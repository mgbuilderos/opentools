'use client';

import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  CheckCircle2,
  FileImage,
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
import type {
  ImagesToPdfOptions,
  PdfImageInput,
  PdfWorkerRequest,
  PdfWorkerResponse,
} from '@/lib/tools/pdf/protocol';

type ImageItem = { id: string; file: File };
type Receipt = {
  url: string;
  bytes: number;
  pages: number;
  durationMs: number;
  validationDurationMs: number;
};

const MAX_FILES = 40;
const MAX_TOTAL_BYTES = 100 * 1024 * 1024;
const supportedTypes = new Set(['image/jpeg', 'image/png']);

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

function now() {
  return performance.now();
}

function createWorker() {
  return new Worker(
    new URL('../workers/pdf-merge.worker.ts', import.meta.url),
    { type: 'module', name: 'images-to-pdf-engine' },
  );
}

async function toWorkerInputs(items: ImageItem[]): Promise<PdfImageInput[]> {
  return Promise.all(
    items.map(async ({ id, file }) => ({
      id,
      name: file.name,
      mimeType: file.type as PdfImageInput['mimeType'],
      bytes: await file.arrayBuffer(),
    })),
  );
}

export function ImagesToPdfTool() {
  const fileRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const outputUrlRef = useRef<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [pageSize, setPageSize] =
    useState<ImagesToPdfOptions['pageSize']>('a4');
  const [orientation, setOrientation] =
    useState<ImagesToPdfOptions['orientation']>('auto');
  const [margin, setMargin] = useState<ImagesToPdfOptions['margin']>(24);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState('');
  const manifest = toolMeta('images-to-pdf');

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

  const addImages = (incoming: File[]) => {
    if (busy) return;
    setError('');
    clearResult();
    const valid = incoming.filter((file) => supportedTypes.has(file.type));
    if (valid.length !== incoming.length) {
      setError(
        'Choose JPEG or PNG images. Animated and vector images are not supported here.',
      );
      return;
    }
    if (images.length + valid.length > MAX_FILES) {
      setError(`Choose no more than ${MAX_FILES} images per PDF.`);
      return;
    }
    const totalBytes = [...images.map(({ file }) => file), ...valid].reduce(
      (total, file) => total + file.size,
      0,
    );
    if (totalBytes > MAX_TOTAL_BYTES) {
      setError('These images exceed the current 100 MB total safety limit.');
      return;
    }
    setImages((current) => [
      ...current,
      ...valid.map((file) => ({ id: crypto.randomUUID(), file })),
    ]);
  };

  const move = (index: number, direction: -1 | 1) => {
    clearResult();
    setImages((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  };

  const run = async () => {
    if (!images.length || busy) return;
    setBusy(true);
    setError('');
    clearResult();
    setProgress({ completed: 0, total: images.length });
    const started = now();
    try {
      const worker = createWorker();
      workerRef.current = worker;
      const inputs = await toWorkerInputs(images);
      worker.onmessage = (event: MessageEvent<PdfWorkerResponse>) => {
        const message = event.data;
        if (message.type === 'progress') {
          setProgress({ completed: message.completed, total: message.total });
          return;
        }
        if (message.type === 'result') {
          const blob = new Blob([message.bytes], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          outputUrlRef.current = url;
          const durationMs = now() - started;
          setReceipt({
            url,
            bytes: blob.size,
            pages: message.pageCount,
            durationMs,
            validationDurationMs: message.validationDurationMs,
          });
          setBusy(false);
          announceCompletion({
            operation: 'Images to PDF',
            durationMs,
            summary: `${message.pageCount} ${message.pageCount === 1 ? 'image' : 'images'} arranged into one checked PDF.`,
            metrics: [
              { label: 'Images', value: String(message.pageCount) },
              { label: 'Output', value: formatBytes(blob.size) },
              {
                label: 'Page size',
                value:
                  pageSize === 'image' ? 'Fit image' : pageSize.toUpperCase(),
              },
            ],
          });
        } else if (message.type === 'error') {
          const failed = images.find((item) => item.id === message.inputId);
          setError(
            `${failed ? `${failed.file.name}: ` : ''}${message.message}`,
          );
          setBusy(false);
        }
        if (message.type === 'result' || message.type === 'error') {
          worker.terminate();
          workerRef.current = null;
        }
      };
      worker.onerror = () => {
        setError(
          'PDF creation stopped unexpectedly. Your images are unchanged.',
        );
        setBusy(false);
        worker.terminate();
        workerRef.current = null;
      };
      const options: ImagesToPdfOptions = { pageSize, orientation, margin };
      const request: PdfWorkerRequest = {
        type: 'images-to-pdf',
        inputs,
        options,
      };
      worker.postMessage(
        request,
        inputs.map((input) => input.bytes),
      );
    } catch {
      workerRef.current?.terminate();
      workerRef.current = null;
      setBusy(false);
      setError(
        'The browser could not start PDF creation. Your images are unchanged.',
      );
    }
  };

  const clear = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    clearResult();
    setImages([]);
    setError('');
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
  };
  const totalBytes = images.reduce((total, item) => total + item.file.size, 0);
  const percent = progress.total
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  return (
    <AppShell currentToolId="images-to-pdf">
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
                <span>Create</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Images to PDF
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                Arrange JPEG and PNG images, choose a paper layout, and create
                one PDF in a dedicated browser worker.
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
                <p className="font-semibold">Couldn’t create this PDF</p>
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
                <h2 className="text-sm font-semibold">Source images</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  JPEG or PNG · 40 files · 100 MB total
                </p>
              </div>
              {images.length ? (
                <span className="tabular text-xs text-muted-foreground">
                  {images.length} files · {formatBytes(totalBytes)}
                </span>
              ) : null}
            </div>
            <div className="p-4 sm:p-5">
              <input
                ref={fileRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                aria-label="Choose JPEG or PNG images"
                className="sr-only"
                onChange={(event) =>
                  addImages(Array.from(event.target.files ?? []))
                }
              />
              {!images.length ? (
                <button
                  type="button"
                  aria-label="Choose JPEG or PNG images to convert to PDF"
                  onClick={() => fileRef.current?.click()}
                  className="focus-ring grid min-h-52 w-full place-items-center rounded-xl border border-dashed bg-muted/45 p-6 text-center"
                >
                  <span>
                    <span className="mx-auto grid size-11 place-items-center rounded-xl border bg-background">
                      <FilePlus2 aria-hidden="true" className="size-5" />
                    </span>
                    <span className="mt-4 block font-semibold">
                      Choose images
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      One PDF page is created for each image.
                    </span>
                  </span>
                </button>
              ) : (
                <div className="space-y-2">
                  {images.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-xl border bg-muted/35 p-3"
                    >
                      <span className="tabular w-6 text-center font-mono text-xs text-muted-foreground">
                        {index + 1}
                      </span>
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg border bg-background">
                        <FileImage aria-hidden="true" className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {item.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatBytes(item.file.size)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={index === 0 || busy}
                        onClick={() => move(index, -1)}
                        aria-label={`Move ${item.file.name} up`}
                      >
                        <ArrowUp aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={index === images.length - 1 || busy}
                        onClick={() => move(index, 1)}
                        aria-label={`Move ${item.file.name} down`}
                      >
                        <ArrowDown aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={busy}
                        onClick={() => {
                          clearResult();
                          setImages((current) =>
                            current.filter(({ id }) => id !== item.id),
                          );
                        }}
                        aria-label={`Remove ${item.file.name}`}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    className="mt-3 h-10"
                    disabled={busy || images.length >= MAX_FILES}
                    onClick={() => fileRef.current?.click()}
                  >
                    <FilePlus2 aria-hidden="true" /> Add images
                  </Button>
                </div>
              )}
            </div>
          </section>

          {images.length ? (
            <section className="mt-5 rounded-2xl border bg-card p-4 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="text-sm font-semibold">
                  Page size
                  <select
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(
                        event.target.value as ImagesToPdfOptions['pageSize'],
                      );
                      clearResult();
                    }}
                    className="focus-ring mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm"
                  >
                    <option value="a4">A4</option>
                    <option value="letter">US Letter</option>
                    <option value="image">Fit each image</option>
                  </select>
                </label>
                <label className="text-sm font-semibold">
                  Orientation
                  <select
                    value={orientation}
                    disabled={pageSize === 'image'}
                    onChange={(event) => {
                      setOrientation(
                        event.target.value as ImagesToPdfOptions['orientation'],
                      );
                      clearResult();
                    }}
                    className="focus-ring mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm disabled:opacity-50"
                  >
                    <option value="auto">Match each image</option>
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </label>
                <label className="text-sm font-semibold">
                  Margin
                  <select
                    value={margin}
                    onChange={(event) => {
                      setMargin(
                        Number(
                          event.target.value,
                        ) as ImagesToPdfOptions['margin'],
                      );
                      clearResult();
                    }}
                    className="focus-ring mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm"
                  >
                    <option value="0">None</option>
                    <option value="12">Small</option>
                    <option value="24">Medium</option>
                    <option value="36">Large</option>
                  </select>
                </label>
              </div>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="ghost"
                  className="h-11"
                  disabled={busy}
                  onClick={clear}
                >
                  <Trash2 aria-hidden="true" /> Clear
                </Button>
                <Button
                  className="h-11 min-w-44"
                  disabled={busy}
                  onClick={() => void run()}
                >
                  <FileText aria-hidden="true" />{' '}
                  {busy ? 'Building locally…' : 'Create PDF'}
                </Button>
              </div>
              {busy ? (
                <div className="mt-5" aria-live="polite">
                  <div className="flex justify-between text-xs">
                    <span>Embedding images</span>
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
                      download="images.pdf"
                      aria-label="Save generated PDF"
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
                    Browser worker
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
                    No file network primitive
                  </p>
                </div>
              </div>
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
