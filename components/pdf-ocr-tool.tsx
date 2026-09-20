'use client';

import {
  AlertCircle,
  ArrowDownToLine,
  FileSearch,
  LockKeyhole,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import {
  formatExactBytes,
  OCR_MAX_INITIAL_DOWNLOAD_BYTES,
} from '@/lib/tools/ocr/assets';
import { createOcrSession } from '@/lib/tools/ocr/runtime';
import type { OcrProgress } from '@/lib/tools/ocr/types';
import {
  addInvisibleTextLayer,
  plainTextFromPages,
  searchablePdfFileName,
  textFileName,
  type OcrPdfPageResult,
} from '@/lib/tools/pdf/ocr-pdf';
import { recognisePdfPages } from '@/lib/tools/pdf/ocr-render';
import { countCharacters, readPdfText } from '@/lib/tools/pdf/pdf-text';

const MAX_PDF_BYTES = 150 * 1024 * 1024;
const MAX_PAGES = 50;

interface PdfOcrReceipt {
  searchablePdf: Blob;
  plainText: Blob;
  pages: OcrPdfPageResult[];
  durationMs: number;
  wordCount: number;
}

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function PdfOcrTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [alreadyText, setAlreadyText] = useState(false);
  const [pageProgress, setPageProgress] = useState({ current: 0, total: 0 });
  const [engineProgress, setEngineProgress] = useState<OcrProgress | null>(
    null,
  );
  const [receipt, setReceipt] = useState<PdfOcrReceipt | null>(null);
  const assetDisclosure = formatExactBytes(OCR_MAX_INITIAL_DOWNLOAD_BYTES);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    [],
  );

  function resetOutput() {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setBusy(false);
    setError('');
    setAlreadyText(false);
    setPageProgress({ current: 0, total: 0 });
    setEngineProgress(null);
    setReceipt(null);
  }

  function chooseFile(next: File | undefined) {
    if (!next) return;
    resetOutput();
    if (next.size > MAX_PDF_BYTES) {
      setError(
        `${next.name} is ${formatBytes(next.size)}. PDFs must be no larger than ${formatBytes(MAX_PDF_BYTES)}.`,
      );
      return;
    }
    setFile(next);
  }

  function clear() {
    resetOutput();
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function run() {
    if (!file || busy) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    setBusy(true);
    setError('');
    setAlreadyText(false);
    setReceipt(null);
    const startedAt = performance.now();
    let session: Awaited<ReturnType<typeof createOcrSession>> | null = null;

    try {
      const source = new Uint8Array(await file.arrayBuffer());
      const textPages = await readPdfText(source.slice());
      if (textPages.length > MAX_PAGES) {
        throw new Error(
          `This PDF has ${textPages.length} pages. OCR is limited to ${MAX_PAGES} pages per run so the tab stays responsive.`,
        );
      }
      if (countCharacters(textPages) > 0) {
        setAlreadyText(true);
        return;
      }

      session = await createOcrSession(setEngineProgress, controller.signal);
      const pages = await recognisePdfPages(source, session, {
        signal: controller.signal,
        onPage(current, total) {
          setPageProgress({ current, total });
        },
        onProgress: setEngineProgress,
      });
      const layered = await addInvisibleTextLayer(source, pages);
      const text = plainTextFromPages(pages);
      const searchablePdf = new Blob([layered.bytes as BlobPart], {
        type: 'application/pdf',
      });
      const plainText = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const durationMs = performance.now() - startedAt;
      const nextReceipt = {
        searchablePdf,
        plainText,
        pages,
        durationMs,
        wordCount: layered.wordCount,
      };
      setReceipt(nextReceipt);
      announceCompletion({
        operation: 'PDF OCR',
        durationMs,
        summary: `${layered.pageCount} ${layered.pageCount === 1 ? 'page' : 'pages'} kept with an invisible searchable text layer.`,
        metrics: [
          { label: 'Pages', value: layered.pageCount.toLocaleString() },
          { label: 'Words', value: layered.wordCount.toLocaleString() },
          { label: 'Searchable PDF', value: formatBytes(searchablePdf.size) },
        ],
      });
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError')) {
        setError(
          cause instanceof Error
            ? cause.message
            : 'This PDF could not be OCRed.',
        );
      }
    } finally {
      await session?.terminate();
      if (controllerRef.current === controller) controllerRef.current = null;
      setBusy(false);
      setEngineProgress(null);
    }
  }

  return (
    <AppShell currentToolId="pdf-ocr">
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
                <span>OCR</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                OCR PDF
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                Turn an English scanned PDF into a searchable PDF without
                replacing its visible pages. Download the recognised plain text
                separately when that is all you need.
              </p>
            </div>
            <span className="flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold">
              <LockKeyhole aria-hidden="true" className="size-3.5" /> On-device
              OCR
            </span>
          </div>

          <div className="mt-6 rounded-xl border bg-muted/40 p-4 text-sm leading-6">
            <p className="font-semibold">A text layer, not a visual rewrite</p>
            <p className="mt-1 text-muted-foreground">
              The output keeps the original PDF pages and adds words using PDF
              rendering mode 3, so the layer is searchable but invisible. This
              page first checks for existing selectable text. Only a scan causes
              the English worker, model and one compatible core — at most{' '}
              <strong>{assetDisclosure}</strong> — to load from this site.
            </p>
          </div>

          {error ? (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-destructive/35 bg-destructive/5 p-4 text-sm"
            >
              <p className="font-semibold">Couldn&apos;t OCR this PDF</p>
              <p className="mt-1 text-muted-foreground">{error}</p>
            </div>
          ) : null}

          {alreadyText ? (
            <div
              role="alert"
              className="mt-6 flex gap-3 rounded-xl border bg-card p-5"
            >
              <AlertCircle
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0"
              />
              <div>
                <h2 className="font-semibold">
                  This PDF already contains selectable text
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  OCR was refused before any OCR asset downloaded.
                  Re-recognising digital text can only introduce mistakes. Use
                  the existing text or open the PDF-to-Word tool for an editable
                  document.
                </p>
                <a
                  href="/pdf/to-word"
                  className="focus-ring mt-3 inline-flex rounded-md border px-3 py-2 text-sm font-semibold"
                >
                  Open PDF to Word
                </a>
              </div>
            </div>
          ) : null}

          <section className="mt-8 rounded-2xl border bg-card p-5 sm:p-6">
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              aria-label="Choose a scanned PDF"
              className="sr-only"
              onChange={(event) => chooseFile(event.target.files?.[0])}
            />
            {file ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">{file.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatBytes(file.size)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => inputRef.current?.click()}
                  >
                    Choose another
                  </Button>
                  <Button
                    variant="outline"
                    aria-label="Remove the chosen PDF"
                    onClick={clear}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-muted-foreground">
                  Choose an image-only or scanned PDF, up to {MAX_PAGES} pages.
                </p>
                <Button
                  className="h-11"
                  onClick={() => inputRef.current?.click()}
                >
                  <FileSearch aria-hidden="true" className="mr-2 size-4" />{' '}
                  Choose a scanned PDF
                </Button>
              </div>
            )}

            {file ? (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button
                  className="h-11"
                  disabled={busy}
                  onClick={() => void run()}
                >
                  {busy
                    ? 'Running OCR…'
                    : `Check scan, then download ${assetDisclosure} and run OCR`}
                </Button>
                {busy ? (
                  <Button
                    variant="outline"
                    className="h-11"
                    onClick={() => controllerRef.current?.abort()}
                  >
                    Cancel
                  </Button>
                ) : null}
                {busy ? (
                  <output
                    aria-live="polite"
                    className="text-sm text-muted-foreground"
                  >
                    {pageProgress.total > 0
                      ? `Page ${pageProgress.current} of ${pageProgress.total}`
                      : 'Checking for an existing text layer'}
                    {engineProgress
                      ? ` · ${engineProgress.status} ${Math.round(engineProgress.progress * 100)}%`
                      : ''}
                  </output>
                ) : null}
              </div>
            ) : null}
          </section>

          {receipt && file ? (
            <section
              aria-live="polite"
              className="mt-6 rounded-2xl border bg-card p-5 sm:p-6"
            >
              <h2 className="text-lg font-semibold">
                Done — {receipt.pages.length}{' '}
                {receipt.pages.length === 1 ? 'page' : 'pages'} searchable
              </h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Pages preserved
                  </dt>
                  <dd className="mt-1 text-sm font-semibold">
                    {receipt.pages.length}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Words placed
                  </dt>
                  <dd className="mt-1 text-sm font-semibold">
                    {receipt.wordCount.toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Searchable PDF
                  </dt>
                  <dd className="mt-1 text-sm font-semibold">
                    {formatBytes(receipt.searchablePdf.size)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Took</dt>
                  <dd className="mt-1 text-sm font-semibold">
                    {(receipt.durationMs / 1000).toFixed(1)} s
                  </dd>
                </div>
              </dl>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2">Page</th>
                      <th className="py-2">Measured confidence</th>
                      <th className="py-2">Words</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipt.pages.map((page) => (
                      <tr
                        key={page.pageNumber}
                        className="border-b last:border-0"
                      >
                        <td className="py-2">{page.pageNumber}</td>
                        <td className="py-2">{page.confidence.toFixed(1)}</td>
                        <td className="py-2">
                          {page.words.length.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  data-receipt-download
                  onClick={() =>
                    download(
                      receipt.searchablePdf,
                      searchablePdfFileName(file.name),
                    )
                  }
                >
                  <ArrowDownToLine aria-hidden="true" /> Save searchable PDF
                </Button>
                <Button
                  variant="outline"
                  data-receipt-download
                  onClick={() =>
                    download(receipt.plainText, textFileName(file.name))
                  }
                >
                  <ArrowDownToLine aria-hidden="true" /> Save plain text
                </Button>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Confidence is reported by the recogniser for each page. It is
                not a promise of correctness; check names, numbers and
                punctuation.
              </p>
            </section>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}
