'use client';

import {
  ArrowDownToLine,
  CheckCircle2,
  FileVideo,
  LockKeyhole,
  Maximize2,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import {
  assertSupportedVideoCodec,
  resizeVideo,
  type EncodeResult,
  type ResizeOptions,
} from '@/lib/tools/video/encode';
import { readMp4, type Mp4File, type Mp4Track } from '@/lib/tools/video/mp4';
import { sourceFromFile, type ByteSource } from '@/lib/tools/video/source';
import { VideoSuiteNav, VideoRelatedLinks } from '@/components/video-suite-nav';

const MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB ceiling for browser file input handling

interface Loaded {
  name: string;
  size: number;
  source: ByteSource;
  movie: Mp4File;
  videoTrack: Mp4Track;
  audioTrack: Mp4Track | null;
  aspect: number;
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

export function VideoResizeTool() {
  const fileRef = useRef<HTMLInputElement>(null);
  const savedRef = useRef<Saved | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [progress, setProgress] = useState(0);

  const [preset, setPreset] = useState<
    '4k' | '1080p' | '720p' | '480p' | 'half'
  >('720p');

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
      const aspect = videoTrack.width / videoTrack.height;

      setLoaded({
        name: file.name,
        size: file.size,
        source,
        movie,
        videoTrack,
        audioTrack,
        aspect,
      });

      // Default preset to something smaller than the source
      if (videoTrack.height > 1080) {
        setPreset('1080p');
      } else if (videoTrack.height > 720) {
        setPreset('720p');
      } else {
        setPreset('480p');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not read video file.',
      );
    } finally {
      setBusy('');
    }
  };

  const getComputedDimensions = () => {
    if (!loaded) return { width: 0, height: 0 };
    const srcH = loaded.videoTrack.height!;
    const aspect = loaded.aspect;

    let targetH = 720;
    if (preset === '4k') targetH = 2160;
    else if (preset === '1080p') targetH = 1080;
    else if (preset === '720p') targetH = 720;
    else if (preset === '480p') targetH = 480;
    else if (preset === 'half') targetH = Math.round(srcH * 0.5);

    const targetW = Math.max(2, Math.round((targetH * aspect) / 2) * 2);
    targetH = Math.max(2, Math.round(targetH / 2) * 2);
    return { width: targetW, height: targetH };
  };

  const onRun = async () => {
    if (!loaded) return;
    clearSaved();
    setError('');
    setProgress(0);
    setBusy('Resizing video with WebCodecs hardware acceleration…');

    try {
      const resizeOpts: ResizeOptions =
        preset === 'half'
          ? { scale: 0.5 }
          : { preset: preset as '4k' | '1080p' | '720p' | '480p' };

      const result: EncodeResult = await resizeVideo(
        loaded.source,
        resizeOpts,
        (pct) => setProgress(pct),
      );

      const base = loaded.name.replace(/\.[^.]+$/, '');
      const url = URL.createObjectURL(result.blob);
      const savedBytes = result.size;

      const nextSaved: Saved = {
        name: `${base}-${result.height}p.mp4`,
        url,
        size: savedBytes,
        width: result.width,
        height: result.height,
        durationMs: result.durationMs,
        headline: `Resized to ${result.width}×${result.height} (${formatBytes(savedBytes)})`,
        detail: `Hardware-encoded in ${(result.durationMs / 1000).toFixed(1)}s using your browser GPU. Audio was passed through untouched with zero sync drift.`,
      };

      setSaved(nextSaved);
      announceCompletion({
        operation: 'Video Resize',
        durationMs: result.durationMs,
        summary: `Resized ${loaded.name} to ${result.width}×${result.height}.`,
        metrics: [
          {
            label: 'Original',
            value: `${loaded.videoTrack.width}×${loaded.videoTrack.height}`,
          },
          { label: 'Output', value: `${result.width}×${result.height}` },
          { label: 'Size', value: formatBytes(savedBytes) },
          { label: 'Watermark', value: 'None' },
        ],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Video resizing failed.');
    } finally {
      setBusy('');
      setProgress(0);
    }
  };

  const computed = getComputedDimensions();

  return (
    <AppShell currentToolId="video-resize">
      <section
        id="tool"
        tabIndex={-1}
        className="mx-auto max-w-4xl px-4 py-8 focus:outline-none sm:px-6"
      >
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Resize Video Resolution
              </h1>
              <p className="mt-2 text-base text-muted-foreground">
                Scale video dimensions (4K, 1080p, 720p, 480p) in your browser.
                Aspect ratio preserved, no watermark.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
              <LockKeyhole className="h-3.5 w-3.5 text-muted-foreground" />
              <span>100% Client-Side</span>
            </div>
          </div>

          <VideoSuiteNav currentPath="/video/resize" />

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
                  Select video to resize
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

              {/* Resolution Preset Picker */}
              <div className="rounded-lg border border-border p-5 space-y-4">
                <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Maximize2 className="h-4 w-4 text-primary" />
                  Target Resolution Preset
                </span>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <button
                    type="button"
                    onClick={() => setPreset('4k')}
                    className={`rounded-lg border p-3 text-center transition ${
                      preset === '4k'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:bg-muted/40'
                    }`}
                  >
                    <div className="text-sm font-bold text-foreground">
                      4K UHD
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      2160p
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreset('1080p')}
                    className={`rounded-lg border p-3 text-center transition ${
                      preset === '1080p'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:bg-muted/40'
                    }`}
                  >
                    <div className="text-sm font-bold text-foreground">
                      Full HD
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      1080p
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreset('720p')}
                    className={`rounded-lg border p-3 text-center transition ${
                      preset === '720p'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:bg-muted/40'
                    }`}
                  >
                    <div className="text-sm font-bold text-foreground">HD</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      720p
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreset('480p')}
                    className={`rounded-lg border p-3 text-center transition ${
                      preset === '480p'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:bg-muted/40'
                    }`}
                  >
                    <div className="text-sm font-bold text-foreground">SD</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      480p
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreset('half')}
                    className={`rounded-lg border p-3 text-center transition ${
                      preset === 'half'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:bg-muted/40'
                    }`}
                  >
                    <div className="text-sm font-bold text-foreground">
                      50% Scale
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Half size
                    </div>
                  </button>
                </div>

                <div className="mt-2 text-xs text-muted-foreground">
                  Target output dimensions:{' '}
                  <span className="font-semibold text-foreground">
                    {computed.width}×{computed.height}
                  </span>{' '}
                  (aspect ratio preserved).
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
                    : 'Resize Video'}
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
            <VideoRelatedLinks currentPath="/video/resize" />
          </div>
        </div>
      </section>
    </AppShell>
  );
}
