'use client';

import {
  ArrowDownToLine,
  CheckCircle2,
  FileAudio,
  ListMusic,
  LockKeyhole,
  Scissors,
  ShieldCheck,
  Sparkles,
  Tags as TagsIcon,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import { ID3_FIELDS, type Id3Field, type Id3Tags } from '@/lib/tools/audio/id3';
import {
  describeMp3,
  formatDurationMs,
  joinMp3,
  type Mp3File,
  parseMp3,
  parseTimecode,
  retagMp3,
  sliceMp3,
} from '@/lib/tools/audio/mp3';
import { publicTools } from '@/lib/tools/catalog';

type Mode = 'cut' | 'join' | 'tags' | 'inspect';

interface Loaded {
  name: string;
  size: number;
  file: Mp3File;
  url: string;
}

interface Output {
  name: string;
  url: string;
  blob: Blob;
  headline: string;
  detail: string;
  durationMs: number;
}

const MAX_BYTES = 100 * 1024 * 1024;

const MODES: readonly { id: Mode; label: string; icon: typeof Scissors }[] = [
  { id: 'cut', label: 'Cut', icon: Scissors },
  { id: 'join', label: 'Join', icon: ListMusic },
  { id: 'tags', label: 'Tags', icon: TagsIcon },
  { id: 'inspect', label: 'Inspect', icon: FileAudio },
];

const FIELD_LABELS: Record<Id3Field, string> = {
  title: 'Title',
  artist: 'Artist',
  album: 'Album',
  year: 'Year',
  track: 'Track',
  genre: 'Genre',
  comment: 'Comment',
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatElapsed(durationMs: number) {
  return durationMs < 1000
    ? `${durationMs.toFixed(1)} ms`
    : `${(durationMs / 1000).toFixed(2)} s`;
}

function baseName(name: string) {
  return name.replace(/\.mp3$/iu, '') || 'audio';
}

function emptyTags(): Record<Id3Field, string> {
  return {
    title: '',
    artist: '',
    album: '',
    year: '',
    track: '',
    genre: '',
    comment: '',
  };
}

function tagsToForm(tags: Id3Tags): Record<Id3Field, string> {
  const form = emptyTags();
  for (const field of ID3_FIELDS) form[field] = tags[field] ?? '';
  return form;
}

function formToTags(form: Record<Id3Field, string>): Id3Tags {
  const tags: Id3Tags = {};
  for (const field of ID3_FIELDS) {
    const value = form[field].trim();
    if (value) tags[field] = value;
  }
  return tags;
}

export function Mp3ToolkitTool() {
  const fileRef = useRef<HTMLInputElement>(null);
  const loadedRef = useRef<Loaded[]>([]);
  const outputRef = useRef<Output | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const [loaded, setLoaded] = useState<Loaded[]>([]);
  const [output, setOutput] = useState<Output | null>(null);
  const [mode, setMode] = useState<Mode>('cut');
  const [startText, setStartText] = useState('0:00');
  const [endText, setEndText] = useState('0:30');
  const [form, setForm] = useState<Record<Id3Field, string>>(emptyTags());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const manifest = publicTools.find((tool) => tool.id === 'mp3-toolkit')!;
  const primary = loaded[0] ?? null;

  useEffect(() => {
    loadedRef.current = loaded;
  }, [loaded]);
  useEffect(() => {
    outputRef.current = output;
  }, [output]);
  useEffect(
    () => () => {
      for (const entry of loadedRef.current) URL.revokeObjectURL(entry.url);
      if (outputRef.current) URL.revokeObjectURL(outputRef.current.url);
    },
    [],
  );
  useEffect(() => {
    // Deep links from search and the catalog name a mode: /audio/mp3-toolkit?tool=mp3-cut.
    // Read client-side so the route stays static and cacheable.
    const requested = new URLSearchParams(window.location.search).get('tool');
    const match = MODES.find((entry) => `mp3-${entry.id}` === requested);
    if (!match) return;
    // Deferred by a frame, the pattern the other workbenches use: setting state
    // synchronously inside an effect cascades an extra render.
    const frame = requestAnimationFrame(() => setMode(match.id));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const clearOutput = () => {
    if (outputRef.current) URL.revokeObjectURL(outputRef.current.url);
    outputRef.current = null;
    setOutput(null);
  };

  const choose = async (fileList: FileList | null) => {
    const files = fileList ? [...fileList] : [];
    if (!files.length || busy) return;
    clearOutput();
    setError('');
    setBusy(true);
    try {
      const next: Loaded[] = [];
      for (const file of files) {
        if (file.size > MAX_BYTES) {
          throw new Error(
            `${file.name} is ${formatBytes(file.size)}. This page reads files up to 100 MB.`,
          );
        }
        const bytes = new Uint8Array(await file.arrayBuffer());
        // parseMp3 throws with a plain reason for anything it cannot copy.
        const parsed = parseMp3(bytes);
        next.push({
          name: file.name,
          size: file.size,
          file: parsed,
          url: URL.createObjectURL(
            new Blob([bytes as BlobPart], { type: 'audio/mpeg' }),
          ),
        });
      }
      for (const entry of loadedRef.current) URL.revokeObjectURL(entry.url);
      loadedRef.current = next;
      setLoaded(next);
      setForm(tagsToForm(next[0].file.tags));
      setStartText('0:00');
      setEndText(formatDurationMs(Math.min(next[0].file.durationMs, 30_000)));
      if (next.length > 1) setMode('join');
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'That file could not be read.',
      );
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  /**
   * One handler for every mode. Each branch only decides what bytes to make
   * and what to say about them; writing the result, re-reading it and
   * announcing it happen once, below.
   */
  async function run() {
    if (!primary || busy) return;
    setBusy(true);
    setError('');
    clearOutput();
    // Yield once so the busy state paints before a large file is copied.
    await Promise.resolve();
    // `run` is only ever called from an onClick, never during render, but the
    // React Compiler rule cannot see that and flags the clock. Suppressed on
    // these two lines rather than with the blanket `/* oxlint-disable */` the
    // sibling tool components use, so every other rule still applies here.
    // oxlint-disable-next-line react/react-compiler
    const started = performance.now();
    try {
      let bytes: Uint8Array;
      let name: string;
      let headline: string;
      let detail: string;
      let rows: { label: string; value: string }[];

      if (mode === 'cut') {
        const startMs = parseTimecode(startText, 'the start time');
        const endMs = parseTimecode(endText, 'the end time');
        const result = sliceMp3(primary.file, startMs, endMs);
        bytes = result.bytes;
        name = `${baseName(primary.name)}-cut.mp3`;
        headline = `Cut ${formatDurationMs(result.startMs)} to ${formatDurationMs(
          result.endMs,
        )}`;
        detail = `${result.frameCount.toLocaleString()} frames copied unchanged. Both edges moved to the nearest frame boundary: the start by ${Math.abs(
          result.startDriftMs,
        ).toFixed(
          1,
        )} ms, the end by ${Math.abs(result.endDriftMs).toFixed(1)} ms.`;
        rows = [
          { label: 'Length', value: formatDurationMs(result.durationMs) },
          { label: 'Frames', value: result.frameCount.toLocaleString() },
          { label: 'Re-encoded', value: 'No' },
        ];
      } else if (mode === 'join') {
        const result = joinMp3(
          loaded.map((entry) => ({ name: entry.name, file: entry.file })),
        );
        bytes = result.bytes;
        name = `${baseName(primary.name)}-joined.mp3`;
        headline = `Joined ${loaded.length} files into ${formatDurationMs(
          result.durationMs,
        )}`;
        detail = `${result.frameCount.toLocaleString()} frames copied unchanged, in the order listed above.`;
        rows = [
          { label: 'Files', value: String(loaded.length) },
          { label: 'Length', value: formatDurationMs(result.durationMs) },
          { label: 'Re-encoded', value: 'No' },
        ];
      } else if (mode === 'tags') {
        const tags = formToTags(form);
        const written = Object.keys(tags).length;
        bytes = retagMp3(primary.file, tags);
        name = `${baseName(primary.name)}-tagged.mp3`;
        headline = written
          ? `Wrote ${written} tag ${written === 1 ? 'field' : 'fields'}`
          : 'Removed every tag';
        detail = written
          ? 'Written as ID3v2.3 in UTF-16, so rupee signs, Indian languages and emoji survive. Any old ID3v1 or APE tag at the end of the file is dropped.'
          : 'The file now carries no ID3v1, ID3v2 or APE tag at all.';
        rows = [
          { label: 'Fields', value: String(written) },
          { label: 'Audio', value: 'Untouched' },
          { label: 'Re-encoded', value: 'No' },
        ];
      } else {
        return;
      }

      // Read the result back with the same parser before offering it, so a
      // file that would not open is never presented as a finished download.
      parseMp3(bytes);
      const blob = new Blob([bytes as BlobPart], { type: 'audio/mpeg' });
      // oxlint-disable-next-line react/react-compiler -- see the note above
      const durationMs = performance.now() - started;
      const next: Output = {
        name,
        url: URL.createObjectURL(blob),
        blob,
        headline,
        detail,
        durationMs,
      };
      outputRef.current = next;
      setOutput(next);
      announceCompletion({
        operation: 'MP3 toolkit',
        durationMs,
        summary: headline,
        metrics: rows,
      });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'That could not be done.',
      );
    } finally {
      setBusy(false);
    }
  }

  const clearAll = () => {
    clearOutput();
    for (const entry of loadedRef.current) URL.revokeObjectURL(entry.url);
    loadedRef.current = [];
    setLoaded([]);
    setForm(emptyTags());
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const save = () => {
    if (!output) return;
    const link = document.createElement('a');
    link.href = output.url;
    link.download = output.name;
    link.click();
  };

  const moveFile = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= loaded.length) return;
    const next = [...loaded];
    const moved = next[index];
    next[index] = next[target];
    next[target] = moved;
    clearOutput();
    setLoaded(next);
  };

  const removeFile = (index: number) => {
    const entry = loaded[index];
    URL.revokeObjectURL(entry.url);
    const next = loaded.filter((_, position) => position !== index);
    clearOutput();
    setLoaded(next);
    if (next.length) setForm(tagsToForm(next[0].file.tags));
    else setForm(emptyTags());
  };

  const actionLabel =
    mode === 'cut' ? 'Cut MP3' : mode === 'join' ? 'Join MP3s' : 'Write tags';
  const canRun =
    Boolean(primary) &&
    !busy &&
    (mode !== 'join' || loaded.length >= 2) &&
    mode !== 'inspect';

  return (
    <AppShell currentToolId="mp3-toolkit">
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
                <span>MP3 toolkit</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Cut, join and tag MP3s
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                Whole MPEG frames are copied from your file to the result, so
                nothing is decoded and nothing is re-encoded. A 320 kbps file
                stays 320 kbps, and the audio you get back is the audio you
                started with.
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
                <p className="mt-1 text-muted-foreground">{error}</p>
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

          <section className="mt-8 overflow-hidden rounded-2xl border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-5">
              <div>
                <h2 className="text-sm font-semibold">Your MP3 files</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  MP3 only · up to 100 MB each · choose several to join them
                </p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="audio/mpeg,.mp3"
                multiple
                aria-label="Choose MP3 files"
                className="sr-only"
                onChange={(event) => void choose(event.target.files)}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="h-10"
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                >
                  <FileAudio aria-hidden="true" />
                  {loaded.length ? 'Add files' : 'Choose files'}
                </Button>
                {loaded.length ? (
                  <Button
                    variant="ghost"
                    className="h-10"
                    disabled={busy}
                    onClick={clearAll}
                  >
                    <Trash2 aria-hidden="true" />
                    Clear
                  </Button>
                ) : null}
              </div>
            </div>

            {loaded.length ? (
              <ul className="divide-y">
                {loaded.map((entry, index) => (
                  <li
                    key={`${entry.name}-${index}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {index + 1}. {entry.name}
                      </p>
                      <p className="tabular mt-0.5 text-xs text-muted-foreground">
                        {formatDurationMs(entry.file.durationMs)} ·{' '}
                        {entry.file.variableBitrate
                          ? `VBR ${Math.round(entry.file.averageBitrateKbps)} kbps`
                          : `${entry.file.frames[0].bitrateKbps} kbps`}
                        {' · '}
                        {entry.file.sampleRate.toLocaleString()} Hz ·{' '}
                        {entry.file.channels === 1 ? 'mono' : 'stereo'} ·{' '}
                        {formatBytes(entry.size)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {loaded.length > 1 ? (
                        <>
                          <Button
                            variant="ghost"
                            className="h-9 px-2 text-xs"
                            disabled={busy || index === 0}
                            onClick={() => moveFile(index, -1)}
                            aria-label={`Move ${entry.name} earlier`}
                          >
                            ↑
                          </Button>
                          <Button
                            variant="ghost"
                            className="h-9 px-2 text-xs"
                            disabled={busy || index === loaded.length - 1}
                            onClick={() => moveFile(index, 1)}
                            aria-label={`Move ${entry.name} later`}
                          >
                            ↓
                          </Button>
                        </>
                      ) : null}
                      <Button
                        variant="ghost"
                        className="h-9 px-2"
                        disabled={busy}
                        onClick={() => removeFile(index)}
                        aria-label={`Remove ${entry.name}`}
                      >
                        <X aria-hidden="true" className="size-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="grid min-h-44 place-items-center p-6 text-center">
                <div>
                  <span className="mx-auto grid size-11 place-items-center rounded-xl border bg-background">
                    <FileAudio aria-hidden="true" className="size-5" />
                  </span>
                  <p className="mt-4 font-semibold">Choose an MP3</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your file stays on this device. The original is never
                    changed.
                  </p>
                </div>
              </div>
            )}
          </section>

          {primary ? (
            <section className="mt-5 overflow-hidden rounded-2xl border bg-card">
              <div
                role="tablist"
                aria-label="What to do"
                className="flex flex-wrap gap-1 border-b p-2"
              >
                {MODES.map((entry) => {
                  const Icon = entry.icon;
                  const selected = mode === entry.id;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      role="tab"
                      id={`mp3-tab-${entry.id}`}
                      aria-selected={selected}
                      aria-controls={`mp3-panel-${entry.id}`}
                      disabled={busy}
                      onClick={() => {
                        clearOutput();
                        setError('');
                        setMode(entry.id);
                      }}
                      className={`focus-ring flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors ${
                        selected
                          ? 'bg-foreground text-background'
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <Icon aria-hidden="true" className="size-4" />
                      {entry.label}
                    </button>
                  );
                })}
              </div>

              <div
                role="tabpanel"
                id={`mp3-panel-${mode}`}
                aria-labelledby={`mp3-tab-${mode}`}
                className="p-4 sm:p-5"
              >
                {mode === 'cut' ? (
                  <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_280px]">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Play the file to find your moment, then type the times.
                        Both{' '}
                        <code className="rounded bg-muted px-1">1:23.5</code>{' '}
                        and <code className="rounded bg-muted px-1">83.5</code>{' '}
                        work.
                      </p>
                      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                      <audio
                        controls
                        preload="metadata"
                        src={primary.url}
                        aria-label={`Preview of ${primary.name}`}
                        className="mt-4 w-full"
                      />
                      <p className="mt-4 text-xs leading-5 text-muted-foreground">
                        An MP3 stores audio in frames of{' '}
                        {primary.file.frames[0].durationMs.toFixed(1)} ms, so a
                        cut lands on a frame edge rather than an exact
                        millisecond — the receipt says how far each edge moved.
                        Frames also share a little data with the frames before
                        them, so roughly the first 60 ms after a cut can sound
                        very slightly different; everything after that is
                        identical. Re-encoding would fix that and lose quality
                        everywhere else instead.
                      </p>
                    </div>
                    <div className="grid content-start gap-3">
                      <label className="text-xs font-semibold">
                        Start
                        <input
                          type="text"
                          inputMode="decimal"
                          value={startText}
                          disabled={busy}
                          onChange={(event) => {
                            clearOutput();
                            setStartText(event.target.value);
                          }}
                          className="focus-ring mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm"
                        />
                      </label>
                      <label className="text-xs font-semibold">
                        End
                        <input
                          type="text"
                          inputMode="decimal"
                          value={endText}
                          disabled={busy}
                          onChange={(event) => {
                            clearOutput();
                            setEndText(event.target.value);
                          }}
                          className="focus-ring mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm"
                        />
                      </label>
                      <p className="tabular text-xs text-muted-foreground">
                        Whole file: 0:00 to{' '}
                        {formatDurationMs(primary.file.durationMs)}
                      </p>
                    </div>
                  </div>
                ) : null}

                {mode === 'join' ? (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Files are joined top to bottom, in the order above. Use
                      the arrows to reorder them.
                    </p>
                    <p className="mt-4 text-xs leading-5 text-muted-foreground">
                      Every file has to share the same sample rate, channel
                      count and MPEG version, because joining different ones
                      without re-encoding would make the audio play at the wrong
                      speed after the join. If they differ you get told which
                      file and why, and nothing is produced.
                    </p>
                    {loaded.length < 2 ? (
                      <p className="mt-4 text-sm font-semibold">
                        Choose at least two files to join.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {mode === 'tags' ? (
                  <div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {ID3_FIELDS.map((field) => (
                        <label key={field} className="text-xs font-semibold">
                          {FIELD_LABELS[field]}
                          <input
                            type="text"
                            value={form[field]}
                            disabled={busy}
                            onChange={(event) => {
                              clearOutput();
                              setForm((current) => ({
                                ...current,
                                [field]: event.target.value,
                              }));
                            }}
                            className="focus-ring mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm"
                          />
                        </label>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <Button
                        variant="outline"
                        className="h-10"
                        disabled={busy}
                        onClick={() => {
                          clearOutput();
                          setForm(emptyTags());
                        }}
                      >
                        Clear every field
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Leaving all of them empty removes the tags entirely.
                      </p>
                    </div>
                  </div>
                ) : null}

                {mode === 'inspect' ? (
                  <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    {describeMp3(primary.file).map((row) => (
                      <div
                        key={row.label}
                        className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-2"
                      >
                        <dt className="text-xs font-semibold text-muted-foreground">
                          {row.label}
                        </dt>
                        <dd className="tabular text-sm font-semibold">
                          {row.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}

                {mode === 'inspect' ? null : (
                  <Button
                    className="mt-5 h-11 w-full sm:w-auto"
                    disabled={!canRun}
                    onClick={() => void run()}
                  >
                    <Sparkles aria-hidden="true" />
                    {busy ? 'Working…' : actionLabel}
                  </Button>
                )}
              </div>
            </section>
          ) : null}

          {output ? (
            <section
              aria-labelledby="mp3-result-heading"
              className="mt-5 overflow-hidden rounded-2xl border bg-card"
            >
              <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center sm:p-6">
                <div>
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-success/10 text-success">
                      <CheckCircle2 aria-hidden="true" className="size-5" />
                    </span>
                    <div>
                      <h2
                        id="mp3-result-heading"
                        className="text-lg font-semibold"
                      >
                        {output.headline}
                      </h2>
                      <p className="tabular mt-1 text-sm text-muted-foreground">
                        {formatBytes(output.blob.size)} ·{' '}
                        {formatElapsed(output.durationMs)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-xs leading-5 text-muted-foreground">
                    {output.detail}
                  </p>
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <audio
                    controls
                    preload="metadata"
                    src={output.url}
                    aria-label="Preview of the result"
                    className="mt-4 w-full"
                  />
                </div>
                <Button data-receipt-download className="h-11" onClick={save}>
                  <ArrowDownToLine aria-hidden="true" />
                  Save MP3
                </Button>
              </div>
              <div className="grid border-t sm:grid-cols-3">
                <div className="border-b p-4 sm:border-b-0 sm:border-r sm:p-5">
                  <p className="text-xs text-muted-foreground">Processing</p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
                    <ShieldCheck
                      aria-hidden="true"
                      className="size-4 text-success"
                    />
                    In this tab
                  </p>
                </div>
                <div className="border-b p-4 sm:border-b-0 sm:border-r sm:p-5">
                  <p className="text-xs text-muted-foreground">Output check</p>
                  <p className="mt-1 text-sm font-semibold">
                    Re-read as an MP3 before download
                  </p>
                </div>
                <div className="p-4 sm:p-5">
                  <p className="text-xs text-muted-foreground">Audio quality</p>
                  <p className="mt-1 text-sm font-semibold">
                    Frames copied, not re-encoded
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          <footer className="mt-10 flex flex-col gap-3 border-t py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              Candidate {manifest.version} · MPEG frame copy · MP3 in, MP3 out
            </p>
            <a
              href="/file/hash-calculator"
              className="focus-ring rounded font-semibold text-foreground hover:underline"
            >
              Next: Check a file hash →
            </a>
          </footer>
        </div>
      </section>
    </AppShell>
  );
}
