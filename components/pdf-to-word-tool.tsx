'use client';

import {
  ArrowDownToLine,
  FileText,
  LockKeyhole,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import {
  useLocaleEdition,
  useToolUi,
} from '@/components/locale-edition-provider';
import { fillMessage } from '@/lib/i18n/tool-ui';
import {
  BatchLocalPromise,
  BatchRunnerPanel,
  useFileBatchRunner,
} from '@/components/batch-runner';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import { offerFile } from '@/lib/file-handoff';
import { DOCX_MIME_TYPE } from '@/lib/tools/docx/document';
import { convertPdfToWord, PdfToWordError } from '@/lib/tools/pdf/pdf-to-word';

type Receipt = {
  url: string;
  name: string;
  pageCount: number;
  characterCount: number;
  paragraphCount: number;
  pagesWithoutText: number;
  docxBytes: number;
  sourceBytes: number;
  durationMs: number;
};

const MAX_BYTES = 150 * 1024 * 1024;

/**
 * The PDF library runs its own worker for parsing, so the heavy work is
 * already off the main thread. Wrapping it in a second worker of ours meant a
 * worker inside a worker, which is where the conversion silently stalled.
 */

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

function docxNameFor(pdfName: string) {
  const trimmed = pdfName.replace(/\.pdf$/iu, '');
  return `${trimmed || 'document'}.docx`;
}

function docxBlob(bytes: Uint8Array) {
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  return new Blob([buffer], { type: DOCX_MIME_TYPE });
}

export function PdfToWordTool() {
  /* Localised control strings; the English bundle everywhere else. */
  const t = useToolUi();
  const edition = useLocaleEdition();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [canOpenOcr, setCanOpenOcr] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const batch = useFileBatchRunner();
  const fileRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  useEffect(() => {
    if (receipt) receiptRef.current?.focus();
  }, [receipt]);

  function clearReceipt() {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setReceipt(null);
  }

  function chooseFile(next: File | undefined) {
    if (!next) return;
    clearReceipt();
    setError('');
    setCanOpenOcr(false);
    if (next.size > MAX_BYTES) {
      setError(
        fillMessage(t.toWordTooLarge, {
          name: next.name,
          size: formatBytes(next.size),
          max: formatBytes(MAX_BYTES),
        }),
      );
      return;
    }
    setFile(next);
  }

  function chooseFiles(files?: FileList | File[]) {
    const selected = Array.from(files ?? []);
    if (selected.length === 0 || busy || batch.running) return;
    if (selected.length === 1) {
      batch.reset();
      setBatchFiles([]);
      chooseFile(selected[0]);
      return;
    }
    clearReceipt();
    setFile(null);
    setError('');
    batch.reset();
    setBatchFiles(selected);
  }

  async function convert() {
    if (!file || busy) return;
    setBusy(true);
    setError('');
    setCanOpenOcr(false);
    clearReceipt();

    const startedAt = performance.now();
    try {
      const buffer = await file.arrayBuffer();
      const response = await convertPdfToWord(new Uint8Array(buffer));
      const durationMs = performance.now() - startedAt;

      const blob = docxBlob(response.bytes);
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setReceipt({
        url,
        name: docxNameFor(file.name),
        pageCount: response.pageCount,
        characterCount: response.characterCount,
        paragraphCount: response.paragraphCount,
        pagesWithoutText: response.pagesWithoutText,
        docxBytes: blob.size,
        sourceBytes: file.size,
        durationMs,
      });
      announceCompletion({
        operation: t.toWordTitle,
        durationMs,
        summary: fillMessage(
          response.pageCount === 1 ? t.toWordSummaryOne : t.toWordSummaryMany,
          { pages: response.pageCount },
        ),
        metrics: [
          {
            label: t.toWordParagraphs,
            value: response.paragraphCount.toLocaleString(),
          },
          {
            label: t.toWordCharacters,
            value: response.characterCount.toLocaleString(),
          },
          { label: t.toWordWordFile, value: formatBytes(blob.size) },
        ],
      });
    } catch (cause) {
      setCanOpenOcr(
        cause instanceof PdfToWordError && cause.code === 'NO_TEXT_LAYER',
      );
      setError(cause instanceof Error ? cause.message : t.toWordFailed);
    } finally {
      setBusy(false);
    }
  }

  async function openOcr() {
    if (!file) return;
    await offerFile(file);
    window.location.assign('/pdf/ocr');
  }

  function clearAll() {
    batch.reset();
    setBatchFiles([]);
    setFile(null);
    clearReceipt();
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  }

  function startBatch() {
    setError('');
    void batch.start(batchFiles, async (source, _index, signal) => {
      if (source.size > MAX_BYTES) {
        return { status: 'skipped', reason: 'The 150 MB limit was exceeded.' };
      }
      if (!source.name.toLowerCase().endsWith('.pdf')) {
        return { status: 'skipped', reason: 'Only PDF files are supported.' };
      }
      if (signal.aborted) {
        return { status: 'skipped', reason: 'Batch cancelled.' };
      }
      const response = await convertPdfToWord(
        new Uint8Array(await source.arrayBuffer()),
      );
      return {
        status: 'done',
        output: {
          blob: docxBlob(response.bytes),
          fileName: docxNameFor(source.name),
        },
      };
    });
  }

  return (
    <AppShell currentToolId="pdf-to-word">
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
                <span>{t.toWordShort}</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                {t.toWordTitle}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                {t.toWordStandfirstLead}{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-sm">
                  .docx
                </code>{' '}
                {t.toWordStandfirstTail}
              </p>
            </div>
            <span className="flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold">
              <LockKeyhole aria-hidden="true" className="size-3.5" />{' '}
              {t.onDevicePrototype}
            </span>
          </div>

          <div className="mt-6 rounded-xl border bg-muted/40 p-4 text-sm leading-6">
            <p className="font-semibold">{t.toWordScope}</p>
            <p className="mt-1 text-muted-foreground">
              {/*
                English keeps its own markup, with the two words in bold. A
                translation cannot reuse that shape -- the emphasised words sit
                elsewhere in other languages -- so a localised page renders one
                plain paragraph from the bundle instead.
              */}
              {edition ? (
                t.toWordScopeProse
              ) : (
                <>
                  It recovers the <strong>text</strong>: reading order,
                  paragraphs, page breaks, and headings where the PDF sets them
                  in larger type. It does <strong>not</strong> rebuild the page
                  layout — columns, tables as real tables, images, and fonts are
                  not carried across. If your PDF is a scan or a photo of paper
                  it holds no text at all, and this page will tell you so rather
                  than hand you an empty document.
                </>
              )}
            </p>
          </div>

          {error ? (
            <div
              ref={errorRef}
              role="alert"
              tabIndex={-1}
              className="focus-ring mt-6 flex items-start justify-between gap-4 rounded-xl border border-destructive/35 bg-destructive/5 p-4 text-sm"
            >
              <div>
                <p className="font-semibold">{t.toWordCouldnt}</p>
                <p className="mt-1 text-muted-foreground">{error}</p>
                {canOpenOcr ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3"
                    onClick={() => void openOcr()}
                  >
                    {t.toWordOcrLink}
                  </Button>
                ) : null}
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

          <section className="mt-8 overflow-hidden rounded-2xl border bg-card p-5 sm:p-6">
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="application/pdf,.pdf"
              aria-label={t.chooseAPdf}
              className="sr-only"
              onChange={(event) => chooseFiles(event.target.files ?? [])}
            />

            {file ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{file.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatBytes(file.size)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="h-10"
                    disabled={batch.running}
                    onClick={() => fileRef.current?.click()}
                  >
                    {t.chooseAnother}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10"
                    aria-label={t.toWordRemoveAria}
                    onClick={() => {
                      clearAll();
                    }}
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-muted-foreground">
                  {t.toWordChooseHint}
                </p>
                <Button
                  className="h-11"
                  disabled={batch.running}
                  onClick={() => fileRef.current?.click()}
                >
                  <FileText aria-hidden="true" className="mr-2 size-4" />
                  {t.toWordChooseAria}
                </Button>
              </div>
            )}
            <BatchLocalPromise />

            {file ? (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button
                  className="h-11"
                  disabled={busy}
                  onClick={() => void convert()}
                >
                  {busy ? 'Converting…' : 'Convert to Word'}
                </Button>
                {busy ? (
                  <output
                    aria-live="polite"
                    className="text-sm text-muted-foreground"
                  >
                    Reading the text out of every page…
                  </output>
                ) : null}
              </div>
            ) : null}
          </section>

          {batchFiles.length > 1 ? (
            <BatchRunnerPanel
              files={batchFiles}
              runner={batch}
              startLabel="Convert all to Word"
              zipName="word-documents.zip"
              onStart={startBatch}
              onClear={clearAll}
            />
          ) : null}

          {receipt ? (
            <section
              ref={receiptRef}
              tabIndex={-1}
              aria-live="polite"
              className="focus-ring mt-6 rounded-2xl border bg-card p-5 sm:p-6"
            >
              <h2 className="text-lg font-semibold">
                Done — {receipt.pageCount}{' '}
                {receipt.pageCount === 1 ? 'page' : 'pages'} converted
              </h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {t.toWordParagraphs}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold">
                    {receipt.paragraphCount.toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {t.toWordCharacters}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold">
                    {receipt.characterCount.toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {t.toWordWordFile}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold">
                    {formatBytes(receipt.docxBytes)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {t.toWordTook}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold">
                    {formatDuration(receipt.durationMs)}
                  </dd>
                </div>
              </dl>

              {receipt.pagesWithoutText > 0 ? (
                <p className="mt-4 rounded-lg border border-destructive/35 bg-destructive/5 p-3 text-sm">
                  {fillMessage(t.toWordNoTextNote, {
                    without: receipt.pagesWithoutText,
                    total: receipt.pageCount,
                  })}
                </p>
              ) : null}

              <p className="mt-4 text-sm text-muted-foreground">
                {t.toWordTextOnlyNote}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  nativeButton={false}
                  className="h-11 px-5"
                  render={
                    <a
                      data-receipt-download
                      href={receipt.url}
                      download={receipt.name}
                      aria-label={t.toWordSave}
                    />
                  }
                >
                  <ArrowDownToLine aria-hidden="true" /> {t.toWordSaveShort}
                </Button>
                <Button
                  variant="outline"
                  className="h-11"
                  onClick={() => {
                    setFile(null);
                    clearReceipt();
                  }}
                >
                  {t.toWordConvertAnother}
                </Button>
              </div>
            </section>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}
