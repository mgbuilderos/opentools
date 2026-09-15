/* oxlint-disable */
'use client';

import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  CheckCircle2,
  FilePlus2,
  FileText,
  LockKeyhole,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import { AuditTerminal } from './audit-terminal';
import { publicTools } from '@/lib/tools/catalog';
import type {
  PdfWorkerInput,
  PdfWorkerRequest,
  PdfWorkerResponse,
} from '@/lib/tools/pdf/protocol';

type PdfFileItem = {
  id: string;
  file: File;
  pages: number;
};

type JobStatus =
  | 'idle'
  | 'inspecting'
  | 'ready'
  | 'processing'
  | 'success'
  | 'cancelled'
  | 'error';

type MergeReceipt = {
  outputUrl: string;
  outputBytes: number;
  pageCount: number;
  durationMs: number;
  computeDurationMs: number;
  validationDurationMs: number;
};

const MAX_FILES = 20;
const MAX_TOTAL_BYTES = 150 * 1024 * 1024;

function createPdfWorker() {
  return new Worker(
    new URL('../workers/pdf-merge.worker.ts', import.meta.url),
    {
      type: 'module',
      name: 'pdf-merge-engine',
    },
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(durationMs: number) {
  if (durationMs < 1000) return `${durationMs.toFixed(0)} ms`;
  return `${(durationMs / 1000).toFixed(2)} s`;
}

function now() {
  return performance.now();
}

async function toWorkerInputs(items: Array<{ id: string; file: File }>) {
  return Promise.all(
    items.map(
      async ({ id, file }): Promise<PdfWorkerInput> => ({
        id,
        name: file.name,
        bytes: await file.arrayBuffer(),
      }),
    ),
  );
}

export function PdfMergeTool() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const outputUrlRef = useRef<string | null>(null);
  const [files, setFiles] = useState<PdfFileItem[]>([]);
  const [status, setStatus] = useState<JobStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({
    phase: '',
    completed: 0,
    total: 0,
  });
  const [receipt, setReceipt] = useState<MergeReceipt | null>(null);
  const manifest = publicTools.find((tool) => tool.id === 'pdf-merge')!;

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

  const addFiles = async (incoming: File[]) => {
    if (status === 'inspecting' || status === 'processing') return;
    setError(null);
    clearResult();

    const availableSlots = MAX_FILES - files.length;
    const selected = incoming.slice(0, availableSlots);
    if (!selected.length) {
      setError(
        `You can merge up to ${MAX_FILES} PDFs at a time in this canary.`,
      );
      return;
    }

    const existingBytes = files.reduce(
      (total, item) => total + item.file.size,
      0,
    );
    const selectedBytes = selected.reduce(
      (total, file) => total + file.size,
      0,
    );
    if (existingBytes + selectedBytes > MAX_TOTAL_BYTES) {
      setError('These files exceed the current 150 MB total safety limit.');
      return;
    }

    const candidates = selected.map((file) => ({
      id: crypto.randomUUID(),
      file,
    }));
    setStatus('inspecting');

    let worker: Worker;
    let inputs: PdfWorkerInput[];
    try {
      worker = createPdfWorker();
      workerRef.current = worker;
      inputs = await toWorkerInputs(candidates);
    } catch {
      workerRef.current?.terminate();
      workerRef.current = null;
      setStatus('error');
      setError(
        'The browser could not read one of these files. Your originals are unchanged.',
      );
      return;
    }
    if (workerRef.current !== worker) {
      worker.terminate();
      return;
    }

    worker.onmessage = (event: MessageEvent<PdfWorkerResponse>) => {
      const message = event.data;
      if (message.type === 'inspected') {
        const pagesById = new Map(
          message.files.map((item) => [item.id, item.pages]),
        );
        setFiles((current) => [
          ...current,
          ...candidates.map(({ id, file }) => ({
            id,
            file,
            pages: pagesById.get(id) ?? 0,
          })),
        ]);
        setStatus('ready');
        worker.terminate();
        workerRef.current = null;
        return;
      }

      if (message.type === 'error') {
        const failed = candidates.find((item) => item.id === message.inputId);
        setError(`${failed ? `${failed.file.name}: ` : ''}${message.message}`);
        setStatus('error');
        worker.terminate();
        workerRef.current = null;
      }
    };

    worker.onerror = () => {
      setError(
        'The PDF inspector stopped unexpectedly. Your files are unchanged.',
      );
      setStatus('error');
      worker.terminate();
      workerRef.current = null;
    };

    const request: PdfWorkerRequest = { type: 'inspect', inputs };
    try {
      worker.postMessage(
        request,
        inputs.map((item) => item.bytes),
      );
    } catch {
      worker.terminate();
      workerRef.current = null;
      setStatus('error');
      setError('The PDF inspector could not start. Your files are unchanged.');
    }
  };

  const mergeFiles = async () => {
    if (files.length < 2 || status === 'processing') return;
    setError(null);
    clearResult();
    setStatus('processing');
    setProgress({
      phase: 'Preparing files',
      completed: 0,
      total: files.length,
    });
    const jobStarted = now();

    let worker: Worker;
    let inputs: PdfWorkerInput[];
    try {
      worker = createPdfWorker();
      workerRef.current = worker;
      inputs = await toWorkerInputs(files);
    } catch {
      workerRef.current?.terminate();
      workerRef.current = null;
      setStatus('error');
      setError(
        'The browser could not read one of these files. Your originals are unchanged.',
      );
      return;
    }
    if (workerRef.current !== worker) {
      worker.terminate();
      return;
    }

    worker.onmessage = (event: MessageEvent<PdfWorkerResponse>) => {
      const message = event.data;
      if (message.type === 'progress') {
        const labels = {
          reading: 'Reading PDFs',
          copying: 'Copying pages',
          validating: 'Checking result',
        };
        setProgress({
          phase: labels[message.phase],
          completed: message.completed,
          total: message.total,
        });
        return;
      }

      if (message.type === 'result') {
        const blob = new Blob([message.bytes], { type: 'application/pdf' });
        const outputUrl = URL.createObjectURL(blob);
        outputUrlRef.current = outputUrl;
        const completedIn = now() - jobStarted;
        setReceipt({
          outputUrl,
          outputBytes: blob.size,
          pageCount: message.pageCount,
          durationMs: completedIn,
          computeDurationMs: message.computeDurationMs,
          validationDurationMs: message.validationDurationMs,
        });
        setStatus('success');
        worker.terminate();
        workerRef.current = null;
        announceCompletion({
          operation: 'PDF merge',
          durationMs: completedIn,
          summary: `${files.length.toLocaleString()} PDF files merged into ${message.pageCount.toLocaleString()} pages.`,
          metrics: [
            { label: 'Files', value: files.length.toLocaleString() },
            {
              label: 'Input',
              value: formatBytes(
                files.reduce((total, item) => total + item.file.size, 0),
              ),
            },
            { label: 'Output', value: formatBytes(blob.size) },
          ],
        });
        return;
      }

      if (message.type === 'error') {
        const failed = files.find((item) => item.id === message.inputId);
        setError(`${failed ? `${failed.file.name}: ` : ''}${message.message}`);
        setStatus('error');
        worker.terminate();
        workerRef.current = null;
      }
    };

    worker.onerror = () => {
      setError(
        'The merge stopped unexpectedly. Your original PDFs are unchanged.',
      );
      setStatus('error');
      worker.terminate();
      workerRef.current = null;
    };

    const request: PdfWorkerRequest = { type: 'merge', inputs };
    try {
      worker.postMessage(
        request,
        inputs.map((item) => item.bytes),
      );
    } catch {
      worker.terminate();
      workerRef.current = null;
      setStatus('error');
      setError('The merge could not start. Your original PDFs are unchanged.');
    }
  };

  const cancelMerge = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setStatus('cancelled');
    setProgress({ phase: '', completed: 0, total: 0 });
  };

  const moveFile = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= files.length) return;
    setFiles((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
    clearResult();
    setStatus('ready');
  };

  const removeFile = (id: string) => {
    setFiles((current) => current.filter((item) => item.id !== id));
    clearResult();
    setStatus('ready');
  };

  const clearAll = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setFiles([]);
    setStatus('idle');
    setError(null);
    setProgress({ phase: '', completed: 0, total: 0 });
    clearResult();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const totalBytes = files.reduce((total, item) => total + item.file.size, 0);
  const totalPages = files.reduce((total, item) => total + item.pages, 0);
  const progressPercent = progress.total
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  return (
    <AppShell currentToolId="pdf-merge">
      <section
        id="tool"
        tabIndex={-1}
        className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-12"
      >
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col justify-between gap-5 border-b pb-8 sm:flex-row sm:items-start">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                <span>PDF</span>
                <span aria-hidden="true">/</span>
                <span>Page management</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Merge PDF
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                Combine PDFs in your chosen order. Processing happens in a
                dedicated browser worker.
              </p>
            </div>
            <button
              type="button"
              className="focus-ring flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold"
              aria-label="Local processing status. Release proof is pending."
            >
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              On-device prototype
            </button>
          </div>

          {error ? (
            <div
              ref={errorRef}
              role="alert"
              tabIndex={-1}
              className="focus-ring mt-6 flex items-start justify-between gap-4 rounded-xl border border-destructive/35 bg-destructive/5 p-4 text-sm"
            >
              <div>
                <p className="font-semibold">Couldn’t use that PDF</p>
                <p className="mt-1 text-muted-foreground">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="focus-ring rounded-md p-1"
                aria-label="Dismiss error"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
          ) : null}

          <section
            aria-labelledby="pdf-input-heading"
            className="mt-8 overflow-hidden rounded-2xl border bg-card"
          >
            <div className="flex items-center justify-between border-b px-4 py-4 sm:px-5">
              <div>
                <h2 id="pdf-input-heading" className="text-sm font-semibold">
                  PDFs to merge
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Up to {MAX_FILES} files · 150 MB total in this canary
                </p>
              </div>
              {files.length ? (
                <span className="tabular text-xs text-muted-foreground">
                  {files.length} files · {totalPages} pages ·{' '}
                  {formatBytes(totalBytes)}
                </span>
              ) : null}
            </div>

            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                void addFiles(Array.from(event.dataTransfer.files));
              }}
              className="m-4 grid min-h-48 place-items-center rounded-xl border border-dashed bg-muted/45 p-6 text-center sm:m-5"
            >
              <div>
                <span className="mx-auto grid size-11 place-items-center rounded-xl border bg-background">
                  <FilePlus2 aria-hidden="true" className="size-5" />
                </span>
                <p className="mt-4 text-base font-semibold">
                  {status === 'inspecting'
                    ? 'Inspecting PDFs locally…'
                    : 'Drop PDFs here'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  File signatures and page counts are checked in your browser.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  className="sr-only"
                  onChange={(event) => {
                    void addFiles(Array.from(event.target.files ?? []));
                    event.currentTarget.value = '';
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 h-11 px-5"
                  disabled={status === 'inspecting' || status === 'processing'}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose PDFs
                </Button>
              </div>
            </div>

            {files.length ? (
              <ol className="border-t" aria-label="PDF merge order">
                {files.map((item, index) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0 sm:px-5"
                  >
                    <span className="tabular w-6 shrink-0 text-xs font-semibold text-muted-foreground">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted">
                      <FileText aria-hidden="true" className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {item.file.name}
                      </span>
                      <span className="tabular block text-xs text-muted-foreground">
                        {item.pages} {item.pages === 1 ? 'page' : 'pages'} ·{' '}
                        {formatBytes(item.file.size)}
                      </span>
                    </span>
                    <span className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        disabled={index === 0 || status === 'processing'}
                        onClick={() => moveFile(index, -1)}
                        aria-label={`Move ${item.file.name} earlier`}
                      >
                        <ArrowUp aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        disabled={
                          index === files.length - 1 || status === 'processing'
                        }
                        onClick={() => moveFile(index, 1)}
                        aria-label={`Move ${item.file.name} later`}
                      >
                        <ArrowDown aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        disabled={status === 'processing'}
                        onClick={() => removeFile(item.id)}
                        aria-label={`Remove ${item.file.name}`}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </span>
                  </li>
                ))}
              </ol>
            ) : null}
            <div className="border-t bg-muted/35 px-4 py-3 text-xs leading-5 text-muted-foreground sm:px-5">
              Canary scope: combines page content and order. Bookmarks,
              signatures, forms, attachments, and document-level metadata are
              not yet guaranteed.
            </div>
          </section>

          <section className="mt-5 rounded-2xl border bg-muted/55 p-4 sm:p-5">
            {status === 'processing' ? (
              <div aria-live="polite">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold">{progress.phase}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {progress.completed} of {progress.total} files · originals
                      unchanged
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="h-11 px-5"
                    onClick={cancelMerge}
                  >
                    Cancel
                  </Button>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-foreground transition-[width] duration-150"
                    style={{ width: `${Math.max(4, progressPercent)}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    {files.length < 2
                      ? 'Add at least 2 PDFs'
                      : 'Ready to merge'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    The originals will not be modified.
                  </p>
                </div>
                <div className="flex gap-2">
                  {files.length ? (
                    <Button
                      variant="ghost"
                      className="h-11 px-4"
                      onClick={clearAll}
                    >
                      Clear all
                    </Button>
                  ) : null}
                  <Button
                    className="h-11 min-w-40 px-5 text-sm"
                    disabled={files.length < 2 || status === 'inspecting'}
                    onClick={mergeFiles}
                  >
                    Merge {files.length || ''} PDFs
                  </Button>
                </div>
              </div>
            )}
          </section>

          {status === 'cancelled' ? (
            <output className="mt-4 block text-sm text-muted-foreground">
              Merge cancelled. Your selected PDFs are still here and unchanged.
            </output>
          ) : null}

          {receipt ? (
            <section
              aria-labelledby="pdf-receipt-heading"
              className="mt-5 overflow-hidden rounded-2xl border bg-card"
            >
              <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-success/10 text-success">
                    <CheckCircle2 aria-hidden="true" className="size-5" />
                  </span>
                  <div>
                    <h2
                      id="pdf-receipt-heading"
                      className="text-lg font-semibold tracking-[-0.02em]"
                    >
                      Done — {files.length} PDFs became 1 PDF
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {receipt.pageCount} pages ·{' '}
                      {formatBytes(receipt.outputBytes)} · ready in{' '}
                      <span className="tabular">
                        {formatDuration(receipt.durationMs)}
                      </span>
                    </p>
                  </div>
                </div>
                <a
                  data-receipt-download
                  href={receipt.outputUrl}
                  download="merged.pdf"
                  aria-label="Download merged PDF"
                  onClick={() =>
                    window.dispatchEvent(new CustomEvent('tool-downloaded'))
                  }
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-transparent bg-primary px-5 text-sm font-medium text-primary-foreground outline-none transition-all hover:bg-primary/80 focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <ArrowDownToLine aria-hidden="true" className="size-4" />
                  Download merged.pdf
                </a>
              </div>
              <div className="grid border-t sm:grid-cols-3">
                <div className="border-b p-4 sm:border-b-0 sm:border-r sm:p-5">
                  <p className="text-xs text-muted-foreground">Processing</p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
                    <ShieldCheck
                      aria-hidden="true"
                      className="size-4 text-success"
                    />
                    Browser worker
                  </p>
                </div>
                <div className="border-b p-4 sm:border-b-0 sm:border-r sm:p-5">
                  <p className="text-xs text-muted-foreground">Output check</p>
                  <p className="mt-1 text-sm font-semibold">
                    Reopened · {receipt.pageCount} pages
                  </p>
                </div>
                <div className="p-4 sm:p-5">
                  <p className="text-xs text-muted-foreground">Phase timing</p>
                  <p className="tabular mt-1 text-sm font-semibold">
                    Merge {formatDuration(receipt.computeDurationMs)} · check{' '}
                    {formatDuration(receipt.validationDurationMs)}
                  </p>
                </div>
              </div>
              <AuditTerminal />
              <div className="border-t bg-success/10 p-4 sm:px-6">
                <p
                  className="text-sm leading-relaxed text-success dark:text-success"
                  style={{ fontFamily: 'var(--font-inter, Inter, sans-serif)' }}
                >
                  We believe your data belongs to you. This PDF was processed{' '}
                  <strong className="font-bold text-success dark:text-success">
                    locally
                  </strong>{' '}
                  in mere{' '}
                  <strong className="font-bold text-success dark:text-success">
                    seconds
                  </strong>
                  , ensuring absolute privacy. If this{' '}
                  <strong className="font-bold text-success dark:text-success">
                    open source
                  </strong>{' '}
                  tool saved you time today, please{' '}
                  <a
                    href="/support"
                    className="font-bold text-success underline decoration-success/30 underline-offset-2 hover:decoration-success dark:text-success dark:decoration-success/30 dark:hover:decoration-success"
                  >
                    support our independent development
                  </a>{' '}
                  to help us fight for a faster, safer web.
                </p>
              </div>
            </section>
          ) : null}

          <footer className="mt-10 flex flex-col gap-3 border-t py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              Canary {manifest.version} · pdf-lib 1.17.1 · No analytics in this
              preview
            </p>
            <a
              href="/"
              className="focus-ring rounded font-semibold text-foreground hover:underline"
            >
              Text case converter →
            </a>
          </footer>
        </div>
      </section>
    </AppShell>
  );
}
