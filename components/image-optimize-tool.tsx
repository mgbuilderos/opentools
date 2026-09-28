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
import { useToolUi } from '@/components/locale-edition-provider';
import { fillMessage, type ToolUiMessages } from '@/lib/i18n/tool-ui';
import {
  BatchLocalPromise,
  BatchRunnerPanel,
  useFileBatchRunner,
} from '@/components/batch-runner';
import {
  RecipeAppliedNotice,
  RecipeShareButton,
} from '@/components/recipe-link-bar';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import { publicTools } from '@/lib/tools/catalog';
import {
  calculateContainDimensions,
  extensionForRasterType,
  supportedRasterTypes,
  type RasterFormat,
} from '@/lib/tools/image';
import {
  IMAGE_OPTIMIZE_RECIPE,
  describeRecipe,
  readRecipeValues,
  recipeParamNames,
} from '@/lib/tools/recipe-link';

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

/*
  The bundle is a parameter, not a hook call: these three are plain helpers
  outside the component, and the message a thrown Error carries is shown to the
  reader, so it has to be in the reader's language.
*/
function loadImage(url: string, t: ToolUiMessages) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(t.optimizeDecodeFailed));
    image.src = url;
  });
}

function encodeCanvas(
  canvas: HTMLCanvasElement,
  format: RasterFormat,
  quality: number,
  t: ToolUiMessages,
) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error(t.optimizeEncodeFailed)),
      format,
      quality,
    );
  });
}

async function optimizeImage({
  t,
  url,
  width,
  height,
  maxWidth,
  maxHeight,
  format,
  quality,
}: {
  t: ToolUiMessages;
  url: string;
  width: number;
  height: number;
  maxWidth: number;
  maxHeight: number;
  format: RasterFormat;
  quality: number;
}) {
  const decoded = await loadImage(url, t);
  const dimensions = calculateContainDimensions(
    width,
    height,
    maxWidth,
    maxHeight,
  );
  const canvas = document.createElement('canvas');
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const context = canvas.getContext('2d', {
    alpha: format !== 'image/jpeg',
  });
  if (!context) throw new Error(t.optimizeCanvasUnavailable);
  if (format === 'image/jpeg') {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(decoded, 0, 0, canvas.width, canvas.height);
  const blob = await encodeCanvas(canvas, format, quality / 100, t);
  // WebKit answers a WebP request with a PNG rather than failing. Keep what the
  // browser produced and name the file for the format it actually is.
  const encodedFormat = blob.type as RasterFormat;
  if (!supportedRasterTypes.has(encodedFormat)) {
    throw new Error(t.optimizeNoFormat);
  }
  const validationUrl = URL.createObjectURL(blob);
  try {
    const validationImage = await loadImage(validationUrl, t);
    if (
      validationImage.naturalWidth !== dimensions.width ||
      validationImage.naturalHeight !== dimensions.height
    ) {
      throw new Error(t.optimizeDimensionCheckFailed);
    }
  } finally {
    URL.revokeObjectURL(validationUrl);
  }
  return { blob, format: encodedFormat, ...dimensions };
}

function baseName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '') || 'image';
}

