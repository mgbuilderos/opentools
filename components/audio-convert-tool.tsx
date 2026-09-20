'use client';

import {
  ArrowDownToLine,
  AudioLines,
  Braces,
  Gauge,
  LockKeyhole,
  Scissors,
  Waves,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import {
  BatchLocalPromise,
  BatchRunnerPanel,
  useFileBatchRunner,
} from '@/components/batch-runner';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import { decodeAudioFile, resample } from '@/lib/tools/audio/decode';
import {
  applyFade,
  extractChannel,
  normalizePeak,
  peakDbfs,
  toMono,
  trim,
} from '@/lib/tools/audio/pcm';
import type { AudioProbe } from '@/lib/tools/audio/probe';
import {
  durationSeconds,
  encodeWav,
  wavByteLength,
  type AudioData,
  type WavBitDepth,
} from '@/lib/tools/audio/wav';
import { publicTools } from '@/lib/tools/catalog';

const MAX_INPUT_BYTES = 100 * 1024 * 1024;
/** Past this, a browser tab runs out of memory rather than saving a file. */
const MAX_OUTPUT_BYTES = 500 * 1024 * 1024;

type ChannelChoice = 'keep' | 'mono' | 'left' | 'right';
type RateChoice = 'keep' | '48000' | '44100' | '22050' | '8000';

interface Loaded {
  name: string;
  size: number;
  audio: AudioData;
  probe: AudioProbe | null;
  resampledFrom: number | null;
  peak: number;
}

interface Saved {
  name: string;
  url: string;
  size: number;
  headline: string;
  detail: string;
  durationMs: number;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatClock(seconds: number) {
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const rest = (seconds - minutes * 60).toFixed(seconds < 10 ? 2 : 1);
  return `${minutes}:${Number(rest) < 10 ? '0' : ''}${rest}`;
}

function formatHertz(hertz: number) {
  return `${hertz.toLocaleString('en-US')} Hz`;
}

function formatPeak(dbfs: number) {
  return Number.isFinite(dbfs) ? `${dbfs.toFixed(1)} dBFS` : 'silent';
}

function channelWord(count: number) {
  if (count === 1) return 'mono';
  if (count === 2) return 'stereo';
  return `${count} channels`;
}

/**
 * A level in decibels below full scale.
 *
 * The field is labelled "below full scale", so `3` means 3 dB down. Both signs
 * are accepted and mean the same thing — someone who types `-3` means exactly
 * what someone who types `3` means, and making them get the sign right as well
 * would be a trap rather than a control.
 *
 * Separate from `readSeconds` rather than reusing it: it was reusing it, and an
 * unparseable level then reported "must be a number of seconds" — the wrong
 * units, for the wrong field.
 */
function readDecibelsBelowFullScale(value: string): number | null {
  const text = value.trim();
  if (!text) return null;
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) {
    throw new Error(
      `The normalise level must be a number of decibels, such as 1 or 3. “${text}” is not one.`,
    );
  }
  return -Math.abs(parsed);
}

/** Seconds from a box someone typed in. Blank means "not set", not zero. */
function readSeconds(value: string, label: string): number | null {
  const text = value.trim();
  if (!text) return null;
  const parsed = Number(text);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(
      `${label} must be a number of seconds, and cannot be negative.`,
    );
  }
  return parsed;
}

interface AudioConversionSettings {
  channelChoice: ChannelChoice;
  depth: WavBitDepth;
  endAt: number | null;
  fadeIn: number;
  fadeOut: number;
  normalize: number | null;
  rateChoice: RateChoice;
  startAt: number | null;
}

