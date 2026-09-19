'use client';

import {
  ArrowDownToLine,
  CheckCircle2,
  FileImage,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import NextImage from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import { publicTools } from '@/lib/tools/catalog';
import {
  calculateContainDimensions,
  extensionForRasterType,
  supportedRasterTypes,
  type RasterFormat,
} from '@/lib/tools/image';

type SourceImage = { file: File; url: string; width: number; height: number };
type ImageReceipt = {
  url: string;
  blob: Blob;
  format: RasterFormat;
  width: number;
  height: number;
  durationMs: number;
};

const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDuration(durationMs: number) {
  return durationMs < 1000
    ? `${durationMs.toFixed(0)} ms`
    : `${(durationMs / 1000).toFixed(2)} s`;
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error('The browser could not decode this image.'));
    image.src = url;
  });
}

function encodeCanvas(
  canvas: HTMLCanvasElement,
  format: RasterFormat,
  quality: number,
) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error('The browser could not encode this image.')),
      format,
      quality,
    );
  });
}

export function ImageOptimizeTool() {
  const fileRef = useRef<HTMLInputElement>(null);
  const sourceRef = useRef<SourceImage | null>(null);
  const resultRef = useRef<ImageReceipt | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [source, setSource] = useState<SourceImage | null>(null);
  const [result, setResult] = useState<ImageReceipt | null>(null);
  const [maxWidth, setMaxWidth] = useState(1600);
  const [maxHeight, setMaxHeight] = useState(1600);
  const [format, setFormat] = useState<RasterFormat>('image/webp');
  const [quality, setQuality] = useState(82);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const manifest = publicTools.find((tool) => tool.id === 'image-optimize')!;

  useEffect(() => {
    sourceRef.current = source;
  }, [source]);
  useEffect(() => {
    resultRef.current = result;
  }, [result]);
  useEffect(
    () => () => {
      if (sourceRef.current) URL.revokeObjectURL(sourceRef.current.url);
      if (resultRef.current) URL.revokeObjectURL(resultRef.current.url);
    },
    [],
  );
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const clearResult = () => {
    if (resultRef.current) URL.revokeObjectURL(resultRef.current.url);
    resultRef.current = null;
    setResult(null);
  };

  const chooseImage = async (file?: File) => {
    if (!file || busy) return;
    clearResult();
    setError('');
    if (!supportedRasterTypes.has(file.type as RasterFormat)) {
      setError(
        'Choose a JPEG, PNG, or WebP image. Animated output is not supported.',
      );
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError('This candidate limits source images to 25 MB.');
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      const decoded = await loadImage(url);
      if (sourceRef.current) URL.revokeObjectURL(sourceRef.current.url);
      const next = {
        file,
        url,
        width: decoded.naturalWidth,
        height: decoded.naturalHeight,
      };
      sourceRef.current = next;
      setSource(next);
      setMaxWidth(Math.min(decoded.naturalWidth, 2400));
      setMaxHeight(Math.min(decoded.naturalHeight, 2400));
    } catch (caught) {
      URL.revokeObjectURL(url);
      setError(
        caught instanceof Error
          ? caught.message
          : 'The browser could not decode this image.',
      );
    }
  };

  const run = async () => {
    if (!source || busy) return;
    if (
      !Number.isFinite(maxWidth) ||
      !Number.isFinite(maxHeight) ||
      maxWidth < 1 ||
      maxHeight < 1 ||
      maxWidth > 12000 ||
      maxHeight > 12000
    ) {
      setError('Width and height must be whole numbers from 1 to 12,000.');
      return;
    }
    const targetMaxWidth = Math.floor(maxWidth);
    const targetMaxHeight = Math.floor(maxHeight);
    const targetFormat = format;
    const targetQuality = quality;
    setBusy(true);
    setError('');
    clearResult();
    const started = performance.now();
    try {
      const decoded = await loadImage(source.url);
      const dimensions = calculateContainDimensions(
        source.width,
        source.height,
        targetMaxWidth,
        targetMaxHeight,
      );
      const canvas = document.createElement('canvas');
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      const context = canvas.getContext('2d', {
        alpha: targetFormat !== 'image/jpeg',
      });
      if (!context)
        throw new Error('Canvas processing is unavailable in this browser.');
      if (targetFormat === 'image/jpeg') {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(decoded, 0, 0, canvas.width, canvas.height);
      const blob = await encodeCanvas(
        canvas,
        targetFormat,
        targetQuality / 100,
      );
      if (blob.type !== targetFormat)
        throw new Error(
          `This browser did not produce ${targetFormat.replace('image/', '').toUpperCase()} output.`,
        );
      const validationUrl = URL.createObjectURL(blob);
      const validationImage = await loadImage(validationUrl);
      if (
        validationImage.naturalWidth !== dimensions.width ||
        validationImage.naturalHeight !== dimensions.height
      ) {
        URL.revokeObjectURL(validationUrl);
        throw new Error('The optimized image failed its dimension check.');
      }
      const next = {
        url: validationUrl,
        blob,
        format: targetFormat,
        ...dimensions,
        durationMs: performance.now() - started,
      };
      resultRef.current = next;
      setResult(next);
      announceCompletion({
        operation: 'Image optimizer',
        durationMs: next.durationMs,
        summary: `Image converted to ${targetFormat.replace('image/', '').toUpperCase()} at ${next.width} × ${next.height}px.`,
        metrics: [
          { label: 'Before', value: formatBytes(source.file.size) },
          { label: 'After', value: formatBytes(blob.size) },
          {
            label: blob.size <= source.file.size ? 'Saved' : 'Larger',
            value: `${Math.abs(Math.round((1 - blob.size / source.file.size) * 100))}%`,
          },
        ],
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'The image could not be optimized.',
      );
    } finally {
      setBusy(false);
    }
  };

  const clearAll = () => {
    clearResult();
    if (sourceRef.current) URL.revokeObjectURL(sourceRef.current.url);
    sourceRef.current = null;
    setSource(null);
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  };
  const save = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result.url;
    link.download = `optimized-image.${extensionForRasterType(result.format)}`;
    link.click();
  };
  const savedPercent =
    source && result
      ? Math.round((1 - result.blob.size / source.file.size) * 100)
      : 0;

  return (
    <AppShell currentToolId="image-optimize">
      <section
        id="tool"
        tabIndex={-1}
        className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-12"
      >
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col justify-between gap-5 border-b pb-8 sm:flex-row sm:items-start">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span>Image</span>
                <span aria-hidden="true">/</span>
                <span>Optimize</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Optimize image
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                Resize, compress, and convert one static JPEG, PNG, or WebP
                without uploading it.
              </p>
            </div>
            <span className="flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold">
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              On-device prototype
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
                <p className="font-semibold">Couldn’t optimize this image</p>
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
            <div className="flex items-center justify-between border-b px-4 py-4 sm:px-5">
              <div>
                <h2 className="text-sm font-semibold">Source image</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  JPEG, PNG, or WebP · 25 MB maximum
                </p>
              </div>
              {source ? (
                <span className="tabular text-xs text-muted-foreground">
                  {source.width} × {source.height} ·{' '}
                  {formatBytes(source.file.size)}
                </span>
              ) : null}
            </div>
            <div className="grid gap-5 p-4 md:grid-cols-[minmax(0,1fr)_280px] sm:p-5">
              <div className="grid min-h-72 place-items-center overflow-hidden rounded-xl border border-dashed bg-muted/45 p-5 text-center">
                {source ? (
                  <NextImage
                    src={source.url}
                    width={source.width}
                    height={source.height}
                    unoptimized
                    alt="Selected preview"
                    className="max-h-72 max-w-full object-contain"
                  />
                ) : (
                  <div>
                    <span className="mx-auto grid size-11 place-items-center rounded-xl border bg-background">
                      <FileImage aria-hidden="true" className="size-5" />
                    </span>
                    <p className="mt-4 font-semibold">Choose an image</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      The original stays unchanged.
                    </p>
                  </div>
                )}
              </div>
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-label="Choose image to optimize"
                  className="sr-only"
                  onChange={(event) =>
                    void chooseImage(event.target.files?.[0])
                  }
                />
                <Button
                  variant="outline"
                  className="h-11 w-full"
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                >
                  <FileImage aria-hidden="true" />
                  {source ? 'Choose another' : 'Choose image'}
                </Button>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <label className="text-xs font-semibold">
                    Max width
                    <input
                      type="number"
                      min="1"
                      max="12000"
                      value={maxWidth}
                      disabled={busy}
                      onChange={(event) => {
                        clearResult();
                        setMaxWidth(Number(event.target.value));
                      }}
                      className="focus-ring mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm"
                    />
                  </label>
                  <label className="text-xs font-semibold">
                    Max height
                    <input
                      type="number"
                      min="1"
                      max="12000"
                      value={maxHeight}
                      disabled={busy}
                      onChange={(event) => {
                        clearResult();
                        setMaxHeight(Number(event.target.value));
                      }}
                      className="focus-ring mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm"
                    />
                  </label>
                </div>
                <label className="mt-4 block text-xs font-semibold">
                  Output format
                  <select
                    value={format}
                    disabled={busy}
                    onChange={(event) => {
                      clearResult();
                      setFormat(event.target.value as RasterFormat);
                    }}
                    className="focus-ring mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm"
                  >
                    <option value="image/webp">WebP</option>
                    <option value="image/jpeg">JPEG</option>
                    <option value="image/png">PNG</option>
                  </select>
                </label>
                <label className="mt-4 block text-xs font-semibold">
                  Quality{' '}
                  <span className="tabular text-muted-foreground">
                    {format === 'image/png' ? 'lossless' : `${quality}%`}
                  </span>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={quality}
                    disabled={busy || format === 'image/png'}
                    onChange={(event) => {
                      clearResult();
                      setQuality(Number(event.target.value));
                    }}
                    className="mt-2 w-full accent-foreground"
                  />
                </label>
                <Button
                  className="mt-5 h-11 w-full"
                  disabled={
                    !source ||
                    busy ||
                    !Number.isFinite(maxWidth) ||
                    !Number.isFinite(maxHeight) ||
                    maxWidth < 1 ||
                    maxHeight < 1 ||
                    maxWidth > 12000 ||
                    maxHeight > 12000
                  }
                  onClick={() => void run()}
                >
                  <Sparkles aria-hidden="true" />
                  {busy ? 'Optimizing…' : 'Optimize image'}
                </Button>
                {source ? (
                  <Button
                    variant="ghost"
                    className="mt-2 h-11 w-full"
                    disabled={busy}
                    onClick={clearAll}
                  >
                    <Trash2 aria-hidden="true" />
                    Clear
                  </Button>
                ) : null}
              </div>
            </div>
          </section>
          {result && source ? (
            <section
              aria-labelledby="image-result-heading"
              className="mt-5 overflow-hidden rounded-2xl border bg-card"
            >
              <div className="grid gap-5 p-5 md:grid-cols-[220px_minmax(0,1fr)_auto] md:items-center sm:p-6">
                <div className="grid h-36 place-items-center overflow-hidden rounded-xl border bg-muted">
                  <NextImage
                    src={result.url}
                    width={result.width}
                    height={result.height}
                    unoptimized
                    alt="Optimized preview"
                    className="max-h-36 max-w-full object-contain"
                  />
                </div>
                <div>
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-success/10 text-success">
                      <CheckCircle2 aria-hidden="true" className="size-5" />
                    </span>
                    <div>
                      <h2
                        id="image-result-heading"
                        className="text-lg font-semibold"
                      >
                        Done — {formatBytes(source.file.size)} →{' '}
                        {formatBytes(result.blob.size)}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {result.width} × {result.height} ·{' '}
                        {formatDuration(result.durationMs)} ·{' '}
                        {savedPercent >= 0
                          ? `${savedPercent}% smaller`
                          : `${Math.abs(savedPercent)}% larger`}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-xs leading-5 text-muted-foreground">
                    A new browser-encoded image was created; this implementation
                    does not copy the original metadata. Animation, embedded
                    profiles, and edit history are not preserved.
                  </p>
                </div>
                <Button className="h-11" onClick={save}>
                  <ArrowDownToLine aria-hidden="true" />
                  Save image
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
                    Decoded dimensions match
                  </p>
                </div>
                <div className="p-4 sm:p-5">
                  <p className="text-xs text-muted-foreground">
                    Release assurance
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    Formal egress proof pending
                  </p>
                </div>
              </div>
            </section>
          ) : null}
          <footer className="mt-10 flex flex-col gap-3 border-t py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              Candidate {manifest.version} · Browser Canvas · Static raster
              output
            </p>
            <a
              href="/pdf/merge"
              className="focus-ring rounded font-semibold text-foreground hover:underline"
            >
              Next: Merge PDF →
            </a>
          </footer>
        </div>
      </section>
    </AppShell>
  );
}
