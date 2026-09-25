'use client';

import {
  ArrowDownToLine,
  CheckCircle2,
  FileVideo,
  LockKeyhole,
  Sliders,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import {
  assertSupportedVideoCodec,
  compressVideo,
  type EncodeResult,
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
  durationSeconds: number;
}

interface Saved {
  name: string;
  url: string;
  size: number;
  originalSize: number;
  compressionRatio: number;
  durationMs: number;
  headline: string;
  detail: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function VideoCompressTool() {
  const fileRef = useRef<HTMLInputElement>(null);
  const savedRef = useRef<Saved | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [progress, setProgress] = useState(0);

  const [mode, setMode] = useState<'preset' | 'target'>('preset');
  const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('medium');
  const [targetSizeMb, setTargetSizeMb] = useState<string>('');

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

    setBusy('Inspecting video…');
    try {
      const source = sourceFromFile(file);
      const movie = await readMp4(source);
      const videoTrack = movie.tracks.find((t) => t.kind === 'video');
      if (!videoTrack) {
        throw new Error(
          'This video file does not contain a recognized video track.',
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
        durationSeconds: movie.durationSeconds,
      });

      // Default target size to roughly 50% of original
      const halfMb = Math.max(1, Math.round((file.size / (1024 * 1024)) * 0.5));
      setTargetSizeMb(String(halfMb));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy('');
    }
  };

  const onRun = async () => {
    if (!loaded) return;
    clearSaved();
    setError('');
    setProgress(0);
    setBusy('Compressing video with WebCodecs hardware acceleration…');

    try {
      const targetBytes =
        mode === 'target' && Number(targetSizeMb) > 0
          ? Number(targetSizeMb) * 1024 * 1024
          : undefined;

      const result: EncodeResult = await compressVideo(
        loaded.source,
        {
          quality: mode === 'preset' ? quality : undefined,
          targetSizeBytes: targetBytes,
        },
        (pct) => setProgress(pct),
      );

      const base = loaded.name.replace(/\.[^.]+$/, '');
      const url = URL.createObjectURL(result.blob);
      const savedBytes = result.size;
      const ratioPct = Math.round(result.compressionRatio * 100);

      const nextSaved: Saved = {
        name: `${base}-compressed.mp4`,
        url,
        size: savedBytes,
        originalSize: loaded.size,
        compressionRatio: result.compressionRatio,
        durationMs: result.durationMs,
        headline: `Compressed by ${ratioPct}% (${formatBytes(loaded.size)} → ${formatBytes(savedBytes)})`,
        detail: `Hardware-encoded in ${(result.durationMs / 1000).toFixed(1)}s using your browser GPU. Audio was passed through untouched with zero degradation.`,
      };

      setSaved(nextSaved);
      announceCompletion({
        operation: 'Video Compress',
        durationMs: result.durationMs,
        summary: `Compressed ${loaded.name} by ${ratioPct}%.`,
        metrics: [
          { label: 'Original', value: formatBytes(loaded.size) },
          { label: 'Compressed', value: formatBytes(savedBytes) },
          { label: 'Saved', value: `${ratioPct}%` },
          { label: 'Watermark', value: 'None' },
        ],
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Video compression failed.',
      );
    } finally {
      setBusy('');
      setProgress(0);
    }
  };

  return (
    <AppShell currentToolId="video-compress">
      <section
        id="tool"
        tabIndex={-1}
        className="mx-auto max-w-4xl px-4 py-8 focus:outline-none sm:px-6"
      >
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Compress Video Online
              </h1>
              <p className="mt-2 text-base text-muted-foreground">
                Shrink MP4 video size using in-browser hardware acceleration. No
                upload, no watermark.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
              <LockKeyhole className="h-3.5 w-3.5 text-muted-foreground" />
              <span>100% Client-Side</span>
            </div>
          </div>

          <VideoSuiteNav currentPath="/video/compress" />

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
                  Select video to compress
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
                      {loaded.videoTrack.width}×{loaded.videoTrack.height} ·{' '}
                      {loaded.videoTrack.codec} · {formatBytes(loaded.size)}
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

              {/* Compression Configuration */}
              <div className="rounded-lg border border-border p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-primary" />
                    Compression Target
                  </span>
                  <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setMode('preset')}
                      className={`px-3 py-1 rounded-md font-medium transition ${
                        mode === 'preset'
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Quality Preset
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('target')}
                      className={`px-3 py-1 rounded-md font-medium transition ${
                        mode === 'target'
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Target File Size
                    </button>
                  </div>
                </div>

                {mode === 'preset' ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => setQuality('high')}
                      className={`rounded-lg border p-3 text-left transition ${
                        quality === 'high'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border hover:bg-muted/40'
                      }`}
                    >
                      <div className="text-sm font-semibold text-foreground">
                        High Quality
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Crisp visuals, ~20–35% size reduction
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuality('medium')}
                      className={`rounded-lg border p-3 text-left transition ${
                        quality === 'medium'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border hover:bg-muted/40'
                      }`}
                    >
                      <div className="text-sm font-semibold text-foreground">
                        Balanced
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Ideal for sharing, ~50–65% reduction
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuality('low')}
                      className={`rounded-lg border p-3 text-left transition ${
                        quality === 'low'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border hover:bg-muted/40'
                      }`}
                    >
                      <div className="text-sm font-semibold text-foreground">
                        Maximum Compression
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Smallest file size, ~70–85% reduction
                      </div>
                    </button>
                  </div>
                ) : (
                  <div>
                    <label
                      htmlFor="desired-output-size"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Desired output size (Megabytes)
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        id="desired-output-size"
                        type="number"
                        min="1"
                        max={Math.max(
                          1,
                          Math.round(loaded.size / (1024 * 1024)),
                        )}
                        value={targetSizeMb}
                        onChange={(e) => setTargetSizeMb(e.target.value)}
                        className="w-32 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <span className="text-sm text-muted-foreground">
                        MB (original: {formatBytes(loaded.size)})
                      </span>
                    </div>
                  </div>
                )}
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
                    : 'Compress Video'}
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
            <VideoRelatedLinks currentPath="/video/compress" />
          </div>
        </div>
      </section>
    </AppShell>
  );
}
