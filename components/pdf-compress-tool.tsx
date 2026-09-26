'use client';

import {
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  FilePlus2,
  Gauge,
  LockKeyhole,
  Minimize2,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { useToolUi } from '@/components/locale-edition-provider';
import { fillMessage, type ToolUiMessages } from '@/lib/i18n/tool-ui';
import {
  BatchLocalPromise,
  BatchRunnerPanel,
  useFileBatchRunner,
} from '@/components/batch-runner';
import { PdfOfflineReadiness } from '@/components/pdf-offline-readiness';
import { PracticeBriefPanel } from '@/components/practice-brief';
import {
  RecipeAppliedNotice,
  RecipeShareButton,
} from '@/components/recipe-link-bar';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import type { PracticeBrief } from '@/lib/practice-briefs';
import { PORTAL_PRESETS, findPreset } from '@/lib/portal-presets';
import { publicTools } from '@/lib/tools/catalog';
import {
  bytesToKib,
  kibToBytes,
  validateTarget,
} from '@/lib/tools/pdf/size-targets';
import {
  PDF_COMPRESS_RECIPE,
  describeRecipe,
  readRecipeValues,
  recipeParamNames,
} from '@/lib/tools/recipe-link';
import type {
  PdfCompressOptions,
  PdfWorkerInput,
  PdfWorkerRequest,
  PdfWorkerResponse,
} from '@/lib/tools/pdf/protocol';

type SourcePdf = { id: string; file: File; pages: number };
type Receipt = {
  url: string;
  pages: number;
  originalBytes: number;
  compressedBytes: number;
  imagesRecompressed: number;
  durationMs: number;
  /**
   * Set only by a fit-to-a-ceiling run. A plain compression has no target to
   * be judged against, and saying "under the limit" when nobody named a limit
   * would be an answer to a question that was not asked.
   */
  fit?: {
    targetBytes: number;
    outcome: 'already-under' | 'met' | 'over-max';
    quality: number | null;
    maxImageDimension: number | null;
    attempts: number;
  };
};

const MAX_BYTES = 150 * 1024 * 1024;

/* A function of the message bundle, because the labels are translated. */
function dimensionChoices(t: ToolUiMessages) {
  return [
    { value: 4000, label: t.compressKeepFullSize },
    { value: 2400, label: t.compressEdgePrint },
    { value: 1600, label: t.compressEdgeScreen },
    { value: 1000, label: t.compressEdgeEmail },
  ] as const;
}

function createWorker() {
  return new Worker(
    new URL('../workers/pdf-merge.worker.ts', import.meta.url),
    {
      type: 'module',
      name: 'pdf-compress-engine',
    },
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(durationMs: number) {
  return durationMs < 1000
    ? `${durationMs.toFixed(0)} ms`
    : `${(durationMs / 1000).toFixed(2)} s`;
}

/** Whole percent saved, floored so the figure is never rounded upward. */
function savedPercent(originalBytes: number, compressedBytes: number) {
  if (originalBytes < 1) return 0;
  return Math.floor(((originalBytes - compressedBytes) / originalBytes) * 100);
}

/**
 * The host of a citation, for the "read from <host> on <date>" line.
 *
 * The URL is data from `lib/portal-presets.ts`, never a literal here:
 * `local-source-policy.test.ts` keeps `http(s)://` out of `components/`, and
 * this page does not open it — a person clicks it.
 */
function sourceHost(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return 'the portal';
  }
}

async function toWorkerInput(source: { id: string; file: File }) {
  return {
    id: source.id,
    name: source.file.name,
    bytes: await source.file.arrayBuffer(),
  } satisfies PdfWorkerInput;
}

async function compressPdfFile(
  file: File,
  options: PdfCompressOptions,
  signal: AbortSignal,
) {
  const input = await toWorkerInput({ id: crypto.randomUUID(), file });
  if (signal.aborted) throw new DOMException('Batch cancelled.', 'AbortError');
  const worker = createWorker();

  return new Promise<Blob>((resolve, reject) => {
    const cleanup = () => {
      signal.removeEventListener('abort', handleAbort);
      worker.terminate();
    };
    const handleAbort = () => {
      cleanup();
      reject(new DOMException('Batch cancelled.', 'AbortError'));
    };
    signal.addEventListener('abort', handleAbort, { once: true });
    worker.onmessage = (event: MessageEvent<PdfWorkerResponse>) => {
      const message = event.data;
      if (message.type === 'result') {
        cleanup();
        resolve(new Blob([message.bytes], { type: 'application/pdf' }));
      } else if (message.type === 'error') {
        cleanup();
        reject(new Error(message.message));
      }
    };
    worker.onerror = () => {
      cleanup();
      reject(new Error('PDF compression stopped unexpectedly.'));
    };
    const request: PdfWorkerRequest = { type: 'compress', input, options };
    worker.postMessage(request, [input.bytes]);
  });
}

function compressedFileName(fileName: string) {
  const base = fileName.replace(/\.pdf$/i, '') || 'document';
  return `${base}_compressed.pdf`;
}

/**
 * The portal-ceiling controls, lifted out of `PdfCompressTool`.
 *
 * Not only for tidiness. `PdfCompressTool` is long, and with this markup
 * inlined the React compiler stopped being able to tell which of the
 * component's own functions run during render — it reported the
 * `performance.now()` inside the worker handler as an impure render-time
 * call. The panel holds no state and reaches for nothing outside its props,
 * so moving it out restores that analysis and makes the claim obvious to a
 * reader too.
 *
 * `selectedPreset` is derived here rather than passed, so the id shown as
 * pressed and the citation shown underneath cannot disagree.
 */
function PortalCeilingPanel({
  presetId,
  targetKb,
  targetProblem,
  disabled,
  onPreset,
  onTargetKb,
}: {
  presetId: string;
  targetKb: string;
  targetProblem: string | null;
  disabled: boolean;
  onPreset: (preset: (typeof PORTAL_PRESETS)[number]) => void;
  onTargetKb: (value: string) => void;
}) {
  /* Its own hook call: this panel is a component, not a render helper. */
  const t = useToolUi();
  const selectedPreset = presetId === '' ? null : findPreset(presetId);

  return (
    <div className="rounded-xl border bg-muted/45 p-4">
      <fieldset>
        <legend className="text-sm font-semibold">
          {t.compressFitCeiling}
        </legend>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {t.compressCeilingHelp}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {PORTAL_PRESETS.map((preset) => (
            <Button
              key={preset.id}
              type="button"
              size="sm"
              variant={preset.id === presetId ? 'secondary' : 'outline'}
              aria-pressed={preset.id === presetId}
              disabled={disabled}
              onClick={() => onPreset(preset)}
            >
              {preset.portal} · {formatBytes(preset.limitBytes)}
            </Button>
          ))}
        </div>
        {selectedPreset ? (
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            {selectedPreset.portal}: {selectedPreset.field}.{' '}
            {selectedPreset.note} {t.compressPresetReadFrom}{' '}
            <a
              href={selectedPreset.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              {sourceHost(selectedPreset.sourceUrl)}
            </a>{' '}
            {t.compressPresetOn} {selectedPreset.checkedOn}.{' '}
            {t.compressPresetWarning}
          </p>
        ) : null}
        <label className="mt-3 block max-w-xs text-xs font-semibold">
          {t.compressCeiling}
          <input
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            placeholder="e.g. 4882"
            value={targetKb}
            disabled={disabled}
            onChange={(event) => onTargetKb(event.target.value)}
            className="focus-ring mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm"
          />
        </label>
        {targetProblem ? (
          <p className="mt-2 text-xs text-muted-foreground">{targetProblem}</p>
        ) : null}
      </fieldset>
    </div>
  );
}

/**
 * `brief` re-points this page at one profession without forking the tool.
 * See the same prop on `pdf-to-excel-tool.tsx` for why it exists.
 */
/**
 * `offlineRoute` makes this the page at that address instead of `/pdf/compress`.
 *
 * It is one prop rather than a boolean and a route because the two can never
 * legitimately disagree: the readiness panel has to ask about the address the
 * reader is on, and a panel reporting on some other page's cache entry would be
 * the most convincing possible way to get this wrong. Setting it also leads the
 * heading with the words the page is for — business rule 31 — and leaves the
 * practice brief off, because "no network" and "a filing portal's size ceiling"
 * are two different jobs and a page that opens with both asks the reader to
 * pick one before they have done anything.
 *
 * Everything below this line is the same engine, the same controls and the same
 * limits as `/pdf/compress`. That is deliberate: rule 29 permits a second
 * address only where a working tool stands behind it.
 */
export function PdfCompressTool({
  brief,
  offlineRoute,
}: { brief?: PracticeBrief; offlineRoute?: string } = {}) {
  /* Localised control strings; the English bundle everywhere else. */
  const t = useToolUi();
  const fileRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const outputUrlRef = useRef<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [source, setSource] = useState<SourcePdf | null>(null);
  const [recompressImages, setRecompressImages] = useState(true);
  const [imageQuality, setImageQuality] = useState(70);
  const [maxImageDimension, setMaxImageDimension] = useState<number>(2400);
  const [removeMetadata, setRemoveMetadata] = useState(true);
  const [status, setStatus] = useState<
    'idle' | 'inspecting' | 'ready' | 'processing' | 'success' | 'error'
  >('idle');
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState('');
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  /*
    Fit-to-a-ceiling state. `lib/tools/pdf/fit-to-size.ts` and the worker's
    `fit-to-size` branch have existed, tested, since the compressor was
    written -- with no control anywhere that could reach them. This is that
    control. The target is held as the string in the box so a half-typed
    number does not become 0.
  */
  const [presetId, setPresetId] = useState('');
  const [targetKb, setTargetKb] = useState('');
  const batch = useFileBatchRunner();
  const [recipeSummary, setRecipeSummary] = useState('');
  const manifest = publicTools.find((tool) => tool.id === 'pdf-compress')!;

  // Settings arriving from someone else's link. Applied once, then removed
  // from the address bar — see image-optimize-tool.tsx for why that shape and
  // not the converging one the `?tool=` deep links use.
  /* oxlint-disable react/react-compiler -- this effect reads the address bar,
     an external system, which is what the rule's own guidance says an effect
     is for. It runs once on mount, so the cascading render the rule warns
     about happens exactly once, before anyone has typed anything. */
  useEffect(() => {
    const applied = readRecipeValues(
      PDF_COMPRESS_RECIPE,
      window.location.search,
    );
    if (Object.keys(applied).length === 0) return;

    if (typeof applied.recompress === 'boolean') {
      setRecompressImages(applied.recompress);
    }
    if (typeof applied.quality === 'number') setImageQuality(applied.quality);
    if (typeof applied.maxedge === 'string') {
      setMaxImageDimension(Number(applied.maxedge));
    }
    if (typeof applied.metadata === 'boolean') {
      setRemoveMetadata(applied.metadata);
    }
    setRecipeSummary(describeRecipe(PDF_COMPRESS_RECIPE, applied));

    const url = new URL(window.location.href);
    for (const name of recipeParamNames(PDF_COMPRESS_RECIPE)) {
      url.searchParams.delete(name);
    }
    window.history.replaceState(
      null,
      '',
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, []);
  /* oxlint-enable react/react-compiler */

  useEffect(
    () => () => {
      workerRef.current?.terminate();
      if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
    },
    [],
  );
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const clearResult = () => {
    if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
    outputUrlRef.current = null;
    setReceipt(null);
  };

  const choosePdf = async (file?: File) => {
    if (!file || status === 'processing' || status === 'inspecting') return;
    clearResult();
    setError('');
    if (file.size > MAX_BYTES) {
      setError(t.compressLimitNote);
      return;
    }
    const candidate = { id: crypto.randomUUID(), file };
    setStatus('inspecting');
    try {
      const worker = createWorker();
      workerRef.current = worker;
      const input = await toWorkerInput(candidate);
      worker.onmessage = (event: MessageEvent<PdfWorkerResponse>) => {
        const message = event.data;
        if (message.type === 'inspected') {
          setSource({ ...candidate, pages: message.files[0]?.pages ?? 0 });
          setStatus('ready');
        } else if (message.type === 'error') {
          setStatus('error');
          setError(message.message);
        }
        worker.terminate();
        workerRef.current = null;
      };
      worker.onerror = () => {
        setStatus('error');
        setError(t.compressInspectorStopped);
        worker.terminate();
        workerRef.current = null;
      };
      const request: PdfWorkerRequest = { type: 'inspect', inputs: [input] };
      worker.postMessage(request, [input.bytes]);
    } catch {
      workerRef.current?.terminate();
      workerRef.current = null;
      setStatus('error');
      setError(t.compressReadFailed);
    }
  };

  const choosePdfs = (files?: FileList | File[]) => {
    const selected = Array.from(files ?? []);
    if (
      selected.length === 0 ||
      status === 'processing' ||
      status === 'inspecting' ||
      batch.running
    ) {
      return;
    }
    if (selected.length === 1) {
      batch.reset();
      setBatchFiles([]);
      void choosePdf(selected[0]);
      return;
    }
    workerRef.current?.terminate();
    workerRef.current = null;
    clearResult();
    setSource(null);
    setError('');
    setStatus('idle');
    batch.reset();
    setBatchFiles(selected);
  };

  const targetBytes =
    targetKb.trim() === '' ? null : kibToBytes(Number(targetKb));
  const targetProblem =
    targetBytes === null ? null : validateTarget(targetBytes);

  const applyPreset = (preset: (typeof PORTAL_PRESETS)[number]) => {
    clearResult();
    setPresetId(preset.id);
    setTargetKb(String(bytesToKib(preset.limitBytes)));
  };

  const run = async (fitTo: number | null) => {
    if (!source || status === 'processing') return;
    clearResult();
    setError('');
    setStatus('processing');
    setProgress({ completed: 0, total: 0 });
    const started = performance.now();
    try {
      const worker = createWorker();
      workerRef.current = worker;
      const input = await toWorkerInput(source);
      const options: PdfCompressOptions = {
        recompressImages,
        imageQuality,
        maxImageDimension,
        removeMetadata,
      };
      worker.onmessage = (event: MessageEvent<PdfWorkerResponse>) => {
        const message = event.data;
        if (message.type === 'progress') {
          setProgress({ completed: message.completed, total: message.total });
        } else if (message.type === 'result') {
          const blob = new Blob([message.bytes], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          outputUrlRef.current = url;
          const durationMs = performance.now() - started;
          const originalBytes = message.originalByteLength ?? source.file.size;
          const next: Receipt = {
            url,
            pages: message.pageCount,
            originalBytes,
            compressedBytes: message.compressedByteLength ?? blob.size,
            imagesRecompressed: message.imagesRecompressed ?? 0,
            durationMs,
            fit:
              message.fitOutcome && message.targetBytes !== undefined
                ? {
                    targetBytes: message.targetBytes,
                    outcome: message.fitOutcome,
                    quality: message.fitQuality ?? null,
                    maxImageDimension: message.fitMaxImageDimension ?? null,
                    attempts: message.fitAttempts ?? 0,
                  }
                : undefined,
          };
          setReceipt(next);
          setStatus('success');
          announceCompletion({
            operation: t.compressOperation,
            recipe: {
              id: PDF_COMPRESS_RECIPE.id,
              values: {
                recompress: options.recompressImages,
                quality: options.imageQuality,
                maxedge: String(options.maxImageDimension),
                metadata: options.removeMetadata,
              },
            },
            durationMs,
            summary: fillMessage(
              message.pageCount === 1
                ? t.compressSummaryOne
                : t.compressSummaryMany,
              { pages: message.pageCount },
            ),
            metrics: [
              { label: t.before, value: formatBytes(next.originalBytes) },
              { label: t.after, value: formatBytes(next.compressedBytes) },
              {
                label: t.saved,
                value: `${savedPercent(next.originalBytes, next.compressedBytes)}%`,
              },
            ],
          });
        } else if (message.type === 'error') {
          setStatus('error');
          setError(message.message);
        }
        if (message.type === 'result' || message.type === 'error') {
          worker.terminate();
          workerRef.current = null;
        }
      };
      worker.onerror = () => {
        setStatus('error');
        setError(t.compressStopped);
        worker.terminate();
        workerRef.current = null;
      };
      const request: PdfWorkerRequest =
        fitTo === null
          ? { type: 'compress', input, options }
          : {
              type: 'fit-to-size',
              input,
              options: { targetBytes: fitTo, removeMetadata },
            };
      worker.postMessage(request, [input.bytes]);
    } catch {
      workerRef.current?.terminate();
      workerRef.current = null;
      setStatus('error');
      setError(t.compressNoStart);
    }
  };

  const clear = () => {
    batch.reset();
    setBatchFiles([]);
    workerRef.current?.terminate();
    workerRef.current = null;
    clearResult();
    setSource(null);
    setError('');
    setStatus('idle');
    if (fileRef.current) fileRef.current.value = '';
  };

  const startBatch = () => {
    setError('');
    const options: PdfCompressOptions = {
      recompressImages,
      imageQuality,
      maxImageDimension,
      removeMetadata,
    };
    void batch.start(batchFiles, async (file, _index, signal) => {
      if (file.size > MAX_BYTES) {
        return { status: 'skipped', reason: 'The 150 MB limit was exceeded.' };
      }
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        return { status: 'skipped', reason: 'Only PDF files are supported.' };
      }
      const blob = await compressPdfFile(file, options, signal);
      return {
        status: 'done',
        output: { blob, fileName: compressedFileName(file.name) },
      };
    });
  };

  const percent = progress.total
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;
  const saved = receipt
    ? savedPercent(receipt.originalBytes, receipt.compressedBytes)
    : 0;
  const nothingSaved = receipt
    ? receipt.compressedBytes >= receipt.originalBytes
    : false;

  return (
    <AppShell currentToolId="pdf-compress">
      <section
        id="tool"
        tabIndex={-1}
        className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-12"
      >
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col justify-between gap-5 border-b pb-8 sm:flex-row sm:items-start">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                {brief ? (
                  <span>{brief.eyebrow}</span>
                ) : (
                  <>
                    <span>PDF</span>
                    <span aria-hidden="true">/</span>
                    <span>{offlineRoute ? 'Offline' : 'Compress'}</span>
                  </>
                )}
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                {offlineRoute
                  ? 'Compress a PDF offline'
                  : brief
                    ? brief.heading
                    : 'Compress a PDF'}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                {offlineRoute
                  ? 'No upload, no installer, and no connection needed once this page has loaded once. The compressing is done by this tab, so the only question left is whether your browser has kept a copy — which the panel below reads and reports.'
                  : brief
                    ? brief.lede
                    : t.compressStandfirst}
              </p>
            </div>
            <span className="flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold">
              <LockKeyhole aria-hidden="true" className="size-3.5" />{' '}
              {t.onDevicePrototype}
            </span>
          </div>

          {offlineRoute ? <PdfOfflineReadiness route={offlineRoute} /> : null}

          {brief ? <PracticeBriefPanel brief={brief} /> : null}

          {error ? (
            <div
              ref={errorRef}
              role="alert"
              tabIndex={-1}
              className="focus-ring mt-6 flex items-start justify-between gap-4 rounded-xl border border-destructive/35 bg-destructive/5 p-4 text-sm"
            >
              <div>
                <p className="font-semibold">{t.compressCouldnt}</p>
                <p className="mt-1 text-muted-foreground">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => setError('')}
                aria-label={t.dismissError}
                className="focus-ring rounded-lg border p-1.5"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
          ) : null}

          <div className="mt-8">
            <RecipeAppliedNotice summary={recipeSummary} />
          </div>
          <section className="overflow-hidden rounded-2xl border bg-card p-5 sm:p-6">
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="application/pdf,.pdf"
              aria-label={t.compressChooseSource}
              className="sr-only"
              onChange={(event) => choosePdfs(event.target.files ?? [])}
            />

            {source ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {source.file.name}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {source.pages} {source.pages === 1 ? 'page' : 'pages'} ·{' '}
                    {formatBytes(source.file.size)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="h-10"
                  disabled={batch.running}
                  onClick={() => fileRef.current?.click()}
                >
                  {t.chooseAnother}
                </Button>
              </div>
            ) : (
              <button
                type="button"
                aria-label={t.compressChoosePdf}
                onClick={() => fileRef.current?.click()}
                disabled={batch.running}
                className="focus-ring grid min-h-52 w-full place-items-center rounded-xl border border-dashed bg-muted/45 p-6 text-center"
              >
                <span>
                  <span className="mx-auto grid size-11 place-items-center rounded-xl border bg-background">
                    <FilePlus2 aria-hidden="true" className="size-5" />
                  </span>
                  <span className="mt-4 block font-semibold">
                    {status === 'inspecting'
                      ? t.compressInspecting
                      : t.chooseAPdf}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {t.upTo150Mb}
                  </span>
                </span>
              </button>
            )}
            <BatchLocalPromise />

            {source || batchFiles.length > 1 ? (
              <div className="mt-5 space-y-5">
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    aria-label={t.compressReEncode}
                    checked={recompressImages}
                    disabled={batch.running}
                    onChange={(event) => {
                      setRecompressImages(event.target.checked);
                      clearResult();
                    }}
                    className="mt-0.5 accent-foreground"
                  />
                  <span>
                    <span className="font-semibold">{t.compressReEncode}</span>
                    <span className="mt-1 block text-muted-foreground">
                      Where most of the size usually is. Turn this off for a
                      lossless rewrite that leaves every image exactly as it is.
                    </span>
                  </span>
                </label>

                <div
                  className={
                    recompressImages ? 'grid gap-5 sm:grid-cols-2' : 'hidden'
                  }
                >
                  <label className="block text-sm">
                    <span className="font-medium">
                      {fillMessage(t.compressPhotoQualityValue, {
                        quality: imageQuality,
                      })}
                    </span>
                    <input
                      type="range"
                      min="40"
                      max="95"
                      value={imageQuality}
                      disabled={batch.running}
                      aria-label={t.compressPhotoQuality}
                      onChange={(event) => {
                        setImageQuality(Number(event.target.value));
                        clearResult();
                      }}
                      className="mt-3 w-full accent-foreground"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium">{t.compressLargestEdge}</span>
                    <select
                      value={maxImageDimension}
                      disabled={batch.running}
                      aria-label={t.compressLargestEdge}
                      onChange={(event) => {
                        setMaxImageDimension(Number(event.target.value));
                        clearResult();
                      }}
                      className="focus-ring mt-3 h-11 w-full rounded-xl border bg-background px-3 text-sm"
                    >
                      {dimensionChoices(t).map((choice) => (
                        <option key={choice.value} value={choice.value}>
                          {choice.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    aria-label={t.compressClearMetadata}
                    checked={removeMetadata}
                    disabled={batch.running}
                    onChange={(event) => {
                      setRemoveMetadata(event.target.checked);
                      clearResult();
                    }}
                    className="mt-0.5 accent-foreground"
                  />
                  <span>
                    <span className="font-semibold">
                      {t.compressClearMetadata}
                    </span>
                    <span className="mt-1 block text-muted-foreground">
                      Document metadata often names the person and the software
                      that made the file.
                    </span>
                  </span>
                </label>

                {source ? (
                  <PortalCeilingPanel
                    presetId={presetId}
                    targetKb={targetKb}
                    targetProblem={targetProblem}
                    disabled={status === 'processing'}
                    onPreset={applyPreset}
                    onTargetKb={(value) => {
                      setPresetId('');
                      setTargetKb(value);
                      clearResult();
                    }}
                  />
                ) : null}

                {source ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button
                      variant="ghost"
                      className="h-11"
                      disabled={status === 'processing'}
                      onClick={clear}
                    >
                      <Trash2 aria-hidden="true" /> {t.clear}
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11 min-w-44"
                      disabled={
                        status === 'processing' ||
                        targetBytes === null ||
                        targetProblem !== null
                      }
                      onClick={() => void run(targetBytes)}
                    >
                      <Gauge aria-hidden="true" />
                      {status === 'processing'
                        ? 'Working locally…'
                        : t.compressFitUnderCeiling}
                    </Button>
                    <Button
                      className="h-11 min-w-44"
                      disabled={status === 'processing'}
                      onClick={() => void run(null)}
                    >
                      <Minimize2 aria-hidden="true" />
                      {status === 'processing'
                        ? 'Working locally…'
                        : 'Compress PDF'}
                    </Button>
                  </div>
                ) : null}

                <div className="sm:max-w-xs sm:self-end">
                  <RecipeShareButton
                    definition={PDF_COMPRESS_RECIPE}
                    values={{
                      recompress: recompressImages,
                      quality: imageQuality,
                      maxedge: String(maxImageDimension),
                      metadata: removeMetadata,
                    }}
                  />
                </div>

                {status === 'processing' && progress.total > 0 ? (
                  <div aria-live="polite">
                    <div className="flex justify-between text-xs">
                      <span>{t.compressReEncoding}</span>
                      <span className="tabular">{percent}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full bg-foreground transition-[width]"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          {batchFiles.length > 1 ? (
            <BatchRunnerPanel
              files={batchFiles}
              runner={batch}
              startLabel="Compress all"
              zipName="compressed-pdfs.zip"
              onStart={startBatch}
              onClear={clear}
            />
          ) : null}

          {receipt ? (
            <section className="mt-5 overflow-hidden rounded-2xl border bg-card">
              <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full border">
                    {receipt.fit?.outcome === 'over-max' ? (
                      <AlertTriangle aria-hidden="true" className="size-5" />
                    ) : (
                      <CheckCircle2 aria-hidden="true" className="size-5" />
                    )}
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold">
                      {receipt.fit
                        ? receipt.fit.outcome === 'over-max'
                          ? `Still over the ceiling — smallest reached was ${formatBytes(receipt.compressedBytes)}`
                          : receipt.fit.outcome === 'already-under'
                            ? t.compressAlreadyUnder
                            : `Under the ceiling — ${formatBytes(receipt.compressedBytes)}`
                        : nothingSaved
                          ? t.compressDoneAlready
                          : `Done — ${saved}% smaller`}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatBytes(receipt.originalBytes)} →{' '}
                      {formatBytes(receipt.compressedBytes)} · completed in{' '}
                      {formatDuration(receipt.durationMs)}
                    </p>
                  </div>
                </div>
                <Button
                  nativeButton={false}
                  className="h-11 px-5"
                  render={
                    <a
                      data-receipt-download
                      href={receipt.url}
                      download="compressed.pdf"
                      aria-label={t.compressSave}
                    />
                  }
                >
                  <ArrowDownToLine aria-hidden="true" /> {t.savePdf}
                </Button>
              </div>
              <div className="grid border-t sm:grid-cols-3">
                <div className="border-b p-4 sm:border-b-0 sm:border-r">
                  <p className="text-xs text-muted-foreground">
                    {t.compressPages}
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {receipt.pages} kept, unchanged
                  </p>
                </div>
                <div className="border-b p-4 sm:border-b-0 sm:border-r">
                  <p className="text-xs text-muted-foreground">
                    {t.compressPhotos}
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {receipt.imagesRecompressed === 0
                      ? t.compressNoneReEncoded
                      : fillMessage(t.compressReEncodedCount, {
                          count: receipt.imagesRecompressed,
                        })}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-muted-foreground">
                    {t.compressWhereItRan}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
                    <ShieldCheck aria-hidden="true" className="size-4" />{' '}
                    {t.inThisBrowserTab}
                  </p>
                </div>
              </div>
              {receipt.fit ? (
                <p className="border-t p-4 text-sm text-muted-foreground">
                  Ceiling {formatBytes(receipt.fit.targetBytes)}.{' '}
                  {receipt.fit.outcome === 'already-under'
                    ? 'The file you opened was already under it, so nothing was re-encoded and nothing was lost.'
                    : receipt.fit.outcome === 'met'
                      ? `Reached after ${receipt.fit.attempts} measured ${receipt.fit.attempts === 1 ? 'rewrite' : 'rewrites'}, at photo quality ${receipt.fit.quality}% and a largest photo edge of ${receipt.fit.maxImageDimension} px. Every attempt was weighed on the bytes it actually produced, not on an estimate.`
                      : `${receipt.fit.attempts} measured ${receipt.fit.attempts === 1 ? 'rewrite' : 'rewrites'} were tried, down to photo quality ${receipt.fit.quality}% at ${receipt.fit.maxImageDimension} px, and none landed under it. Saving this gives you the smallest one produced. Split the document, or take the pages the portal actually asked for.`}
                </p>
              ) : nothingSaved ? (
                <p className="border-t p-4 text-sm text-muted-foreground">
                  The rewritten file came out no smaller, so this is your
                  original, byte for byte. A PDF that is mostly text has little
                  left to squeeze; the gains here come from photos.
                </p>
              ) : null}
            </section>
          ) : null}

          <footer className="mt-10 border-t py-6 text-xs text-muted-foreground">
            Candidate {manifest.version} · pdf-lib · {t.browserWorker}
          </footer>
        </div>
      </section>
    </AppShell>
  );
}
