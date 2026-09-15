/* oxlint-disable */
'use client';

import {
  ArrowDownToLine,
  CheckCircle2,
  Eraser,
  FileImage,
  FlipHorizontal2,
  FlipVertical2,
  LockKeyhole,
  RotateCw,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import NextImage from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import type { BackgroundRemovalResponse } from '@/lib/tools/background-removal/protocol';
import { publicTools } from '@/lib/tools/catalog';
import {
  canvasFilter,
  extensionForRasterType,
  makeSolidBackgroundTransparent,
  supportedRasterTypes,
  transformedDimensions,
  validateCrop,
  type QuarterTurn,
  type RasterFormat,
} from '@/lib/tools/image';

type SourceImage = { file: File; url: string; width: number; height: number };
type Result = {
  url: string;
  blob: Blob;
  width: number;
  height: number;
  durationMs: number;
  format: RasterFormat;
  removedPixels: number;
};
const MAX_BYTES = 25 * 1024 * 1024;

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error('The browser could not decode this image.'));
    image.src = url;
  });
}

/** Runs U²-Net inference in a disposable worker; the image never leaves the tab. */
function removeBackgroundLocally(image: Blob) {
  const worker = new Worker(
    new URL('../workers/background-removal.worker.ts', import.meta.url),
    { type: 'module', name: 'background-removal-engine' },
  );
  return new Promise<Blob>((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<BackgroundRemovalResponse>) => {
      if (event.data.type === 'done') resolve(event.data.image);
      else reject(new Error(event.data.message));
    };
    worker.onerror = () =>
      reject(new Error('The local background removal engine failed to load.'));
    worker.postMessage({ type: 'remove', image });
  }).finally(() => worker.terminate());
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

