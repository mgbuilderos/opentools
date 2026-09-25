'use client';

import {
  ArrowDownToLine,
  CheckCircle2,
  Crop,
  FileVideo,
  LockKeyhole,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import {
  assertSupportedVideoCodec,
  cropVideo,
  type CropOptions,
  type EncodeResult,
} from '@/lib/tools/video/encode';
import { readMp4, type Mp4File, type Mp4Track } from '@/lib/tools/video/mp4';
import { sourceFromFile, type ByteSource } from '@/lib/tools/video/source';
import { VideoSuiteNav, VideoRelatedLinks } from '@/components/video-suite-nav';

const MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB ceiling for browser file input handling

type AspectPreset = '1:1' | '9:16' | '4:5' | '16:9' | 'free';

interface Loaded {
  name: string;
  size: number;
  source: ByteSource;
  movie: Mp4File;
  videoTrack: Mp4Track;
  audioTrack: Mp4Track | null;
}

interface Saved {
  name: string;
  url: string;
  size: number;
  width: number;
  height: number;
  durationMs: number;
  headline: string;
  detail: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function VideoCropTool() {
  const fileRef = useRef<HTMLInputElement>(null);
  const savedRef = useRef<Saved | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [progress, setProgress] = useState(0);

  const [preset, setPreset] = useState<AspectPreset>('1:1');
  const [cropX, setCropX] = useState<number>(0);
  const [cropY, setCropY] = useState<number>(0);
  const [cropW, setCropW] = useState<number>(0);
  const [cropH, setCropH] = useState<number>(0);

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

  const applyPreset = (chosen: AspectPreset, srcW: number, srcH: number) => {
    setPreset(chosen);
    let targetRatio = 1;
    if (chosen === '1:1') targetRatio = 1;
    else if (chosen === '9:16') targetRatio = 9 / 16;
    else if (chosen === '4:5') targetRatio = 4 / 5;
    else if (chosen === '16:9') targetRatio = 16 / 9;
    else if (chosen === 'free') {
      setCropX(0);
      setCropY(0);
      setCropW(srcW);
      setCropH(srcH);
      return;
    }

    const srcRatio = srcW / srcH;
    let w = srcW;
    let h = srcH;

    if (srcRatio > targetRatio) {
      // Source is wider than target: clamp height, reduce width
      h = srcH;
      w = Math.round(h * targetRatio);
    } else {
      // Source is taller than target: clamp width, reduce height
      w = srcW;
      h = Math.round(w / targetRatio);
    }

    // Snap to even dimensions
    w = Math.max(2, Math.round(w / 2) * 2);
    h = Math.max(2, Math.round(h / 2) * 2);

    const x = Math.max(0, Math.round((srcW - w) / 2));
    const y = Math.max(0, Math.round((srcH - h) / 2));

    setCropX(x);
    setCropY(y);
    setCropW(w);
    setCropH(h);
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

    setBusy('Inspecting video dimensions…');
    try {
      const source = sourceFromFile(file);
      const movie = await readMp4(source);
      const videoTrack = movie.tracks.find((t) => t.kind === 'video');
      if (!videoTrack || !videoTrack.width || !videoTrack.height) {
        throw new Error(
          'This video file does not contain a valid picture size.',
        );
      }

      assertSupportedVideoCodec(videoTrack);

      const audioTrack = movie.tracks.find((t) => t.kind === 'audio') ?? null;
      setLoaded({
        name: file.name,
        size: file.size,
        source,
        movie,
        videoTrack,
        audioTrack,
      });

      applyPreset('1:1', videoTrack.width, videoTrack.height);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not read video file.',
      );
    } finally {
      setBusy('');
    }
  };

  const onRun = async () => {
    if (!loaded) return;
    clearSaved();
    setError('');
    setProgress(0);
    setBusy('Cropping video with WebCodecs hardware acceleration…');

    try {
      const cropOpts: CropOptions = {
        x: cropX,
        y: cropY,
        width: cropW,
        height: cropH,
        preset,
      };

      const result: EncodeResult = await cropVideo(
        loaded.source,
        cropOpts,
        (pct) => setProgress(pct),
      );

      const base = loaded.name.replace(/\.[^.]+$/, '');
      const url = URL.createObjectURL(result.blob);
      const savedBytes = result.size;

      const nextSaved: Saved = {
        name: `${base}-cropped.mp4`,
        url,
        size: savedBytes,
        width: result.width,
        height: result.height,
        durationMs: result.durationMs,
        headline: `Cropped to ${result.width}×${result.height} (${formatBytes(savedBytes)})`,
        detail: `Hardware-encoded in ${(result.durationMs / 1000).toFixed(1)}s using your browser GPU. Audio was passed through untouched with zero sync drift.`,
      };

      setSaved(nextSaved);
      announceCompletion({
        operation: 'Video Crop',
        durationMs: result.durationMs,
        summary: `Cropped ${loaded.name} to ${result.width}×${result.height}.`,
        metrics: [
          {
            label: 'Original',
            value: `${loaded.videoTrack.width}×${loaded.videoTrack.height}`,
          },
          { label: 'Cropped', value: `${result.width}×${result.height}` },
          { label: 'Size', value: formatBytes(savedBytes) },
          { label: 'Watermark', value: 'None' },
        ],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Video cropping failed.');
    } finally {
      setBusy('');
      setProgress(0);
    }
  };

  return (
    <AppShell currentToolId="video-crop">
      <section
        id="tool"
        tabIndex={-1}
        className="mx-auto max-w-4xl px-4 py-8 focus:outline-none sm:px-6"
      >
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Crop Video Online
              </h1>
              <p className="mt-2 text-base text-muted-foreground">
                Trim video canvas aspect ratios (1:1, 9:16, 4:5, 16:9) in your
                browser without uploading. No watermark.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
              <LockKeyhole className="h-3.5 w-3.5 text-muted-foreground" />
              <span>100% Client-Side</span>
            </div>
          </div>

          <VideoSuiteNav currentPath="/video/crop" />

          {error && (
            <div
              ref={errorRef}
              tabIndex={-1}
              role="alert"
              className="mt-6 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive focus:outline-none"
            >
              <div className="flex-1 font-medium">{error}</div>
              <button
                type="button"
                onClick={() => setError('')}
                className="text-destructive/70 hover:text-destructive"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Dismiss</span>
              </button>
            </div>
          )}

          {!loaded && (
            <div className="mt-6">
              <input
                ref={fileRef}
                type="file"
                accept="video/mp4,video/quicktime"
                className="sr-only"
                onChange={(e) => onChoose(e.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/20 p-12 text-center transition hover:border-primary/50 hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <div className="rounded-full bg-primary/10 p-4 text-primary">
                  <FileVideo className="h-8 w-8" />
                </div>
                <span className="mt-4 text-base font-semibold text-foreground">
                  Select video to crop
                </span>
                <span className="mt-1 text-sm text-muted-foreground">
                  Supports MP4 and MOV files up to 2 GB
                </span>
              </button>
            </div>
          )}

          {loaded && (
            <div className="mt-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-3">
                  <FileVideo className="h-6 w-6 text-primary" />
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {loaded.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Original: {loaded.videoTrack.width}×
                      {loaded.videoTrack.height} · {loaded.videoTrack.codec} ·{' '}
                      {formatBytes(loaded.size)}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setLoaded(null);
                    clearSaved();
                  }}
                >
                  Change file
                </Button>
              </div>

              {/* Aspect Ratio Preset Picker */}
              <div className="rounded-lg border border-border p-5 space-y-4">
                <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Crop className="h-4 w-4 text-primary" />
                  Aspect Ratio Presets
                </span>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <button
                    type="button"
                    onClick={() =>
                      applyPreset(
                        '1:1',
                        loaded.videoTrack.width!,
                        loaded.videoTrack.height!,
                      )
                    }
                    className={`rounded-lg border p-3 text-center transition ${
                      preset === '1:1'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:bg-muted/40'
                    }`}
                  >
                    <div className="text-sm font-bold text-foreground">
                      1:1 Square
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Instagram / Feed
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      applyPreset(
                        '9:16',
                        loaded.videoTrack.width!,
                        loaded.videoTrack.height!,
                      )
                    }
                    className={`rounded-lg border p-3 text-center transition ${
                      preset === '9:16'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:bg-muted/40'
                    }`}
                  >
                    <div className="text-sm font-bold text-foreground">
                      9:16 Vertical
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Reels / TikTok
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      applyPreset(
                        '4:5',
                        loaded.videoTrack.width!,
                        loaded.videoTrack.height!,
                      )
                    }
                    className={`rounded-lg border p-3 text-center transition ${
                      preset === '4:5'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:bg-muted/40'
                    }`}
                  >
                    <div className="text-sm font-bold text-foreground">
                      4:5 Portrait
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Social Portrait
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      applyPreset(
                        '16:9',
                        loaded.videoTrack.width!,
                        loaded.videoTrack.height!,
                      )
                    }
                    className={`rounded-lg border p-3 text-center transition ${
                      preset === '16:9'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:bg-muted/40'
                    }`}
                  >
                    <div className="text-sm font-bold text-foreground">
                      16:9 Widescreen
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      YouTube / Desktop
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      applyPreset(
                        'free',
                        loaded.videoTrack.width!,
                        loaded.videoTrack.height!,
                      )
                    }
                    className={`rounded-lg border p-3 text-center transition ${
                      preset === 'free'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:bg-muted/40'
                    }`}
                  >
                    <div className="text-sm font-bold text-foreground">
                      Custom / Free
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Full Canvas
                    </div>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 pt-2">
                  <div>
                    <label
                      htmlFor="crop-w"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Width (px)
                    </label>
                    <input
                      id="crop-w"
                      type="number"
                      min="2"
                      max={loaded.videoTrack.width ?? undefined}
                      value={cropW}
                      onChange={(e) =>
                        setCropW(
                          Math.max(
                            2,
                            Math.round(Number(e.target.value) / 2) * 2,
                          ),
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="crop-h"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Height (px)
                    </label>
                    <input
                      id="crop-h"
                      type="number"
                      min="2"
                      max={loaded.videoTrack.height ?? undefined}
                      value={cropH}
                      onChange={(e) =>
                        setCropH(
                          Math.max(
                            2,
                            Math.round(Number(e.target.value) / 2) * 2,
                          ),
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="crop-x"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Left Offset (X)
                    </label>
                    <input
                      id="crop-x"
                      type="number"
                      min="0"
                      max={
                        loaded.videoTrack.width
                          ? loaded.videoTrack.width - 2
                          : undefined
                      }
                      value={cropX}
                      onChange={(e) =>
                        setCropX(Math.max(0, Number(e.target.value)))
                      }
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="crop-y"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Top Offset (Y)
                    </label>
                    <input
                      id="crop-y"
                      type="number"
                      min="0"
                      max={
                        loaded.videoTrack.height
                          ? loaded.videoTrack.height - 2
                          : undefined
                      }
                      value={cropY}
                      onChange={(e) =>
                        setCropY(Math.max(0, Number(e.target.value)))
                      }
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Crop window:{' '}
                  <span className="font-semibold text-foreground">
                    {cropW}×{cropH}
                  </span>{' '}
                  positioned at ({cropX}, {cropY}).
                </div>
              </div>

              {/* Mandatory Re-Encoding Honesty Disclosure (Above Button) */}
              <div className="rounded-lg border border-border bg-muted/40 p-3.5 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">
                  Re-encoding disclosure:
                </span>{' '}
                This tool re-encodes video frames using your browser&apos;s
                hardware-accelerated H.264 encoder. Some compression loss
                occurs. Audio is copied without re-encoding. No watermark is
                ever added.
              </div>

              {/* Action Button */}
              <div>
                <Button
                  size="lg"
                  className="w-full sm:w-auto"
                  disabled={Boolean(busy)}
                  onClick={onRun}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {busy
                    ? `${busy} ${progress > 0 ? `(${progress}%)` : ''}`
                    : 'Crop Video'}
                </Button>
              </div>

              {/* Result Receipt Card */}
              {saved && (
                <div
                  data-receipt="true"
                  className="rounded-xl border border-border bg-card p-5 space-y-3"
                >
                  <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{saved.headline}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {saved.detail}
                  </p>
                  <div>
                    <a
                      href={saved.url}
                      download={saved.name}
                      data-receipt-download="true"
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    >
                      <ArrowDownToLine className="h-4 w-4" />
                      Save {saved.name} ({formatBytes(saved.size)})
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 border-t border-border pt-6">
            <VideoRelatedLinks currentPath="/video/crop" />
          </div>
        </div>
      </section>
    </AppShell>
  );
}
