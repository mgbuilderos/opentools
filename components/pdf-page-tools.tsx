'use client';

import {
  ArrowDownToLine,
  CheckCircle2,
  FilePlus2,
  FileText,
  LockKeyhole,
  RotateCw,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { RelatedTools } from '@/components/related-tools';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import type { RelatedTool } from '@/lib/seo/related-tools';
import { toolMeta } from '@/lib/tools/tool-meta';
import { parsePageSelection } from '@/lib/tools/pdf/page-selection';
import type {
  PdfPageTransformOptions,
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
    {
      type: 'module',
      name: 'pdf-page-transform-engine',
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

async function toWorkerInput(source: { id: string; file: File }) {
  return {
    id: source.id,
    name: source.file.name,
    bytes: await source.file.arrayBuffer(),
  } satisfies PdfWorkerInput;
}

/*
  Six distinct jobs live on this one page: rotate, reorder, delete pages, page
  numbers, watermark and metadata. Each is a separate thing a person searches
  for, and until now all six shared one URL and one title ("Organize PDF
  pages"), so none could rank for its own name.

  `initialOperationId` is what app/pdf/[tool]/page.tsx passes so that
  /pdf/rotate-pdf is genuinely a page about rotating a PDF: the heading, the
  description and the stated task are that operation's, not the generic
  workspace's. The controls are all present either way — this page has always
  been one pass over a document — so naming the task is an honest difference,
  not a template with two words swapped.
*/
const PAGE_TOOL_TASKS: ReadonlyMap<
  string,
  { name: string; description: string }
> = new Map([
  [
    'rotate-pdf',
    {
      name: 'Rotate PDF',
      description: 'Turn pages 90, 180 or 270 degrees and save the result.',
    },
  ],
  [
    'reorder-pdf-pages',
    {
      name: 'Reorder PDF pages',
      description: 'Put the pages of a PDF into the order you want.',
    },
  ],
  [
    'delete-pdf-pages',
    {
      name: 'Delete PDF pages',
      description: 'Remove the pages you do not want and keep the rest.',
    },
  ],
  [
    'pdf-page-numbers',
    {
      name: 'Add page numbers to a PDF',
      description: 'Number the pages of a PDF before you send it.',
    },
  ],
  [
    'pdf-watermark',
    {
      name: 'Watermark a PDF',
      description: 'Stamp text across every page of a PDF.',
    },
  ],
  [
    'pdf-metadata-editor',
    {
      name: 'Edit PDF metadata',
      description: 'Change the title, author and subject stored inside a PDF.',
    },
  ],
]);

export function PdfPageTools({
  initialOperationId,
  relatedTools = [],
}: {
  initialOperationId?: string;
  /** Built by `lib/seo/related-tools.ts` in the route file; see there. */
  relatedTools?: readonly RelatedTool[];
} = {}) {
  const task = initialOperationId
    ? PAGE_TOOL_TASKS.get(initialOperationId)
    : undefined;

  const fileRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const outputUrlRef = useRef<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [source, setSource] = useState<SourcePdf | null>(null);
  const [pageOrder, setPageOrder] = useState('1');
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [pageNumbers, setPageNumbers] = useState(false);
  const [watermark, setWatermark] = useState('');
  const [metadata, setMetadata] = useState({
    title: '',
    author: '',
    subject: '',
    keywords: '',
  });
  const [status, setStatus] = useState<
    'idle' | 'inspecting' | 'ready' | 'processing' | 'success' | 'error'
  >('idle');
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState('');
  const manifest = toolMeta('pdf-page-tools');

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
          const pages = message.files[0]?.pages ?? 0;
          setSource({ ...candidate, pages });
          setPageOrder(`1-${pages}`);
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

  const run = async () => {
    if (!source || status === 'processing') return;
    if (
      watermark &&
      Array.from(watermark).some((character) => {
        const codePoint = character.codePointAt(0) ?? 0;
        return codePoint < 32 || codePoint > 126;
      })
    ) {
      setError(
        'Watermark text currently supports basic Latin characters only.',
      );
      return;
    }
    let orderedPages: number[];
    try {
      orderedPages = parsePageSelection(pageOrder, source.pages);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Page order is invalid.',
      );
      return;
    }
    clearResult();
    setError('');
    setStatus('processing');
    setProgress({ completed: 0, total: orderedPages.length });
    const started = performance.now();
    try {
      const worker = createWorker();
      workerRef.current = worker;
      const input = await toWorkerInput(source);
      const options: PdfPageTransformOptions = {
        pageOrder: orderedPages,
        rotation,
        pageNumbers,
        watermark,
        metadata,
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
          setReceipt({
            url,
            bytes: blob.size,
            pages: message.pageCount,
            durationMs,
            validationDurationMs: message.validationDurationMs,
          });
          setStatus('success');
          announceCompletion({
            operation: 'PDF page tools',
            durationMs,
            summary: `${message.pageCount} ${message.pageCount === 1 ? 'page' : 'pages'} organized and checked locally.`,
            metrics: [
              { label: 'Pages', value: String(message.pageCount) },
              { label: 'Input', value: formatBytes(source.file.size) },
              { label: 'Output', value: formatBytes(blob.size) },
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
          'PDF editing stopped unexpectedly. Your original is unchanged.',
        );
        worker.terminate();
        workerRef.current = null;
      };
      const request: PdfWorkerRequest = { type: 'transform', input, options };
      worker.postMessage(request, [input.bytes]);
    } catch {
      workerRef.current?.terminate();
      workerRef.current = null;
      setStatus('error');
      setError('PDF editing could not start. Your original is unchanged.');
    }
  };

  const clear = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    clearResult();
    setSource(null);
    setPageOrder('1');
    setRotation(0);
    setPageNumbers(false);
    setWatermark('');
    setMetadata({ title: '', author: '', subject: '', keywords: '' });
    setError('');
    setStatus('idle');
    if (fileRef.current) fileRef.current.value = '';
  };
  const percent = progress.total
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  return (
    <AppShell currentToolId="pdf-page-tools">
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
                <span>{task ? task.name : 'Page tools'}</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                {task ? task.name : 'Organize PDF pages'}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                {task
                  ? `${task.description} Everything happens in this browser tab.`
                  : 'Reorder, remove, rotate, number, watermark, and label a PDF in one local pass.'}
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
                <p className="font-semibold">Couldn’t edit this PDF</p>
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
                  Signature and page count checked locally
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
                        {source.pages} pages · original remains unchanged
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
                  aria-label="Choose a PDF to organize"
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
                      Up to 150 MB
                    </span>
                  </span>
                </button>
              )}
            </div>
          </section>

          {source ? (
            <section className="mt-5 rounded-2xl border bg-card p-4 sm:p-6">
              <div className="grid gap-5 lg:grid-cols-2">
                <label className="text-sm font-semibold">
                  Pages in output order
                  <input
                    value={pageOrder}
                    onChange={(event) => {
                      setPageOrder(event.target.value);
                      clearResult();
                    }}
                    className="focus-ring mt-2 h-11 w-full rounded-xl border bg-background px-3 font-mono text-sm"
                  />
                  <span className="mt-2 block text-xs font-normal text-muted-foreground">
                    Example: 3, 1-2. Omit a page to remove it.
                  </span>
                </label>
                <label className="text-sm font-semibold">
                  Rotate every page
                  <select
                    value={rotation}
                    onChange={(event) => {
                      setRotation(
                        Number(event.target.value) as 0 | 90 | 180 | 270,
                      );
                      clearResult();
                    }}
                    className="focus-ring mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm"
                  >
                    <option value="0">No rotation</option>
                    <option value="90">90° clockwise</option>
                    <option value="180">180°</option>
                    <option value="270">270° clockwise</option>
                  </select>
                </label>
                <label className="text-sm font-semibold">
                  Watermark text
                  <input
                    value={watermark}
                    maxLength={80}
                    placeholder="Optional"
                    onChange={(event) => {
                      setWatermark(event.target.value);
                      clearResult();
                    }}
                    className="focus-ring mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm"
                  />
                </label>
                <label className="flex min-h-11 items-center gap-3 self-end rounded-xl border px-3 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={pageNumbers}
                    onChange={(event) => {
                      setPageNumbers(event.target.checked);
                      clearResult();
                    }}
                    className="size-4 accent-foreground"
                  />{' '}
                  Add page numbers
                </label>
              </div>
              <details className="mt-5 rounded-xl border p-4">
                <summary className="cursor-pointer text-sm font-semibold">
                  Document metadata
                </summary>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {(['title', 'author', 'subject', 'keywords'] as const).map(
                    (field) => (
                      <label
                        key={field}
                        className="text-xs font-semibold capitalize"
                      >
                        {field}
                        <input
                          value={metadata[field]}
                          placeholder={
                            field === 'keywords'
                              ? 'Comma-separated'
                              : 'Optional'
                          }
                          onChange={(event) => {
                            setMetadata((current) => ({
                              ...current,
                              [field]: event.target.value,
                            }));
                            clearResult();
                          }}
                          className="focus-ring mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm font-normal"
                        />
                      </label>
                    ),
                  )}
                </div>
              </details>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
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
                  disabled={status === 'processing' || !pageOrder.trim()}
                  onClick={() => void run()}
                >
                  <RotateCw aria-hidden="true" />
                  {status === 'processing'
                    ? 'Working locally…'
                    : 'Apply PDF changes'}
                </Button>
              </div>
              {status === 'processing' ? (
                <div className="mt-5" aria-live="polite">
                  <div className="flex justify-between text-xs">
                    <span>Processing pages</span>
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
            </section>
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
                      Done — {receipt.pages}{' '}
                      {receipt.pages === 1 ? 'page' : 'pages'} ready
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatBytes(receipt.bytes)} · completed in{' '}
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
                      download="edited-pages.pdf"
                      aria-label="Save edited PDF"
                    />
                  }
                >
                  <ArrowDownToLine aria-hidden="true" /> Save PDF
                </Button>
              </div>
              <div className="grid border-t sm:grid-cols-3">
                <div className="border-b p-4 sm:border-b-0 sm:border-r">
                  <p className="text-xs text-muted-foreground">Processing</p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
                    <ShieldCheck aria-hidden="true" className="size-4" />{' '}
                    Dedicated browser worker
                  </p>
                </div>
                <div className="border-b p-4 sm:border-b-0 sm:border-r">
                  <p className="text-xs text-muted-foreground">Output check</p>
                  <p className="mt-1 text-sm font-semibold">
                    Reopened · {formatDuration(receipt.validationDurationMs)}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-muted-foreground">
                    Privacy boundary
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    No file upload path
                  </p>
                </div>
              </div>
            </section>
          ) : null}
          <RelatedTools tools={relatedTools} />

          <footer className="mt-10 border-t py-6 text-xs text-muted-foreground">
            Candidate {manifest.version} · pdf-lib · Browser worker
          </footer>
        </div>
      </section>
    </AppShell>
  );
}
