'use client';

import {
  CalendarClock,
  Fingerprint,
  FileCheck,
  FileText,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  UploadCloud,
  X,
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import {
  readPdfMetadata,
  stripPdfMetadata,
  type MetadataFinding,
  type PdfMetadataReport,
} from '@/lib/tools/pdf/metadata';

const MAX_FILE_BYTES = 100 * 1024 * 1024;

interface LoadedPdf {
  name: string;
  size: number;
  bytes: Uint8Array;
  report: PdfMetadataReport;
}

/**
 * The four places, in the order the page shows them.
 *
 * Each carries its own explanation because the whole point of this tool is
 * that people already know about the first one and are surprised by the
 * second. A list of values with no account of where they were hiding would
 * teach nothing and would not be believed.
 */
const SOURCES = [
  {
    id: 'info' as const,
    title: 'Document properties',
    icon: FileText,
    explains:
      'The fields a PDF reader shows under File → Properties. These are the ones most people know to check.',
  },
  {
    id: 'xmp' as const,
    title: 'XMP packet',
    icon: FileText,
    explains:
      'A second copy of the same information, written as XML. Most editors and design programs add one. It usually repeats the author and title and names the program that made the file. Clearing the document properties does not touch it, which is why a file can look clean and still name you.',
  },
  {
    id: 'dates' as const,
    title: 'Dates',
    icon: CalendarClock,
    explains:
      'When the document was really written and last changed — which can contradict whatever the covering message says.',
  },
  {
    id: 'id' as const,
    title: 'File identifier',
    icon: Fingerprint,
    explains:
      'A pair of hashes that lets two copies of a document be recognised as versions of one another, even after renaming.',
  },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function cleanedName(name: string): string {
  return name.replace(/\.pdf$/i, '') + '-no-metadata.pdf';
}

export function PdfMetadataTool() {
  const [loaded, setLoaded] = useState<LoadedPdf | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [cleanSummary, setCleanSummary] = useState<{
    fileName: string;
    removedCount: number;
  } | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const processFile = useCallback(async (file: File) => {
    setError('');
    setCleanSummary(null);

    if (file.size > MAX_FILE_BYTES) {
      setError(
        `File is too large (${formatBytes(file.size)}). This tool reads the whole document into memory, so it stops at ${formatBytes(MAX_FILE_BYTES)} to keep the page responsive.`,
      );
      errorRef.current?.focus();
      return;
    }

    setBusy('Reading what this PDF says about itself…');
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const report = await readPdfMetadata(bytes);
      setLoaded({ name: file.name, size: file.size, bytes, report });
    } catch {
      setError(
        'This file could not be read as a PDF. If it is password-protected, remove the password first — an encrypted file cannot be inspected without it.',
      );
      errorRef.current?.focus();
    } finally {
      setBusy('');
    }
  }, []);

  const handleChoose = (file?: File) => {
    if (file) void processFile(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void processFile(file);
  };

  const handleReset = () => {
    setLoaded(null);
    setCleanSummary(null);
    setError('');
    setBusy('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleStrip = async () => {
    if (!loaded) return;
    setBusy('Removing it…');
    const started = performance.now();
    try {
      const result = await stripPdfMetadata(loaded.bytes);
      const durationMs = performance.now() - started;

      const blob = new Blob([result.bytes as BlobPart], {
        type: 'application/pdf',
      });
      const url = URL.createObjectURL(blob);
      const name = cleanedName(loaded.name);
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 10000);

      setCleanSummary({ fileName: name, removedCount: result.removed.length });
      announceCompletion({
        operation: 'PDF metadata remover',
        durationMs,
        summary: `Removed ${result.removed.length} pieces of metadata from ${loaded.name}.`,
        metrics: [
          { label: 'Entries removed', value: String(result.removed.length) },
          { label: 'Size', value: formatBytes(result.bytes.length) },
        ],
      });
    } catch {
      setError('This PDF could not be rewritten without its metadata.');
      errorRef.current?.focus();
    } finally {
      setBusy('');
    }
  };

  const report = loaded?.report;
  const findingsBySource = (source: MetadataFinding['source']) =>
    report?.findings.filter((finding) => finding.source === source) ?? [];
  const nothingFound = report ? report.findings.length === 0 : false;

  return (
    <AppShell currentToolId="pdf-metadata">
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
                <span>Metadata</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                See what your PDF says about you, then remove it
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                A PDF records who wrote it, what wrote it and when — in four
                separate places. Many tools clear the first one and leave the
                rest, so a file that looks clean can still carry your name. This
                shows all four and removes all four.
              </p>
            </div>
            <span className="flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold">
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              Runs in this tab
            </span>
          </div>

          {error ? (
            <div
              ref={errorRef}
              tabIndex={-1}
              role="alert"
              className="mt-6 flex items-start justify-between gap-4 rounded-xl border border-destructive/35 bg-destructive/5 p-4 text-sm"
            >
              <div>
                <p className="font-semibold text-destructive">
                  Unable to read this PDF
                </p>
                <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">
                  {error}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setError('')}
                className="cursor-pointer text-muted-foreground"
              >
                <span className="sr-only">Dismiss</span>
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
          ) : null}

          {!loaded ? (
            <div
              onDrop={handleDrop}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragOver(false);
              }}
              className={`mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed p-10 text-center transition-colors ${
                isDragOver
                  ? 'border-primary bg-accent/30'
                  : 'border-border bg-card'
              }`}
            >
              <div className="flex size-14 items-center justify-center rounded-2xl border bg-background">
                <UploadCloud
                  aria-hidden="true"
                  className="size-7 text-muted-foreground"
                />
              </div>
              <p className="mt-4 text-base font-semibold">
                Choose a PDF or drop it here
              </p>
              <p className="mt-1.5 max-w-md text-xs leading-5 text-muted-foreground">
                Accepts PDF files up to 100 MB. Read and cleaned entirely in
                your browser tab.
              </p>
              <label className="mt-6">
                <span className="sr-only">Choose a PDF</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(event) => handleChoose(event.target.files?.[0])}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  disabled={Boolean(busy)}
                  onClick={() => fileRef.current?.click()}
                  className="cursor-pointer"
                >
                  {busy || 'Select PDF'}
                </Button>
              </label>
            </div>
          ) : null}

          {busy ? (
            <output className="mt-4 block text-sm text-muted-foreground">
              {busy}
            </output>
          ) : null}

          {loaded && report ? (
            <div className="mt-6 space-y-6">
              <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-2xl border bg-background text-foreground">
                    <FileCheck className="size-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {loaded.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(loaded.size)} ·{' '}
                      {nothingFound
                        ? 'nothing found to remove'
                        : `${report.findings.length} ${report.findings.length === 1 ? 'entry' : 'entries'} found`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    data-receipt-download
                    disabled={Boolean(busy) || nothingFound}
                    onClick={handleStrip}
                    className="flex items-center gap-1.5"
                  >
                    <ShieldCheck aria-hidden="true" className="size-4" />
                    Remove all and download
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    className="flex items-center gap-1.5"
                  >
                    <RotateCcw aria-hidden="true" className="size-4" />
                    Choose another
                  </Button>
                </div>
              </div>

              {cleanSummary ? (
                <output className="block rounded-xl border border-border bg-card p-4 text-sm">
                  <p className="font-semibold">
                    Downloaded {cleanSummary.fileName}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {cleanSummary.removedCount}{' '}
                    {cleanSummary.removedCount === 1 ? 'entry' : 'entries'}{' '}
                    removed. The pages themselves are untouched — this changes
                    only what describes the file.
                  </p>
                </output>
              ) : null}

              {nothingFound ? (
                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="text-sm font-semibold">
                    This PDF carries no metadata
                  </p>
                  <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                    No document properties, no XMP packet, no dates and no file
                    identifier. There is nothing here to remove, so the button
                    is switched off rather than handing you back an identical
                    file under the word &ldquo;cleaned&rdquo;.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {SOURCES.map((source) => {
                    const items = findingsBySource(source.id);
                    const Icon = source.icon;
                    return (
                      <div
                        key={source.id}
                        className="rounded-2xl border border-border bg-card p-5"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border bg-background">
                            <Icon aria-hidden="true" className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">
                              {source.title}
                              {items.length === 0 ? (
                                <span className="ml-2 font-normal text-muted-foreground">
                                  — nothing here
                                </span>
                              ) : null}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                              {source.explains}
                            </p>
                          </div>
                        </div>
                        {items.length > 0 ? (
                          <dl className="mt-4 space-y-2 border-t pt-4">
                            {items.map((finding) => (
                              <div
                                key={`${finding.source}-${finding.label}`}
                                className="flex flex-col gap-1 sm:flex-row sm:gap-4"
                              >
                                <dt className="w-48 shrink-0 text-xs font-medium text-muted-foreground">
                                  {finding.label}
                                </dt>
                                <dd className="min-w-0 break-words text-sm">
                                  {finding.value}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="text-xs leading-5 text-muted-foreground">
                What this does not do: it removes what describes the file, not
                what is printed on the pages. A name in the text of the document
                stays there — use{' '}
                <a className="underline" href="/pdf/redact">
                  Redact
                </a>{' '}
                for that.
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}
