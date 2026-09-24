'use client';

import {
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  FileVideo,
  HardDrive,
  Info,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import {
  inspectVideoMetadata,
  stripVideoMetadata,
  type StripMetadataResult,
  type VideoMetadata,
} from '@/lib/tools/video/metadata';
import { readMp4, type Mp4File } from '@/lib/tools/video/mp4';
import { sourceFromFile, type ByteSource } from '@/lib/tools/video/source';
import { VideoSuiteNav, VideoRelatedLinks } from '@/components/video-suite-nav';

const MAX_BYTES = 4 * 1024 * 1024 * 1024;

interface Loaded {
  name: string;
  size: number;
  source: ByteSource;
  movie: Mp4File;
  metadata: VideoMetadata;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function VideoMetadataTool() {
  const fileRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [strippedResult, setStrippedResult] = useState<{
    result: StripMetadataResult;
    url: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const clearResult = () => {
    if (strippedResult) URL.revokeObjectURL(strippedResult.url);
    setStrippedResult(null);
  };

  const onChoose = async (file: File | undefined) => {
    if (!file) return;
    clearResult();
    setError('');
    setLoaded(null);

    if (file.size > MAX_BYTES) {
      setError(
        `That file is ${formatBytes(file.size)}. This page works on files up to ${formatBytes(MAX_BYTES)}, processed entirely in your browser without uploading.`,
      );
      return;
    }

    setBusy('Scanning video metadata & GPS…');
    try {
      const source = sourceFromFile(file);
      const movie = await readMp4(source);
      const metadata = await inspectVideoMetadata(source, movie);

      setLoaded({
        name: file.name,
        size: file.size,
        source,
        movie,
        metadata,
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

  const onStrip = async () => {
    if (!loaded) return;
    clearResult();
    setError('');
    setBusy('Stripping metadata & GPS tags…');
    const started = performance.now();

    try {
      const res = await stripVideoMetadata(loaded.source, loaded.movie);
      const durationMs = performance.now() - started;

      const base = loaded.name.replace(/\.[^.]+$/u, '');
      const outName = `${base}-clean.mp4`;
      const url = URL.createObjectURL(res.blob);

      setStrippedResult({ result: res, url, name: outName });

      announceCompletion({
        operation: 'Video metadata scrubber',
        durationMs,
        summary: `Stripped metadata from ${loaded.name}.`,
        metrics: [
          { label: 'Original size', value: formatBytes(res.originalSize) },
          { label: 'Clean size', value: formatBytes(res.size) },
          { label: 'Re-encoded', value: 'No' },
        ],
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Failed to strip video metadata.',
      );
    } finally {
      setBusy('');
    }
  };

  return (
    <AppShell currentToolId="video-metadata">
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
                <span>Metadata</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Inspect and strip video metadata and GPS location
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                Lossless privacy sanitization up to 4 GB. View camera make,
                model, creation dates, and GPS coordinates, and wipe identifying
                metadata without touching audio or video frames.
              </p>
            </div>
            <span className="flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold">
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              Runs in this tab
            </span>
          </div>

          <VideoSuiteNav currentPath="/video/metadata" />

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
                Inspect hidden GPS coordinates, device identifiers, and creation
                timestamps. Strip them losslessly without re-encoding video
                frames.
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
              aria-label="Metadata inspection"
              className="rounded-xl border border-border/80 bg-card p-6 shadow-sm space-y-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
                <div>
                  <div className="font-semibold text-base">{loaded.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {formatBytes(loaded.size)} · Duration:{' '}
                    {loaded.movie.durationSeconds.toFixed(1)}s
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setLoaded(null);
                    clearResult();
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Change file
                </Button>
              </div>

              {/* Privacy risks banner */}
              {loaded.metadata.hasIdentifyingMetadata ? (
                <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Privacy Sensitive Data Found in Container</span>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1 pl-6 list-disc">
                    {loaded.metadata.privacyRisks.map((risk, idx) => (
                      <li key={idx}>{risk}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="rounded-lg border border-border bg-muted/40 p-4 flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      Clean Container:{' '}
                    </span>
                    No smartphone GPS coordinates or device hardware tags
                    detected in user data boxes.
                  </div>
                </div>
              )}

              {/* Detailed Metadata Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* GPS Coordinates */}
                <div className="rounded-lg border border-border p-4 space-y-2 bg-background">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>GPS Location Coordinates</span>
                  </div>
                  {loaded.metadata.gps ? (
                    <div className="space-y-1 text-xs">
                      <div className="font-mono text-sm font-semibold">
                        {loaded.metadata.gps.latitude.toFixed(6)},{' '}
                        {loaded.metadata.gps.longitude.toFixed(6)}
                      </div>
                      {loaded.metadata.gps.altitude !== undefined && (
                        <div className="text-muted-foreground">
                          Altitude: {loaded.metadata.gps.altitude.toFixed(1)}m
                        </div>
                      )}
                      <div className="text-muted-foreground pt-1">
                        Raw tag:{' '}
                        <code className="bg-muted px-1 py-0.5 rounded">
                          {loaded.metadata.gps.raw}
                        </code>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      No GPS location tags embedded in this file.
                    </div>
                  )}
                </div>

                {/* Hardware Device */}
                <div className="rounded-lg border border-border p-4 space-y-2 bg-background">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Smartphone className="h-4 w-4 text-primary" />
                    <span>Hardware Device & Software</span>
                  </div>
                  {loaded.metadata.deviceMake ||
                  loaded.metadata.deviceModel ||
                  loaded.metadata.software ? (
                    <div className="space-y-1 text-xs">
                      {(loaded.metadata.deviceMake ||
                        loaded.metadata.deviceModel) && (
                        <div>
                          <span className="text-muted-foreground">
                            Device:{' '}
                          </span>
                          <span className="font-medium">
                            {[
                              loaded.metadata.deviceMake,
                              loaded.metadata.deviceModel,
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          </span>
                        </div>
                      )}
                      {loaded.metadata.software && (
                        <div>
                          <span className="text-muted-foreground">
                            Software:{' '}
                          </span>
                          <span className="font-medium">
                            {loaded.metadata.software}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      No hardware manufacturer or model tags embedded.
                    </div>
                  )}
                </div>

                {/* Recording Timestamps */}
                <div className="rounded-lg border border-border p-4 space-y-2 bg-background">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Info className="h-4 w-4 text-primary" />
                    <span>Recording Timestamps</span>
                  </div>
                  {loaded.metadata.creationTime ? (
                    <div className="space-y-1 text-xs">
                      <div>
                        <span className="text-muted-foreground">Created: </span>
                        <span className="font-medium">
                          {loaded.metadata.creationTime.toLocaleString()}
                        </span>
                      </div>
                      {loaded.metadata.modificationTime && (
                        <div>
                          <span className="text-muted-foreground">
                            Modified:{' '}
                          </span>
                          <span className="font-medium">
                            {loaded.metadata.modificationTime.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      Container timestamps are clean or uninitialized.
                    </div>
                  )}
                </div>

                {/* Container Format */}
                <div className="rounded-lg border border-border p-4 space-y-2 bg-background">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <HardDrive className="h-4 w-4 text-primary" />
                    <span>Tracks & Streams</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div>
                      <span className="text-muted-foreground">Tracks: </span>
                      <span className="font-medium">
                        {loaded.movie.tracks
                          .map((t) => `${t.kind} (${t.codec})`)
                          .join(', ')}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Timescale: </span>
                      <span className="font-medium">
                        {loaded.movie.timescale} ticks/sec
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Privacy Explanation */}
              <div className="rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground space-y-1">
                <div className="font-medium text-foreground">
                  Why strip metadata locally?
                </div>
                <p>
                  A location tag on a video of your home, family, or workplace
                  is the most privacy-sensitive data in your camera roll. Most
                  online &quot;metadata strippers&quot; require uploading your
                  video to a third-party server, defeating the entire purpose of
                  privacy.
                </p>
                <p>
                  This tool runs 100% locally in your browser. It rewrites the
                  MP4 container structure to drop all{' '}
                  <code className="text-foreground">udta</code>, GPS, device,
                  and tracking atoms without touching or re-encoding your video
                  frames.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  size="lg"
                  onClick={onStrip}
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Strip Metadata & Save Clean Video
                </Button>
              </div>
            </section>
          )}

          {strippedResult && (
            <section
              aria-label="Download clean video"
              className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-base text-foreground">
                    Metadata & GPS tags stripped successfully
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Removed: {strippedResult.result.removedFields.join(', ')}.
                    The video and audio frames were preserved byte-for-byte with
                    zero quality loss.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href={strippedResult.url}
                  download={strippedResult.name}
                  data-receipt-download
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
                >
                  <ArrowDownToLine className="h-4 w-4 mr-2" />
                  Download Sanitized Video (
                  {formatBytes(strippedResult.result.size)})
                </a>
              </div>
            </section>
          )}

          <VideoRelatedLinks currentPath="/video/metadata" />
        </div>
      </section>
    </AppShell>
  );
}