async function convertAudioData(
  input: AudioData,
  settings: AudioConversionSettings,
) {
  const steps: string[] = [];
  let audio = input;

  if (settings.startAt !== null || settings.endAt !== null) {
    const total = durationSeconds(audio);
    audio = trim(audio, settings.startAt ?? 0, settings.endAt ?? total);
    steps.push(`trimmed to ${formatClock(durationSeconds(audio))}`);
  }

  if (settings.channelChoice === 'mono' && audio.channels.length > 1) {
    audio = toMono(audio);
    steps.push('mixed down to mono');
  } else if (
    settings.channelChoice === 'left' ||
    settings.channelChoice === 'right'
  ) {
    const index = settings.channelChoice === 'left' ? 0 : 1;
    audio = extractChannel(audio, index);
    steps.push(`kept the ${settings.channelChoice} channel`);
  }

  if (settings.rateChoice !== 'keep') {
    const target = Number(settings.rateChoice);
    if (target !== audio.sampleRate) {
      audio = await resample(audio, target);
      steps.push(`resampled to ${formatHertz(target)}`);
    }
  }

  if (settings.fadeIn > 0 || settings.fadeOut > 0) {
    audio = applyFade(audio, settings.fadeIn, settings.fadeOut);
    steps.push('faded');
  }

  if (settings.normalize !== null) {
    audio = normalizePeak(audio, settings.normalize);
    steps.push(`normalised to ${settings.normalize.toFixed(1)} dBFS`);
  }

  const projected = wavByteLength(audio, settings.depth);
  if (projected > MAX_OUTPUT_BYTES) {
    throw new Error(
      `That would produce a ${formatBytes(projected)} WAV, which is more than this tab can hold. Trim it, or choose a lower bit depth or sample rate.`,
    );
  }

  return { audio, bytes: encodeWav(audio, settings.depth), steps };
}

function wavNameFor(fileName: string) {
  return `${fileName.replace(/\.[^.]+$/u, '') || 'audio'}.wav`;
}

