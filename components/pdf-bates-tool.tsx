'use client';

import {
  AlertTriangle,
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  CheckCircle2,
  FileCheck,
  FilePlus2,
  FileText,
  Layers,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { Button, buttonVariants } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import {
  applyBatesNumbering,
  formatBatesNumber,
  formatBatesRange,
  type BatesBundleResult,
  type BatesPosition,
} from '@/lib/tools/pdf/bates';

interface LoadedPdf {
  id: string;
  name: string;
  size: number;
  bytes: Uint8Array;
  pageCount: number;
}

const MAX_TOTAL_BYTES = 100 * 1024 * 1024; // 100 MB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function PdfBatesTool() {
  const prefixId = useId();
  const startNumId = useId();
  const paddingId = useId();
  const suffixId = useId();
  const fontSizeId = useId();
  const marginId = useId();
  const pageLabelsId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [docs, setDocs] = useState<LoadedPdf[]>([]);
  const [prefix, setPrefix] = useState('EXHIBIT-');
  const [startingNumber, setStartingNumber] = useState(1);
  const [paddingWidth, setPaddingWidth] = useState(6);
  const [suffix, setSuffix] = useState('');
  const [position, setPosition] = useState<BatesPosition>('bottom-right');
  const [fontSize, setFontSize] = useState(10);
  const [marginPt, setMarginPt] = useState(36);
  const [writePageLabels, setWritePageLabels] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<BatesBundleResult | null>(null);
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});
  const [combinedUrl, setCombinedUrl] = useState<string | null>(null);
  const [processingDuration, setProcessingDuration] = useState(0);

  // Clean up Object URLs on unmount or new run
  useEffect(() => {
    return () => {
      Object.values(docUrls).forEach((url) => URL.revokeObjectURL(url));
      if (combinedUrl) URL.revokeObjectURL(combinedUrl);
    };
  }, [docUrls, combinedUrl]);

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      setErrorMessage(null);
      const incoming = Array.from(fileList).filter(
        (file) =>
          file.name.toLowerCase().endsWith('.pdf') ||
          file.type === 'application/pdf',
      );

      if (incoming.length === 0) {
        setErrorMessage('Please select standard PDF documents (.pdf).');
        return;
      }

      const currentTotal = docs.reduce((acc, d) => acc + d.size, 0);
      const incomingTotal = incoming.reduce((acc, f) => acc + f.size, 0);
      if (currentTotal + incomingTotal > MAX_TOTAL_BYTES) {
        setErrorMessage(
          `Total file size cannot exceed ${formatBytes(MAX_TOTAL_BYTES)}. Please remove some files or select smaller documents.`,
        );
        return;
      }

      const loaded: LoadedPdf[] = [];
      for (const file of incoming) {
        try {
          const buffer = await file.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          const pdfDoc = await PDFDocument.load(bytes);
          const pageCount = pdfDoc.getPageCount();

          if (pageCount === 0) {
            setErrorMessage(`"${file.name}" has no pages and was skipped.`);
            continue;
          }

          loaded.push({
            id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: file.name,
            size: file.size,
            bytes,
            pageCount,
          });
        } catch (err) {
          const errStr = String(err).toLowerCase();
          if (errStr.includes('password') || errStr.includes('encrypt')) {
            setErrorMessage(
              `"${file.name}" is password-protected or encrypted. Encrypted PDFs cannot be stamped.`,
            );
          } else {
            setErrorMessage(
              `Failed to read "${file.name}". Please verify it is a valid PDF.`,
            );
          }
        }
      }

      if (loaded.length > 0) {
        setDocs((prev) => [...prev, ...loaded]);
        setResult(null);
      }
    },
    [docs],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        void handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const removeDoc = useCallback((id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
    setResult(null);
  }, []);

  const moveDoc = useCallback((index: number, direction: 'up' | 'down') => {
    setDocs((prev) => {
      const next = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      const temp = next[index]!;
      next[index] = next[target]!;
      next[target] = temp;
      return next;
    });
    setResult(null);
  }, []);

  const totalPages = docs.reduce((acc, d) => acc + d.pageCount, 0);
  const totalBytes = docs.reduce((acc, d) => acc + d.size, 0);
  const projectedRange =
    totalPages > 0
      ? formatBatesRange(
          startingNumber,
          startingNumber + totalPages - 1,
          prefix,
          paddingWidth,
          suffix,
        )
      : '';

  const handleStamp = async () => {
    if (docs.length === 0) return;
    setIsProcessing(true);
    setErrorMessage(null);

    const startTime = performance.now();

    try {
      const stampResult = await applyBatesNumbering(
        docs.map((d) => ({ name: d.name, bytes: d.bytes })),
        {
          prefix,
          startingNumber,
          paddingWidth,
          suffix,
          position,
          fontSize,
          marginPt,
          writePageLabels,
        },
      );

      const urls: Record<string, string> = {};
      stampResult.documents.forEach((docOut, idx) => {
        const originalDoc = docs[idx];
        if (originalDoc) {
          const blob = new Blob([docOut.bytes as unknown as BlobPart], {
            type: 'application/pdf',
          });
          urls[originalDoc.id] = URL.createObjectURL(blob);
        }
      });

      let bundleUrl: string | null = null;
      if (stampResult.combined) {
        const bundleBlob = new Blob(
          [stampResult.combined.bytes as unknown as BlobPart],
          {
            type: 'application/pdf',
          },
        );
        bundleUrl = URL.createObjectURL(bundleBlob);
      }

      const elapsed = performance.now() - startTime;
      setProcessingDuration(elapsed);
      setDocUrls(urls);
      setCombinedUrl(bundleUrl);
      setResult(stampResult);
    } catch (err) {
      setErrorMessage(
        (err as Error).message || 'Failed to apply Bates numbering.',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = (
    operationName: string,
    range: string,
    pages: number,
  ) => {
    announceCompletion({
      operation: 'Bates Numbering',
      durationMs: processingDuration,
      summary: `Numbered ${pages} pages (${range}) across ${docs.length} documents`,
      metrics: [
        { label: 'Pages', value: String(pages) },
        { label: 'Range', value: range },
        { label: 'Format', value: 'PDF' },
      ],
    });
  };

  const resetAll = () => {
    setDocs([]);
    setResult(null);
    setErrorMessage(null);
    Object.values(docUrls).forEach((url) => URL.revokeObjectURL(url));
    if (combinedUrl) URL.revokeObjectURL(combinedUrl);
    setDocUrls({});
    setCombinedUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <AppShell currentToolId="pdf-bates" currentGroupId="pdf">
      <section
        id="tool"
        tabIndex={-1}
        className="mx-auto max-w-5xl space-y-8 px-4 py-8 focus:outline-none sm:px-6 lg:px-8"
      >
        {/* Header */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-md border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              Legal Exhibit Stamping
            </span>
            <span className="inline-flex items-center rounded-md border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              In-Browser Only
            </span>
            <span className="inline-flex items-center rounded-md border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              Page Labels Supported
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Bates Numbering for PDFs
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Stamp sequential Bates identifiers onto legal exhibits and document
            bundles. Numbering continues across multiple PDFs with upright
            placement on rotated and cropped pages.
          </p>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Upload Dropzone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card p-8 text-center transition-colors hover:border-foreground/40 sm:p-12"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            aria-label="Upload PDF documents"
            className="sr-only"
            id="bates-file-picker"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                void handleFiles(e.target.files);
              }
            }}
          />
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <UploadCloud className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-medium text-foreground">
            Drop PDF documents here, or browse
          </h2>
          <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">
            Select one or more legal exhibits to stamp sequentially in order
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-5"
            onClick={() => fileInputRef.current?.click()}
          >
            <FilePlus2 className="mr-2 h-4 w-4" />
            Choose PDF Files
          </Button>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <span>
              Files are stamped directly in your browser tab. Zero server
              uploads.
            </span>
          </div>
        </div>

        {/* Loaded Documents Queue */}
        {docs.length > 0 && (
          <div className="space-y-4 rounded-xl border border-border bg-card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Exhibit Sequence ({docs.length}{' '}
                  {docs.length === 1 ? 'file' : 'files'})
                </h3>
                <p className="text-xs text-muted-foreground">
                  {totalPages} total pages • {formatBytes(totalBytes)} • Stamped
                  in the order listed below
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FilePlus2 className="mr-1.5 h-3.5 w-3.5" />
                  Add More PDFs
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetAll}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Clear All
                </Button>
              </div>
            </div>

            <div className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border bg-background">
              {docs.map((doc, index) => {
                // Calculate starting and ending page for this doc in current sequence
                let offset = 0;
                for (let i = 0; i < index; i++) {
                  offset += docs[i]!.pageCount;
                }
                const docStart = startingNumber + offset;
                const docEnd = docStart + doc.pageCount - 1;
                const docRange = formatBatesRange(
                  docStart,
                  docEnd,
                  prefix,
                  paddingWidth,
                  suffix,
                );

                return (
                  <div
                    key={doc.id}
                    className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded bg-muted text-xs font-bold text-foreground">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">
                          {doc.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {doc.pageCount}{' '}
                          {doc.pageCount === 1 ? 'page' : 'pages'} •{' '}
                          {formatBytes(doc.size)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-foreground">
                        {docRange}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={index === 0}
                          aria-label={`Move ${doc.name} up`}
                          onClick={() => moveDoc(index, 'up')}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={index === docs.length - 1}
                          aria-label={`Move ${doc.name} down`}
                          onClick={() => moveDoc(index, 'down')}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove ${doc.name}`}
                          onClick={() => removeDoc(doc.id)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Configuration Panel */}
        {docs.length > 0 && (
          <div className="space-y-6 rounded-xl border border-border bg-card p-5 sm:p-6">
            <h3 className="text-base font-semibold text-foreground">
              Bates Numbering Options
            </h3>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {/* Prefix */}
              <div className="space-y-1.5">
                <label
                  htmlFor={prefixId}
                  className="text-xs font-medium text-muted-foreground"
                >
                  Prefix (Optional)
                </label>
                <input
                  id={prefixId}
                  type="text"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder="EXHIBIT-"
                  className="h-9 w-full rounded-md border border-border bg-background px-3 font-mono text-sm text-foreground focus:border-foreground focus:outline-none"
                />
              </div>

              {/* Starting Number */}
              <div className="space-y-1.5">
                <label
                  htmlFor={startNumId}
                  className="text-xs font-medium text-muted-foreground"
                >
                  Starting Number
                </label>
                <input
                  id={startNumId}
                  type="number"
                  min={0}
                  step={1}
                  value={startingNumber}
                  onChange={(e) =>
                    setStartingNumber(
                      Math.max(0, parseInt(e.target.value, 10) || 0),
                    )
                  }
                  className="h-9 w-full rounded-md border border-border bg-background px-3 font-mono text-sm text-foreground focus:border-foreground focus:outline-none"
                />
              </div>

              {/* Padding Digits */}
              <div className="space-y-1.5">
                <label
                  htmlFor={paddingId}
                  className="text-xs font-medium text-muted-foreground"
                >
                  Digits (Zero Padding)
                </label>
                <select
                  id={paddingId}
                  value={paddingWidth}
                  onChange={(e) =>
                    setPaddingWidth(parseInt(e.target.value, 10))
                  }
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:border-foreground focus:outline-none"
                >
                  <option value={4}>4 Digits (0001)</option>
                  <option value={5}>5 Digits (00001)</option>
                  <option value={6}>6 Digits (000001)</option>
                  <option value={7}>7 Digits (0000001)</option>
                  <option value={8}>8 Digits (00000001)</option>
                  <option value={0}>No Zero Padding</option>
                </select>
              </div>

              {/* Suffix */}
              <div className="space-y-1.5">
                <label
                  htmlFor={suffixId}
                  className="text-xs font-medium text-muted-foreground"
                >
                  Suffix (Optional)
                </label>
                <input
                  id={suffixId}
                  type="text"
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                  placeholder="-CONF"
                  className="h-9 w-full rounded-md border border-border bg-background px-3 font-mono text-sm text-foreground focus:border-foreground focus:outline-none"
                />
              </div>
            </div>

            {/* Position Grid & Page Options */}
            <div className="grid grid-cols-1 gap-6 pt-2 lg:grid-cols-2">
              {/* Position selector */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Stamp Position on Page
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['top-left', 'Top Left'],
                      ['top-center', 'Top Center'],
                      ['top-right', 'Top Right'],
                      ['bottom-left', 'Bottom Left'],
                      ['bottom-center', 'Bottom Center'],
                      ['bottom-right', 'Bottom Right'],
                    ] as const
                  ).map(([pos, label]) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setPosition(pos)}
                      className={`flex h-11 items-center justify-center rounded-lg border text-xs font-medium transition-colors ${
                        position === pos
                          ? 'border-foreground bg-muted font-semibold text-foreground ring-1 ring-foreground'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Correctly aligned upright on rotated (/Rotate 90/180/270) and
                  cropped pages.
                </p>
              </div>

              {/* Font Size & Margin */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor={fontSizeId}
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Font Size
                    </label>
                    <select
                      id={fontSizeId}
                      value={fontSize}
                      onChange={(e) =>
                        setFontSize(parseInt(e.target.value, 10))
                      }
                      className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:border-foreground focus:outline-none"
                    >
                      <option value={8}>8 pt (Compact)</option>
                      <option value={9}>9 pt</option>
                      <option value={10}>10 pt (Standard)</option>
                      <option value={11}>11 pt</option>
                      <option value={12}>12 pt (Large)</option>
                      <option value={14}>14 pt</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor={marginId}
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Page Margin
                    </label>
                    <select
                      id={marginId}
                      value={marginPt}
                      onChange={(e) =>
                        setMarginPt(parseInt(e.target.value, 10))
                      }
                      className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:border-foreground focus:outline-none"
                    >
                      <option value={18}>18 pt (0.25 inch)</option>
                      <option value={24}>24 pt (0.33 inch)</option>
                      <option value={36}>36 pt (0.5 inch)</option>
                      <option value={48}>48 pt (0.66 inch)</option>
                      <option value={72}>72 pt (1.0 inch)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 pt-1">
                  <input
                    id={pageLabelsId}
                    type="checkbox"
                    checked={writePageLabels}
                    onChange={(e) => setWritePageLabels(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-border bg-background accent-foreground"
                  />
                  <label
                    htmlFor={pageLabelsId}
                    className="text-xs leading-relaxed text-muted-foreground"
                  >
                    <span className="font-medium text-foreground">
                      Write Bates numbers into PDF Page Labels
                    </span>
                    <br />
                    Displays the Bates identifier in PDF viewer navigation and
                    thumbnail sidebars.
                  </label>
                </div>
              </div>
            </div>

            {/* Sequence Preview Box */}
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Projected Bundle Range
                  </div>
                  <div className="mt-1 font-mono text-base font-semibold text-foreground sm:text-lg">
                    {projectedRange}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    First stamp:{' '}
                    <span className="font-mono text-foreground">
                      {formatBatesNumber(
                        startingNumber,
                        prefix,
                        paddingWidth,
                        suffix,
                      )}
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  size="lg"
                  disabled={isProcessing}
                  onClick={handleStamp}
                  className="w-full sm:w-auto"
                >
                  {isProcessing ? (
                    'Stamping Documents...'
                  ) : (
                    <>
                      <FileCheck className="mr-2 h-4 w-4" />
                      Stamp{' '}
                      {docs.length === 1
                        ? '1 Document'
                        : `${docs.length} Documents`}{' '}
                      ({totalPages} Pages)
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Results Card */}
        {result && (
          <div className="space-y-6 rounded-xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <CheckCircle2 className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Bates Numbering Complete
                </h3>
                <p className="text-xs text-muted-foreground">
                  Numbered in {formatDuration(processingDuration)} • All pages
                  verified upright
                </p>
              </div>
            </div>

            {/* Receipt metrics */}
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-background p-4 sm:grid-cols-4">
              <div>
                <div className="text-xs text-muted-foreground">Documents</div>
                <div className="mt-1 text-sm font-semibold text-foreground">
                  {result.documents.length}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Total Pages</div>
                <div className="mt-1 text-sm font-semibold text-foreground">
                  {result.totalPageCount}
                </div>
              </div>
              <div className="col-span-2 sm:col-span-2">
                <div className="text-xs text-muted-foreground">
                  Assigned Bates Range
                </div>
                <div className="mt-1 font-mono text-sm font-semibold text-foreground">
                  {result.combined?.batesRange ||
                    result.documents[0]?.batesRange}
                </div>
              </div>
            </div>

            {/* Combined Bundle Download (if multi-doc) */}
            {result.combined && combinedUrl && (
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <Layers className="h-6 w-6 text-foreground" />
                    <div>
                      <div className="font-semibold text-foreground">
                        Combined Legal Exhibit Bundle
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Single merged PDF containing all {result.totalPageCount}{' '}
                        sequentially numbered pages
                      </div>
                    </div>
                  </div>

                  <a
                    href={combinedUrl}
                    download="exhibit-bundle-bates.pdf"
                    data-receipt-download
                    className={buttonVariants({
                      variant: 'default',
                      size: 'default',
                    })}
                    onClick={() =>
                      handleDownload(
                        'Combined Exhibit Bundle',
                        result.combined!.batesRange,
                        result.totalPageCount,
                      )
                    }
                  >
                    <ArrowDownToLine className="mr-2 h-4 w-4" />
                    Download Combined PDF
                  </a>
                </div>
              </div>
            )}

            {/* Individual Stamped Documents Download List */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Individual Stamped Documents
              </h4>
              <div className="divide-y divide-border/60 rounded-lg border border-border bg-background">
                {result.documents.map((docOut, idx) => {
                  const orig = docs[idx];
                  const url = orig ? docUrls[orig.id] : null;
                  const downloadName =
                    docOut.name.replace(/\.pdf$/i, '') + '-bates.pdf';

                  return (
                    <div
                      key={idx}
                      className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {downloadName}
                          </div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {docOut.batesRange} ({docOut.pageCount}{' '}
                            {docOut.pageCount === 1 ? 'page' : 'pages'})
                          </div>
                        </div>
                      </div>

                      {url && (
                        <a
                          href={url}
                          download={downloadName}
                          data-receipt-download
                          className={buttonVariants({
                            variant: 'outline',
                            size: 'sm',
                          })}
                          onClick={() =>
                            handleDownload(
                              downloadName,
                              docOut.batesRange,
                              docOut.pageCount,
                            )
                          }
                        >
                          <ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" />
                          Download
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
