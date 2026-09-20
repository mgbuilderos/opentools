/* oxlint-disable */
'use client';

import {
  ArrowDownToLine,
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
import { toolMeta } from '@/lib/tools/tool-meta';
import { parsePageSelection } from '@/lib/tools/pdf/page-selection';
import type {
  PdfWorkerInput,
  PdfWorkerRequest,
  PdfWorkerResponse,
} from '@/lib/tools/pdf/protocol';

type SourcePdf = { id: string; file: File; pages: number };
type Receipt = {
  url: string;
  bytes: number;
  pages: number;
  durationMs: number;
  validationDurationMs: number;
};
const MAX_BYTES = 150 * 1024 * 1024;

function createWorker() {
  return new Worker(
    new URL('../workers/pdf-merge.worker.ts', import.meta.url),
    { type: 'module', name: 'pdf-page-engine' },
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

async function toWorkerInput(source: {
  id: string;
  file: File;
}): Promise<PdfWorkerInput> {
  return {
    id: source.id,
    name: source.file.name,
    bytes: await source.file.arrayBuffer(),
  };
}

export function PdfExtractTool() {
  const fileRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const outputUrlRef = useRef<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [source, setSource] = useState<SourcePdf | null>(null);
  const [selection, setSelection] = useState('1');
  const [status, setStatus] = useState<
    | 'idle'
    | 'inspecting'
    | 'ready'
    | 'processing'
    | 'success'
    | 'error'
    | 'cancelled'
  >('idle');
  const [progress, setProgress] = useState({
    label: '',
    completed: 0,
    total: 0,
  });
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState('');
  const manifest = toolMeta('pdf-extract');

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
    setError('');
    clearResult();
    if (file.size > MAX_BYTES) {
      setError('This candidate limits a source PDF to 150 MB.');
      return;
    }
    const candidate = { id: crypto.randomUUID(), file };
    setStatus('inspecting');
    let worker: Worker;
    let input: PdfWorkerInput;
    try {
      worker = createWorker();
      workerRef.current = worker;
      input = await toWorkerInput(candidate);
    } catch {
      workerRef.current?.terminate();
      workerRef.current = null;
      setStatus('error');
      setError('The browser could not read that file.');
      return;
    }
    if (workerRef.current !== worker) {
      worker.terminate();
      return;
    }
    worker.onmessage = (event: MessageEvent<PdfWorkerResponse>) => {
      const message = event.data;
      if (message.type === 'inspected') {
        const pages = message.files[0]?.pages ?? 0;
        setSource({ ...candidate, pages });
        setSelection(`1-${pages}`);
        setStatus('ready');
        worker.terminate();
        workerRef.current = null;
      } else if (message.type === 'error') {
        setStatus('error');
        setError(message.message);
        worker.terminate();
        workerRef.current = null;
      }
    };
    worker.onerror = () => {
      setStatus('error');
      setError('The PDF inspector stopped unexpectedly.');
      worker.terminate();
      workerRef.current = null;
    };
    const request: PdfWorkerRequest = { type: 'inspect', inputs: [input] };
    try {
      worker.postMessage(request, [input.bytes]);
    } catch {
      worker.terminate();
      workerRef.current = null;
      setStatus('error');
      setError('The PDF inspector could not start.');
    }
  };

  const extract = async () => {
    if (!source || status === 'processing') return;
    let pages: number[];
    try {
      pages = parsePageSelection(selection, source.pages);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Page selection is invalid.',
      );
      return;
    }
    setError('');
    clearResult();
    setStatus('processing');
    setProgress({ label: 'Preparing PDF', completed: 0, total: pages.length });
    const started = performance.now();
    let worker: Worker;
    let input: PdfWorkerInput;
    try {
      worker = createWorker();
      workerRef.current = worker;
      input = await toWorkerInput(source);
    } catch {
      workerRef.current?.terminate();
      workerRef.current = null;
      setStatus('error');
      setError('The browser could not read that file.');
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
          reading: 'Reading PDF',
          copying: 'Copying pages',
          validating: 'Checking result',
          // Fit-to-size reports one of these per compression attempt, and the
          // attempt count is not known ahead of time, so it arrives with no
          // total to count towards.
          fitting: 'Trying compression settings',
        };
        setProgress({
          label: labels[message.phase],
          completed: message.completed,
          total: message.total,
        });
      } else if (message.type === 'result') {
        const blob = new Blob([message.bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        outputUrlRef.current = url;
        const completedIn = performance.now() - started;
        setReceipt({
          url,
          bytes: blob.size,
          pages: message.pageCount,
          durationMs: completedIn,
          validationDurationMs: message.validationDurationMs,
        });
        setStatus('success');
        worker.terminate();
        workerRef.current = null;
        announceCompletion({
          operation: 'PDF page extraction',
          durationMs: completedIn,
          summary: `${message.pageCount.toLocaleString()} selected ${message.pageCount === 1 ? 'page' : 'pages'} saved as a new PDF.`,
          metrics: [
            { label: 'Pages', value: message.pageCount.toLocaleString() },
            {
              label: 'Input',
              value: source ? formatBytes(source.file.size) : '—',
            },
            { label: 'Output', value: formatBytes(blob.size) },
          ],
        });
      } else if (message.type === 'error') {
        setStatus('error');
        setError(message.message);
        worker.terminate();
        workerRef.current = null;
      }
    };
    worker.onerror = () => {
      setStatus('error');
      setError(
        'Page extraction stopped unexpectedly. Your original is unchanged.',
      );
      worker.terminate();
      workerRef.current = null;
    };
    const request: PdfWorkerRequest = { type: 'extract', input, pages };
    try {
      worker.postMessage(request, [input.bytes]);
    } catch {
      worker.terminate();
      workerRef.current = null;
      setStatus('error');
      setError('Page extraction could not start. Your original is unchanged.');
    }
  };

  const cancel = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setStatus('cancelled');
    setProgress({ label: '', completed: 0, total: 0 });
  };
  const clear = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    clearResult();
    setSource(null);
    setSelection('1');
    setError('');
    setStatus('idle');
    if (fileRef.current) fileRef.current.value = '';
  };
  const percent = progress.total
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  return (
    <AppShell currentToolId="pdf-extract">
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
                <span>Page management</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Extract PDF pages
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                Choose pages or ranges, keep their requested order, and save
                them as a new PDF in your browser.
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
                <p className="font-semibold">Couldn’t extract those pages</p>
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
            <div className="flex items-center justify-between border-b px-4 py-4 sm:px-5">
              <div>
                <h2 className="text-sm font-semibold">Source PDF</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  File signature and page count checked locally
                </p>
              </div>
              {source ? (
                <span className="tabular text-xs text-muted-foreground">
                  {source.pages} pages · {formatBytes(source.file.size)}
                </span>
              ) : null}
            </div>
            <div className="p-4 sm:p-5">
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf,.pdf"
                aria-label="Choose source PDF"
                className="sr-only"
                onChange={(event) => void choosePdf(event.target.files?.[0])}
              />
              {source ? (
                <div className="flex flex-col gap-4 rounded-xl border bg-muted/45 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg border bg-background">
                      <FileText aria-hidden="true" className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {source.file.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {source.pages} pages · {formatBytes(source.file.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="h-10"
                    onClick={() => fileRef.current?.click()}
                  >
                    Choose another
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  aria-label="Choose a PDF to extract pages from"
                  onClick={() => fileRef.current?.click()}
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
                      Up to 150 MB in this candidate
                    </span>
                  </span>
                </button>
              )}
            </div>
          </section>
          {source ? (
            <section className="mt-5 rounded-2xl border bg-muted/55 p-4 sm:p-5">
              <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <label className="text-sm font-semibold">
                  Pages to keep
                  <input
                    value={selection}
                    onChange={(event) => {
                      setSelection(event.target.value);
                      clearResult();
                      setStatus('ready');
                    }}
                    placeholder="1-3, 5, 8-10"
                    className="focus-ring mt-2 h-12 w-full rounded-xl border bg-background px-4 font-mono text-sm"
                  />
                  <span className="mt-2 block text-xs font-normal text-muted-foreground">
                    Examples: 1-3, 5 · duplicates are removed · order is
                    preserved
                  </span>
                </label>
                <div className="flex gap-2">
                  {status === 'processing' ? (
                    <Button variant="outline" className="h-12" onClick={cancel}>
                      <X aria-hidden="true" />
                      Cancel
                    </Button>
                  ) : (
                    <>
                      <Button variant="ghost" className="h-12" onClick={clear}>
                        <Trash2 aria-hidden="true" />
                        Clear
                      </Button>
                      <Button
                        className="h-12 min-w-40"
                        disabled={!selection.trim()}
                        onClick={() => void extract()}
                      >
                        Extract pages
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {status === 'processing' ? (
                <div className="mt-5" aria-live="polite">
                  <div className="flex justify-between text-xs">
                    <span>{progress.label}</span>
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
              {status === 'cancelled' ? (
                <output className="mt-4 block text-sm text-muted-foreground">
                  Extraction cancelled. Your source PDF is unchanged.
                </output>
              ) : null}
            </section>
          ) : null}
          {receipt ? (
            <section
              aria-labelledby="extract-receipt-heading"
              className="mt-5 overflow-hidden rounded-2xl border bg-card"
            >
              <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-success/10 text-success">
                    <CheckCircle2 aria-hidden="true" className="size-5" />
                  </span>
                  <div>
                    <h2
                      id="extract-receipt-heading"
                      className="text-lg font-semibold"
                    >
                      Done — {receipt.pages}{' '}
                      {receipt.pages === 1 ? 'page' : 'pages'} ready
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatBytes(receipt.bytes)} · completed in{' '}
                      <span className="tabular">
                        {formatDuration(receipt.durationMs)}
                      </span>
                    </p>
                  </div>
                </div>
                <a
                  data-receipt-download
                  href={receipt.url}
                  download="extracted-pages.pdf"
                  aria-label="Save extracted PDF"
                  onClick={() =>
                    window.dispatchEvent(new CustomEvent('tool-downloaded'))
                  }
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-transparent bg-primary px-5 text-sm font-medium text-primary-foreground outline-none transition-all hover:bg-primary/80 focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <ArrowDownToLine aria-hidden="true" className="size-4" />
                  Save PDF
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
                    Dedicated browser worker
                  </p>
                </div>
                <div className="border-b p-4 sm:border-b-0 sm:border-r sm:p-5">
                  <p className="text-xs text-muted-foreground">Output check</p>
                  <p className="mt-1 text-sm font-semibold">
                    Reopened · {formatDuration(receipt.validationDurationMs)}
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
              <div className="border-t bg-success/10 p-4 sm:px-6">
                <p
                  className="text-sm leading-relaxed text-success dark:text-success"
                  style={{ fontFamily: 'var(--font-inter, Inter, sans-serif)' }}
                >
                  We believe your data belongs to you. This PDF task was
                  processed{' '}
                  <strong className="font-bold text-success dark:text-success">
                    locally
                  </strong>{' '}
                  in mere{' '}
                  <strong className="font-bold text-success dark:text-success">
                    {formatDuration(receipt.durationMs)}
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
          <p className="mt-5 rounded-xl border p-4 text-xs leading-5 text-muted-foreground">
            Scope: visible page content and order. Bookmarks, signatures, form
            behavior, attachments, document-level metadata, and certification
            state are not guaranteed in the new PDF.
          </p>
          <footer className="mt-10 flex flex-col gap-3 border-t py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              Candidate {manifest.version} · pdf-lib worker · Independent PDF.js
              tests
            </p>
            <a
              href="/data/json"
              className="focus-ring rounded font-semibold text-foreground hover:underline"
            >
              Next: JSON formatter →
            </a>
          </footer>
        </div>
      </section>
    </AppShell>
  );
}
