'use client';

import {
  ArrowDownToLine,
  Film,
  LockKeyhole,
  Scissors,
  VolumeX,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import { editVideo, keyframeSeconds } from '@/lib/tools/video/edit';
import { readMp4, type Mp4File } from '@/lib/tools/video/mp4';
import { publicTools } from '@/lib/tools/catalog';

/**
 * Nothing is decoded here, so memory is roughly twice the file rather than the
 * tens of times a decoded frame buffer would need. That is why this limit is far
 * higher than the audio converter's.
 */
const MAX_BYTES = 250 * 1024 * 1024;

type Keep = 'both' | 'video' | 'audio';

interface Loaded {
  name: string;
  size: number;
  bytes: Uint8Array;
  movie: Mp4File;
  keyframes: number[];
}

interface Saved {
  name: string;
  url: string;
  size: number;
  headline: string;
  detail: string;
  note: string | null;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  return `${minutes}:${rest < 10 ? '0' : ''}${rest.toFixed(1)}`;
}

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

export function VideoTrimTool() {
  const fileRef = useRef<HTMLInputElement>(null);
  const savedRef = useRef<Saved | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [keep, setKeep] = useState<Keep>('both');

  const manifest = publicTools.find((tool) => tool.id === 'video-trim')!;

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

  const clearSaved = () => {
    if (savedRef.current) URL.revokeObjectURL(savedRef.current.url);
    savedRef.current = null;
    setSaved(null);
  };

  const save = () => {
    if (!saved) return;
    const link = document.createElement('a');
    link.href = saved.url;
    link.download = saved.name;
    link.click();
  };

  const onChoose = async (file: File | undefined) => {
    if (!file) return;
    clearSaved();
    setError('');
    setLoaded(null);
    if (file.size > MAX_BYTES) {
      setError(
        `That file is ${formatBytes(file.size)}. This page works on files up to ${formatBytes(MAX_BYTES)}, because the whole thing has to fit in this tab's memory.`,
      );
      return;
    }
    setBusy('Reading the file…');
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const movie = readMp4(bytes);
      const video = movie.tracks.find((track) => track.kind === 'video');
      setLoaded({
        name: file.name,
        size: file.size,
        bytes,
        movie,
        keyframes: video ? keyframeSeconds(video) : [],
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'That file could not be read.',
      );
    } finally {
      setBusy('');
    }
  };

  const onRun = () => {
    if (!loaded) return;
    clearSaved();
    setError('');
    setBusy('Making the clip…');
    const started = performance.now();
    try {
      const result = editVideo(loaded.bytes, loaded.movie, {
        startSeconds: readSeconds(startAt, 'The start time') ?? 0,
        endSeconds: readSeconds(endAt, 'The end time'),
        keepVideo: keep !== 'audio',
        keepAudio: keep !== 'video',
      });
      // oxlint-disable-next-line react/react-compiler
      const durationMs = performance.now() - started;

      const base = loaded.name.replace(/\.[^.]+$/u, '');
      const suffix =
        keep === 'audio'
          ? 'audio.m4a'
          : keep === 'video'
            ? 'muted.mp4'
            : 'clip.mp4';
      const url = URL.createObjectURL(
        new Blob([result.bytes as BlobPart], {
          type: keep === 'audio' ? 'audio/mp4' : 'video/mp4',
        }),
      );

      const what =
        keep === 'audio'
          ? `Sound only, ${result.audioFrames.toLocaleString('en-US')} frames`
          : keep === 'video'
            ? `Picture only, ${result.videoFrames.toLocaleString('en-US')} frames, no sound`
            : `${result.videoFrames.toLocaleString('en-US')} frames with sound`;

      const next: Saved = {
        name: `${base}-${suffix}`,
        url,
        size: result.bytes.length,
        headline: what,
        detail: `${formatClock(result.actualStartSeconds)} to ${formatClock(result.endSeconds)}, written in ${durationMs < 1000 ? `${durationMs.toFixed(0)} ms` : `${(durationMs / 1000).toFixed(2)} s`}. The frames were copied, not re-encoded, so nothing was lost.`,
        note:
          result.movedBackBySeconds > 0.01
            ? `You asked to start at ${formatClock(result.requestedStartSeconds)}. A cut can only begin on a keyframe, and the nearest one before that is at ${formatClock(result.actualStartSeconds)} — so the clip starts there, ${result.movedBackBySeconds.toFixed(2)}s earlier. Landing exactly on your time would mean re-encoding the opening frames, which would lose quality this way does not.`
            : null,
      };
      savedRef.current = next;
      setSaved(next);

      announceCompletion({
        operation: 'Video trimmer',
        durationMs,
        summary: `Made a clip from ${loaded.name}.`,
        metrics: [
          { label: 'Size', value: formatBytes(result.bytes.length) },
          { label: 'Re-encoded', value: 'No' },
          { label: 'Uploaded', value: 'No' },
        ],
      });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'That could not be done.',
      );
    } finally {
      setBusy('');
    }
  };

  const video =
    loaded?.movie.tracks.find((track) => track.kind === 'video') ?? null;
  const audio =
    loaded?.movie.tracks.find((track) => track.kind === 'audio') ?? null;

  return (
    <AppShell currentToolId="video-trim">
      <section
        id="tool"
        tabIndex={-1}
        className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-12"
      >
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col justify-between gap-5 border-b pb-8 sm:flex-row sm:items-start">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span>Video</span>
                <span aria-hidden="true">/</span>
                <span>Trim</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Trim, mute or take the sound out of a video
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                The picture is never re-encoded. The frames you keep are copied
                across exactly as they were, so a trimmed clip is not a
                lower-quality copy of your video — it is the same frames in a
                smaller file. MP4 and MOV, in the tab you are looking at.
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
            <label htmlFor="video-file" className="text-sm font-semibold">
              Choose a video file
            </label>
            <input
              ref={fileRef}
              id="video-file"
              type="file"
              accept="video/mp4,video/quicktime,.mp4,.m4v,.mov"
              className="focus-ring mt-3 block w-full rounded-lg border bg-background p-2.5 text-sm"
              onChange={(event) => {
                void onChoose(event.target.files?.[0]);
              }}
            />
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              MP4 and MOV only. WebM and Matroska store their index in a
              different format entirely and are refused by name rather than
              failing oddly.
            </p>
          </div>

          {busy ? (
            <output className="mt-4 block text-sm text-muted-foreground">
              {busy}
            </output>
          ) : null}

          {loaded && video ? (
            <>
              <div className="mt-6 rounded-2xl border bg-card p-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Film aria-hidden="true" className="size-4" />
                  What this file is
                </h2>
                <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-xs text-muted-foreground">Picture</dt>
                    <dd className="mt-0.5 font-medium">
                      {video.width}×{video.height} · {video.codec}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Length</dt>
                    <dd className="mt-0.5 font-medium">
                      {formatClock(loaded.movie.durationSeconds)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Frames</dt>
                    <dd className="mt-0.5 font-medium">
                      {video.samples.length.toLocaleString('en-US')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Sound</dt>
                    <dd className="mt-0.5 font-medium">
                      {audio
                        ? `${audio.codec} · ${audio.sampleRate} Hz`
                        : 'none'}
                    </dd>
                  </div>
                </dl>
                <p className="mt-4 text-xs leading-5 text-muted-foreground">
                  {loaded.keyframes.length === 1
                    ? 'This video has a single keyframe, at the very start, so a trim can only begin there.'
                    : `A cut can begin at any of this video's ${loaded.keyframes.length.toLocaleString('en-US')} keyframes — roughly every ${(loaded.movie.durationSeconds / Math.max(1, loaded.keyframes.length - 1)).toFixed(1)}s. Ask for a time in between and the clip starts at the keyframe before it, and says so.`}
                </p>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border bg-card p-5">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <Scissors aria-hidden="true" className="size-4" />
                    Which part to keep
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
                        placeholder={loaded.movie.durationSeconds.toFixed(1)}
                        className="focus-ring mt-1.5 block w-full rounded-lg border bg-background p-2 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border bg-card p-5">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <VolumeX aria-hidden="true" className="size-4" />
                    Picture and sound
                  </h2>
                  <label
                    htmlFor="keep"
                    className="mt-4 block text-xs text-muted-foreground"
                  >
                    What to keep
                  </label>
                  <select
                    id="keep"
                    value={keep}
                    onChange={(event) => setKeep(event.target.value as Keep)}
                    className="focus-ring mt-1.5 block w-full rounded-lg border bg-background p-2 text-sm"
                  >
                    <option value="both">Both the picture and the sound</option>
                    <option value="video">Picture only — mute it</option>
                    <option value="audio">Sound only — save the audio</option>
                  </select>
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    Muting removes the sound track rather than silencing it, so
                    the file gets smaller. Saving the sound gives you an M4A of
                    the original audio, not a re-recording of it.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button type="button" disabled={Boolean(busy)} onClick={onRun}>
                  <Scissors aria-hidden="true" className="size-4" />
                  Make the clip
                </Button>
                <p className="text-xs text-muted-foreground">
                  From {formatBytes(loaded.size)}. Nothing is decoded, so this
                  takes about as long as copying the file.
                </p>
              </div>
            </>
          ) : null}

          <section aria-live="polite" className="mt-6">
            {saved ? (
              <div className="rounded-2xl border bg-card p-5">
                <h2 className="text-base font-semibold">{saved.headline}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {saved.detail} {formatBytes(saved.size)}.
                </p>
                {saved.note ? (
                  <p className="mt-3 rounded-lg border bg-background p-3 text-xs leading-5 text-muted-foreground">
                    {saved.note}
                  </p>
                ) : null}
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
            {manifest.shortDescription} Turning a clip into a GIF is the one
            thing this page cannot do, because that genuinely needs decoding —
            it is not offered rather than offered badly.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
