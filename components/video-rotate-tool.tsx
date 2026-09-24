'use client';

import {
  ArrowDownToLine,
  CheckCircle2,
  FileVideo,
  FlipHorizontal,
  FlipVertical,
  LockKeyhole,
  RotateCcw,
  RotateCw,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import { rotateVideo, type RotationAngle } from '@/lib/tools/video/matrix';
import { readMp4, type Mp4File } from '@/lib/tools/video/mp4';
import { sourceFromFile, type ByteSource } from '@/lib/tools/video/source';
import { VideoSuiteNav, VideoRelatedLinks } from '@/components/video-suite-nav';

const MAX_BYTES = 4 * 1024 * 1024 * 1024;

interface Loaded {
  name: string;
  size: number;
  source: ByteSource;
  movie: Mp4File;
  width?: number;
  height?: number;
}

interface Saved {
  name: string;
  url: string;
  size: number;
  headline: string;
  detail: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function VideoRotateTool() {
  const fileRef = useRef<HTMLInputElement>(null);
  const savedRef = useRef<Saved | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [angle, setAngle] = useState<RotationAngle>(90);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

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

  const onChoose = async (file: File | undefined) => {
    if (!file) return;
    clearSaved();
    setError('');
    setLoaded(null);

    if (file.size > MAX_BYTES) {
      setError(
        `That file is ${formatBytes(file.size)}. This page works on files up to ${formatBytes(MAX_BYTES)}, processed entirely in your browser without uploading.`,
      );
      return;
    }

    setBusy('Reading video header…');
    try {
      const source = sourceFromFile(file);
      const movie = await readMp4(source);
      const video = movie.tracks.find((t) => t.kind === 'video');

      setLoaded({
        name: file.name,
        size: file.size,
        source,
        movie,
        width: video?.width ?? undefined,
        height: video?.height ?? undefined,
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

  const onRotate = async () => {
    if (!loaded) return;
    clearSaved();
    setError('');
    setBusy('Applying rotation matrix…');
    const started = performance.now();

    try {
      const result = await rotateVideo(loaded.source, loaded.movie, {
        angle,
        flipH,
        flipV,
      });
      const durationMs = performance.now() - started;

      const base = loaded.name.replace(/\.[^.]+$/u, '');
      const transformLabels: string[] = [];
      if (angle !== 0) transformLabels.push(`rot${angle}`);
      if (flipH) transformLabels.push('fliph');
      if (flipV) transformLabels.push('flipv');
      const suffix =
        transformLabels.length > 0
          ? `-${transformLabels.join('-')}`
          : '-rotated';
      const outName = `${base}${suffix}.mp4`;
      const url = URL.createObjectURL(result.blob);

      const next: Saved = {
        name: outName,
        url,
        size: result.size,
        headline: `Rotated in ${durationMs < 1000 ? `${durationMs.toFixed(0)} ms` : `${(durationMs / 1000).toFixed(2)} s`}`,
        detail: `The video's 3×3 display matrix was rewritten in the container header. Not a single pixel was decoded or re-encoded, meaning 100% original visual fidelity is preserved.`,
      };
      savedRef.current = next;
      setSaved(next);

      announceCompletion({
        operation: 'Video rotator',
        durationMs,
        summary: `Rotated ${loaded.name} by ${angle}°.`,
        metrics: [
          { label: 'Angle', value: `${angle}°` },
          { label: 'Size', value: formatBytes(result.size) },
          { label: 'Re-encoded', value: 'No' },
        ],
      });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Failed to rotate video.',
      );
    } finally {
      setBusy('');
    }
  };

  return (
    <AppShell currentToolId="video-rotate">
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
                <span>Rotate</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Rotate MP4 or MOV video without re-encoding
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                Instant lossless rotation (90°, 180°, 270°, flip). Rewrites nine
                numbers in the header without re-encoding or quality loss.
              </p>
            </div>
            <span className="flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold">
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              Runs in this tab
            </span>
          </div>

          <VideoSuiteNav currentPath="/video/rotate" />

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
                Select a video file to rotate orientation.
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
              aria-label="Rotation options"
              className="rounded-xl border border-border/80 bg-card p-6 shadow-sm space-y-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
                <div>
                  <div className="font-semibold text-base">{loaded.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {formatBytes(loaded.size)} · Resolution:{' '}
                    {loaded.width ?? '?'}×{loaded.height ?? '?'} · Duration:{' '}
                    {loaded.movie.durationSeconds.toFixed(1)}s
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setLoaded(null);
                    clearSaved();
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Change file
                </Button>
              </div>

              <div className="space-y-4">
                <div className="text-sm font-medium">Rotation Angle</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {
                      deg: 90 as RotationAngle,
                      label: '90° Clockwise',
                      icon: RotateCw,
                    },
                    {
                      deg: 180 as RotationAngle,
                      label: '180° Upside Down',
                      icon: RotateCw,
                    },
                    {
                      deg: 270 as RotationAngle,
                      label: '270° (90° CCW)',
                      icon: RotateCcw,
                    },
                    {
                      deg: 0 as RotationAngle,
                      label: '0° Original',
                      icon: FileVideo,
                    },
                  ].map((item) => (
                    <button
                      key={item.deg}
                      type="button"
                      onClick={() => setAngle(item.deg)}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all ${
                        angle === item.deg
                          ? 'border-primary bg-primary/10 font-semibold text-foreground'
                          : 'border-border bg-card hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <item.icon className="h-5 w-5 mb-1 text-primary" />
                      <span className="text-xs">{item.label}</span>
                    </button>
                  ))}
                </div>

                <div className="text-sm font-medium pt-2">Flip Mirrors</div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={flipH}
                      onChange={(e) => setFlipH(e.target.checked)}
                      className="rounded border-border"
                    />
                    <FlipHorizontal className="h-4 w-4 text-muted-foreground" />
                    <span>Flip Horizontal (Mirror)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={flipV}
                      onChange={(e) => setFlipV(e.target.checked)}
                      className="rounded border-border"
                    />
                    <FlipVertical className="h-4 w-4 text-muted-foreground" />
                    <span>Flip Vertical</span>
                  </label>
                </div>

                <div className="rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground space-y-1">
                  <div className="font-medium text-foreground">
                    Lossless Matrix Rotation Guarantee:
                  </div>
                  <p>
                    This tool modifies the 3×3 transformation matrix inside the
                    MP4 <code className="text-foreground">tkhd</code> box. The
                    video streams themselves remain completely untouched, so the
                    export finishes in milliseconds regardless of file size.
                  </p>
                  <p>
                    <strong>Compatibility note:</strong> All modern operating
                    systems (iOS, macOS, Android, Windows 11) and media players
                    (VLC, QuickTime, Chrome, Safari) render the matrix
                    orientation correctly. A few legacy desktop players ignore
                    matrix rotation and show the sensor default orientation.
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    size="lg"
                    onClick={onRotate}
                    className="w-full sm:w-auto"
                  >
                    <RotateCw className="h-4 w-4 mr-2" />
                    Apply Rotation & Export
                  </Button>
                </div>
              </div>
            </section>
          )}

          {saved && (
            <section
              aria-label="Download rotated file"
              className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-base text-foreground">
                    {saved.headline}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {saved.detail}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href={saved.url}
                  download={saved.name}
                  data-receipt-download
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <ArrowDownToLine className="h-4 w-4 mr-2" />
                  Download {saved.name} ({formatBytes(saved.size)})
                </a>
              </div>
            </section>
          )}

          <VideoRelatedLinks currentPath="/video/rotate" />
        </div>
      </section>
    </AppShell>
  );
}