export function ImageEditorTool({
  defaultRemoveBackground = false,
}: {
  defaultRemoveBackground?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const sourceRef = useRef<SourceImage | null>(null);
  const resultRef = useRef<Result | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [source, setSource] = useState<SourceImage | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 1, height: 1 });
  const [rotation, setRotation] = useState<QuarterTurn>(0);
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [grayscale, setGrayscale] = useState(0);
  const [sepia, setSepia] = useState(0);
  const [removeBackground, setRemoveBackground] = useState(
    defaultRemoveBackground,
  );
  const [removeBackgroundMode, setRemoveBackgroundMode] = useState<
    'solid' | 'ai'
  >('ai');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [backgroundTolerance, setBackgroundTolerance] = useState(36);
  const [edgeSoftness, setEdgeSoftness] = useState(24);
  const [format, setFormat] = useState<RasterFormat>(
    defaultRemoveBackground ? 'image/png' : 'image/webp',
  );
  const [quality, setQuality] = useState(90);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const manifest = publicTools.find((tool) => tool.id === 'image-editor')!;

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

  // Auto-run when a new image is loaded if removeBackground is active
  useEffect(() => {
    if (source && removeBackground && !resultRef.current && !busy) {
      const timer = setTimeout(() => {
        void run();
      }, 50);
      return () => clearTimeout(timer);
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  const clearResult = () => {
    if (resultRef.current) URL.revokeObjectURL(resultRef.current.url);
    resultRef.current = null;
    setResult(null);
  };
  const change = (run: () => void) => {
    clearResult();
    run();
  };

  const chooseImage = async (file?: File) => {
    if (!file || busy) return;
    clearResult();
    setError('');
    if (!supportedRasterTypes.has(file.type as RasterFormat)) {
      setError('Choose a static JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_BYTES) {
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
      setCrop({ x: 0, y: 0, width: next.width, height: next.height });
      setRotation(0);
      setFlipX(false);
      setFlipY(false);
      setBrightness(100);
      setContrast(100);
      setGrayscale(0);
      setSepia(0);
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
    setError('');
    clearResult();
    setBusy(true);
    const started = performance.now();
    try {
      const safeCrop = validateCrop(crop, source.width, source.height);
      let activeSourceUrl = source.url;
      if (removeBackground && removeBackgroundMode === 'ai') {
        const aiBlob = await removeBackgroundLocally(source.file);
        activeSourceUrl = URL.createObjectURL(aiBlob);
      }
      const decoded = await loadImage(activeSourceUrl);
      if (activeSourceUrl !== source.url) {
        URL.revokeObjectURL(activeSourceUrl);
      }
      const dimensions = transformedDimensions(
        safeCrop.width,
        safeCrop.height,
        rotation,
      );
      if (dimensions.width * dimensions.height > 64_000_000) {
        throw new Error(
          'The edited image exceeds the 64 megapixel canvas limit.',
        );
      }
      if (
        removeBackground &&
        removeBackgroundMode === 'solid' &&
        dimensions.width * dimensions.height > 16_000_000
      ) {
        throw new Error(
          'Solid-background removal is limited to 16 megapixels per image.',
        );
      }
      if (removeBackground && format === 'image/jpeg') {
        throw new Error(
          'Choose PNG or WebP to preserve the transparent background.',
        );
      }
      const canvas = document.createElement('canvas');
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      const context = canvas.getContext('2d', {
        alpha: format !== 'image/jpeg',
      });
      if (!context)
        throw new Error('Canvas processing is unavailable in this browser.');
      if (format === 'image/jpeg') {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      context.save();
      context.translate(canvas.width / 2, canvas.height / 2);
      context.rotate((rotation * Math.PI) / 180);
      context.scale(flipX ? -1 : 1, flipY ? -1 : 1);
      context.filter = canvasFilter({ brightness, contrast, grayscale, sepia });
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(
        decoded,
        safeCrop.x,
        safeCrop.y,
        safeCrop.width,
        safeCrop.height,
        -safeCrop.width / 2,
        -safeCrop.height / 2,
        safeCrop.width,
        safeCrop.height,
      );
      context.restore();
      let removedPixels = 0;
      if (removeBackground && removeBackgroundMode === 'solid') {
        const imageData = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        );
        removedPixels = makeSolidBackgroundTransparent(
          imageData.data,
          backgroundColor,
          backgroundTolerance,
          edgeSoftness,
        );
        context.putImageData(imageData, 0, 0);
      }
      const blob = await encodeCanvas(canvas, format, quality / 100);
      if (blob.type !== format)
        throw new Error(
          'This browser did not produce the selected output format.',
        );
      const url = URL.createObjectURL(blob);
      const checked = await loadImage(url);
      if (
        checked.naturalWidth !== dimensions.width ||
        checked.naturalHeight !== dimensions.height
      ) {
        URL.revokeObjectURL(url);
        throw new Error('The edited image failed its dimension check.');
      }
      const next = {
        url,
        blob,
        ...dimensions,
        durationMs: performance.now() - started,
        format,
        removedPixels,
      };
      resultRef.current = next;
      setResult(next);
      announceCompletion({
        operation: !removeBackground
          ? 'Local photo editor'
          : removeBackgroundMode === 'ai'
            ? 'AI background remover'
            : 'Solid background remover',
        durationMs: next.durationMs,
        summary: `${next.width} × ${next.height}px image edited and checked in this browser.`,
        metrics: [
          { label: 'Before', value: formatBytes(source.file.size) },
          { label: 'After', value: formatBytes(blob.size) },
          {
            label: 'Output',
            value: format.replace('image/', '').toUpperCase(),
          },
          ...(removeBackground && removeBackgroundMode === 'solid'
            ? [
                {
                  label: 'Pixels cleared',
                  value: removedPixels.toLocaleString('en-US'),
                },
              ]
            : []),
        ],
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'The image could not be edited.',
      );
    } finally {
      setBusy(false);
    }
  };

  const clear = () => {
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
    link.download = `edited-image.${extensionForRasterType(result.format)}`;
    link.click();
  };

  return (
    <AppShell currentToolId="image-editor">
      <section
        id="tool"
        tabIndex={-1}
        className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-12"
      >
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col justify-between gap-5 border-b pb-8 sm:flex-row sm:items-start">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span>Images</span>
                <span aria-hidden="true">/</span>
                <span>{defaultRemoveBackground ? 'Background' : 'Edit'}</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                {defaultRemoveBackground
                  ? 'Remove solid background'
                  : 'Edit image'}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                {defaultRemoveBackground
                  ? 'Make a white or selected plain-color background transparent, with adjustable edge tolerance.'
                  : 'Crop, rotate, flip, and tune one static image without uploading it.'}
              </p>
            </div>
            <span className="flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold">
              <LockKeyhole aria-hidden="true" className="size-3.5" /> On-device
              prototype
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
                <p className="font-semibold">Couldn’t edit this image</p>
                <p className="mt-1 text-muted-foreground">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => setError('')}
                className="focus-ring rounded p-1"
                aria-label="Dismiss error"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
          ) : null}

          <section className="mt-8 overflow-hidden rounded-2xl border bg-card">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="min-h-[460px] border-b p-4 lg:border-b-0 lg:border-r sm:p-6">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  aria-label="Choose image"
                  onChange={(event) =>
                    void chooseImage(event.target.files?.[0])
                  }
                />
                {source ? (
                  <div className="flex h-full min-h-[410px] flex-col">
                    <div className="flex items-center justify-between gap-3 border-b pb-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {source.file.name}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {source.width} × {source.height}px ·{' '}
                          {formatBytes(source.file.size)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="h-10"
                        onClick={() => fileRef.current?.click()}
                      >
                        Replace
                      </Button>
                    </div>
                    <div className="grid flex-1 place-items-center py-6">
                      <NextImage
                        src={result?.url ?? source.url}
                        width={result?.width ?? source.width}
                        height={result?.height ?? source.height}
                        unoptimized
                        alt={
                          result
                            ? 'Edited image preview'
                            : 'Source image preview'
                        }
                        className="max-h-[520px] max-w-full rounded-lg object-contain bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjZmZmIi8+PHBhdGggZD0iTTAgMTBoMTB2MTBIMHpNMTAgMGgxMHYxMEgxMHoiIGZpbGw9IiNlNWU3ZWIiIC8+PC9zdmc+')] shadow-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    aria-label="Choose an image to edit"
                    onClick={() => fileRef.current?.click()}
                    className="focus-ring grid min-h-[420px] w-full place-items-center rounded-xl border border-dashed bg-muted/45 p-8 text-center"
                  >
                    <span>
                      <span className="mx-auto grid size-12 place-items-center rounded-xl border bg-background">
                        <FileImage aria-hidden="true" className="size-5" />
                      </span>
                      <span className="mt-4 block font-semibold">
                        Choose an image
                      </span>
                      <span className="mt-1 block text-sm text-muted-foreground">
                        JPEG, PNG, or WebP · up to 25 MB
                      </span>
                    </span>
                  </button>
                )}
              </div>
              <div className="p-4 sm:p-6">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <SlidersHorizontal aria-hidden="true" className="size-4" />{' '}
                  Adjustments
                </h2>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {(['x', 'y', 'width', 'height'] as const).map((field) => (
                    <label
                      key={field}
                      className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {field}
                      <input
                        type="number"
                        min={field === 'width' || field === 'height' ? 1 : 0}
                        value={crop[field]}
                        disabled={!source || busy}
                        onChange={(event) =>
                          change(() =>
                            setCrop((current) => ({
                              ...current,
                              [field]: Number(event.target.value),
                            })),
                          )
                        }
                        className="focus-ring mt-2 h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground"
                      />
                    </label>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    disabled={!source || busy}
                    onClick={() =>
                      change(() =>
                        setRotation(
                          (current) => ((current + 90) % 360) as QuarterTurn,
                        ),
                      )
                    }
                  >
                    <RotateCw aria-hidden="true" /> Rotate
                  </Button>
                  <Button
                    variant={flipX ? 'default' : 'outline'}
                    disabled={!source || busy}
                    onClick={() =>
                      change(() => setFlipX((current) => !current))
                    }
                  >
                    <FlipHorizontal2 aria-hidden="true" /> Flip H
                  </Button>
                  <Button
                    variant={flipY ? 'default' : 'outline'}
                    disabled={!source || busy}
                    onClick={() =>
                      change(() => setFlipY((current) => !current))
                    }
                  >
                    <FlipVertical2 aria-hidden="true" /> Flip V
                  </Button>
                </div>
                {[
                  ['Brightness', brightness, setBrightness, 0, 200],
                  ['Contrast', contrast, setContrast, 0, 200],
                  ['Grayscale', grayscale, setGrayscale, 0, 100],
                  ['Sepia', sepia, setSepia, 0, 100],
                ].map(([label, value, setter, min, max]) => (
                  <label
                    key={label as string}
                    className="mt-4 block text-xs font-semibold"
                  >
                    {label as string}{' '}
                    <span className="tabular text-muted-foreground">
                      {value as number}%
                    </span>
                    <input
                      type="range"
                      min={min as number}
                      max={max as number}
                      value={value as number}
                      disabled={!source || busy}
                      onChange={(event) =>
                        change(() =>
                          (setter as (value: number) => void)(
                            Number(event.target.value),
                          ),
                        )
                      }
                      className="mt-2 w-full accent-foreground"
                    />
                  </label>
                ))}
                <section className="mt-5 rounded-xl border bg-muted/35 p-4">
                  <label className="flex items-start gap-3 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={removeBackground}
                      disabled={!source || busy}
                      onChange={(event) =>
                        change(() => {
                          setRemoveBackground(event.target.checked);
                          if (event.target.checked) setFormat('image/png');
                        })
                      }
                      className="mt-0.5 size-4 accent-foreground"
                    />
                    <span>
                      Remove background
                      <span className="mt-1 block text-xs font-normal leading-5 text-muted-foreground">
                        Extract subjects using AI, or remove a plain color.
                      </span>
                    </span>
                  </label>
                  {removeBackground ? (
                    <div className="mt-4 space-y-4 border-t pt-4">
                      <div className="flex gap-4 mb-4">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="bgMode"
                            checked={removeBackgroundMode === 'ai'}
                            onChange={() =>
                              change(() => setRemoveBackgroundMode('ai'))
                            }
                            disabled={!source || busy}
                            className="accent-foreground"
                          />
                          AI Subject (Smart)
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="bgMode"
                            checked={removeBackgroundMode === 'solid'}
                            onChange={() =>
                              change(() => setRemoveBackgroundMode('solid'))
                            }
                            disabled={!source || busy}
                            className="accent-foreground"
                          />
                          Solid Color
                        </label>
                      </div>

                      {removeBackgroundMode === 'solid' ? (
                        <>
                          <label className="flex items-center justify-between gap-3 text-xs font-semibold">
                            Background color
                            <span className="flex items-center gap-2">
                              <input
                                type="color"
                                value={backgroundColor}
                                disabled={!source || busy}
                                onChange={(event) =>
                                  change(() =>
                                    setBackgroundColor(event.target.value),
                                  )
                                }
                                className="focus-ring size-9 rounded-lg border bg-background p-1"
                                aria-label="Background color to remove"
                              />
                              <input
                                value={backgroundColor}
                                maxLength={7}
                                disabled={!source || busy}
                                onChange={(event) =>
                                  change(() =>
                                    setBackgroundColor(event.target.value),
                                  )
                                }
                                className="focus-ring h-9 w-24 rounded-lg border bg-background px-2 font-mono text-xs"
                                aria-label="Background color hex value"
                              />
                            </span>
                          </label>
                          <label className="block text-xs font-semibold">
                            Color tolerance{' '}
                            <span className="tabular text-muted-foreground">
                              {backgroundTolerance}
                            </span>
                            <input
                              type="range"
                              min="0"
                              max="180"
                              value={backgroundTolerance}
                              disabled={!source || busy}
                              onChange={(event) =>
                                change(() =>
                                  setBackgroundTolerance(
                                    Number(event.target.value),
                                  ),
                                )
                              }
                              className="mt-2 w-full accent-foreground"
                            />
                          </label>
                          <label className="block text-xs font-semibold">
                            Edge softness{' '}
                            <span className="tabular text-muted-foreground">
                              {edgeSoftness}
                            </span>
                            <input
                              type="range"
                              min="0"
                              max="96"
                              value={edgeSoftness}
                              disabled={!source || busy}
                              onChange={(event) =>
                                change(() =>
                                  setEdgeSoftness(Number(event.target.value)),
                                )
                              }
                              className="mt-2 w-full accent-foreground"
                            />
                          </label>
                        </>
                      ) : (
                        <div className="text-xs text-muted-foreground rounded-lg border p-3 bg-background">
                          A U²-Net model detects the main subject and removes
                          everything else, entirely in this browser.
                          <br />
                          <br />
                          <i>
                            The first run loads a 4.4 MB model and a 12 MB
                            WebAssembly runtime from this site. Your image is
                            never uploaded. Fine hair and fur edges may look
                            soft.
                          </i>
                        </div>
                      )}
                    </div>
                  ) : null}
                </section>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <label className="text-xs font-semibold">
                    Format
                    <select
                      value={format}
                      disabled={!source || busy}
                      onChange={(event) =>
                        change(() =>
                          setFormat(event.target.value as RasterFormat),
                        )
                      }
                      className="focus-ring mt-2 h-10 w-full rounded-lg border bg-background px-3 text-sm"
                    >
                      <option value="image/webp">WebP</option>
                      <option value="image/jpeg" disabled={removeBackground}>
                        JPEG
                      </option>
                      <option value="image/png">PNG</option>
                    </select>
                  </label>
                  <label className="text-xs font-semibold">
                    Quality{' '}
                    <span className="tabular text-muted-foreground">
                      {format === 'image/png' ? 'lossless' : `${quality}%`}
                    </span>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={quality}
                      disabled={!source || busy || format === 'image/png'}
                      onChange={(event) =>
                        change(() => setQuality(Number(event.target.value)))
                      }
                      className="mt-3 w-full accent-foreground"
                    />
                  </label>
                </div>
                <Button
                  className="mt-5 h-11 w-full"
                  disabled={!source || busy}
                  onClick={() => void run()}
                >
                  {removeBackground ? (
                    <Eraser aria-hidden="true" />
                  ) : (
                    <SlidersHorizontal aria-hidden="true" />
                  )}
                  {busy
                    ? 'Rendering locally…'
                    : removeBackground
                      ? 'Remove background'
                      : 'Apply edits'}
                </Button>
                {source ? (
                  <Button
                    variant="ghost"
                    className="mt-2 h-11 w-full"
                    disabled={busy}
                    onClick={clear}
                  >
                    <Trash2 aria-hidden="true" /> Clear
                  </Button>
                ) : null}
              </div>
            </div>
          </section>

          {result && source ? (
            <section className="mt-5 overflow-hidden rounded-2xl border bg-card">
              <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full border">
                    <CheckCircle2 aria-hidden="true" className="size-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold">
                      Done — {result.width} × {result.height}px
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatBytes(source.file.size)} →{' '}
                      {formatBytes(result.blob.size)} ·{' '}
                      {formatDuration(result.durationMs)}
                    </p>
                  </div>
                </div>
                <Button data-receipt-download className="h-11" onClick={save}>
                  <ArrowDownToLine aria-hidden="true" /> Save image
                </Button>
              </div>
              <div className="grid border-t sm:grid-cols-3">
                <div className="border-b p-4 sm:border-b-0 sm:border-r">
                  <p className="text-xs text-muted-foreground">Processing</p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
                    <ShieldCheck aria-hidden="true" className="size-4" /> In
                    this browser tab
                  </p>
                </div>
                <div className="border-b p-4 sm:border-b-0 sm:border-r">
                  <p className="text-xs text-muted-foreground">Output check</p>
                  <p className="mt-1 text-sm font-semibold">
                    Decoded dimensions match
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-muted-foreground">
                    Output behavior
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {result.removedPixels
                      ? `${result.removedPixels.toLocaleString('en-US')} pixels cleared`
                      : 'Metadata is not copied'}
                  </p>
                </div>
              </div>
            </section>
          ) : null}
          <footer className="mt-10 border-t py-6 text-xs text-muted-foreground">
            Candidate {manifest.version} · Browser Canvas · Static raster output
          </footer>
        </div>
      </section>
    </AppShell>
  );
}
