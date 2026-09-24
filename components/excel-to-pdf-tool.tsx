'use client';

import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  LockKeyhole,
  RefreshCw,
  Settings2,
  Table,
  Upload,
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { RelatedTools } from '@/components/related-tools';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import type { RelatedTool } from '@/lib/seo/related-tools';
import {
  convertExcelToPdf,
  type ExcelToPdfOptions,
  type ExcelToPdfResult,
} from '@/lib/tools/spreadsheet/excel-to-pdf';
import { readXlsx, type Workbook } from '@/lib/tools/spreadsheet/xlsx-reader';

interface ExcelToPdfToolProps {
  relatedTools?: readonly RelatedTool[];
}

export function ExcelToPdfTool({ relatedTools = [] }: ExcelToPdfToolProps) {
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(
    null,
  );
  const [workbook, setWorkbook] = useState<Workbook | null>(null);
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Configuration options
  const [sheetSelection, setSheetSelection] = useState<string>('all');
  const [pageSize, setPageSize] = useState<'a4' | 'letter'>('a4');
  const [orientation, setOrientation] = useState<
    'auto' | 'portrait' | 'landscape'
  >('auto');
  const [margin, setMargin] = useState<number>(36);
  const [gridlines, setGridlines] = useState<boolean>(true);
  const [repeatHeader, setRepeatHeader] = useState<boolean>(true);
  const [pageNumbers, setPageNumbers] = useState<boolean>(true);
  const [documentTitle, setDocumentTitle] = useState<string>('');

  // Result & receipt state
  const [result, setResult] = useState<ExcelToPdfResult | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    async (selectedFile: File) => {
      setError(null);
      setResult(null);
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
        setDownloadUrl(null);
      }
      setLoading(true);

      try {
        const buffer = await selectedFile.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const parsedWorkbook = await readXlsx(bytes);

        setFile({ name: selectedFile.name, bytes });
        setWorkbook(parsedWorkbook);
        setSheetSelection('all');
        const defaultTitle = selectedFile.name.replace(/\.[^/.]+$/u, '');
        setDocumentTitle(defaultTitle);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Could not read this spreadsheet. Make sure it is a valid .xlsx file.',
        );
        setFile(null);
        setWorkbook(null);
      } finally {
        setLoading(false);
      }
    },
    [downloadUrl],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const dropped = e.dataTransfer.files?.[0];
      if (dropped) {
        void handleFileChange(dropped);
      }
    },
    [handleFileChange],
  );

  const handleConvert = async () => {
    if (!file || !workbook) return;
    setConverting(true);
    setError(null);

    try {
      const options: ExcelToPdfOptions = {
        sheetSelection: sheetSelection === 'all' ? 'all' : sheetSelection,
        pageSize,
        orientation,
        margin,
        gridlines,
        repeatHeader,
        pageNumbers,
        documentTitle: documentTitle.trim() || undefined,
      };

      const res = await convertExcelToPdf(file.bytes, options);
      setResult(res);

      const blob = new Blob([res.pdfBytes as unknown as BlobPart], {
        type: 'application/pdf',
      });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);

      announceCompletion({
        operation: 'Convert Excel to PDF',
        durationMs: Math.round(res.durationMs),
        summary: `Converted ${res.rowCount} rows across ${res.sheetCount} sheet(s) into a ${res.pageCount}-page vector PDF.`,
        metrics: [
          { label: 'PDF Pages', value: String(res.pageCount) },
          { label: 'Rows', value: String(res.rowCount) },
          { label: 'Duration', value: `${Math.round(res.durationMs)} ms` },
        ],
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to convert Excel to PDF.',
      );
    } finally {
      setConverting(false);
    }
  };

  const handleDownload = () => {
    if (!downloadUrl || !file) return;
    const a = document.createElement('a');
    a.href = downloadUrl;
    const baseName = file.name.replace(/\.[^/.]+$/u, '');
    a.download = `${baseName}.pdf`;
    a.setAttribute('data-receipt-download', 'true');
    a.click();
  };

  const handleReset = () => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }
    setFile(null);
    setWorkbook(null);
    setResult(null);
    setDownloadUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <AppShell currentToolId="excel-to-pdf" currentGroupId="pdf">
      <section
        id="tool"
        tabIndex={-1}
        className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
      >
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Office to Vector PDF
              </span>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                Convert Excel to PDF Online
              </h1>
              <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">
                Convert .xlsx workbooks into crisp, printable vector PDF
                documents directly in your browser. Automatic orientation, table
                headers, repeated pagination headers, and gridlines with zero
                server uploads.
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <LockKeyhole className="h-3.5 w-3.5 text-foreground" />
            <span>
              <strong>Zero-Egress Security:</strong> Confidential payroll,
              budgets, and client lists never leave your computer. 100% private.
            </span>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">Conversion error</p>
              <p className="mt-0.5 text-xs opacity-90">{error}</p>
            </div>
          </div>
        )}

        {!file ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card p-12 text-center transition-colors hover:border-foreground/30"
          >
            <div className="rounded-full bg-muted p-4">
              <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-foreground">
              Choose an Excel file or drop it here
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Supports .xlsx spreadsheets from Microsoft Excel, Google Sheets,
              and LibreOffice Calc
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xlsm"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFileChange(f);
              }}
              className="hidden"
              id="excel-file-upload"
            />
            <Button
              type="button"
              disabled={loading}
              onClick={() => fileInputRef.current?.click()}
              className="mt-6 gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Reading spreadsheet...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Select Excel file
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* File Info Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2.5">
                  <FileSpreadsheet className="h-6 w-6 text-foreground" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {file.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {(file.bytes.length / 1024).toFixed(1)} KB ·{' '}
                    {workbook?.sheets.length ?? 0} sheet(s) ·{' '}
                    {workbook?.sheets.reduce(
                      (acc, s) => acc + s.rows.length,
                      0,
                    ) ?? 0}{' '}
                    total rows
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Change file
              </Button>
            </div>

            {/* Conversion Settings */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <Settings2 className="h-4 w-4 text-foreground" />
                <h2 className="text-sm font-semibold text-foreground">
                  PDF Page Layout &amp; Options
                </h2>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Sheet Selection */}
                <div>
                  <label
                    htmlFor="sheet-select"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Sheets to Export
                  </label>
                  <select
                    id="sheet-select"
                    value={sheetSelection}
                    onChange={(e) => setSheetSelection(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="all">
                      All Sheets ({workbook?.sheets.length})
                    </option>
                    {workbook?.sheets.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name} ({s.rows.length} rows, {s.columnCount} cols)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Orientation */}
                <div>
                  <label
                    htmlFor="orientation-select"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Page Orientation
                  </label>
                  <select
                    id="orientation-select"
                    value={orientation}
                    onChange={(e) =>
                      setOrientation(
                        e.target.value as 'auto' | 'portrait' | 'landscape',
                      )
                    }
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="auto">Auto (Landscape if wide)</option>
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>

                {/* Page Size */}
                <div>
                  <label
                    htmlFor="page-size-select"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Page Size
                  </label>
                  <select
                    id="page-size-select"
                    value={pageSize}
                    onChange={(e) =>
                      setPageSize(e.target.value as 'a4' | 'letter')
                    }
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="a4">A4 (Standard)</option>
                    <option value="letter">US Letter</option>
                  </select>
                </div>

                {/* Margins */}
                <div>
                  <label
                    htmlFor="margin-select"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Page Margins
                  </label>
                  <select
                    id="margin-select"
                    value={margin}
                    onChange={(e) => setMargin(Number(e.target.value))}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value={18}>Narrow (18 pt / 0.25 in)</option>
                    <option value={36}>Normal (36 pt / 0.5 in)</option>
                    <option value={54}>Wide (54 pt / 0.75 in)</option>
                  </select>
                </div>
              </div>

              {/* Toggles */}
              <div className="mt-5 grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-3">
                <label className="flex items-center gap-2.5 text-xs text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gridlines}
                    onChange={(e) => setGridlines(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-foreground focus:ring-ring"
                  />
                  <span>Draw cell gridlines</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={repeatHeader}
                    onChange={(e) => setRepeatHeader(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-foreground focus:ring-ring"
                  />
                  <span>Repeat table headers on new pages</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pageNumbers}
                    onChange={(e) => setPageNumbers(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-foreground focus:ring-ring"
                  />
                  <span>Print &quot;Page X of Y&quot; footer</span>
                </label>
              </div>

              {/* Document Title Header */}
              <div className="mt-4 border-t border-border pt-4">
                <label
                  htmlFor="doc-title-input"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Custom Document Title Header (Optional)
                </label>
                <input
                  id="doc-title-input"
                  type="text"
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  placeholder="e.g. Q3 Financial Statement"
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring sm:max-w-md"
                />
              </div>

              {/* Convert Button */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  disabled={converting}
                  onClick={handleConvert}
                  className="gap-2"
                >
                  {converting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Rendering vector PDF...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      Convert to PDF
                    </>
                  )}
                </Button>
                {downloadUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDownload}
                    data-receipt-download="true"
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                )}
              </div>
            </div>

            {/* Receipt Summary Card */}
            {result && downloadUrl && (
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 text-foreground">
                  <CheckCircle2 className="h-5 w-5 text-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">
                    PDF Generated Successfully
                  </h3>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">PDF Pages</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {result.pageCount}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">
                      Processed Rows
                    </p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {result.rowCount}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Sheets</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {result.sheetCount}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Time</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {Math.round(result.durationMs)} ms
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
                  <div className="text-xs text-muted-foreground">
                    Vector PDF ready for print, sharing, or archiving ·{' '}
                    {(result.pdfBytes.length / 1024).toFixed(1)} KB
                  </div>
                  <Button
                    type="button"
                    onClick={handleDownload}
                    data-receipt-download="true"
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download {file.name.replace(/\.[^/.]+$/u, '')}.pdf
                  </Button>
                </div>
              </div>
            )}

            {/* Sheet Preview Table */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Table className="h-4 w-4 text-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Workbook Contents Preview
                  </h3>
                </div>
                <span className="text-xs text-muted-foreground">
                  {workbook?.sheets.length} Sheet(s) detected
                </span>
              </div>

              <div className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border">
                {workbook?.sheets.map((sheet, idx) => (
                  <div
                    key={sheet.name}
                    className="flex flex-wrap items-center justify-between p-3 text-sm hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-medium text-foreground">
                          {sheet.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sheet.rows.length} rows × {sheet.columnCount} columns
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {sheet.rows.length > 0 ? 'Ready' : 'Empty sheet'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Related Tools */}
        {relatedTools.length > 0 && (
          <div className="mt-12">
            <RelatedTools tools={relatedTools} />
          </div>
        )}
      </section>
    </AppShell>
  );
}
