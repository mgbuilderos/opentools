'use client';

import {
  ArrowDownToLine,
  CheckCircle2,
  FileVideo,
  LockKeyhole,
  RefreshCw,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import { convertContainer } from '@/lib/tools/video/convert';
import { readMp4, type Mp4File } from '@/lib/tools/video/mp4';
import { sourceFromFile, type ByteSource } from '@/lib/tools/video/source';
import { VideoSuiteNav, VideoRelatedLinks } from '@/components/video-suite-nav';

const MAX_BYTES = 2 * 1024 * 1024 * 1024;

interface Loaded {
  name: string;
  size: number;
  source: ByteSource;
  movie: Mp4File;
  detectedFormat: 'mov' | 'mp4';
  videoCodec?: string;
  audioCodec?: string;
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

export function VideoConvertTool() {
  const fileRef = useRef<HTMLInputElement>(null);
  const savedRef = useRef<Saved | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [targetFormat, setTargetFormat] = useState<'mp4' | 'mov'>('mp4');

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

    setBusy('Inspecting container…');
    try {
      const source = sourceFromFile(file);
      const movie = await readMp4(source);
      const video = movie.tracks.find((t) => t.kind === 'video');
      const audio = movie.tracks.find((t) => t.kind === 'audio');

      const isMov = file.name.toLowerCase().endsWith('.mov');
      const detectedFormat: 'mov' | 'mp4' = isMov ? 'mov' : 'mp4';
      const defaultTarget = isMov ? 'mp4' : 'mov';

      setLoaded({
        name: file.name,
        size: file.size,
        source,
        movie,
        detectedFormat,
        videoCodec: video?.codec,
        audioCodec: audio?.codec,
      });
      setTargetFormat(defaultTarget);
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

  const onConvert = async () => {
    if (!loaded) return;
    clearSaved();
    setError('');
    setBusy('Remuxing container…');
    const started = performance.now();

    try {
      const result = await convertContainer(
        loaded.source,
        loaded.movie,
        targetFormat,
      );
      const durationMs = performance.now() - started;

      const base = loaded.name.replace(/\.[^.]+$/u, '');
      const outName = `${base}.${targetFormat}`;
      const url = URL.createObjectURL(result.blob);

      const next: Saved = {
        name: outName,
        url,
        size: result.size,
        headline: `Converted to ${targetFormat.toUpperCase()} in ${durationMs < 1000 ? `${durationMs.toFixed(0)} ms` : `${(durationMs / 1000).toFixed(2)} s`}`,
        detail: `The video and audio streams were copied byte-for-byte into the new ${targetFormat.toUpperCase()} container. Zero quality was lost because nothing was re-encoded.`,
      };
      savedRef.current = next;
      setSaved(next);

      announceCompletion({
        operation: 'Video converter',
        durationMs,
        summary: `Converted ${loaded.name} to ${targetFormat.toUpperCase()}.`,
        metrics: [
          { label: 'Target', value: targetFormat.toUpperCase() },
          { label: 'Size', value: formatBytes(result.size) },
          { label: 'Re-encoded', value: 'No' },
        ],
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Failed to convert container.',
      );
    } finally {
      setBusy('');
    }
  };

  return (
    <AppShell currentToolId="video-convert">
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
                <span>Convert</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Convert MOV to MP4 or MP4 to MOV without re-encoding
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                Lossless in-browser container remuxing. The picture and sound
                are copied byte-for-byte with zero quality loss and zero
                watermark.
              </p>
            </div>
            <span className="flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold">
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              Runs in this tab
            </span>
          </div>

          <VideoSuiteNav currentPath="/video/convert" />

          <section
            aria-label="File upload"
            className="rounded-xl border border-border/80 bg-card p-6 shadow-sm"
          >
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50">
              <FileVideo className="h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-lg font-semibold mb-1">
                Select a MOV or MP4 video
              </h2>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                Select a file to inspect stream codecs and remux to another
                container.
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
              <div className="font-semibold mb-1">
                Cannot convert without re-encoding:
              </div>
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
              aria-label="Conversion options"
              className="rounded-xl border border-border/80 bg-card p-6 shadow-sm space-y-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
                <div>
                  <div className="font-semibold text-base">{loaded.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {formatBytes(loaded.size)} · Duration:{' '}
                    {loaded.movie.durationSeconds.toFixed(1)}s · Codecs:{' '}
                    {loaded.videoCodec ?? 'none'} /{' '}
                    {loaded.audioCodec ?? 'none'}
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
                <div className="text-sm font-medium">Select Output Format</div>
                <div className="grid grid-cols-2 gap-4 max-w-md">
                  <button
                    type="button"
                    onClick={() => setTargetFormat('mp4')}
                    className={`flex flex-col items-center justify-center p-4 rounded-lg border text-center transition-all ${
                      targetFormat === 'mp4'
                        ? 'border-primary bg-primary/10 font-semibold text-foreground'
                        : 'border-border bg-card hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <span className="text-base">MP4</span>
                    <span className="text-xs text-muted-foreground mt-1">
                      Universal playback (Web, Android, Windows)
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetFormat('mov')}
                    className={`flex flex-col items-center justify-center p-4 rounded-lg border text-center transition-all ${
                      targetFormat === 'mov'
                        ? 'border-primary bg-primary/10 font-semibold text-foreground'
                        : 'border-border bg-card hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <span className="text-base">MOV</span>
                    <span className="text-xs text-muted-foreground mt-1">
                      Apple QuickTime & Final Cut friendly
                    </span>
                  </button>
                </div>

                <div className="rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground space-y-1">
                  <div className="font-medium text-foreground">
                    Why this is faster than any online converter:
                  </div>
                  <p>
                    Every online converter re-encodes your video from scratch,
                    which takes minutes, consumes gigabytes of server bandwidth,
                    and slightly smears fine details.
                  </p>
                  <p>
                    This tool replaces only the container shell (the MP4/MOV
                    header metadata). The raw compressed H.264/AAC packets
                    inside are preserved byte-for-byte.
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    size="lg"
                    onClick={onConvert}
                    className="w-full sm:w-auto"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Convert to {targetFormat.toUpperCase()}
                  </Button>
                </div>
              </div>
            </section>
          )}

          {saved && (
            <section
              aria-label="Download converted file"
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

          <VideoRelatedLinks currentPath="/video/convert" />
        </div>
      </section>
    </AppShell>
  );
}