export function AudioConvertTool() {
  const fileRef = useRef<HTMLInputElement>(null);
  const savedRef = useRef<Saved | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const batch = useFileBatchRunner();

  const [depth, setDepth] = useState<WavBitDepth>(16);
  const [channelChoice, setChannelChoice] = useState<ChannelChoice>('keep');
  const [rateChoice, setRateChoice] = useState<RateChoice>('keep');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [normalize, setNormalize] = useState('');
  const [fadeIn, setFadeIn] = useState('');
  const [fadeOut, setFadeOut] = useState('');

  const manifest = publicTools.find((tool) => tool.id === 'audio-convert')!;

  useEffect(() => {
    savedRef.current = saved;
  }, [saved]);
  useEffect(
    () => () => {
      if (savedRef.current) URL.revokeObjectURL(savedRef.current.url);
    },
    [],
  );
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const save = () => {
    if (!saved) return;
    const link = document.createElement('a');
    link.href = saved.url;
    link.download = saved.name;
    link.click();
  };

  const clearSaved = () => {
    if (savedRef.current) URL.revokeObjectURL(savedRef.current.url);
    savedRef.current = null;
    setSaved(null);
  };

  const onChoose = async (file: File | undefined) => {
    if (!file) return;
    clearSaved();
    setError('');
    setLoaded(null);
    if (file.size > MAX_INPUT_BYTES) {
      setError(
        `That file is ${formatBytes(file.size)}. This page works on files up to ${formatBytes(MAX_INPUT_BYTES)}, because everything happens in this tab's memory.`,
      );
      return;
    }
    setBusy('Reading the file…');
    try {
      const result = await decodeAudioFile(file);
      setLoaded({
        name: file.name,
        size: file.size,
        audio: result.audio,
        probe: result.probe,
        resampledFrom: result.resampledFrom,
        peak: peakDbfs(result.audio),
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'That file could not be read as audio.',
      );
    } finally {
      setBusy('');
    }
  };

  const onChooseFiles = (files?: FileList | File[]) => {
    const selected = Array.from(files ?? []);
    if (selected.length === 0 || busy || batch.running) return;
    if (selected.length === 1) {
      batch.reset();
      setBatchFiles([]);
      void onChoose(selected[0]);
      return;
    }
    clearSaved();
    setLoaded(null);
    setError('');
    batch.reset();
    setBatchFiles(selected);
  };

  const getSettings = (): AudioConversionSettings => ({
    channelChoice,
    depth,
    endAt: readSeconds(endAt, 'The end time'),
    fadeIn: readSeconds(fadeIn, 'The fade in') ?? 0,
    fadeOut: readSeconds(fadeOut, 'The fade out') ?? 0,
    normalize: readDecibelsBelowFullScale(normalize),
    rateChoice,
    startAt: readSeconds(startAt, 'The start time'),
  });

  const onConvert = async () => {
    if (!loaded) return;
    clearSaved();
    setError('');
    setBusy('Converting…');
    const started = performance.now();
    try {
      const converted = await convertAudioData(loaded.audio, getSettings());
      const { audio, bytes, steps } = converted;
      // oxlint-disable-next-line react/react-compiler
      const durationMs = performance.now() - started;

      const url = URL.createObjectURL(
        new Blob([bytes as BlobPart], { type: 'audio/wav' }),
      );
      const next: Saved = {
        name: wavNameFor(loaded.name),
        url,
        size: bytes.length,
        headline: `${depth === 32 ? '32-bit float' : `${depth}-bit`} WAV, ${formatHertz(audio.sampleRate)}, ${channelWord(audio.channels.length)}`,
        detail: steps.length
          ? `Decoded, then ${steps.join(', ')}.`
          : 'Decoded and written out, with nothing else changed.',
        durationMs,
      };
      savedRef.current = next;
      setSaved(next);

      announceCompletion({
        operation: 'Audio converter',
        durationMs,
        summary: `Converted ${loaded.name} to WAV.`,
        metrics: [
          { label: 'Size', value: formatBytes(bytes.length) },
          { label: 'Peak', value: formatPeak(peakDbfs(audio)) },
          { label: 'Uploaded', value: 'No' },
        ],
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'That could not be converted.',
      );
    } finally {
      setBusy('');
    }
  };

  const clearAll = () => {
    batch.reset();
    setBatchFiles([]);
    clearSaved();
    setLoaded(null);
    setError('');
    setBusy('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const startBatch = () => {
    let settings: AudioConversionSettings;
    try {
      settings = getSettings();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Check the conversion settings.',
      );
      return;
    }
    setError('');
    void batch.start(batchFiles, async (file, _index, signal) => {
      if (file.size > MAX_INPUT_BYTES) {
        return { status: 'skipped', reason: 'The 100 MB limit was exceeded.' };
      }
      if (signal.aborted) {
        return { status: 'skipped', reason: 'Batch cancelled.' };
      }
      const decoded = await decodeAudioFile(file);
      const converted = await convertAudioData(decoded.audio, settings);
      return {
        status: 'done',
        output: {
          blob: new Blob([converted.bytes as BlobPart], { type: 'audio/wav' }),
          fileName: wavNameFor(file.name),
        },
      };
    });
  };

  const projectedSize = loaded ? wavByteLength(loaded.audio, depth) : 0;

  return (
    <AppShell currentToolId="audio-convert">
      <section
        id="tool"
        tabIndex={-1}
        className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-12"
      >
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col justify-between gap-5 border-b pb-8 sm:flex-row sm:items-start">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span>Audio</span>
                <span aria-hidden="true">/</span>
                <span>Convert</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Convert audio to WAV
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                Turn an M4A, FLAC, OGG, AIFF or MP3 recording into a WAV, and
                trim, fade or level it on the way through. The decoders are the
                ones your browser already carries, so the work happens in the
                tab you are looking at.
              </p>
            </div>
            <span className="flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold">
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              Runs in this tab
            </span>
          </div>

          {error ? (
            <div
              ref={errorRef}
              role="alert"
              tabIndex={-1}
              className="focus-ring mt-6 flex items-start justify-between gap-4 rounded-xl border border-destructive/35 bg-destructive/5 p-4 text-sm"
            >
              <div>
                <p className="font-semibold">Couldn’t do that</p>
                <p className="mt-1 whitespace-pre-line text-muted-foreground">
                  {error}
                </p>
              </div>
              <button
                type="button"
                className="focus-ring rounded p-1"
                onClick={() => setError('')}
                aria-label="Dismiss error"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
          ) : null}

          <div className="mt-8 rounded-2xl border bg-card p-5">
            <label htmlFor="audio-file" className="text-sm font-semibold">
              Choose an audio file
            </label>
            <input
              ref={fileRef}
              id="audio-file"
              type="file"
              multiple
              accept="audio/*,.mp3,.m4a,.aac,.flac,.ogg,.opus,.oga,.wav,.aiff,.aif,.caf,.webm"
              className="focus-ring mt-3 block w-full rounded-lg border bg-background p-2.5 text-sm"
              disabled={Boolean(busy) || batch.running}
              onChange={(event) => onChooseFiles(event.target.files ?? [])}
            />
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Output is WAV. There is no MP3 encoder on this page — shipping one
              means shipping a licensed encoder, and a re-encode would lose
              quality that the original still has.
            </p>
            <BatchLocalPromise />
          </div>

          {batchFiles.length > 1 ? (
            <section className="mt-6 rounded-2xl border bg-card p-5">
              <h2 className="text-sm font-semibold">Batch WAV settings</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                These settings apply to every selected recording.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <label className="text-xs font-semibold">
                  Bit depth
                  <select
                    value={depth}
                    disabled={batch.running}
                    onChange={(event) =>
                      setDepth(Number(event.target.value) as WavBitDepth)
                    }
                    className="focus-ring mt-1.5 block w-full rounded-lg border bg-background p-2 text-sm"
                  >
                    <option value={16}>16-bit</option>
                    <option value={24}>24-bit</option>
                    <option value={32}>32-bit float</option>
                  </select>
                </label>
                <label className="text-xs font-semibold">
                  Channels
                  <select
                    value={channelChoice}
                    disabled={batch.running}
                    onChange={(event) =>
                      setChannelChoice(event.target.value as ChannelChoice)
                    }
                    className="focus-ring mt-1.5 block w-full rounded-lg border bg-background p-2 text-sm"
                  >
                    <option value="keep">Keep as they are</option>
                    <option value="mono">Mix down to mono</option>
                    <option value="left">Left channel only</option>
                    <option value="right">Right channel only</option>
                  </select>
                </label>
                <label className="text-xs font-semibold">
                  Sample rate
                  <select
                    value={rateChoice}
                    disabled={batch.running}
                    onChange={(event) =>
                      setRateChoice(event.target.value as RateChoice)
                    }
                    className="focus-ring mt-1.5 block w-full rounded-lg border bg-background p-2 text-sm"
                  >
                    <option value="keep">Keep each source rate</option>
                    <option value="48000">48,000 Hz</option>
                    <option value="44100">44,100 Hz</option>
                    <option value="22050">22,050 Hz</option>
                    <option value="8000">8,000 Hz</option>
                  </select>
                </label>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[
                  ['Start at (seconds)', startAt, setStartAt],
                  ['End at (seconds)', endAt, setEndAt],
                  ['Fade in (seconds)', fadeIn, setFadeIn],
                  ['Fade out (seconds)', fadeOut, setFadeOut],
                  ['Normalise peak (dB)', normalize, setNormalize],
                ].map(([label, value, update]) => (
                  <label
                    key={label as string}
                    className="text-xs font-semibold"
                  >
                    {label as string}
                    <input
                      inputMode="decimal"
                      value={value as string}
                      disabled={batch.running}
                      onChange={(event) =>
                        (update as (next: string) => void)(event.target.value)
                      }
                      placeholder="optional"
                      className="focus-ring mt-1.5 block w-full rounded-lg border bg-background p-2 text-sm"
                    />
                  </label>
                ))}
              </div>
            </section>
          ) : null}

          {batchFiles.length > 1 ? (
            <BatchRunnerPanel
              files={batchFiles}
              runner={batch}
              startLabel="Convert all to WAV"
              zipName="converted-audio.zip"
              onStart={startBatch}
              onClear={clearAll}
            />
          ) : null}

          {busy ? (
            <output className="mt-4 block text-sm text-muted-foreground">
              {busy}
            </output>
          ) : null}

          {loaded ? (
            <>
              <div className="mt-6 rounded-2xl border bg-card p-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <AudioLines aria-hidden="true" className="size-4" />
                  What this file is
                </h2>
                <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-xs text-muted-foreground">Format</dt>
                    <dd className="mt-0.5 font-medium">
                      {loaded.probe
                        ? `${loaded.probe.container} · ${loaded.probe.codec}`
                        : 'Not recognised from its header'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Sample rate
                    </dt>
                    <dd className="mt-0.5 font-medium">
                      {formatHertz(loaded.audio.sampleRate)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Channels</dt>
                    <dd className="mt-0.5 font-medium">
                      {channelWord(loaded.audio.channels.length)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Length</dt>
                    <dd className="mt-0.5 font-medium">
                      {formatClock(durationSeconds(loaded.audio))}
                    </dd>
                  </div>
                </dl>
                <p className="mt-4 text-xs leading-5 text-muted-foreground">
                  Loudest moment: {formatPeak(loaded.peak)}.{' '}
                  {loaded.resampledFrom
                    ? `The file declares ${formatHertz(loaded.resampledFrom)}, and your browser decoded it at ${formatHertz(loaded.audio.sampleRate)}.`
                    : 'Decoded at the rate the file itself declares, so nothing was resampled on the way in.'}
                  {loaded.probe?.note ? ` ${loaded.probe.note}` : ''}
                </p>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border bg-card p-5">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <Braces aria-hidden="true" className="size-4" />
                    How to write it
                  </h2>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label
                        htmlFor="bit-depth"
                        className="text-xs text-muted-foreground"
                      >
                        Bit depth
                      </label>
                      <select
                        id="bit-depth"
                        value={depth}
                        onChange={(event) =>
                          setDepth(Number(event.target.value) as WavBitDepth)
                        }
                        className="focus-ring mt-1.5 block w-full rounded-lg border bg-background p-2 text-sm"
                      >
                        <option value={16}>16-bit — what a CD holds</option>
                        <option value={24}>24-bit — studio standard</option>
                        <option value={32}>32-bit float — no clipping</option>
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="channels"
                        className="text-xs text-muted-foreground"
                      >
                        Channels
                      </label>
                      <select
                        id="channels"
                        value={channelChoice}
                        onChange={(event) =>
                          setChannelChoice(event.target.value as ChannelChoice)
                        }
                        className="focus-ring mt-1.5 block w-full rounded-lg border bg-background p-2 text-sm"
                      >
                        <option value="keep">Keep as they are</option>
                        <option value="mono">Mix down to mono</option>
                        <option value="left">Left channel only</option>
                        <option value="right">Right channel only</option>
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="sample-rate"
                        className="text-xs text-muted-foreground"
                      >
                        Sample rate
                      </label>
                      <select
                        id="sample-rate"
                        value={rateChoice}
                        onChange={(event) =>
                          setRateChoice(event.target.value as RateChoice)
                        }
                        className="focus-ring mt-1.5 block w-full rounded-lg border bg-background p-2 text-sm"
                      >
                        <option value="keep">
                          Keep {formatHertz(loaded.audio.sampleRate)}
                        </option>
                        <option value="48000">48,000 Hz — video</option>
                        <option value="44100">44,100 Hz — CD</option>
                        <option value="22050">22,050 Hz — speech</option>
                        <option value="8000">8,000 Hz — telephone</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border bg-card p-5">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <Scissors aria-hidden="true" className="size-4" />
                    Optional changes
                  </h2>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="start-at"
                        className="text-xs text-muted-foreground"
                      >
                        Start at (seconds)
                      </label>
                      <input
                        id="start-at"
                        inputMode="decimal"
                        value={startAt}
                        onChange={(event) => setStartAt(event.target.value)}
                        placeholder="0"
                        className="focus-ring mt-1.5 block w-full rounded-lg border bg-background p-2 text-sm"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="end-at"
                        className="text-xs text-muted-foreground"
                      >
                        End at (seconds)
                      </label>
                      <input
                        id="end-at"
                        inputMode="decimal"
                        value={endAt}
                        onChange={(event) => setEndAt(event.target.value)}
                        placeholder={durationSeconds(loaded.audio).toFixed(1)}
                        className="focus-ring mt-1.5 block w-full rounded-lg border bg-background p-2 text-sm"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="fade-in"
                        className="text-xs text-muted-foreground"
                      >
                        Fade in (seconds)
                      </label>
                      <input
                        id="fade-in"
                        inputMode="decimal"
                        value={fadeIn}
                        onChange={(event) => setFadeIn(event.target.value)}
                        placeholder="0"
                        className="focus-ring mt-1.5 block w-full rounded-lg border bg-background p-2 text-sm"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="fade-out"
                        className="text-xs text-muted-foreground"
                      >
                        Fade out (seconds)
                      </label>
                      <input
                        id="fade-out"
                        inputMode="decimal"
                        value={fadeOut}
                        onChange={(event) => setFadeOut(event.target.value)}
                        placeholder="0"
                        className="focus-ring mt-1.5 block w-full rounded-lg border bg-background p-2 text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label
                        htmlFor="normalize"
                        className="text-xs text-muted-foreground"
                      >
                        Normalise the peak to (dB below full scale)
                      </label>
                      <input
                        id="normalize"
                        inputMode="decimal"
                        value={normalize}
                        onChange={(event) => setNormalize(event.target.value)}
                        placeholder="leave blank to keep the level"
                        className="focus-ring mt-1.5 block w-full rounded-lg border bg-background p-2 text-sm"
                      />
                      <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                        This matches the loudest instant to a ceiling. It is not
                        the same as making two recordings sound equally loud,
                        which needs a different measurement entirely.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => {
                    void onConvert();
                  }}
                >
                  <Waves aria-hidden="true" className="size-4" />
                  Convert to WAV
                </Button>
                <p className="text-xs text-muted-foreground">
                  About {formatBytes(projectedSize)} before any trimming — a WAV
                  stores every sample, so it is larger than the file you started
                  with ({formatBytes(loaded.size)}).
                </p>
              </div>
            </>
          ) : null}

          <section aria-live="polite" className="mt-6">
            {saved ? (
              <div className="rounded-2xl border bg-card p-5">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  <Gauge aria-hidden="true" className="size-4" />
                  {saved.headline}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {saved.detail} {formatBytes(saved.size)}, written in{' '}
                  {saved.durationMs < 1000
                    ? `${saved.durationMs.toFixed(0)} ms`
                    : `${(saved.durationMs / 1000).toFixed(2)} s`}
                  .
                </p>
                <Button
                  data-receipt-download
                  className="mt-4 h-11"
                  onClick={save}
                >
                  <ArrowDownToLine aria-hidden="true" />
                  Save {saved.name}
                </Button>
              </div>
            ) : null}
          </section>

          <p className="mt-10 text-xs leading-5 text-muted-foreground">
            {manifest.shortDescription} Which files open here depends on the
            decoders your own browser ships with, so a format one browser reads
            may be refused by another — the page says which it managed.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
