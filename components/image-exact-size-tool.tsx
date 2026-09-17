'use client';

import {
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  FileImage,
  LockKeyhole,
  Scaling,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import { publicTools } from '@/lib/tools/catalog';
import {
  QUALITY_FLOOR,
  MIN_SHRINK_EDGE,
  aspectDiffers,
  checkConstraints,
  fitToSize,
  formatKb,
  maxBytesFor,
  minBytesFor,
  planDraw,
  readDpi,
  resolveOutputSize,
  validateRequest,
  type ConstraintCheck,
  type ExactOutputFormat,
  type ExactSizeRequest,
  type FitMode,
  type FitResult,
  type KbUnit,
} from '@/lib/tools/exact-size';

type SourceImage = {
  id: string;
  file: File;
  url: string;
  width: number;
  height: number;
};

type ExactResult = {
  id: string;
  name: string;
  fileName: string;
  url: string | null;
  fit: FitResult;
  checks: ConstraintCheck[];
  requested: { width: number; height: number };
  decoded: { width: number; height: number };
  dpi: number | null;
};

const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_FILES = 20;

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error('The browser could not decode this image.'));
    image.src = url;
  });
}

function canvasBlob(
  canvas: HTMLCanvasElement,
  format: ExactOutputFormat,
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

const optionalNumber = (value: string) =>
  value.trim() === '' ? undefined : Number(value);

function baseName(name: string) {
  const dot = name.lastIndexOf('.');
  const stem = (dot > 0 ? name.slice(0, dot) : name)
    .replace(/[^\w.-]+/gu, '-')
    .slice(0, 60);
  return stem || 'image';
}

function explain(result: ExactResult, request: ExactSizeRequest) {
  const { fit } = result;
  const { attempt } = fit;
  const unit = request.kbUnit;
  const size = formatKb(attempt.bytes.length, unit);
  const pixels = `${fit.requestedWidth} × ${fit.requestedHeight} px`;
  if (fit.outcome === 'over-max') {
    const how =
      request.format === 'image/png'
        ? `PNG has no quality setting, so its size depends only on pixels and colours; at ${pixels} it is ${size}.`
        : `Even at the lowest quality tried (${QUALITY_FLOOR}%) it is ${size}.`;
    const next = fit.pixelsReduced
      ? ''
      : request.format === 'image/png'
        ? ' Allow smaller pixels, switch to JPEG, or raise the limit.'
        : ' Allow smaller pixels or raise the limit.';
    return `Can’t reach ${request.maxKb} KB at ${pixels}. ${how}${next}`;
  }
  if (fit.outcome === 'under-min') {
    const min = `${request.minKb} KB`;
    if (fit.gapBetweenQualities) {
      return `No quality setting lands between ${min} and ${request.maxKb} KB: quality ${attempt.quality}% gives ${size}, and the next step up goes over the maximum. The file is not padded with filler bytes.`;
    }
    const best =
      request.format === 'image/png'
        ? `At ${attempt.width} × ${attempt.height} px this PNG is ${size}`
        : `At full quality this image is only ${size}`;
    return `${best}, under the minimum of ${min}. The file is not padded with filler bytes; a larger image or more pixels would be needed.`;
  }
  if (fit.pixelsReduced) {
    return `Pixels reduced from ${pixels} to ${attempt.width} × ${attempt.height} px because you allowed smaller pixels.`;
  }
  return '';
}

export function ImageExactSizeTool() {
  const fileRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);
  const sourcesRef = useRef<SourceImage[]>([]);
  const resultsRef = useRef<ExactResult[]>([]);
  const formId = useId();

  const [sources, setSources] = useState<SourceImage[]>([]);
  const [results, setResults] = useState<ExactResult[]>([]);
  const [lastRequest, setLastRequest] = useState<ExactSizeRequest | null>(null);
  const [maxKb, setMaxKb] = useState('50');
  const [minKb, setMinKb] = useState('');
  const [kbUnit, setKbUnit] = useState<KbUnit>(1024);
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [fit, setFit] = useState<FitMode>('crop');
  const [dpi, setDpi] = useState('');
  const [format, setFormat] = useState<ExactOutputFormat>('image/jpeg');
  const [allowSmaller, setAllowSmaller] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const manifest = publicTools.find((tool) => tool.id === 'image-exact-size')!;

  useEffect(() => {
    sourcesRef.current = sources;
  }, [sources]);
  useEffect(() => {
    resultsRef.current = results;
  }, [results]);
  useEffect(
    () => () => {
      for (const source of sourcesRef.current) URL.revokeObjectURL(source.url);
      for (const result of resultsRef.current)
        if (result.url) URL.revokeObjectURL(result.url);
    },
    [],
  );
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const clearResults = () => {
    for (const result of resultsRef.current)
      if (result.url) URL.revokeObjectURL(result.url);
    resultsRef.current = [];
    setResults([]);
  };

  const chooseImages = async (files: FileList | null) => {
    if (!files?.length || busy) return;
    clearResults();
    setError('');
    const picked = [...files].slice(0, MAX_FILES);
    const loaded: SourceImage[] = [];
    const problems: string[] = [];
    for (const file of picked) {
      if (file.size > MAX_IMAGE_BYTES) {
        problems.push(`${file.name} is over 25 MB.`);
        continue;
      }
      const url = URL.createObjectURL(file);
      try {
        const image = await loadImage(url);
        loaded.push({
          id: `${file.name}-${file.size}-${file.lastModified}-${loaded.length}`,
          file,
          url,
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
      } catch {
        URL.revokeObjectURL(url);
        problems.push(`${file.name} could not be decoded by this browser.`);
      }
    }
    if (files.length > MAX_FILES) {
      problems.push(`Only the first ${MAX_FILES} images were added.`);
    }
    for (const source of sourcesRef.current) URL.revokeObjectURL(source.url);
    sourcesRef.current = loaded;
    setSources(loaded);
    if (problems.length) setError(problems.join(' '));
  };

  const currentRequest = (): ExactSizeRequest => ({
    format,
    maxKb: Number(maxKb),
    minKb: optionalNumber(minKb),
    kbUnit,
    width: optionalNumber(width),
    height: optionalNumber(height),
    fit,
    dpi: optionalNumber(dpi),
  });

  const run = async (allowSmallerPixels = allowSmaller) => {
    if (!sources.length || busy) return;
    const request = currentRequest();
    const invalid =
      maxKb.trim() === ''
        ? 'Enter a maximum size in KB.'
        : validateRequest(request);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    setError('');
    clearResults();
    setLastRequest(request);
    const started = performance.now();
    const next: ExactResult[] = [];
    try {
      for (const [index, source] of sources.entries()) {
        setProgress(
          `Fitting image ${index + 1} of ${sources.length}: ${source.file.name}`,
        );
        const image = await loadImage(source.url);
        const requested = resolveOutputSize(
          source.width,
          source.height,
          request.width,
          request.height,
        );
        // Redraw only when the pixel size changes; quality steps reuse it.
        let canvas: HTMLCanvasElement | null = null;
        const encode = async (w: number, h: number, quality: number) => {
          if (!canvas || canvas.width !== w || canvas.height !== h) {
            canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const context = canvas.getContext('2d');
            if (!context)
              throw new Error(
                'Canvas processing is unavailable in this browser.',
              );
            if (request.format === 'image/jpeg' || request.fit === 'pad') {
              context.fillStyle = '#ffffff';
              context.fillRect(0, 0, w, h);
            }
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = 'high';
            const plan = planDraw(
              source.width,
              source.height,
              w,
              h,
              request.fit,
            );
            context.drawImage(
              image,
              plan.sx,
              plan.sy,
              plan.sw,
              plan.sh,
              plan.dx,
              plan.dy,
              plan.dw,
              plan.dh,
            );
          }
          const blob = await canvasBlob(canvas, request.format, quality / 100);
          if (blob.type !== request.format) {
            throw new Error(
              `This browser could not produce ${request.format === 'image/png' ? 'PNG' : 'JPEG'} output.`,
            );
          }
          return new Uint8Array(await blob.arrayBuffer());
        };

        const fitted = await fitToSize({
          format: request.format,
          width: requested.width,
          height: requested.height,
          maxBytes: maxBytesFor(request.maxKb, request.kbUnit),
          minBytes:
            request.minKb !== undefined && request.minKb > 0
              ? minBytesFor(request.minKb, request.kbUnit)
              : undefined,
          dpi: request.dpi,
          allowSmallerPixels,
          encode,
        });

        const { bytes } = fitted.attempt;
        const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], {
          type: request.format,
        });
        const url = URL.createObjectURL(blob);
        let decoded = { width: 0, height: 0 };
        try {
          const check = await loadImage(url);
          decoded = { width: check.naturalWidth, height: check.naturalHeight };
        } catch {
          // Left at 0 × 0 so the pixel check fails visibly.
        }
        const checks = checkConstraints(bytes, decoded, request, requested);
        // A file over the maximum is never offered for saving.
        const offer = fitted.outcome !== 'over-max' && decoded.width > 0;
        if (!offer) URL.revokeObjectURL(url);
        const extension = request.format === 'image/png' ? 'png' : 'jpg';
        next.push({
          id: source.id,
          name: source.file.name,
          fileName: `${baseName(source.file.name)}-${fitted.attempt.width}x${fitted.attempt.height}.${extension}`,
          url: offer ? url : null,
          fit: fitted,
          checks,
          requested,
          decoded,
          dpi: readDpi(bytes),
        });
      }
      resultsRef.current = next;
      setResults(next);
      const met = next.filter((result) =>
        result.checks.every((check) => check.pass),
      ).length;
      setProgress(
        `${met} of ${next.length} image${next.length === 1 ? '' : 's'} met every requirement.`,
      );
      if (met > 0) {
        announceCompletion({
          operation: 'Exact-size image',
          durationMs: performance.now() - started,
          summary: `${met} of ${next.length} image${next.length === 1 ? '' : 's'} fitted to ${request.maxKb} KB.`,
        });
      }
      requestAnimationFrame(() => resultsHeadingRef.current?.focus());
    } catch (caught) {
      for (const result of next)
        if (result.url) URL.revokeObjectURL(result.url);
      setProgress('');
      setError(
        caught instanceof Error
          ? caught.message
          : 'The image could not be processed.',
      );
    } finally {
      setBusy(false);
    }
  };

  const clearAll = () => {
    clearResults();
    for (const source of sourcesRef.current) URL.revokeObjectURL(source.url);
    sourcesRef.current = [];
    setSources([]);
    setError('');
    setProgress('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const changed =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      clearResults();
      setter(value);
    };

  const requestedWidth = optionalNumber(width);
  const requestedHeight = optionalNumber(height);
  const shapeMayDiffer =
    requestedWidth !== undefined &&
    requestedHeight !== undefined &&
    Number.isFinite(requestedWidth) &&
    Number.isFinite(requestedHeight) &&
    requestedWidth > 0 &&
    requestedHeight > 0 &&
    (sources.length === 0 ||
      sources.some((source) =>
        aspectDiffers(
          source.width,
          source.height,
          requestedWidth,
          requestedHeight,
        ),
      ));

  const inputClass =
    'focus-ring mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm';

  return (
    <AppShell currentToolId="image-exact-size">
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
                <span>Exact size</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Resize image to exact KB
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                Make a photo or signature fit an upload limit: a maximum size in
                KB, exact pixels and a DPI value, for exam, job and government
                portal uploads (photo and signature). It runs in this tab.
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Portal limits change — check the current notice for the exact
                size, pixels and format.
              </p>
            </div>
            <span className="flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold">
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              Runs in your browser
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
                <p className="font-semibold">Check these settings</p>
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
                <h2 className="text-sm font-semibold">Images</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  JPEG, PNG, WebP or any format this browser opens · 25 MB each
                  · up to {MAX_FILES}
                </p>
              </div>
              {sources.length ? (
                <span className="tabular text-xs text-muted-foreground">
                  {sources.length} selected
                </span>
              ) : null}
            </div>

            <div className="grid gap-5 p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept="image/*"
                  aria-label="Choose images to resize"
                  className="sr-only"
                  onChange={(event) => void chooseImages(event.target.files)}
                />
                <Button
                  variant="outline"
                  className="h-11 w-full"
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                >
                  <FileImage aria-hidden="true" />
                  {sources.length ? 'Choose other images' : 'Choose images'}
                </Button>
                {sources.length ? (
                  <ul className="mt-4 divide-y rounded-xl border text-sm">
                    {sources.map((source) => (
                      <li
                        key={source.id}
                        className="flex items-center justify-between gap-3 px-3 py-2"
                      >
                        <span className="truncate">{source.file.name}</span>
                        <span className="tabular shrink-0 text-xs text-muted-foreground">
                          {source.width} × {source.height} ·{' '}
                          {formatKb(source.file.size, kbUnit)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-4 grid min-h-40 place-items-center rounded-xl border border-dashed bg-muted/45 p-5 text-center">
                    <div>
                      <p className="font-semibold">No images yet</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Your originals stay unchanged.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <form
                aria-labelledby={`${formId}-settings`}
                onSubmit={(event) => {
                  event.preventDefault();
                  void run();
                }}
              >
                <h2 id={`${formId}-settings`} className="sr-only">
                  Target settings
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs font-semibold">
                    Maximum size (KB)
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      required
                      value={maxKb}
                      disabled={busy}
                      onChange={(event) =>
                        changed(setMaxKb)(event.target.value)
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="text-xs font-semibold">
                    Minimum size (KB, optional)
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      value={minKb}
                      disabled={busy}
                      onChange={(event) =>
                        changed(setMinKb)(event.target.value)
                      }
                      className={inputClass}
                    />
                  </label>
                </div>
                <label className="mt-3 block text-xs font-semibold">
                  What 1 KB means
                  <select
                    value={kbUnit}
                    disabled={busy}
                    onChange={(event) =>
                      changed(setKbUnit)(Number(event.target.value) as KbUnit)
                    }
                    className={inputClass}
                  >
                    <option value={1024}>1 KB = 1,024 bytes</option>
                    <option value={1000}>1 KB = 1,000 bytes</option>
                  </select>
                </label>
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                  KB here means 1,024 bytes; some portals use 1,000 — check
                  yours.
                </p>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <label className="text-xs font-semibold">
                    Width (px)
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="12000"
                      step="1"
                      value={width}
                      disabled={busy}
                      onChange={(event) =>
                        changed(setWidth)(event.target.value)
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="text-xs font-semibold">
                    Height (px)
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="12000"
                      step="1"
                      value={height}
                      disabled={busy}
                      onChange={(event) =>
                        changed(setHeight)(event.target.value)
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="text-xs font-semibold">
                    DPI
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="65535"
                      step="1"
                      value={dpi}
                      disabled={busy}
                      onChange={(event) => changed(setDpi)(event.target.value)}
                      className={inputClass}
                    />
                  </label>
                </div>
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                  All optional. Give one edge to keep the shape; leave both
                  empty to keep the original pixels.
                </p>

                {shapeMayDiffer ? (
                  <fieldset className="mt-4">
                    <legend className="text-xs font-semibold">
                      When the shape differs
                    </legend>
                    <div className="mt-2 grid gap-2">
                      {(
                        [
                          ['crop', 'Crop to fill (keeps the centre)'],
                          ['pad', 'Fit inside with white padding'],
                          ['stretch', 'Stretch to the exact size'],
                        ] as const
                      ).map(([value, label]) => (
                        <label
                          key={value}
                          className="flex items-center gap-2 text-sm"
                        >
                          <input
                            type="radio"
                            name={`${formId}-fit`}
                            value={value}
                            checked={fit === value}
                            disabled={busy}
                            onChange={() => changed(setFit)(value)}
                            className="accent-foreground"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ) : null}

                <label className="mt-4 block text-xs font-semibold">
                  Output format
                  <select
                    value={format}
                    disabled={busy}
                    onChange={(event) =>
                      changed(setFormat)(
                        event.target.value as ExactOutputFormat,
                      )
                    }
                    className={inputClass}
                  >
                    <option value="image/jpeg">JPEG</option>
                    <option value="image/png">PNG</option>
                  </select>
                </label>
                {format === 'image/png' ? (
                  <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                    PNG has no quality setting: its size depends on pixels and
                    colours only.
                  </p>
                ) : null}

                <label className="mt-4 flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={allowSmaller}
                    disabled={busy}
                    onChange={(event) =>
                      changed(setAllowSmaller)(event.target.checked)
                    }
                    className="mt-1 accent-foreground"
                  />
                  <span>
                    Allow smaller pixels
                    <span className="block text-xs text-muted-foreground">
                      Only if the size can’t be reached at your pixels. The
                      shape is kept and the final pixels are reported.
                    </span>
                  </span>
                </label>

                <Button
                  type="submit"
                  className="mt-5 h-11 w-full"
                  disabled={!sources.length || busy}
                >
                  <Scaling aria-hidden="true" />
                  {busy ? 'Working in this tab…' : 'Fit to size'}
                </Button>
                {sources.length ? (
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
              </form>
            </div>
          </section>

          <p aria-live="polite" className="mt-4 text-sm text-muted-foreground">
            {progress}
          </p>

          {results.length && lastRequest ? (
            <section aria-labelledby={`${formId}-results`} className="mt-4">
              <h2
                id={`${formId}-results`}
                ref={resultsHeadingRef}
                tabIndex={-1}
                className="focus-ring rounded text-lg font-semibold"
              >
                Results
              </h2>
              <ul className="mt-3 grid gap-4">
                {results.map((result) => {
                  const failing = result.checks.filter((check) => !check.pass);
                  const note = explain(result, lastRequest);
                  const { attempt } = result.fit;
                  return (
                    <li
                      key={result.id}
                      className="overflow-hidden rounded-2xl border bg-card"
                    >
                      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <span
                            className={`grid size-9 shrink-0 place-items-center rounded-full ${failing.length ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}
                          >
                            {failing.length ? (
                              <XCircle aria-hidden="true" className="size-5" />
                            ) : (
                              <CheckCircle2
                                aria-hidden="true"
                                className="size-5"
                              />
                            )}
                          </span>
                          <div className="min-w-0">
                            <h3 className="truncate text-base font-semibold">
                              {failing.length
                                ? `Does not meet: ${failing.map((check) => check.label.toLowerCase()).join(', ')}`
                                : 'Meets every requirement'}
                            </h3>
                            <p className="mt-1 truncate text-sm text-muted-foreground">
                              {result.name}
                            </p>
                            <p className="tabular mt-1 text-sm text-muted-foreground">
                              {attempt.bytes.length.toLocaleString('en-US')}{' '}
                              bytes ·{' '}
                              {formatKb(
                                attempt.bytes.length,
                                lastRequest.kbUnit,
                              )}{' '}
                              · {result.decoded.width} × {result.decoded.height}{' '}
                              px ·{' '}
                              {result.dpi === null
                                ? 'no DPI set'
                                : `${result.dpi} DPI`}{' '}
                              ·{' '}
                              {attempt.quality === null
                                ? 'PNG (no quality setting)'
                                : `quality ${attempt.quality}%`}
                            </p>
                          </div>
                        </div>
                        {result.url ? (
                          <Button
                            nativeButton={false}
                            className="h-11 shrink-0 px-5"
                            render={
                              <a
                                data-receipt-download
                                href={result.url}
                                download={result.fileName}
                                aria-label={`Save ${result.fileName}`}
                              />
                            }
                          >
                            <ArrowDownToLine aria-hidden="true" /> Save image
                          </Button>
                        ) : null}
                      </div>
                      {note ? (
                        <p className="flex items-start gap-2 border-t px-5 py-3 text-sm">
                          <AlertTriangle
                            aria-hidden="true"
                            className="mt-0.5 size-4 shrink-0"
                          />
                          <span>{note}</span>
                        </p>
                      ) : null}
                      {result.fit.outcome === 'over-max' &&
                      !result.fit.pixelsReduced &&
                      !allowSmaller ? (
                        <div className="border-t px-5 py-3">
                          <Button
                            variant="outline"
                            className="h-11"
                            disabled={busy}
                            onClick={() => {
                              setAllowSmaller(true);
                              void run(true);
                            }}
                          >
                            Allow smaller pixels and try again
                          </Button>
                        </div>
                      ) : null}
                      {result.fit.outcome === 'over-max' &&
                      allowSmaller &&
                      !result.fit.pixelsReduced ? (
                        <p className="border-t px-5 py-3 text-sm text-muted-foreground">
                          Smaller pixels were allowed, but even with the shorter
                          edge at {MIN_SHRINK_EDGE} px it does not fit.
                        </p>
                      ) : null}
                      <div className="overflow-x-auto border-t">
                        <table className="w-full text-left text-sm">
                          <caption className="sr-only">
                            Requirement checks for {result.name}
                          </caption>
                          <thead className="text-xs text-muted-foreground">
                            <tr>
                              <th scope="col" className="px-5 py-2 font-medium">
                                Check
                              </th>
                              <th scope="col" className="px-5 py-2 font-medium">
                                Required
                              </th>
                              <th scope="col" className="px-5 py-2 font-medium">
                                Saved file
                              </th>
                              <th scope="col" className="px-5 py-2 font-medium">
                                Result
                              </th>
                            </tr>
                          </thead>
                          <tbody className="tabular">
                            {result.checks.map((check) => (
                              <tr key={check.label} className="border-t">
                                <th
                                  scope="row"
                                  className="px-5 py-2 font-medium"
                                >
                                  {check.label}
                                </th>
                                <td className="px-5 py-2">{check.required}</td>
                                <td className="px-5 py-2">{check.actual}</td>
                                <td className="px-5 py-2 font-semibold">
                                  {check.pass ? 'Pass' : 'Fail'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                Each check reads the file that will be saved: its byte length,
                its decoded pixels and the DPI stored in its bytes. A new image
                is encoded by the browser, so metadata other than DPI is not
                kept.
              </p>
            </section>
          ) : null}

          <footer className="mt-10 flex flex-col gap-3 border-t py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              Candidate {manifest.version} · Browser Canvas · JPEG and PNG
              output
            </p>
            <a
              href="/image/optimize"
              className="focus-ring rounded font-semibold text-foreground hover:underline"
            >
              Just compress or convert: Optimize image →
            </a>
          </footer>
        </div>
      </section>
    </AppShell>
  );
}
