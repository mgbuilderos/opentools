'use client';

import {
  Camera,
  CheckCircle2,
  Clock,
  FileText,
  Image as ImageIcon,
  LockKeyhole,
  MapPin,
  RotateCcw,
  ShieldCheck,
  UploadCloud,
  X,
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import {
  BatchLocalPromise,
  BatchRunnerPanel,
  useFileBatchRunner,
} from '@/components/batch-runner';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import {
  readMetadata,
  stripMetadata,
  type ImageMetadataResult,
  type ImageStripResult,
} from '@/lib/tools/metadata';

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

interface LoadedImage {
  name: string;
  size: number;
  type: string;
  bytes: Uint8Array;
  metadata: ImageMetadataResult;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getCleanFileName(originalName: string): string {
  const dotIdx = originalName.lastIndexOf('.');
  if (dotIdx === -1) return `${originalName}_clean`;
  const base = originalName.slice(0, dotIdx);
  const ext = originalName.slice(dotIdx);
  return `${base}_clean${ext}`;
}

function getMimeType(format: string): string {
  switch (format) {
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

function orientationDescription(tag?: number): string {
  switch (tag) {
    case 1:
      return '1 (Normal)';
    case 2:
      return '2 (Flipped horizontal)';
    case 3:
      return '3 (Rotated 180°)';
    case 4:
      return '4 (Flipped vertical)';
    case 5:
      return '5 (Rotated 90° CCW, flipped vertical)';
    case 6:
      return '6 (Rotated 90° CW)';
    case 7:
      return '7 (Rotated 90° CW, flipped vertical)';
    case 8:
      return '8 (Rotated 90° CCW)';
    default:
      return tag ? String(tag) : 'Standard';
  }
}

export function MetadataTool() {
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const [error, setError] = useState<string>('');
  const [busy, setBusy] = useState<string>('');
  const [stripResult, setStripResult] = useState<ImageStripResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const batch = useFileBatchRunner();

  const fileRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const processFile = useCallback(async (file: File) => {
    setError('');
    setStripResult(null);

    if (file.size > MAX_FILE_BYTES) {
      setError(
        `File is too large (${formatBytes(file.size)}). This tool's per-file limit is ${formatBytes(MAX_FILE_BYTES)}.`,
      );
      errorRef.current?.focus();
      return;
    }

    setBusy('Analyzing photo metadata...');
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const meta = readMetadata(bytes);

      if (meta.format === 'unsupported') {
        setError(
          'Unsupported file format. Please choose a JPEG, PNG, or WebP photo.',
        );
        errorRef.current?.focus();
        return;
      }

      setLoaded({
        name: file.name,
        size: file.size,
        type: file.type || getMimeType(meta.format),
        bytes,
        metadata: meta,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not parse photo metadata from this file.',
      );
      errorRef.current?.focus();
    } finally {
      setBusy('');
    }
  }, []);

  const handleChoose = (files?: FileList | File[]) => {
    const selected = Array.from(files ?? []);
    if (selected.length === 0 || busy || batch.running) return;
    if (selected.length === 1) {
      batch.reset();
      setBatchFiles([]);
      void processFile(selected[0]);
      return;
    }
    setLoaded(null);
    setStripResult(null);
    setError('');
    batch.reset();
    setBatchFiles(selected);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    handleChoose(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleReset = () => {
    batch.reset();
    setBatchFiles([]);
    setLoaded(null);
    setStripResult(null);
    setError('');
    setBusy('');
    if (fileRef.current) {
      fileRef.current.value = '';
    }
  };

  const startBatch = () => {
    setError('');
    void batch.start(batchFiles, async (file, _index, signal) => {
      if (file.size > MAX_FILE_BYTES) {
        return {
          status: 'skipped',
          reason: `The ${formatBytes(MAX_FILE_BYTES)} per-file limit was exceeded.`,
        };
      }
      if (signal.aborted) {
        return { status: 'skipped', reason: 'Batch cancelled.' };
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      const metadata = readMetadata(bytes);
      if (metadata.format === 'unsupported') {
        return {
          status: 'skipped',
          reason: 'Only JPEG, PNG, and WebP photos are supported.',
        };
      }
      const result = stripMetadata(bytes);
      if (!result.success) {
        throw new Error(
          result.warnings[0] ??
            'Metadata could not be stripped from this file.',
        );
      }
      return {
        status: 'done',
        output: {
          blob: new Blob([result.cleanedBytes as BlobPart], {
            type: getMimeType(result.format),
          }),
          fileName: getCleanFileName(file.name),
        },
      };
    });
  };

  const handleStripAndDownload = () => {
    if (!loaded) return;

    setBusy('Stripping metadata...');
    const started = performance.now();
    try {
      const result = stripMetadata(loaded.bytes);
      const durationMs = performance.now() - started;
      setStripResult(result);

      const mimeType = getMimeType(result.format);
      const cleanBytes = result.cleanedBytes;
      const cleanBlob = new Blob([cleanBytes as BlobPart], { type: mimeType });
      const cleanUrl = URL.createObjectURL(cleanBlob);
      const cleanName = getCleanFileName(loaded.name);

      const downloadLink = document.createElement('a');
      downloadLink.href = cleanUrl;
      downloadLink.download = cleanName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      setTimeout(() => {
        URL.revokeObjectURL(cleanUrl);
      }, 10000);

      announceCompletion({
        operation: 'Photo metadata stripper',
        durationMs,
        summary: `Stripped metadata from ${loaded.name}.`,
        metrics: [
          { label: 'Original', value: formatBytes(result.originalSize) },
          { label: 'Cleaned', value: formatBytes(result.cleanedSize) },
          { label: 'Saved', value: formatBytes(result.bytesSaved) },
        ],
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to strip metadata from this file.',
      );
      errorRef.current?.focus();
    } finally {
      setBusy('');
    }
  };

  const camera = loaded?.metadata.camera;
  const shot = loaded?.metadata.shot;
  const gps = loaded?.metadata.gps;
  const rawText = loaded?.metadata.rawTextEntries ?? [];

  const hasCameraData = Boolean(
    camera &&
    (camera.make ||
      camera.model ||
      camera.lensModel ||
      camera.lensMake ||
      camera.software ||
      camera.serialNumber ||
      camera.ownerName),
  );

  const hasShotData = Boolean(
    shot &&
    (shot.dateTimeOriginal ||
      shot.dateTime ||
      shot.exposureTime ||
      shot.fNumber ||
      shot.iso ||
      shot.focalLength ||
      shot.width ||
      shot.height ||
      shot.orientation),
  );

  return (
    <AppShell currentToolId="photo-metadata">
      <section
        id="tool"
        tabIndex={-1}
        className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-12"
      >
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <div className="flex flex-col justify-between gap-5 border-b pb-8 sm:flex-row sm:items-start">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span>Image</span>
                <span aria-hidden="true">/</span>
                <span>Metadata</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Photo metadata viewer & stripper
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                Inspect camera make, shot settings, and GPS location embedded
                inside JPEG, PNG, and WebP photos. Remove all EXIF tags,
                comments, and location coordinates before sharing while
                preserving color profiles and image pixels.
              </p>
            </div>
            <span className="flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold">
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              Runs in this tab
            </span>
          </div>

          {/* Error display */}
          {error ? (
            <div
              ref={errorRef}
              role="alert"
              tabIndex={-1}
              className="focus-ring mt-6 flex items-start justify-between gap-4 rounded-xl border border-destructive/35 bg-destructive/5 p-4 text-sm"
            >
              <div>
                <p className="font-semibold">Unable to process photo</p>
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

          {/* Upload / Dropzone area */}
          {!loaded ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`mt-8 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
                isDragOver
                  ? 'border-primary bg-accent/30'
                  : 'border-border bg-card'
              }`}
            >
              <div className="flex size-14 items-center justify-center rounded-2xl border bg-background">
                <UploadCloud
                  aria-hidden="true"
                  className="size-7 text-muted-foreground"
                />
              </div>
              <p className="mt-4 text-base font-semibold">
                Drop your photo here, or browse
              </p>
              <p className="mt-1.5 max-w-md text-xs leading-5 text-muted-foreground">
                Supports JPEG, PNG, and WebP photos up to 50 MB. Processing and
                stripping are performed directly in your browser tab.
              </p>
              <label className="mt-6">
                <span className="sr-only">Choose a photo</span>
                <input
                  ref={fileRef}
                  id="metadata-file-input"
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={(e) => handleChoose(e.target.files ?? [])}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  disabled={Boolean(busy) || batch.running}
                  onClick={() => fileRef.current?.click()}
                  className="cursor-pointer"
                >
                  Select photo(s)
                </Button>
              </label>
              <BatchLocalPromise />
            </div>
          ) : null}

          {batchFiles.length > 1 ? (
            <BatchRunnerPanel
              files={batchFiles}
              runner={batch}
              startLabel="Strip all metadata"
              zipName="clean-photos.zip"
              onStart={startBatch}
              onClear={handleReset}
            />
          ) : null}

          {/* Busy indicator */}
          {busy ? (
            <output className="mt-4 block text-sm text-muted-foreground">
              {busy}
            </output>
          ) : null}

          {/* Loaded details */}
          {loaded ? (
            <div className="mt-6 space-y-6">
              {/* File summary & actions bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl border bg-background">
                    <ImageIcon
                      aria-hidden="true"
                      className="size-5 text-muted-foreground"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{loaded.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(loaded.size)} ·{' '}
                      {loaded.metadata.format.toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    data-receipt-download
                    onClick={handleStripAndDownload}
                    className="flex items-center gap-1.5"
                  >
                    <ShieldCheck aria-hidden="true" className="size-4" />
                    Strip & download clean photo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    className="flex items-center gap-1.5"
                  >
                    <RotateCcw aria-hidden="true" className="size-4" />
                    Clear
                  </Button>
                </div>
              </div>

              {/* Stripped banner if stripped */}
              {stripResult ? (
                <output className="block rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <CheckCircle2
                      aria-hidden="true"
                      className="size-4 text-foreground"
                    />
                    Metadata stripped successfully
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Your clean photo has been downloaded. EXIF tags, GPS
                    coordinates, and comment markers were removed, while color
                    profiles and pixel data were preserved byte-for-byte.
                  </p>
                  <dl className="mt-4 grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
                    <div>
                      <dt className="text-muted-foreground">Original size</dt>
                      <dd className="mt-0.5 font-medium">
                        {formatBytes(stripResult.originalSize)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Cleaned size</dt>
                      <dd className="mt-0.5 font-medium">
                        {formatBytes(stripResult.cleanedSize)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Bytes saved</dt>
                      <dd className="mt-0.5 font-medium">
                        {formatBytes(stripResult.bytesSaved)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Preserved</dt>
                      <dd className="mt-0.5 font-medium">
                        Pixels, ICC Profile, Orientation
                      </dd>
                    </div>
                  </dl>
                </output>
              ) : null}

              {/* Metadata cards grid */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Camera & Lens Card */}
                <div className="rounded-2xl border bg-card p-5">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <Camera aria-hidden="true" className="size-4" />
                    Camera & lens
                  </h2>
                  {hasCameraData ? (
                    <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Camera make
                        </dt>
                        <dd className="mt-0.5 font-medium">
                          {camera?.make || '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Camera model
                        </dt>
                        <dd className="mt-0.5 font-medium">
                          {camera?.model || '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Lens make
                        </dt>
                        <dd className="mt-0.5 font-medium">
                          {camera?.lensMake || '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Lens model
                        </dt>
                        <dd className="mt-0.5 font-medium">
                          {camera?.lensModel || '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Software
                        </dt>
                        <dd className="mt-0.5 font-medium">
                          {camera?.software || '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Serial number
                        </dt>
                        <dd className="mt-0.5 font-medium">
                          {camera?.serialNumber || '—'}
                        </dd>
                      </div>
                      {camera?.ownerName ? (
                        <div className="col-span-2">
                          <dt className="text-xs text-muted-foreground">
                            Owner name
                          </dt>
                          <dd className="mt-0.5 font-medium">
                            {camera.ownerName}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : (
                    <p className="mt-4 text-xs text-muted-foreground">
                      No camera or equipment tags found in this file.
                    </p>
                  )}
                </div>

                {/* The Moment / Shot Settings Card */}
                <div className="rounded-2xl border bg-card p-5">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <Clock aria-hidden="true" className="size-4" />
                    The moment & shot settings
                  </h2>
                  {hasShotData ? (
                    <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div className="col-span-2">
                        <dt className="text-xs text-muted-foreground">
                          Date taken
                        </dt>
                        <dd className="mt-0.5 font-medium">
                          {shot?.dateTimeOriginal || shot?.dateTime || '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Shutter speed
                        </dt>
                        <dd className="mt-0.5 font-medium">
                          {shot?.exposureTime || '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Aperture
                        </dt>
                        <dd className="mt-0.5 font-medium">
                          {shot?.fNumber || '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          ISO sensitivity
                        </dt>
                        <dd className="mt-0.5 font-medium">
                          {shot?.iso !== undefined ? shot.iso : '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Focal length
                        </dt>
                        <dd className="mt-0.5 font-medium">
                          {shot?.focalLength || '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Resolution
                        </dt>
                        <dd className="mt-0.5 font-medium">
                          {shot?.width && shot?.height
                            ? `${shot.width} × ${shot.height}`
                            : '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Orientation
                        </dt>
                        <dd className="mt-0.5 font-medium">
                          {orientationDescription(shot?.orientation)}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="mt-4 text-xs text-muted-foreground">
                      No exposure or timestamp tags found in this file.
                    </p>
                  )}
                </div>

                {/* Location (GPS) Card */}
                <div className="rounded-2xl border bg-card p-5 md:col-span-2">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <MapPin aria-hidden="true" className="size-4" />
                    Location (GPS)
                  </h2>
                  {gps ? (
                    <div className="mt-4 space-y-4">
                      <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
                        <div>
                          <dt className="text-xs text-muted-foreground">
                            Coordinates (DMS)
                          </dt>
                          <dd className="mt-0.5 font-medium">
                            {gps.formattedLat}, {gps.formattedLon}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">
                            Decimal coordinates
                          </dt>
                          <dd className="mt-0.5 font-medium">
                            {gps.latitude.toFixed(5)},{' '}
                            {gps.longitude.toFixed(5)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">
                            Altitude
                          </dt>
                          <dd className="mt-0.5 font-medium">
                            {gps.formattedAltitude || '—'}
                          </dd>
                        </div>
                      </dl>

                      {gps.mapUrl ? (
                        <div className="pt-2">
                          <a
                            href={gps.mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground underline underline-offset-4 hover:text-muted-foreground"
                          >
                            View on OpenStreetMap ↗
                          </a>
                          <span className="ml-2 text-xs text-muted-foreground">
                            (Opens external link in new tab. No map or tracker
                            is embedded.)
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-4 text-xs text-muted-foreground">
                      No GPS coordinates found in this image.
                    </p>
                  )}
                </div>

                {/* Raw text chunks (e.g. PNG / WebP comments) */}
                {rawText.length > 0 ? (
                  <div className="rounded-2xl border bg-card p-5 md:col-span-2">
                    <h2 className="flex items-center gap-2 text-sm font-semibold">
                      <FileText aria-hidden="true" className="size-4" />
                      Embedded text entries & comments
                    </h2>
                    <dl className="mt-4 space-y-2 text-sm">
                      {rawText.map((entry, idx) => (
                        <div
                          key={`${entry.key}-${idx}`}
                          className="flex flex-col sm:flex-row sm:gap-4"
                        >
                          <dt className="min-w-32 text-xs font-medium text-muted-foreground">
                            {entry.key}
                          </dt>
                          <dd className="break-all font-mono text-xs">
                            {entry.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ) : null}
              </div>

              {/* Explanation of what is stripped vs kept */}
              <div className="rounded-2xl border bg-muted/20 p-5 text-xs leading-6 text-muted-foreground">
                <p className="font-semibold text-foreground">
                  How metadata stripping works:
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  <li>
                    <strong>Stripped:</strong> EXIF tags, GPS coordinates,
                    camera serial numbers, date/time stamps, embedded
                    thumbnails, XMP metadata, IPTC markers, and comments.
                  </li>
                  <li>
                    <strong>Preserved:</strong> Image pixels, color profiles
                    (ICC profiles in JPEG, sRGB/iCCP chunks in PNG), and
                    orientation markers so your photos never turn sideways or
                    shift color.
                  </li>
                  <li>
                    <strong>Pure client-side:</strong> No upload occurs. The
                    entire parsing and rebuilding process happens in your
                    browser tab.
                  </li>
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}
