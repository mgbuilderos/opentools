'use client';

import {
  AlertCircle,
  ArrowDownToLine,
  CheckCircle2,
  FilePlus2,
  FileText,
  Lock,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import type {
  PdfFillOptions,
  PdfFormDocumentInfo,
  PdfFormField,
  PdfFormFieldReadOnlyReason,
  PdfFormFieldValue,
  PdfPageGeometry,
  PdfWorkerRequest,
  PdfWorkerResponse,
} from '@/lib/tools/pdf/protocol';
import {
  changedFieldValues,
  displayFieldValue,
  isEditableField,
  missingRequiredFields,
  sameFieldValue,
} from '@/lib/tools/pdf/sign-form-state';

type SourcePdf = {
  id: string;
  name: string;
  file: File;
  bytes: ArrayBuffer;
  pages: number;
  pageSizes: PdfPageGeometry[];
  fields: PdfFormField[];
  info: PdfFormDocumentInfo;
};

type Receipt = {
  url: string;
  name: string;
  bytes: number;
  pages: number;
  fieldsChanged: number;
  flattened: boolean;
  durationMs: number;
};

type ErrorState = {
  kind: 'open' | 'fill';
  message: string;
  suggestion?: string;
  link?: { href: string; label: string };
};

const READ_ONLY_REASONS: Record<PdfFormFieldReadOnlyReason, string> = {
  locked: 'Locked by document author',
  richText: 'Rich text preserved for layout',
  duplicateName: 'Shared field identifier',
  unreadable: 'Could not be parsed',
};

const MAX_BYTES = 150 * 1024 * 1024; // 150 MB

function createWorker() {
  return new Worker(
    new URL('../workers/pdf-merge.worker.ts', import.meta.url),
    {
      type: 'module',
      name: 'pdf-fill-engine',
    },
  );
}

export function PdfFormFillerTool() {
  const [source, setSource] = useState<SourcePdf | null>(null);
  const [fieldValues, setFieldValues] = useState<
    Record<string, PdfFormFieldValue>
  >({});
  const [flatten, setFlatten] = useState<boolean>(true);
  const [filterPage, setFilterPage] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [progressText, setProgressText] = useState<string>('');
  const [error, setError] = useState<ErrorState | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      if (receipt?.url) {
        URL.revokeObjectURL(receipt.url);
      }
    };
  }, [receipt?.url]);

  const resetAll = useCallback(() => {
    if (receipt?.url) {
      URL.revokeObjectURL(receipt.url);
    }
    setSource(null);
    setFieldValues({});
    setFlatten(true);
    setFilterPage('all');
    setSearchQuery('');
    setError(null);
    setReceipt(null);
    setLoading(false);
    setProgressText('');
  }, [receipt]);

  const handleFile = useCallback(
    async (file: File) => {
      resetAll();
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setError({
          kind: 'open',
          message: 'Please choose a valid PDF file.',
        });
        return;
      }
      if (file.size > MAX_BYTES) {
        setError({
          kind: 'open',
          message: `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 150 MB.`,
        });
        return;
      }

      setLoading(true);
      setProgressText('Reading PDF structure...');

      try {
        const buffer = await file.arrayBuffer();

        workerRef.current?.terminate();
        const worker = createWorker();
        workerRef.current = worker;

        worker.onmessage = (event: MessageEvent<PdfWorkerResponse>) => {
          const msg = event.data;
          if (msg.type === 'form') {
            setLoading(false);
            const initialValues: Record<string, PdfFormFieldValue> = {};
            for (const f of msg.fields) {
              initialValues[f.id] = f.value;
            }
            setFieldValues(initialValues);
            setSource({
              id: `pdf-${Date.now()}`,
              name: file.name,
              file,
              bytes: buffer,
              pages: msg.pages,
              pageSizes: msg.pageSizes,
              fields: msg.fields,
              info: msg.document,
            });
          } else if (msg.type === 'error') {
            setLoading(false);
            if (msg.code === 'ENCRYPTED_PDF') {
              setError({
                kind: 'open',
                message: 'This PDF is encrypted and cannot be filled.',
                suggestion:
                  'Unlocking needs the password. Use the password tool first.',
                link: { href: '/pdf/password', label: 'Unlock PDF' },
              });
            } else if (msg.code === 'RESTRICTED_PDF') {
              setError({
                kind: 'open',
                message:
                  'This PDF has permissions restrictions (owner password).',
                suggestion:
                  'Whoever made this PDF locked it against changes. It opens without a password, but it cannot be filled or modified here.',
                link: { href: '/pdf/password', label: 'Manage PDF password' },
              });
            } else if (msg.code === 'SIGNED_PDF') {
              setError({
                kind: 'open',
                message: 'This PDF already contains a digital signature.',
                suggestion:
                  'Modifying form fields would invalidate the cryptographic signature on this document.',
              });
            } else if (msg.code === 'XFA_PDF') {
              setError({
                kind: 'open',
                message: 'This file uses dynamic XML Forms Architecture (XFA).',
                suggestion:
                  'Dynamic XFA forms require proprietary desktop readers and cannot be rendered or filled with standard AcroForm tools.',
              });
            } else {
              setError({
                kind: 'open',
                message: msg.message || 'Could not read PDF form fields.',
              });
            }
          }
        };

        const request: PdfWorkerRequest = {
          type: 'inspect-form',
          input: {
            id: 'source-pdf',
            name: file.name,
            bytes: buffer,
          },
        };

        worker.postMessage(request);
      } catch (err) {
        setLoading(false);
        setError({
          kind: 'open',
          message:
            err instanceof Error ? err.message : 'Failed to inspect PDF form.',
        });
      }
    },
    [resetAll],
  );

  const handleFill = useCallback(async () => {
    if (!source) return;

    // Check required fields
    const missing = missingRequiredFields(source.fields, fieldValues);
    if (missing.length > 0 && flatten) {
      setError({
        kind: 'fill',
        message: `Please fill required fields before flattening: ${missing.map((m) => m.name || m.id).join(', ')}.`,
      });
      return;
    }

    setLoading(true);
    setProgressText('Filling form fields & generating PDF...');
    setError(null);

    workerRef.current?.terminate();
    const worker = createWorker();
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<PdfWorkerResponse>) => {
      const msg = event.data;
      if (msg.type === 'progress') {
        setProgressText(
          msg.phase === 'reading'
            ? 'Reading PDF...'
            : msg.phase === 'validating'
              ? 'Verifying filled fields...'
              : 'Writing changes...',
        );
      } else if (msg.type === 'result') {
        setLoading(false);
        const blob = new Blob([msg.bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const stem = source.name.replace(/\.[^.]+$/u, '');
        const outputName = flatten
          ? `${stem}-filled-flattened.pdf`
          : `${stem}-filled.pdf`;

        setReceipt({
          url,
          name: outputName,
          bytes: msg.bytes.byteLength,
          pages: msg.pageCount,
          fieldsChanged: msg.fieldsChanged ?? 0,
          flattened: Boolean(msg.flattened),
          durationMs: Math.round(msg.computeDurationMs),
        });

        announceCompletion({
          operation: 'PDF form fill',
          durationMs: Math.round(msg.computeDurationMs),
          summary: `${msg.pageCount} ${msg.pageCount === 1 ? 'page' : 'pages'} completed and checked in this browser.`,
          metrics: [
            { label: 'Fields', value: `${msg.fieldsChanged ?? 0} changed` },
            { label: 'Flattened', value: msg.flattened ? 'Yes' : 'No' },
            {
              label: 'Output',
              value: `${(msg.bytes.byteLength / 1024).toFixed(1)} KB`,
            },
          ],
        });
      } else if (msg.type === 'error') {
        setLoading(false);
        setError({
          kind: 'fill',
          message: msg.message || 'Failed to fill PDF form.',
        });
      }
    };

    const changed = changedFieldValues(source.fields, fieldValues);
    const options: PdfFillOptions = {
      values: changed,
      signature: null,
      flatten,
    };

    const request: PdfWorkerRequest = {
      type: 'fill',
      input: {
        id: source.id,
        name: source.name,
        bytes: source.bytes.slice(0),
      },
      options,
    };

    worker.postMessage(request);
  }, [source, fieldValues, flatten]);

  const updateFieldValue = useCallback(
    (id: string, value: PdfFormFieldValue) => {
      setFieldValues((prev) => ({
        ...prev,
        [id]: value,
      }));
    },
    [],
  );

  // Filter fields
  const filteredFields = (source?.fields ?? []).filter((f) => {
    if (
      filterPage !== 'all' &&
      f.pageIndex !== null &&
      f.pageIndex !== filterPage
    ) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = f.name.toLowerCase().includes(q);
      const matchId = f.id.toLowerCase().includes(q);
      const matchVal = String(fieldValues[f.id] ?? '')
        .toLowerCase()
        .includes(q);
      return matchName || matchId || matchVal;
    }
    return true;
  });

  const changedCount = source
    ? Object.keys(changedFieldValues(source.fields, fieldValues)).length
    : 0;
  const missingRequired = source
    ? missingRequiredFields(source.fields, fieldValues)
    : [];

  return (
    <AppShell currentToolId="pdf-form-filler" currentGroupId="pdf">
      <section
        id="tool"
        tabIndex={-1}
        className="mx-auto max-w-5xl space-y-6 px-4 py-8 focus:outline-none sm:px-6 lg:px-8"
      >
        {/* Caveat Banner (R3 Honest Caveat) */}
        <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-foreground shadow-sm">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium">
                Honest privacy and encryption notice:
              </p>
              <p className="text-muted-foreground">
                An encrypted form cannot be filled. Unlocking needs the
                password. This tool cannot break or recover a password it was
                not given, and it will not try. All form filling and flattening
                executes 100% inside your browser — zero bytes leave your
                device.
              </p>
            </div>
          </div>
        </div>

        {/* File Selection / Dropzone */}
        {!source && !loading && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
            <button
              type="button"
              aria-label="Choose a PDF form to fill"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) void handleFile(f);
              }}
              className="w-full group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50/60 p-12 text-center transition-all hover:border-zinc-400 hover:bg-zinc-100/70 cursor-pointer dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/70"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-foreground group-hover:scale-105 transition-transform mb-4 shadow-sm">
                <FilePlus2 className="h-8 w-8" />
              </div>
              <span className="block text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Choose a PDF form to fill
              </span>
              <span className="block text-sm text-zinc-600 dark:text-zinc-400 max-w-md mb-4">
                Select or drop an interactive PDF form. We will extract all text
                inputs, checkboxes, radio groups, and dropdowns for easy
                editing.
              </span>
              <span className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900">
                <FileText className="h-4 w-4" />
                Select PDF file
              </span>
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              {progressText}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Processing locally in Web Worker without server upload
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">{error.message}</p>
                {error.suggestion && (
                  <p className="text-sm opacity-90">{error.suggestion}</p>
                )}
                {error.link && (
                  <p className="pt-2">
                    <a
                      href={error.link.href}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-4 hover:underline"
                    >
                      {error.link.label} →
                    </a>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Download Receipt */}
        {receipt && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-foreground font-semibold text-lg">
                  <CheckCircle2 className="h-6 w-6 text-foreground" />
                  Form successfully filled!
                </div>
                <p className="text-sm text-muted-foreground">
                  {receipt.fieldsChanged} field
                  {receipt.fieldsChanged === 1 ? '' : 's'} updated •{' '}
                  {receipt.pages} page{receipt.pages === 1 ? '' : 's'} •{' '}
                  {(receipt.bytes / 1024).toFixed(1)} KB • {receipt.durationMs}{' '}
                  ms
                  {receipt.flattened
                    ? ' • Form flattened (fields made permanent)'
                    : ' • Form left editable'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={resetAll} variant="outline" className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Fill Another
                </Button>
                <a
                  href={receipt.url}
                  download={receipt.name}
                  data-receipt-download="true"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                >
                  <ArrowDownToLine className="h-4 w-4" />
                  Download PDF
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Form Editor Workspace */}
        {source && !receipt && (
          <div className="space-y-6">
            {/* Top document summary bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold text-foreground">
                    {source.name}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {source.pages} page{source.pages === 1 ? '' : 's'} •{' '}
                  {source.fields.length} fillable field
                  {source.fields.length === 1 ? '' : 's'} •{' '}
                  {(source.bytes.byteLength / 1024).toFixed(1)} KB
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetAll}
                  className="text-muted-foreground"
                >
                  Change file
                </Button>
              </div>
            </div>

            {/* Empty Form State */}
            {source.fields.length === 0 && (
              <div className="rounded-xl border border-border bg-muted/40 p-8 text-center">
                <p className="font-medium text-foreground">
                  No interactive form fields found in this PDF.
                </p>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  This document may be a static scan or standard text document
                  without AcroForm widgets.
                </p>
              </div>
            )}

            {/* Field Controls Bar */}
            {source.fields.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Page Filter */}
                  {source.pages > 1 && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-muted-foreground">Page:</span>
                      <select
                        aria-label="Filter fields by page"
                        value={filterPage}
                        onChange={(e) =>
                          setFilterPage(
                            e.target.value === 'all'
                              ? 'all'
                              : Number(e.target.value),
                          )
                        }
                        className="rounded-md border border-border bg-card px-2.5 py-1 text-xs text-foreground"
                      >
                        <option value="all">All pages ({source.pages})</option>
                        {Array.from({ length: source.pages }, (_, i) => (
                          <option key={i} value={i}>
                            Page {i + 1}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Search box */}
                  <input
                    type="search"
                    placeholder="Search field names or values..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="rounded-md border border-border bg-card px-3 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    Showing {filteredFields.length} of {source.fields.length}{' '}
                    fields
                  </span>
                  {changedCount > 0 && (
                    <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-foreground font-medium">
                      {changedCount} modified
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Field List Cards */}
            {filteredFields.length > 0 && (
              <div className="space-y-4">
                {filteredFields.map((field) => {
                  const val = fieldValues[field.id] ?? field.value;
                  const isModified = !sameFieldValue(val, field.value);
                  const editable = isEditableField(field);

                  return (
                    <div
                      key={field.id}
                      className={`rounded-xl border p-4 transition-colors ${
                        isModified
                          ? 'border-primary/50 bg-muted/30'
                          : 'border-border bg-card'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-foreground text-sm">
                              {field.name || field.id}
                            </span>
                            {field.pageIndex !== null && (
                              <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                Page {field.pageIndex + 1}
                              </span>
                            )}
                            <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground uppercase">
                              {field.kind}
                            </span>
                            {field.required && (
                              <span className="rounded border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                                Required
                              </span>
                            )}
                            {!editable && field.readOnlyReason && (
                              <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                {READ_ONLY_REASONS[field.readOnlyReason]}
                              </span>
                            )}
                            {isModified && (
                              <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                                Edited
                              </span>
                            )}
                          </div>
                          {field.maxLength && (
                            <p className="text-[11px] text-muted-foreground">
                              Max length: {field.maxLength} characters
                            </p>
                          )}
                        </div>

                        {/* Reset button for modified field */}
                        {isModified && editable && (
                          <button
                            type="button"
                            onClick={() =>
                              updateFieldValue(field.id, field.value)
                            }
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Reset
                          </button>
                        )}
                      </div>

                      {/* Field Value Editor */}
                      <div className="pt-1">
                        {!editable ? (
                          <div className="text-sm text-muted-foreground italic bg-muted/40 p-2.5 rounded-lg border border-border">
                            {displayFieldValue(field, val)}
                          </div>
                        ) : field.kind === 'checkbox' ? (
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(val)}
                              onChange={(e) =>
                                updateFieldValue(field.id, e.target.checked)
                              }
                              className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
                            />
                            <span className="text-sm font-medium text-foreground">
                              {val ? 'Checked' : 'Unchecked'}
                            </span>
                          </label>
                        ) : field.kind === 'radio' ? (
                          <div className="flex flex-wrap gap-4">
                            {field.options.map((opt) => (
                              <label
                                key={opt.value}
                                className="flex items-center gap-2 cursor-pointer text-sm"
                              >
                                <input
                                  type="radio"
                                  name={`field-${field.id}`}
                                  value={opt.value}
                                  checked={val === opt.value}
                                  onChange={() =>
                                    updateFieldValue(field.id, opt.value)
                                  }
                                  className="h-4 w-4 text-primary focus:ring-ring border-border"
                                />
                                <span className="text-foreground">
                                  {opt.display || opt.value}
                                </span>
                              </label>
                            ))}
                          </div>
                        ) : field.kind === 'dropdown' ? (
                          <select
                            value={String(val ?? '')}
                            onChange={(e) =>
                              updateFieldValue(field.id, e.target.value)
                            }
                            className="w-full rounded-lg border border-border bg-card p-2.5 text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring"
                          >
                            <option value="">-- Select an option --</option>
                            {field.options.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.display || opt.value}
                              </option>
                            ))}
                          </select>
                        ) : field.kind === 'optionList' ? (
                          <select
                            multiple={field.multiSelect}
                            value={
                              Array.isArray(val) ? val : [String(val ?? '')]
                            }
                            onChange={(e) => {
                              if (field.multiSelect) {
                                const selected = Array.from(
                                  e.target.selectedOptions,
                                  (o) => o.value,
                                );
                                updateFieldValue(field.id, selected);
                              } else {
                                updateFieldValue(field.id, e.target.value);
                              }
                            }}
                            className="w-full rounded-lg border border-border bg-card p-2.5 text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring"
                            size={Math.min(
                              5,
                              Math.max(3, field.options.length),
                            )}
                          >
                            {field.options.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.display || opt.value}
                              </option>
                            ))}
                          </select>
                        ) : field.multiline ? (
                          <textarea
                            value={String(val ?? '')}
                            maxLength={field.maxLength ?? undefined}
                            rows={3}
                            onChange={(e) =>
                              updateFieldValue(field.id, e.target.value)
                            }
                            placeholder="Enter text..."
                            className="w-full rounded-lg border border-border bg-card p-2.5 text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring font-mono"
                          />
                        ) : (
                          <input
                            type="text"
                            value={String(val ?? '')}
                            maxLength={field.maxLength ?? undefined}
                            onChange={(e) =>
                              updateFieldValue(field.id, e.target.value)
                            }
                            placeholder="Enter text..."
                            className="w-full rounded-lg border border-border bg-card p-2.5 text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Actions Bar */}
            {source.fields.length > 0 && (
              <div className="sticky bottom-6 rounded-2xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur-md space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Flatten Option */}
                  <label
                    htmlFor="flatten-form-toggle"
                    className="flex items-start gap-3 cursor-pointer select-none"
                  >
                    <input
                      id="flatten-form-toggle"
                      type="checkbox"
                      aria-label="Flatten form (bakes values into PDF)"
                      checked={flatten}
                      onChange={(e) => setFlatten(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-ring"
                    />
                    <span className="space-y-0.5">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <ShieldCheck className="h-4 w-4 text-foreground" />
                        Flatten form (bakes values into PDF)
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        Removes interactive form widgets so filled values cannot
                        be modified by recipients.
                      </span>
                    </span>
                  </label>

                  {/* Submit Button */}
                  <Button
                    onClick={handleFill}
                    disabled={
                      loading || (missingRequired.length > 0 && flatten)
                    }
                    className="gap-2 px-6 py-2.5 font-semibold"
                  >
                    <ArrowDownToLine className="h-4 w-4" />
                    Fill & Download PDF
                  </Button>
                </div>

                {missingRequired.length > 0 && flatten && (
                  <p className="text-xs text-destructive">
                    * {missingRequired.length} required field
                    {missingRequired.length === 1 ? ' is' : 's are'} still
                    empty. Fill all required fields or uncheck &quot;Flatten
                    form&quot; to continue.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </AppShell>
  );
}