export function ImageOptimizeTool() {
  /* Localised control strings; the English bundle everywhere else. */
  const t = useToolUi();
  const fileRef = useRef<HTMLInputElement>(null);
  const sourceRef = useRef<SourceImage | null>(null);
  const resultRef = useRef<ImageReceipt | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  /**
   * True once a shared link has supplied max width or height.
   *
   * WHY IT IS NEEDED. Choosing a file normally re-fits those two boxes to the
   * image's own dimensions, which is right for someone who set nothing. For
   * someone who arrived from a link it is wrong: the notice says "max width
   * 720 px", they pick a 64 px image, and the shared bound is silently
   * replaced by 64 before they ever press the button. Caught by
   * `e2e/recipe-links.spec.ts`; it is a ref and not state because nothing
   * renders from it.
   */
  const recipeSetDimensionsRef = useRef(false);
  const [source, setSource] = useState<SourceImage | null>(null);
  const [result, setResult] = useState<ImageReceipt | null>(null);
  const [maxWidth, setMaxWidth] = useState(1600);
  const [maxHeight, setMaxHeight] = useState(1600);
  const [format, setFormat] = useState<RasterFormat>('image/webp');
  const [quality, setQuality] = useState(82);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const batch = useFileBatchRunner();
  const [recipeSummary, setRecipeSummary] = useState('');
  const manifest = publicTools.find((tool) => tool.id === 'image-optimize')!;

  // Settings shared from someone else's link, applied once and then cleared
  // out of the address bar.
  //
  // WHY THE PARAMS ARE STRIPPED rather than kept as the source of truth, which
  // is how `?tool=` works on the workbenches. These settings stay editable
  // after arrival, so a URL that kept asserting them would have to be rewritten
  // on every slider tick to avoid fighting the person using the page. Applying
  // once and removing the params means the effect is idempotent: if React
  // rebuilds the tree recovering from a hydration mismatch — the trap
  // documented in text-workbench-tool.tsx — this either runs again with the
  // same values or finds nothing left to do. Neither outcome loses an edit.
  /* oxlint-disable react/react-compiler -- this effect reads the address bar,
     an external system, which is what the rule's own guidance says an effect
     is for. It runs once on mount, so the cascading render the rule warns
     about happens exactly once, before anyone has typed anything. */
  useEffect(() => {
    const applied = readRecipeValues(
      IMAGE_OPTIMIZE_RECIPE,
      window.location.search,
    );
    if (Object.keys(applied).length === 0) return;

    if (typeof applied.format === 'string') {
      setFormat(`image/${applied.format}` as RasterFormat);
    }
    if (typeof applied.quality === 'number') setQuality(applied.quality);
    if (typeof applied.width === 'number') setMaxWidth(applied.width);
    if (typeof applied.height === 'number') setMaxHeight(applied.height);
    if (
      typeof applied.width === 'number' ||
      typeof applied.height === 'number'
    ) {
      recipeSetDimensionsRef.current = true;
    }
    setRecipeSummary(describeRecipe(IMAGE_OPTIMIZE_RECIPE, applied));

    const url = new URL(window.location.href);
    for (const name of recipeParamNames(IMAGE_OPTIMIZE_RECIPE)) {
      url.searchParams.delete(name);
    }
    window.history.replaceState(
      null,
      '',
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, []);
  /* oxlint-enable react/react-compiler */

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
      setError(t.optimizeWrongType);
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(t.optimizeLimitNote);
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      const decoded = await loadImage(url, t);
      if (sourceRef.current) URL.revokeObjectURL(sourceRef.current.url);
      const next = {
        file,
        url,
        width: decoded.naturalWidth,
        height: decoded.naturalHeight,
      };
      sourceRef.current = next;
      setSource(next);
      // Fit the bounds to the image, unless a shared link already chose them.
      if (!recipeSetDimensionsRef.current) {
        setMaxWidth(Math.min(decoded.naturalWidth, 2400));
        setMaxHeight(Math.min(decoded.naturalHeight, 2400));
      }
    } catch (caught) {
      URL.revokeObjectURL(url);
      setError(
        caught instanceof Error ? caught.message : t.optimizeDecodeFailed,
      );
    }
  };

  const chooseImages = (files?: FileList | File[]) => {
    const selected = Array.from(files ?? []);
    if (selected.length === 0 || busy || batch.running) return;
    if (selected.length === 1) {
      batch.reset();
      setBatchFiles([]);
      void chooseImage(selected[0]);
      return;
    }
    clearResult();
    if (sourceRef.current) URL.revokeObjectURL(sourceRef.current.url);
    sourceRef.current = null;
    setSource(null);
    setError('');
    batch.reset();
    setBatchFiles(selected);
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
      setError(t.optimizeBadDimensions);
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
      const optimized = await optimizeImage({
        t,
        url: source.url,
        width: source.width,
        height: source.height,
        maxWidth: targetMaxWidth,
        maxHeight: targetMaxHeight,
        format: targetFormat,
        quality: targetQuality,
      });
      const validationUrl = URL.createObjectURL(optimized.blob);
      const next = {
        url: validationUrl,
        ...optimized,
        durationMs: performance.now() - started,
      };
      resultRef.current = next;
      setResult(next);
      announceCompletion({
        operation: t.optimizeOperation,
        recipe: {
          id: IMAGE_OPTIMIZE_RECIPE.id,
          values: {
            format: targetFormat.split('/')[1],
            quality: targetQuality,
            width: targetMaxWidth,
            height: targetMaxHeight,
          },
        },
        durationMs: next.durationMs,
        summary: fillMessage(t.optimizeSummary, {
          format: optimized.format.replace('image/', '').toUpperCase(),
          width: next.width,
          height: next.height,
        }),
        metrics: [
          { label: t.before, value: formatBytes(source.file.size) },
          { label: t.after, value: formatBytes(optimized.blob.size) },
          {
            label: t.saved,
            value: `${Math.max(0, Math.round((1 - optimized.blob.size / source.file.size) * 100))}%`,
          },
        ],
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.optimizeFailed);
    } finally {
      setBusy(false);
    }
  };

  const startBatch = () => {
    if (
      !Number.isFinite(maxWidth) ||
      !Number.isFinite(maxHeight) ||
      maxWidth < 1 ||
      maxHeight < 1 ||
      maxWidth > 12000 ||
      maxHeight > 12000
    ) {
      setError(t.optimizeBadDimensions);
      return;
    }
    setError('');
    const settings = {
      maxWidth: Math.floor(maxWidth),
      maxHeight: Math.floor(maxHeight),
      format,
      quality,
    };
    void batch.start(batchFiles, async (file, _index, signal) => {
      if (!supportedRasterTypes.has(file.type as RasterFormat)) {
        return {
          status: 'skipped',
          reason: 'Choose a JPEG, PNG, or WebP image.',
        };
      }
      if (file.size > MAX_IMAGE_BYTES) {
        return {
          status: 'skipped',
          reason: t.optimizeTooLarge,
        };
      }
      if (signal.aborted) {
        return { status: 'skipped', reason: 'Batch cancelled.' };
      }
      const url = URL.createObjectURL(file);
      try {
        const decoded = await loadImage(url, t);
        const optimized = await optimizeImage({
          t,
          url,
          width: decoded.naturalWidth,
          height: decoded.naturalHeight,
          ...settings,
        });
        return {
          status: 'done',
          output: {
            blob: optimized.blob,
            fileName: `${baseName(file.name)}-optimized.${extensionForRasterType(optimized.format)}`,
          },
        };
      } finally {
        URL.revokeObjectURL(url);
      }
    });
  };

  const clearAll = () => {
    batch.reset();
    setBatchFiles([]);
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
                <span>{t.optimizeImage}</span>
                <span aria-hidden="true">/</span>
                <span>{t.optimizeAction}</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                {t.optimizeTitle}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                {t.optimizeStandfirst}
              </p>
            </div>
            <span className="flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold">
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              {t.onDevicePrototype}
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
                <p className="font-semibold">{t.optimizeCouldnt}</p>
                <p className="mt-1 text-muted-foreground">{error}</p>
              </div>
              <button
                type="button"
                className="focus-ring rounded p-1"
                onClick={() => setError('')}
                aria-label={t.dismissError}
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
          ) : null}
          <div className="mt-8">
            <RecipeAppliedNotice summary={recipeSummary} />
          </div>
          <section className="overflow-hidden rounded-2xl border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-4 sm:px-5">
              <div>
                <h2 className="text-sm font-semibold">
                  {t.optimizeSourceImage}
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t.optimizeAcceptHint}
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
                    <p className="mt-4 font-semibold">{t.optimizeChoose}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t.optimizeOriginalUnchanged}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  aria-label={t.optimizeChooseAria}
                  className="sr-only"
                  onChange={(event) => chooseImages(event.target.files ?? [])}
                />
                <Button
                  variant="outline"
                  className="h-11 w-full"
                  disabled={busy || batch.running}
                  onClick={() => fileRef.current?.click()}
                >
                  <FileImage aria-hidden="true" />
                  {source || batchFiles.length > 0
                    ? t.chooseAnother
                    : t.optimizeChooseMany}
                </Button>
                <BatchLocalPromise />
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <label className="text-xs font-semibold">
                    {t.optimizeMaxWidth}
                    <input
                      type="number"
                      min="1"
                      max="12000"
                      value={maxWidth}
                      disabled={busy || batch.running}
                      onChange={(event) => {
                        clearResult();
                        setMaxWidth(Number(event.target.value));
                      }}
                      className="focus-ring mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm"
                    />
                  </label>
                  <label className="text-xs font-semibold">
                    {t.optimizeMaxHeight}
                    <input
                      type="number"
                      min="1"
                      max="12000"
                      value={maxHeight}
                      disabled={busy || batch.running}
                      onChange={(event) => {
                        clearResult();
                        setMaxHeight(Number(event.target.value));
                      }}
                      className="focus-ring mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm"
                    />
                  </label>
                </div>
                <label className="mt-4 block text-xs font-semibold">
                  {t.optimizeOutputFormat}
                  <select
                    value={format}
                    disabled={busy || batch.running}
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
                    disabled={busy || batch.running || format === 'image/png'}
                    onChange={(event) => {
                      clearResult();
                      setQuality(Number(event.target.value));
                    }}
                    className="mt-2 h-6 w-full cursor-pointer accent-foreground"
                  />
                </label>
                {batchFiles.length === 0 ? (
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
                    {busy ? t.optimizeBusy : t.optimizeTitle}
                  </Button>
                ) : null}
                {source ? (
                  <Button
                    variant="ghost"
                    className="mt-2 h-11 w-full"
                    disabled={busy}
                    onClick={clearAll}
                  >
                    <Trash2 aria-hidden="true" />
                    {t.clear}
                  </Button>
                ) : null}
                <RecipeShareButton
                  definition={IMAGE_OPTIMIZE_RECIPE}
                  values={{
                    format: format.split('/')[1],
                    quality,
                    width: maxWidth,
                    height: maxHeight,
                  }}
                />
              </div>
            </div>
          </section>
          {batchFiles.length > 1 ? (
            <BatchRunnerPanel
              files={batchFiles}
              runner={batch}
              startLabel={t.optimizeAll}
              zipName="optimized-images.zip"
              onStart={startBatch}
              onClear={clearAll}
            />
          ) : null}
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
                    alt={t.optimizePreviewAlt}
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
                <Button data-receipt-download className="h-11" onClick={save}>
                  <ArrowDownToLine aria-hidden="true" />
                  {t.optimizeSave}
                </Button>
              </div>
              <div className="grid border-t sm:grid-cols-3">
                <div className="border-b p-4 sm:border-b-0 sm:border-r sm:p-5">
                  <p className="text-xs text-muted-foreground">
                    {t.processing}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
                    <ShieldCheck
                      aria-hidden="true"
                      className="size-4 text-success"
                    />
                    {t.optimizeInThisTab}
                  </p>
                </div>
                <div className="border-b p-4 sm:border-b-0 sm:border-r sm:p-5">
                  <p className="text-xs text-muted-foreground">
                    {t.outputCheck}
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {t.optimizeDecodedMatch}
                  </p>
                </div>
                <div className="p-4 sm:p-5">
                  <p className="text-xs text-muted-foreground">
                    {t.optimizeReleaseAssurance}
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {t.optimizeEgressPending}
                  </p>
                </div>
              </div>
            </section>
          ) : null}
          <footer className="mt-10 flex flex-col gap-3 border-t py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              Candidate {manifest.version} · {t.browserCanvasNote}
            </p>
            <a
              href="/pdf/merge"
              className="focus-ring rounded font-semibold text-foreground hover:underline"
            >
              {t.optimizeNextMerge}
            </a>
          </footer>
        </div>
      </section>
    </AppShell>
  );
}
