'use client';

import {
  ArrowDownToLine,
  CheckCircle2,
  FilePlus2,
  LockKeyhole,
  Minimize2,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import {
  BatchLocalPromise,
  BatchRunnerPanel,
  useFileBatchRunner,
} from '@/components/batch-runner';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import { publicTools } from '@/lib/tools/catalog';
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
};

const MAX_BYTES = 150 * 1024 * 1024;

const DIMENSION_CHOICES = [
  { value: 4000, label: 'Keep full size' },
  { value: 2400, label: '2400 px — print' },
  { value: 1600, label: '1600 px — screen' },
  { value: 1000, label: '1000 px — email' },
] as const;

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

export function PdfCompressTool() {
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
  const batch = useFileBatchRunner();
  const manifest = publicTools.find((tool) => tool.id === 'pdf-compress')!;

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
      setError('This candidate limits a source PDF to 150 MB.');
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
        setError('The PDF inspector stopped unexpectedly.');
        worker.terminate();
        workerRef.current = null;
      };
      const request: PdfWorkerRequest = { type: 'inspect', inputs: [input] };
      worker.postMessage(request, [input.bytes]);
    } catch {
      workerRef.current?.terminate();
      workerRef.current = null;
      setStatus('error');
      setError('The browser could not read that file.');
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

  const run = async () => {
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
          };
          setReceipt(next);
          setStatus('success');
          announceCompletion({
            operation: 'PDF compressor',
            durationMs,
            summary: `${message.pageCount} ${message.pageCount === 1 ? 'page' : 'pages'} rewritten and checked in this browser.`,
            metrics: [
              { label: 'Before', value: formatBytes(next.originalBytes) },
              { label: 'After', value: formatBytes(next.compressedBytes) },
              {
                label: 'Saved',
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
        setError(
          'PDF compression stopped unexpectedly. Your original is unchanged.',
        );
        worker.terminate();
        workerRef.current = null;
      };
      const request: PdfWorkerRequest = { type: 'compress', input, options };
      worker.postMessage(request, [input.bytes]);
    } catch {
      workerRef.current?.terminate();
      workerRef.current = null;
      setStatus('error');
      setError('PDF compression could not start. Your original is unchanged.');
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
                <span>PDF</span>
                <span aria-hidden="true">/</span>
                <span>Compress</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Compress a PDF
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                Rewrite a PDF more compactly and re-encode the photos inside it.
                The file is read by this page and never sent to a server.
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
                <p className="font-semibold">Couldn’t compress this PDF</p>
                <p className="mt-1 text-muted-foreground">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => setError('')}
                aria-label="Dismiss error"
                className="focus-ring rounded-lg border p-1.5"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
          ) : null}

          <section className="mt-8 overflow-hidden rounded-2xl border bg-card p-5 sm:p-6">
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="application/pdf,.pdf"
              aria-label="Choose source PDF"
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
                  Choose another
                </Button>
              </div>
            ) : (
              <button
                type="button"
                aria-label="Choose a PDF to compress"
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
                      ? 'Inspecting PDF locally…'
                      : 'Choose a PDF'}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    Up to 150 MB
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
                    aria-label="Re-encode photos inside the PDF"
                    checked={recompressImages}
                    disabled={batch.running}
                    onChange={(event) => {
                      setRecompressImages(event.target.checked);
                      clearResult();
                    }}
                    className="mt-0.5 accent-foreground"
                  />
                  <span>
                    <span className="font-semibold">
                      Re-encode photos inside the PDF
                    </span>
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
                      Photo quality {imageQuality}%
                    </span>
                    <input
                      type="range"
                      min="40"
                      max="95"
                      value={imageQuality}
                      disabled={batch.running}
                      aria-label="Photo quality"
                      onChange={(event) => {
                        setImageQuality(Number(event.target.value));
                        clearResult();
                      }}
                      className="mt-3 w-full accent-foreground"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium">Largest photo edge</span>
                    <select
                      value={maxImageDimension}
                      disabled={batch.running}
                      aria-label="Largest photo edge"
                      onChange={(event) => {
                        setMaxImageDimension(Number(event.target.value));
                        clearResult();
                      }}
                      className="focus-ring mt-3 h-11 w-full rounded-xl border bg-background px-3 text-sm"
                    >
                      {DIMENSION_CHOICES.map((choice) => (
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
                    aria-label="Clear title, author and producer"
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
                      Clear title, author and producer
                    </span>
                    <span className="mt-1 block text-muted-foreground">
                      Document metadata often names the person and the software
                      that made the file.
                    </span>
                  </span>
                </label>

                {source ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button
                      variant="ghost"
                      className="h-11"
                      disabled={status === 'processing'}
                      onClick={clear}
                    >
                      <Trash2 aria-hidden="true" /> Clear
                    </Button>
                    <Button
                      className="h-11 min-w-44"
                      disabled={status === 'processing'}
                      onClick={() => void run()}
                    >
                      <Minimize2 aria-hidden="true" />
                      {status === 'processing'
                        ? 'Working locally…'
                        : 'Compress PDF'}
                    </Button>
                  </div>
                ) : null}

                {status === 'processing' && progress.total > 0 ? (
                  <div aria-live="polite">
                    <div className="flex justify-between text-xs">
                      <span>Re-encoding photos</span>
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
                    <CheckCircle2 aria-hidden="true" className="size-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold">
                      {nothingSaved
                        ? 'Done — this PDF was already as small as we can make it'
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
                      aria-label="Save compressed PDF"
                    />
                  }
                >
                  <ArrowDownToLine aria-hidden="true" /> Save PDF
                </Button>
              </div>
              <div className="grid border-t sm:grid-cols-3">
                <div className="border-b p-4 sm:border-b-0 sm:border-r">
                  <p className="text-xs text-muted-foreground">Pages</p>
                  <p className="mt-1 text-sm font-semibold">
                    {receipt.pages} kept, unchanged
                  </p>
                </div>
                <div className="border-b p-4 sm:border-b-0 sm:border-r">
                  <p className="text-xs text-muted-foreground">Photos</p>
                  <p className="mt-1 text-sm font-semibold">
                    {receipt.imagesRecompressed === 0
                      ? 'None re-encoded'
                      : `${receipt.imagesRecompressed} re-encoded`}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-muted-foreground">Where it ran</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
                    <ShieldCheck aria-hidden="true" className="size-4" /> In
                    this browser tab
                  </p>
                </div>
              </div>
              {nothingSaved ? (
                <p className="border-t p-4 text-sm text-muted-foreground">
                  The rewritten file came out no smaller, so this is your
                  original, byte for byte. A PDF that is mostly text has little
                  left to squeeze; the gains here come from photos.
                </p>
              ) : null}
            </section>
          ) : null}

          <footer className="mt-10 border-t py-6 text-xs text-muted-foreground">
            Candidate {manifest.version} · pdf-lib · Browser worker
          </footer>
        </div>
      </section>
    </AppShell>
  );
}
