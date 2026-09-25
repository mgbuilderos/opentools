'use client';

import {
  Archive,
  ArrowDownToLine,
  CheckCircle2,
  FileVideo,
  LockKeyhole,
  Scissors,
  Split,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import { keyframeSeconds } from '@/lib/tools/video/edit';
import { readMp4, type Mp4File } from '@/lib/tools/video/mp4';
import { sourceFromFile, type ByteSource } from '@/lib/tools/video/source';
import { VideoSuiteNav, VideoRelatedLinks } from '@/components/video-suite-nav';
import {
  removeSection,
  splitIntoClips,
  type ClipResult,
  type RemoveSectionResult,
  type SplitClipsResult,
} from '@/lib/tools/video/split';

const MAX_BYTES = 2 * 1024 * 1024 * 1024;

interface Loaded {
  name: string;
  size: number;
  source: ByteSource;
  movie: Mp4File;
  duration: number;
  keyframes: number[];
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

export function VideoSplitTool() {
  const fileRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const [mode, setMode] = useState<'remove' | 'split'>('remove');

  // Remove section inputs
  const [cutStart, setCutStart] = useState('1.0');
  const [cutEnd, setCutEnd] = useState('3.0');
  const [removeResult, setRemoveResult] = useState<{
    result: RemoveSectionResult;
    url: string;
    name: string;
  } | null>(null);

  // Split clips inputs
  const [splitTimestamps, setSplitTimestamps] = useState('5.0, 10.0');
  const [splitResult, setSplitResult] = useState<{
    result: SplitClipsResult;
    clipUrls: { name: string; url: string; size: number }[];
    zipUrl?: string;
  } | null>(null);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const clearResults = () => {
    if (removeResult) URL.revokeObjectURL(removeResult.url);
    if (splitResult) {
      splitResult.clipUrls.forEach((c) => URL.revokeObjectURL(c.url));
      if (splitResult.zipUrl) URL.revokeObjectURL(splitResult.zipUrl);
    }
    setRemoveResult(null);
    setSplitResult(null);
  };

  const onChoose = async (file: File | undefined) => {
    if (!file) return;
    clearResults();
    setError('');
    setLoaded(null);

    if (file.size > MAX_BYTES) {
      setError(
        `That file is ${formatBytes(file.size)}. This page works on files up to ${formatBytes(MAX_BYTES)}, processed entirely in your browser without uploading.`,
      );
      return;
    }

    setBusy('Reading video…');
    try {
      const source = sourceFromFile(file);
      const movie = await readMp4(source);
      const video = movie.tracks.find((t) => t.kind === 'video');

      setLoaded({
        name: file.name,
        size: file.size,
        source,
        movie,
        duration: movie.durationSeconds,
        keyframes: video ? keyframeSeconds(video) : [],
      });

      if (movie.durationSeconds > 6) {
        setCutStart('2.0');
        setCutEnd('5.0');
        setSplitTimestamps(`${(movie.durationSeconds / 2).toFixed(1)}`);
      }
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

  const onRunRemove = async () => {
    if (!loaded) return;
    clearResults();
    setError('');

    const startNum = parseFloat(cutStart);
    const endNum = parseFloat(cutEnd);

    if (isNaN(startNum) || isNaN(endNum)) {
      setError('Cut start and end times must be valid numbers.');
      return;
    }

    setBusy('Cutting section…');
    const started = performance.now();

    try {
      const res = await removeSection(
        loaded.source,
        loaded.movie,
        startNum,
        endNum,
      );
      const durationMs = performance.now() - started;

      const base = loaded.name.replace(/\.[^.]+$/u, '');
      const outName = `${base}-cut-${startNum.toFixed(1)}s-${endNum.toFixed(1)}s.mp4`;
      const url = URL.createObjectURL(res.blob);

      setRemoveResult({ result: res, url, name: outName });

      announceCompletion({
        operation: 'Video split / remove section',
        durationMs,
        summary: `Removed middle section from ${loaded.name}.`,
        metrics: [
          { label: 'Cut range', value: `${startNum}s – ${endNum}s` },
          { label: 'Final size', value: formatBytes(res.size) },
          { label: 'Re-encoded', value: 'No' },
        ],
      });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Failed to cut video.',
      );
    } finally {
      setBusy('');
    }
  };

  const onRunSplit = async () => {
    if (!loaded) return;
    clearResults();
    setError('');

    const points = splitTimestamps
      .split(',')
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !isNaN(n));

    if (points.length === 0) {
      setError(
        'Provide at least one split timestamp in seconds (e.g. "10, 20").',
      );
      return;
    }

    setBusy('Splitting into clips…');
    const started = performance.now();

    try {
      const base = loaded.name.replace(/\.[^.]+$/u, '');
      const res = await splitIntoClips(
        loaded.source,
        loaded.movie,
        points,
        base,
      );
      const durationMs = performance.now() - started;

      const clipUrls = res.clips.map((c: ClipResult) => ({
        name: c.name,
        url: URL.createObjectURL(c.blob),
        size: c.size,
      }));

      const zipUrl = res.zipBlob ? URL.createObjectURL(res.zipBlob) : undefined;

      setSplitResult({ result: res, clipUrls, zipUrl });

      announceCompletion({
        operation: 'Video split into clips',
        durationMs,
        summary: `Split ${loaded.name} into ${res.clips.length} clips.`,
        metrics: [
          { label: 'Clips', value: String(res.clips.length) },
          { label: 'Total size', value: formatBytes(res.totalSize) },
          { label: 'Re-encoded', value: 'No' },
        ],
      });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Failed to split video.',
      );
    } finally {
      setBusy('');
    }
  };

  return (
    <AppShell currentToolId="video-split">
      <section
        id="tool"
        tabIndex={-1}
        className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-12"
      >
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex flex-col justify-between gap-5 border-b pb-8 sm:flex-row sm:items-start">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span>Video</span>
                <span aria-hidden="true">/</span>
                <span>Split</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Split video into clips or cut out unwanted sections
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                Cut out a middle section or split into multiple downloadable
                clips without re-encoding. Lossless keyframe splicing up to 4
                GB.
              </p>
            </div>
            <span className="flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold">
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              Runs in this tab
            </span>
          </div>

          <VideoSuiteNav currentPath="/video/split" />

          <section
            aria-label="File upload"
            className="rounded-xl border border-border/80 bg-card p-6 shadow-sm"
          >
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50">
              <FileVideo className="h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-lg font-semibold mb-1">
                Select an MP4 or MOV video
              </h2>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                Select a video file to cut or split into clips.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".mp4,.mov,video/mp4,video/quicktime"
                className="hidden"
                onChange={(e) => onChoose(e.target.files?.[0])}
              />
              <Button
                variant="default"
                onClick={() => fileRef.current?.click()}
                disabled={!!busy}
              >
                Choose Video File
              </Button>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <LockKeyhole className="h-3.5 w-3.5" />
                <span>Runs 100% locally in your browser. Never uploaded.</span>
              </div>
            </div>
          </section>

          {error && (
            <div
              ref={errorRef}
              tabIndex={-1}
              role="alert"
              className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive focus:outline-none"
            >
              <div className="font-semibold mb-1">Error:</div>
              <div>{error}</div>
            </div>
          )}

          {busy && (
            <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground animate-pulse">
              {busy}
            </div>
          )}

          {loaded && !busy && (
            <section
              aria-label="Split options"
              className="rounded-xl border border-border/80 bg-card p-6 shadow-sm space-y-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
                <div>
                  <div className="font-semibold text-base">{loaded.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {formatBytes(loaded.size)} · Duration:{' '}
                    {formatClock(loaded.duration)} ({loaded.duration.toFixed(2)}
                    s)
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setLoaded(null);
                    clearResults();
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Change file
                </Button>
              </div>

              <div className="space-y-4">
                <div className="flex gap-4 border-b border-border/60 pb-3">
                  <button
                    type="button"
                    onClick={() => setMode('remove')}
                    className={`flex items-center gap-2 pb-1 text-sm font-medium border-b-2 transition-colors ${
                      mode === 'remove'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Scissors className="h-4 w-4" />
                    Cut Out Middle Section
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('split')}
                    className={`flex items-center gap-2 pb-1 text-sm font-medium border-b-2 transition-colors ${
                      mode === 'split'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Split className="h-4 w-4" />
                    Split into Multiple Clips
                  </button>
                </div>

                {mode === 'remove' ? (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                      Removes the section between Cut Start and Cut End,
                      seamlessly joining the beginning and end portions into a
                      single video file.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="cut-start-input"
                          className="block text-xs font-medium mb-1"
                        >
                          Cut Starts At (seconds)
                        </label>
                        <input
                          id="cut-start-input"
                          type="number"
                          step="0.1"
                          min="0"
                          max={loaded.duration}
                          value={cutStart}
                          onChange={(e) => setCutStart(e.target.value)}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="cut-end-input"
                          className="block text-xs font-medium mb-1"
                        >
                          Cut Ends At (Resume Video At)
                        </label>
                        <input
                          id="cut-end-input"
                          type="number"
                          step="0.1"
                          min="0"
                          max={loaded.duration}
                          value={cutEnd}
                          onChange={(e) => setCutEnd(e.target.value)}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div className="rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground space-y-1">
                      <div className="font-medium text-foreground">
                        Keyframe-Accurate Splicing:
                      </div>
                      <p>
                        Because frames are copied without re-encoding, the
                        second half must resume on an I-frame (keyframe). If
                        your chosen end time is between keyframes, the cut
                        cleanly snaps to the keyframe before it.
                      </p>
                    </div>

                    <Button size="lg" onClick={onRunRemove}>
                      <Scissors className="h-4 w-4 mr-2" />
                      Cut Out Section & Join
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                      Splits the video at the given timestamps into separate
                      clips. For example, entering &quot;10, 25&quot; produces 3
                      clips: [0..10s], [10..25s], and [25s..end].
                    </p>
                    <div>
                      <label
                        htmlFor="split-timestamps-input"
                        className="block text-xs font-medium mb-1"
                      >
                        Split Timestamps (comma-separated seconds)
                      </label>
                      <input
                        id="split-timestamps-input"
                        type="text"
                        value={splitTimestamps}
                        onChange={(e) => setSplitTimestamps(e.target.value)}
                        placeholder="e.g. 5, 12.5, 30"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>

                    <Button size="lg" onClick={onRunSplit}>
                      <Split className="h-4 w-4 mr-2" />
                      Split Into Clips
                    </Button>
                  </div>
                )}
              </div>
            </section>
          )}

          {removeResult && (
            <section
              aria-label="Download cut video"
              className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-base text-foreground">
                    Middle section removed (
                    {removeResult.result.durationSeconds.toFixed(1)}s total)
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Cut from{' '}
                    {formatClock(removeResult.result.requestedCutStart)} to{' '}
                    {formatClock(removeResult.result.actualResumeSeconds)}.
                    {removeResult.result.movedBackBySeconds > 0.05 && (
                      <span className="block mt-1 text-xs text-muted-foreground italic">
                        Note: Resumed{' '}
                        {removeResult.result.movedBackBySeconds.toFixed(2)}s
                        earlier at nearest keyframe (
                        {formatClock(removeResult.result.actualResumeSeconds)})
                        to avoid visual smear.
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href={removeResult.url}
                  download={removeResult.name}
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
                >
                  <ArrowDownToLine className="h-4 w-4 mr-2" />
                  Download Cut Video ({formatBytes(removeResult.result.size)})
                </a>
              </div>
            </section>
          )}

          {splitResult && (
            <section
              aria-label="Download clips"
              className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-base text-foreground">
                      Split into {splitResult.clipUrls.length} clips
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Each clip was extracted losslessly at keyframe boundaries.
                    </p>
                  </div>
                </div>

                {splitResult.zipUrl && (
                  <a
                    href={splitResult.zipUrl}
                    download={`${loaded?.name.replace(/\.[^.]+$/u, '')}-clips.zip`}
                    data-receipt-download
                    className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90"
                  >
                    <Archive className="h-3.5 w-3.5 mr-1.5" />
                    Download All (ZIP)
                  </a>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {splitResult.clipUrls.map((clip, idx) => (
                  <div
                    key={clip.name}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                  >
                    <div className="overflow-hidden pr-2">
                      <div className="text-sm font-medium truncate">
                        {clip.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Part {idx + 1} · {formatBytes(clip.size)}
                      </div>
                    </div>
                    <a
                      href={clip.url}
                      download={clip.name}
                      data-receipt-download
                      className="inline-flex items-center justify-center rounded border border-input bg-background p-2 text-xs font-medium hover:bg-accent text-foreground"
                      title={`Download ${clip.name}`}
                    >
                      <ArrowDownToLine className="h-4 w-4" />
                    </a>
                  </div>
                ))}
              </div>
            </section>
          )}

          <VideoRelatedLinks currentPath="/video/split" />
        </div>
      </section>
    </AppShell>
  );
}
