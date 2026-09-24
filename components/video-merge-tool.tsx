'use client';

import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  CheckCircle2,
  FileVideo,
  Layers,
  LockKeyhole,
  Plus,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import {
  mergeVideos,
  type MergeInput,
  type MergeResult,
} from '@/lib/tools/video/merge';
import { readMp4, type Mp4File } from '@/lib/tools/video/mp4';
import { sourceFromFile, type ByteSource } from '@/lib/tools/video/source';
import { VideoSuiteNav, VideoRelatedLinks } from '@/components/video-suite-nav';

const MAX_BYTES = 4 * 1024 * 1024 * 1024;

interface ClipItem {
  id: string;
  name: string;
  size: number;
  source: ByteSource;
  movie: Mp4File;
  duration: number;
  width?: number;
  height?: number;
  codec?: string;
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

export function VideoMergeTool() {
  const fileRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const [clips, setClips] = useState<ClipItem[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [result, setResult] = useState<{
    merge: MergeResult;
    url: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const clearResult = () => {
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
  };

  const onAddFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    clearResult();
    setError('');
    setBusy('Analyzing clips…');

    const newClips: ClipItem[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > MAX_BYTES) {
          setError(`File "${file.name}" exceeds the 4 GB browser limit.`);
          return;
        }

        const source = sourceFromFile(file);
        const movie = await readMp4(source);
        const video = movie.tracks.find((t) => t.kind === 'video');

        newClips.push({
          id: `${file.name}-${Date.now()}-${i}`,
          name: file.name,
          size: file.size,
          source,
          movie,
          duration: movie.durationSeconds,
          width: video?.width ?? undefined,
          height: video?.height ?? undefined,
          codec: video?.codec,
        });
      }

      setClips((prev) => [...prev, ...newClips]);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not read one or more video files.',
      );
    } finally {
      setBusy('');
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeClip = (index: number) => {
    clearResult();
    setClips((prev) => prev.filter((_, i) => i !== index));
  };

  const moveClip = (index: number, direction: 'up' | 'down') => {
    clearResult();
    setClips((prev) => {
      const copy = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[target];
      copy[target] = temp;
      return copy;
    });
  };

  const onMerge = async () => {
    if (clips.length < 2) {
      setError('Please add at least two video clips to merge.');
      return;
    }

    clearResult();
    setError('');
    setBusy('Joining video streams…');
    const started = performance.now();

    try {
      const inputs: MergeInput[] = clips.map((c) => ({
        source: c.source,
        movie: c.movie,
        name: c.name,
      }));

      const merged = await mergeVideos(inputs);
      const durationMs = performance.now() - started;

      const baseName = clips[0].name.replace(/\.[^.]+$/u, '');
      const outName = `${baseName}-merged.mp4`;
      const url = URL.createObjectURL(merged.blob);

      setResult({ merge: merged, url, name: outName });

      announceCompletion({
        operation: 'Video merge',
        durationMs,
        summary: `Merged ${clips.length} clips into ${outName}.`,
        metrics: [
          { label: 'Clips', value: String(clips.length) },
          {
            label: 'Total duration',
            value: `${merged.durationSeconds.toFixed(1)}s`,
          },
          { label: 'Re-encoded', value: 'No' },
        ],
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Failed to merge video clips.',
      );
    } finally {
      setBusy('');
    }
  };

  const totalDuration = clips.reduce((acc, c) => acc + c.duration, 0);

  return (
    <AppShell currentToolId="video-merge">
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
                <span>Merge</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Merge MP4 or MOV video clips without re-encoding
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                Lossless clip concatenation up to 4 GB. Joins videos with
                matching codecs, dimensions, and sample descriptions instantly
                without quality loss.
              </p>
            </div>
            <span className="flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold">
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              Runs in this tab
            </span>
          </div>

          <VideoSuiteNav currentPath="/video/merge" />

          <section
            aria-label="Upload files"
            className="rounded-xl border border-border/80 bg-card p-6 shadow-sm"
          >
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50">
              <FileVideo className="h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-lg font-semibold mb-1">
                Select video clips to join
              </h2>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                Lossless container concatenation. Joins matching clips
                end-to-end in milliseconds with zero quality loss and no
                watermark.
              </p>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept=".mp4,.mov,video/mp4,video/quicktime"
                className="hidden"
                onChange={(e) => onAddFiles(e.target.files)}
              />
              <Button
                variant="default"
                onClick={() => fileRef.current?.click()}
                disabled={!!busy}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Video Clips
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
              <div className="font-semibold mb-1">
                Cannot merge without re-encoding:
              </div>
              <div>{error}</div>
            </div>
          )}

          {busy && (
            <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground animate-pulse">
              {busy}
            </div>
          )}

          {clips.length > 0 && !busy && (
            <section
              aria-label="Clips list"
              className="rounded-xl border border-border/80 bg-card p-6 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div>
                  <h3 className="font-semibold text-base">
                    Clips to Join ({clips.length})
                  </h3>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Total Duration: {formatClock(totalDuration)} (
                    {totalDuration.toFixed(1)}s)
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add More Clips
                </Button>
              </div>

              <div className="space-y-2">
                {clips.map((clip, index) => (
                  <div
                    key={clip.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-background"
                  >
                    <div className="flex items-center gap-3 overflow-hidden pr-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                        {index + 1}
                      </span>
                      <div className="overflow-hidden">
                        <div className="text-sm font-medium truncate">
                          {clip.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {clip.width}×{clip.height} · {clip.codec ?? 'avc1'} ·{' '}
                          {formatClock(clip.duration)} ·{' '}
                          {formatBytes(clip.size)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={index === 0}
                        onClick={() => moveClip(index, 'up')}
                        title="Move up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={index === clips.length - 1}
                        onClick={() => moveClip(index, 'down')}
                        title="Move down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeClip(index)}
                        className="text-destructive hover:text-destructive"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground space-y-1">
                <div className="font-medium text-foreground">
                  Lossless Join Compatibility Rules:
                </div>
                <p>
                  To join clips without re-encoding, all clips must have the
                  same video resolution, codec, and timescale. Joining takes
                  seconds because the raw video frames are copied directly into
                  the new timeline.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  size="lg"
                  onClick={onMerge}
                  disabled={clips.length < 2}
                  className="w-full sm:w-auto"
                >
                  <Layers className="h-4 w-4 mr-2" />
                  Merge {clips.length} Clips
                </Button>
              </div>
            </section>
          )}

          {result && (
            <section
              aria-label="Download merged file"
              className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-base text-foreground">
                    Merged {result.merge.clipCount} clips (
                    {result.merge.durationSeconds.toFixed(1)}s total)
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Concatenated{' '}
                    {result.merge.totalVideoFrames.toLocaleString()} video
                    frames without re-encoding.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href={result.url}
                  download={result.name}
                  data-receipt-download
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
                >
                  <ArrowDownToLine className="h-4 w-4 mr-2" />
                  Download Merged Video ({formatBytes(result.merge.size)})
                </a>
              </div>
            </section>
          )}

          <VideoRelatedLinks currentPath="/video/merge" />
        </div>
      </section>
    </AppShell>
  );
}
