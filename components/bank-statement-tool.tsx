'use client';

import {
  AlertCircle,
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Info,
  RotateCcw,
  ShieldCheck,
  Table as TableIcon,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import { readPdfText } from '@/lib/tools/pdf/pdf-text';
import {
  detectDateFormatForColumn,
  detectNumberConvention,
  parseAmount,
  parseDate,
  reconcileRunningBalance,
  type DateFormatPreference,
  type NumberConvention,
  type StatementReconciliationReport,
} from '@/lib/tools/pdf/statement-values';
import {
  extractTableFromPdfPages,
  type ExtractedTableResult,
} from '@/lib/tools/pdf/tables';
import { toCsv } from '@/lib/tools/spreadsheet/csv';
import { writeXlsx } from '@/lib/tools/spreadsheet/xlsx-writer';

type StatementData = {
  fileName: string;
  fileBytes: number;
  table: ExtractedTableResult;
  numberConvention: NumberConvention;
  dateFormat: DateFormatPreference;
  dateAmbiguous: boolean;
  reconciliation: StatementReconciliationReport;
};

type DownloadReceipt = {
  format: 'csv' | 'xlsx';
  url: string;
  name: string;
  rows: number;
  reconciled: boolean;
};

const MAX_BYTES = 100 * 1024 * 1024; // 100 MB

export function BankStatementTool() {
  const [data, setData] = useState<StatementData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<DownloadReceipt | null>(null);

  // Pagination for table preview
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 15;

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (receipt?.url) {
        URL.revokeObjectURL(receipt.url);
      }
    };
  }, [receipt?.url]);

  const resetAll = useCallback(() => {
    if (receipt?.url) {
      URL.revokeObjectURL(receipt.url);
    }
    setData(null);
    setLoading(false);
    setLoadingStep('');
    setError(null);
    setReceipt(null);
    setCurrentPage(1);
  }, [receipt]);

  const handleFile = useCallback(
    async (file: File) => {
      resetAll();
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setError('Please choose a valid PDF bank statement.');
        return;
      }
      if (file.size > MAX_BYTES) {
        setError(
          `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum supported size is 100 MB.`,
        );
        return;
      }

      setLoading(true);
      setLoadingStep('Extracting PDF text layer & layout coordinates...');

      try {
        const buffer = await file.arrayBuffer();
        const pages = await readPdfText(new Uint8Array(buffer));

        setLoadingStep(
          'Reconstructing statement tables & column boundaries...',
        );
        const table = extractTableFromPdfPages(pages);

        if (table.refusalReason) {
          setLoading(false);
          setError(
            `${table.refusalReason}. Scanned statement PDFs without an embedded text layer cannot be reliably extracted. Please convert using an OCR tool first.`,
          );
          return;
        }

        if (table.rows.length === 0) {
          setLoading(false);
          setError(
            'No transaction rows could be identified in this PDF. The layout might not match standard tabular statements.',
          );
          return;
        }

        setLoadingStep(
          'Detecting currency conventions, dates, and reconciling balance...',
        );

        // Find date column and amount/balance columns
        let dateColIdx = 0;
        let amountColIdx = -1;
        let debitColIdx = -1;
        let creditColIdx = -1;
        let balanceColIdx = -1;

        table.columns.forEach((col, idx) => {
          if (col.detectedRole === 'date') dateColIdx = idx;
          else if (col.detectedRole === 'amount') amountColIdx = idx;
          else if (col.detectedRole === 'debit') debitColIdx = idx;
          else if (col.detectedRole === 'credit') creditColIdx = idx;
          else if (col.detectedRole === 'balance') balanceColIdx = idx;
        });

        // Sample amount strings for convention detection
        const sampleAmounts: string[] = [];
        table.rows.forEach((r) => {
          if (amountColIdx >= 0 && r.cells[amountColIdx])
            sampleAmounts.push(r.cells[amountColIdx]);
          if (debitColIdx >= 0 && r.cells[debitColIdx])
            sampleAmounts.push(r.cells[debitColIdx]);
          if (creditColIdx >= 0 && r.cells[creditColIdx])
            sampleAmounts.push(r.cells[creditColIdx]);
        });

        const numberConvention = detectNumberConvention(sampleAmounts);

        // Date convention
        const dateStrings = table.rows
          .map((r) => r.cells[dateColIdx] || '')
          .filter(Boolean);
        const dateInfo = detectDateFormatForColumn(dateStrings);

        // Running balance reconciliation
        const reconRows = table.rows.map((r, i) => {
          const amt =
            amountColIdx >= 0
              ? parseAmount(r.cells[amountColIdx] || '', numberConvention).value
              : null;
          const deb =
            debitColIdx >= 0
              ? parseAmount(r.cells[debitColIdx] || '', numberConvention).value
              : null;
          const cred =
            creditColIdx >= 0
              ? parseAmount(r.cells[creditColIdx] || '', numberConvention).value
              : null;
          const bal =
            balanceColIdx >= 0
              ? parseAmount(r.cells[balanceColIdx] || '', numberConvention)
                  .value
              : null;

          return {
            rowIndex: i + 1,
            amount: amt,
            debit: deb,
            credit: cred,
            balance: bal,
          };
        });

        const reconciliation = reconcileRunningBalance(reconRows);

        setData({
          fileName: file.name,
          fileBytes: file.size,
          table,
          numberConvention,
          dateFormat: dateInfo.format,
          dateAmbiguous: dateInfo.isAmbiguous,
          reconciliation,
        });

        setLoading(false);
      } catch (err) {
        setLoading(false);
        setError(
          err instanceof Error ? err.message : 'Failed to parse statement PDF.',
        );
      }
    },
    [resetAll],
  );

  const handleExportCsv = useCallback(() => {
    if (!data) return;
    const { table, fileName, reconciliation } = data;

    const allRows = [table.headers, ...table.rows.map((r) => r.cells)];
    const csvContent = toCsv(allRows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const stem = fileName.replace(/\.[^.]+$/u, '');
    const outName = `${stem}-statement.csv`;

    if (receipt?.url) URL.revokeObjectURL(receipt.url);
    setReceipt({
      format: 'csv',
      url,
      name: outName,
      rows: table.rows.length,
      reconciled:
        reconciliation.mismatchCount === 0 &&
        reconciliation.reconciledCount > 0,
    });

    announceCompletion({
      operation: 'Bank Statement CSV Export',
      durationMs: 0,
      summary: 'Statement CSV generated and ready to download',
      metrics: [
        { label: 'Transactions', value: `${table.rows.length} rows` },
        {
          label: 'Reconciled',
          value:
            reconciliation.mismatchCount === 0 &&
            reconciliation.reconciledCount > 0
              ? 'Yes'
              : 'Discrepancy noted',
        },
      ],
    });
  }, [data, receipt]);

  const handleExportXlsx = useCallback(async () => {
    if (!data) return;
    const { table, fileName, numberConvention, dateFormat, reconciliation } =
      data;

    // Detect column roles
    let dateColIdx = -1;
    table.columns.forEach((col, idx) => {
      if (col.detectedRole === 'date') dateColIdx = idx;
    });

    const excelRows = [
      table.headers,
      ...table.rows.map((r) =>
        r.cells.map((cell, idx) => {
          if (idx === dateColIdx) {
            const parsed = parseDate(cell, dateFormat);
            return parsed.date ?? cell;
          }
          const parsedNum = parseAmount(cell, numberConvention);
          if (parsedNum.value !== null) {
            return parsedNum.value;
          }
          return cell;
        }),
      ),
    ];

    const result = await writeXlsx([{ name: 'Statement', rows: excelRows }]);
    const blob = new Blob([new Uint8Array(result.bytes)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const stem = fileName.replace(/\.[^.]+$/u, '');
    const outName = `${stem}-statement.xlsx`;

    if (receipt?.url) URL.revokeObjectURL(receipt.url);
    setReceipt({
      format: 'xlsx',
      url,
      name: outName,
      rows: table.rows.length,
      reconciled:
        reconciliation.mismatchCount === 0 &&
        reconciliation.reconciledCount > 0,
    });

    announceCompletion({
      operation: 'Bank Statement Excel Export',
      durationMs: 0,
      summary: 'Statement Excel workbook generated and ready to download',
      metrics: [
        { label: 'Transactions', value: `${table.rows.length} rows` },
        {
          label: 'Reconciled',
          value:
            reconciliation.mismatchCount === 0 &&
            reconciliation.reconciledCount > 0
              ? 'Yes'
              : 'Discrepancy noted',
        },
      ],
    });
  }, [data, receipt]);

  const totalPages = data ? Math.ceil(data.table.rows.length / PAGE_SIZE) : 0;
  const pagedRows = data
    ? data.table.rows.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
      )
    : [];

  return (
    <AppShell currentToolId="bank-statement" currentGroupId="finance">
      <section
        id="tool"
        tabIndex={-1}
        className="mx-auto max-w-5xl space-y-6 px-4 py-8 focus:outline-none sm:px-6 lg:px-8"
      >
        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Bank statement converter
          </h1>
        </div>
        {/* R3 Honest Caveat Banner */}
        <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-foreground shadow-sm">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium">
                Honest statement extraction & privacy guarantee:
              </p>
              <p className="text-muted-foreground">
                Every statement layout is different. Check the reconciliation
                line and the table preview below before you use this for
                anything that matters. Your financial data never leaves this
                browser tab — 0 bytes are uploaded, and no amounts, dates, or
                account numbers are ever sent to telemetry.
              </p>
            </div>
          </div>
        </div>

        {/* File Dropzone */}
        {!data && !loading && (
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
              aria-label="Select Bank Statement PDF"
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
                <FileSpreadsheet className="h-8 w-8" />
              </div>
              <span className="block text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Select Bank Statement PDF
              </span>
              <span className="block text-sm text-zinc-600 dark:text-zinc-400 max-w-md mb-4">
                Upload any PDF bank or credit card statement. Automatic column
                mapping, lakh/crore and European amount parsing, and running
                balance reconciliation.
              </span>
              <span className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900">
                <FileText className="h-4 w-4" />
                Choose PDF statement
              </span>
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              {loadingStep}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Processing locally in browser memory without cloud servers
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">Statement extraction failed</p>
                <p className="text-sm opacity-90">{error}</p>
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetAll}
                    className="gap-1.5 border-destructive/40 text-destructive"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Try another file
                  </Button>
                </div>
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
                  {receipt.format.toUpperCase()} file ready to download!
                </div>
                <p className="text-sm text-muted-foreground">
                  {receipt.rows} transactions exported •{' '}
                  {receipt.reconciled
                    ? 'Balance verified'
                    : 'Discrepancy noted'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={receipt.url}
                  download={receipt.name}
                  data-receipt-download="true"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                >
                  <ArrowDownToLine className="h-4 w-4" />
                  Download {receipt.format.toUpperCase()}
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Statement Review Workspace */}
        {data && (
          <div className="space-y-6">
            {/* Header metadata bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold text-foreground">
                    {data.fileName}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.table.rows.length} transactions extracted •{' '}
                  {data.table.pageCount} page
                  {data.table.pageCount === 1 ? '' : 's'} •{' '}
                  {(data.fileBytes / 1024).toFixed(1)} KB
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-md border border-border bg-muted px-2.5 py-1 font-medium text-foreground">
                  Number: {data.numberConvention}
                </span>
                <span className="rounded-md border border-border bg-muted px-2.5 py-1 font-medium text-foreground">
                  Date: {data.dateFormat}
                </span>
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

            {/* Reconciliation Report Banner */}
            {data.reconciliation.hasBalanceColumn && (
              <div
                className={`rounded-xl border p-4 shadow-sm ${
                  data.reconciliation.mismatchCount === 0 &&
                  data.reconciliation.reconciledCount > 0
                    ? 'border-border bg-card text-foreground'
                    : 'border-destructive/30 bg-destructive/10 text-destructive'
                }`}
              >
                <div className="flex items-start gap-3">
                  {data.reconciliation.mismatchCount === 0 &&
                  data.reconciliation.reconciledCount > 0 ? (
                    <ShieldCheck className="h-6 w-6 text-foreground shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-semibold text-base">
                      {data.reconciliation.mismatchCount === 0 &&
                      data.reconciliation.reconciledCount > 0
                        ? 'Running Balance Verified (Reconciled)'
                        : 'Reconciliation Discrepancy Detected'}
                    </p>
                    <p className="text-sm opacity-95">
                      {data.reconciliation.mismatchCount === 0 &&
                      data.reconciliation.reconciledCount > 0
                        ? `All ${data.reconciliation.reconciledCount} transactions correctly reconcile with running balance (${data.reconciliation.chronologicalDirection} order).`
                        : `${data.reconciliation.mismatchCount} transaction row(s) do not match expected delta vs running balance. Review highlighted rows below.`}
                    </p>
                    {data.reconciliation.mismatchedRows.length > 0 && (
                      <div className="pt-2 text-xs font-mono space-y-1">
                        {data.reconciliation.mismatchedRows
                          .slice(0, 3)
                          .map((m, i) => (
                            <div
                              key={i}
                              className="rounded bg-destructive/15 p-1.5 text-destructive"
                            >
                              Row {m.rowIndex}: {m.error}
                            </div>
                          ))}
                        {data.reconciliation.mismatchedRows.length > 3 && (
                          <p className="text-xs opacity-75">
                            + {data.reconciliation.mismatchedRows.length - 3}{' '}
                            more mismatch(es)
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Table Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TableIcon className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold text-foreground text-sm">
                    Extracted Statement Preview
                  </h3>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="rounded border border-border px-2 py-0.5 disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <span className="text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      className="rounded border border-border px-2 py-0.5 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-muted/60 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2.5 font-semibold text-muted-foreground w-10">
                        #
                      </th>
                      {data.table.headers.map((h, i) => (
                        <th key={i} className="px-3 py-2.5 font-semibold">
                          {h || `Col ${i + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pagedRows.map((row, rIdx) => {
                      const absoluteIndex =
                        (currentPage - 1) * PAGE_SIZE + rIdx + 1;
                      const hasMismatch =
                        data.reconciliation.mismatchedRows.some(
                          (m) => m.rowIndex === absoluteIndex,
                        );

                      return (
                        <tr
                          key={row.id}
                          className={`hover:bg-muted/50 ${
                            hasMismatch
                              ? 'bg-destructive/10 text-destructive font-medium'
                              : ''
                          }`}
                        >
                          <td className="px-3 py-2 text-muted-foreground font-mono text-[11px]">
                            {absoluteIndex}
                          </td>
                          {row.cells.map((cell, cIdx) => (
                            <td
                              key={cIdx}
                              className={`px-3 py-2 whitespace-nowrap text-foreground ${
                                data.table.columns[cIdx]?.alignment === 'right'
                                  ? 'text-right font-mono'
                                  : ''
                              }`}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sticky Actions Bar */}
            <div className="sticky bottom-6 rounded-2xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs text-muted-foreground">
                Ready to export {data.table.rows.length} rows to Excel or CSV.
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={handleExportCsv}
                  variant="outline"
                  className="gap-2"
                >
                  <ArrowDownToLine className="h-4 w-4" />
                  Export CSV
                </Button>
                <Button onClick={handleExportXlsx} className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Export Excel (.xlsx)
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
