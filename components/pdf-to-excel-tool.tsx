'use client';

import {
  AlertCircle,
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Plus,
  RotateCcw,
  Scale,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { PracticeBriefPanel } from '@/components/practice-brief';
import { Button } from '@/components/ui/button';
import { PdfGridOverlay } from '@/components/pdf-grid-overlay';
import { announceCompletion } from '@/lib/completion';
import type { PracticeBrief } from '@/lib/practice-briefs';
import { offerFile } from '@/lib/file-handoff';
import {
  flagCells,
  summariseFlags,
  type CellFlag,
  type ColumnRole,
} from '@/lib/tools/pdf/cell-flags';
import { extractTableFromGrids } from '@/lib/tools/pdf/lattice';
import {
  readPdfGeometry,
  type PdfPageGeometry,
} from '@/lib/tools/pdf/pdf-geometry';
import {
  buildGridFromRulings,
  segmentsToRulings,
  type RuledGrid,
} from '@/lib/tools/pdf/rulings';
import {
  detectDateFormatForColumn,
  detectNumberConvention,
  parseAmount,
  parseDate,
  reconcileRunningBalance,
  type DateFormatPreference,
  type ReconciledTransaction,
  type StatementReconciliationReport,
} from '@/lib/tools/pdf/statement-values';
import {
  extractTableFromPdfPages,
  type ExtractedTableResult,
} from '@/lib/tools/pdf/tables';
import { toCsv } from '@/lib/tools/spreadsheet/csv';
import { writeXlsx, type WriteCell } from '@/lib/tools/spreadsheet/xlsx-writer';

export type { ColumnRole };

const ROLE_LABELS: Record<ColumnRole, string> = {
  date: 'Date',
  description: 'Description',
  debit: 'Debit (-)',
  credit: 'Credit (+)',
  amount: 'Amount (Signed)',
  balance: 'Running Balance',
  ignore: 'Ignore (Omit)',
};

const MAX_PDF_BYTES = 100 * 1024 * 1024; // 100 MB

/**
 * How many flags to spell out. A badly misread statement can flag hundreds,
 * and a list that long stops being a list to work through; the rest stay
 * outlined in the table where the problem is.
 */
const MAX_LISTED_FLAGS = 12;

/**
 * The divider positions implied by a set of columns.
 *
 * Columns from either engine are contiguous — each one's right edge is the
 * next one's left — so the dividers are every left edge plus the final right.
 */
function edgesOf(table: ExtractedTableResult): number[] {
  if (table.columns.length === 0) return [];
  const last = table.columns[table.columns.length - 1]!;
  return [...table.columns.map((column) => column.left), last.right];
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function inferInitialRoles(
  headers: readonly string[],
  rows: readonly (readonly string[])[],
): ColumnRole[] {
  const colCount = headers.length;
  const roles: ColumnRole[] = [];

  for (let colIdx = 0; colIdx < colCount; colIdx++) {
    const header = (headers[colIdx] ?? '').toLowerCase();
    const colValues = rows
      .map((r) => r[colIdx] ?? '')
      .filter((v) => v.trim().length > 0);

    // Keyword matching on header first
    if (/date|datum|jour|fecha/i.test(header)) {
      roles.push('date');
      continue;
    }
    if (/balance|saldo|solde/i.test(header)) {
      roles.push('balance');
      continue;
    }
    if (/debit|withdrawal|paid out|belastung|charge/i.test(header)) {
      roles.push('debit');
      continue;
    }
    if (/credit|deposit|paid in|gutschrift/i.test(header)) {
      roles.push('credit');
      continue;
    }
    if (/amount|betrag|montant|summe/i.test(header)) {
      roles.push('amount');
      continue;
    }
    if (
      /desc|detail|particular|narrat|memo|beschreibung|transaction/i.test(
        header,
      )
    ) {
      roles.push('description');
      continue;
    }

    // Inspect values if header is generic or missing
    if (colValues.length > 0) {
      const parsedDates = colValues.map((v) => parseDate(v));
      const validDateCount = parsedDates.filter((d) => d.date !== null).length;
      if (validDateCount / colValues.length >= 0.7) {
        roles.push('date');
        continue;
      }

      // Check numeric amounts
      const convention = detectNumberConvention(colValues);
      const parsed = colValues.map((v) => parseAmount(v, convention));
      const numericCount = parsed.filter((p) => p.value !== null).length;

      if (numericCount / colValues.length >= 0.7) {
        // Likely amount or balance
        if (colIdx === colCount - 1) {
          roles.push('balance');
        } else {
          roles.push('amount');
        }
        continue;
      }
    }

    roles.push('description');
  }

  return roles;
}

/**
 * `brief` re-points this page at one profession without forking the tool.
 *
 * The engine is the same either way. What changes is the heading, the
 * standfirst and the two lists under them, because "PDF to Excel" and "the
 * client's bank statement, into the books, by Thursday" are the same operation
 * described to two different people, and only one of them is searching.
 */
export function PdfToExcelTool({ brief }: { brief?: PracticeBrief } = {}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refusal state for scanned documents without text (Guardrail G7)
  const [isScannedRefusal, setIsScannedRefusal] = useState(false);
  const [scannedFileName, setScannedFileName] = useState('');

  // Table structure and user overrides
  const [pageCount, setPageCount] = useState(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [columnRoles, setColumnRoles] = useState<ColumnRole[]>([]);

  // Date ambiguity preference
  const [isDateAmbiguous, setIsDateAmbiguous] = useState(false);
  const [datePreference, setDatePreference] =
    useState<DateFormatPreference>('DD/MM/YYYY');
  const [settledDateFormat, setSettledDateFormat] = useState<string | null>(
    null,
  );

  // The page view, and the grid the user can correct.
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [geometry, setGeometry] = useState<PdfPageGeometry[] | null>(null);
  const [pageGrids, setPageGrids] = useState<(RuledGrid | null)[]>([]);
  const [overlayPage, setOverlayPage] = useState(1);
  const [columnSource, setColumnSource] = useState<'rules' | 'spacing'>(
    'spacing',
  );
  const [columnEdges, setColumnEdges] = useState<number[]>([]);

  // Download links
  const [xlsxUrl, setXlsxUrl] = useState<string | null>(null);
  const [csvUrl, setCsvUrl] = useState<string | null>(null);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (xlsxUrl) URL.revokeObjectURL(xlsxUrl);
      if (csvUrl) URL.revokeObjectURL(csvUrl);
    };
  }, [xlsxUrl, csvUrl]);

  const resetAll = useCallback(() => {
    if (xlsxUrl) URL.revokeObjectURL(xlsxUrl);
    if (csvUrl) URL.revokeObjectURL(csvUrl);
    setFile(null);
    setIsProcessing(false);
    setErrorMessage(null);
    setIsScannedRefusal(false);
    setScannedFileName('');
    setPageCount(0);
    setPdfBytes(null);
    setGeometry(null);
    setPageGrids([]);
    setOverlayPage(1);
    setColumnSource('spacing');
    setColumnEdges([]);
    setHeaders([]);
    setRows([]);
    setColumnRoles([]);
    setIsDateAmbiguous(false);
    setDatePreference('DD/MM/YYYY');
    setSettledDateFormat(null);
    setXlsxUrl(null);
    setCsvUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [xlsxUrl, csvUrl]);

  const handleProcessPdf = useCallback(
    async (uploadedFile: File) => {
      resetAll();
      setFile(uploadedFile);
      setIsProcessing(true);

      if (uploadedFile.size > MAX_PDF_BYTES) {
        setErrorMessage(
          `${uploadedFile.name} is ${formatBytes(uploadedFile.size)}. Please upload a file smaller than ${formatBytes(MAX_PDF_BYTES)}.`,
        );
        setIsProcessing(false);
        return;
      }

      try {
        const buffer = await uploadedFile.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const pages = await readPdfGeometry(bytes);
        setPdfBytes(bytes);
        setGeometry(pages);
        setPageCount(pages.length);

        // Check if PDF has 0 readable text items (Guardrail G7: Refusal)
        const totalItems = pages.reduce((sum, p) => sum + p.items.length, 0);
        if (totalItems === 0) {
          setIsScannedRefusal(true);
          setScannedFileName(uploadedFile.name);
          setIsProcessing(false);
          return;
        }

        // Prefer the table the PDF drew over the one we would infer. Where a
        // page carries real ruling lines the column boundaries are stated, not
        // guessed, and `extractTableFromGrids` returns null rather than force
        // a grid onto a page that has none.
        const grids = pages.map((page) =>
          buildGridFromRulings(segmentsToRulings(page.segments)),
        );
        setPageGrids(grids);
        const ruled = extractTableFromGrids(
          pages.map((page, index) => ({
            items: page.items,
            grid: grids[index] ?? null,
          })),
        );
        setColumnSource(ruled ? 'rules' : 'spacing');
        const table: ExtractedTableResult =
          ruled ?? extractTableFromPdfPages(pages);
        if (table.rows.length === 0) {
          setErrorMessage(
            `No tabular statement data could be extracted from "${uploadedFile.name}". Please verify the document contains structured tabular rows.`,
          );
          setIsProcessing(false);
          return;
        }

        const initialHeaders = [...table.headers];
        const initialRows = table.rows.map((r) => [...r.cells]);
        const initialRoles = inferInitialRoles(initialHeaders, initialRows);
        setColumnEdges(edgesOf(table));

        setHeaders(initialHeaders);
        setRows(initialRows);
        setColumnRoles(initialRoles);

        // Analyze date columns for ambiguity
        const dateColIdx = initialRoles.findIndex((r) => r === 'date');
        if (dateColIdx !== -1) {
          const dateValues = initialRows.map((r) => r[dateColIdx] ?? '');
          const dateAnalysis = detectDateFormatForColumn(dateValues);
          if (dateAnalysis.isAmbiguous) {
            setIsDateAmbiguous(true);
            setSettledDateFormat(null);
          } else {
            setIsDateAmbiguous(false);
            setSettledDateFormat(dateAnalysis.format);
            setDatePreference(dateAnalysis.format);
          }
        }
      } catch (err) {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred while parsing the PDF.',
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [resetAll],
  );

  const handleRoleChange = (colIndex: number, newRole: ColumnRole) => {
    setColumnRoles((prev) => {
      const updated = [...prev];
      updated[colIndex] = newRole;
      return updated;
    });

    // Invalidate stale download URLs
    if (xlsxUrl) {
      URL.revokeObjectURL(xlsxUrl);
      setXlsxUrl(null);
    }
    if (csvUrl) {
      URL.revokeObjectURL(csvUrl);
      setCsvUrl(null);
    }
  };

  const handleCellChange = (
    rowIndex: number,
    colIndex: number,
    value: string,
  ) => {
    setRows((prev) => {
      const updated = prev.map((r) => [...r]);
      if (updated[rowIndex]) {
        updated[rowIndex]![colIndex] = value;
      }
      return updated;
    });

    if (xlsxUrl) {
      URL.revokeObjectURL(xlsxUrl);
      setXlsxUrl(null);
    }
    if (csvUrl) {
      URL.revokeObjectURL(csvUrl);
      setCsvUrl(null);
    }
  };

  const handleDeleteRow = (rowIndex: number) => {
    setRows((prev) => prev.filter((_, idx) => idx !== rowIndex));
    if (xlsxUrl) {
      URL.revokeObjectURL(xlsxUrl);
      setXlsxUrl(null);
    }
    if (csvUrl) {
      URL.revokeObjectURL(csvUrl);
      setCsvUrl(null);
    }
  };

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      Array.from({ length: headers.length }, () => ''),
    ]);
    if (xlsxUrl) {
      URL.revokeObjectURL(xlsxUrl);
      setXlsxUrl(null);
    }
    if (csvUrl) {
      URL.revokeObjectURL(csvUrl);
      setCsvUrl(null);
    }
  };

  /**
   * Re-read the document against boundaries the user moved.
   *
   * Their dividers apply to EVERY page, not just the one on screen: a
   * statement keeps one column layout throughout, so fixing it once should
   * fix the whole document rather than leaving page 4 wrong.
   *
   * Roles are kept when the column count has not changed, and re-inferred
   * when it has — removing a divider merges two columns, and carrying the old
   * roles over would leave "Debit" pointing at a column that no longer exists.
   */
  const handleColumnEdgesChange = useCallback(
    (edges: number[]) => {
      setColumnEdges(edges);
      if (!geometry || edges.length < 2) return;

      const ruled =
        columnSource === 'rules'
          ? extractTableFromGrids(
              geometry.map((page, index) => {
                const grid = pageGrids[index];
                return {
                  items: page.items,
                  grid: grid
                    ? {
                        ...grid,
                        columnEdges: edges,
                        left: edges[0]!,
                        right: edges[edges.length - 1]!,
                      }
                    : null,
                };
              }),
            )
          : null;
      const table =
        ruled ?? extractTableFromPdfPages(geometry, { columnEdges: edges });
      if (table.rows.length === 0) return;

      const nextHeaders = [...table.headers];
      const nextRows = table.rows.map((row) => [...row.cells]);
      setHeaders(nextHeaders);
      setRows(nextRows);
      setColumnRoles((previous) =>
        previous.length === nextHeaders.length
          ? previous
          : inferInitialRoles(nextHeaders, nextRows),
      );

      // Any download already built describes the old boundaries.
      setXlsxUrl((url) => {
        if (url) URL.revokeObjectURL(url);
        return null;
      });
      setCsvUrl((url) => {
        if (url) URL.revokeObjectURL(url);
        return null;
      });
    },
    [geometry, pageGrids, columnSource],
  );

  // Reconcile Running Balance across active rows
  const reconciliationReport: StatementReconciliationReport | null =
    useMemo(() => {
      if (rows.length === 0 || columnRoles.length === 0) return null;

      const dateCol = columnRoles.findIndex((r) => r === 'date');
      const descCol = columnRoles.findIndex((r) => r === 'description');
      const amountCol = columnRoles.findIndex((r) => r === 'amount');
      const debitCol = columnRoles.findIndex((r) => r === 'debit');
      const creditCol = columnRoles.findIndex((r) => r === 'credit');
      const balanceCol = columnRoles.findIndex((r) => r === 'balance');

      if (balanceCol === -1) {
        return {
          totalTransactions: rows.length,
          hasBalanceColumn: false,
          chronologicalDirection: 'undetermined',
          reconciledCount: 0,
          mismatchCount: 0,
          mismatchedRows: [],
        };
      }

      // Detect number conventions per column
      const amountValues =
        amountCol !== -1 ? rows.map((r) => r[amountCol] ?? '') : [];
      const debitValues =
        debitCol !== -1 ? rows.map((r) => r[debitCol] ?? '') : [];
      const creditValues =
        creditCol !== -1 ? rows.map((r) => r[creditCol] ?? '') : [];
      const balanceValues = rows.map((r) => r[balanceCol] ?? '');

      const amountConv = detectNumberConvention(amountValues);
      const debitConv = detectNumberConvention(debitValues);
      const creditConv = detectNumberConvention(creditValues);
      const balanceConv = detectNumberConvention(balanceValues);

      const transactions: ReconciledTransaction[] = rows.map((r, idx) => {
        const dateStr = dateCol !== -1 ? (r[dateCol] ?? '') : '';
        const parsedD = dateStr ? parseDate(dateStr, datePreference) : null;
        const description = descCol !== -1 ? (r[descCol] ?? '') : '';

        const rawAmount = amountCol !== -1 ? (r[amountCol] ?? '') : '';
        const amountVal = rawAmount
          ? parseAmount(rawAmount, amountConv).value
          : null;

        const rawDebit = debitCol !== -1 ? (r[debitCol] ?? '') : undefined;
        const debitVal = rawDebit
          ? parseAmount(rawDebit, debitConv).value
          : null;

        const rawCredit = creditCol !== -1 ? (r[creditCol] ?? '') : undefined;
        const creditVal = rawCredit
          ? parseAmount(rawCredit, creditConv).value
          : null;

        const rawBalance = r[balanceCol] ?? '';
        const balanceVal = rawBalance
          ? parseAmount(rawBalance, balanceConv).value
          : null;

        return {
          rowIndex: idx,
          dateStr,
          date: parsedD?.date ?? null,
          description,
          rawAmount,
          amount: amountVal,
          rawDebit,
          debit: debitVal,
          rawCredit,
          credit: creditVal,
          rawBalance,
          balance: balanceVal ?? null,
        };
      });

      return reconcileRunningBalance(transactions);
    }, [rows, columnRoles, datePreference]);

  /**
   * Which cells need a human, and why. Recomputed from the table as it stands,
   * so correcting a divider or editing a cell clears its flag immediately.
   */
  const cellFlags: CellFlag[] = useMemo(() => {
    if (rows.length === 0 || columnRoles.length === 0) return [];
    const moneyColumn = columnRoles.findIndex(
      (role) => role === 'balance' || role === 'amount' || role === 'debit',
    );
    const convention = detectNumberConvention(
      moneyColumn === -1 ? [] : rows.map((row) => row[moneyColumn] ?? ''),
    );
    return flagCells(rows, columnRoles, {
      convention,
      dateFormat: datePreference,
      reconciliation: reconciliationReport,
    });
  }, [rows, columnRoles, datePreference, reconciliationReport]);

  const flagsByCell = useMemo(() => {
    const map = new Map<string, CellFlag>();
    for (const flag of cellFlags) {
      const key = `${flag.rowIndex}:${flag.columnIndex}`;
      if (!map.has(key)) map.set(key, flag);
    }
    return map;
  }, [cellFlags]);

  // Export to Excel (.xlsx)
  const handleExportXlsx = async () => {
    const start = performance.now();
    const activeColIndices = columnRoles
      .map((role, idx) => ({ role, idx }))
      .filter((col) => col.role !== 'ignore');

    const outHeaders: string[] = activeColIndices.map((col) => {
      const h = headers[col.idx]?.trim();
      return h && h.length > 0 ? h : ROLE_LABELS[col.role];
    });

    // Detect column conventions
    const conventions = activeColIndices.map((col) => {
      const colValues = rows.map((r) => r[col.idx] ?? '');
      return detectNumberConvention(colValues);
    });

    const outRows: WriteCell[][] = [outHeaders];

    for (const r of rows) {
      const rowCells: WriteCell[] = [];
      for (let i = 0; i < activeColIndices.length; i++) {
        const { role, idx } = activeColIndices[i]!;
        const raw = (r[idx] ?? '').trim();
        const conv = conventions[i]!;

        if (!raw) {
          rowCells.push(null);
          continue;
        }

        if (role === 'date') {
          const parsed = parseDate(raw, datePreference);
          rowCells.push(parsed.date ?? raw);
        } else if (
          role === 'amount' ||
          role === 'balance' ||
          role === 'debit' ||
          role === 'credit'
        ) {
          const parsed = parseAmount(raw, conv);
          if (parsed.value !== null) {
            rowCells.push(parsed.value);
          } else {
            rowCells.push(raw);
          }
        } else {
          rowCells.push(raw);
        }
      }
      outRows.push(rowCells);
    }

    const sheetName = file
      ? file.name.replace(/\.pdf$/i, '').slice(0, 30)
      : 'Statement';
    const writeResult = await writeXlsx([{ name: sheetName, rows: outRows }]);

    const blob = new Blob([new Uint8Array(writeResult.bytes)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    setXlsxUrl(url);

    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `${file ? file.name.replace(/\.pdf$/i, '') : 'statement'}.xlsx`;
    downloadLink.setAttribute('data-receipt-download', 'true');
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    const durationMs = Math.round(performance.now() - start);
    announceCompletion({
      operation: 'Export Excel (.xlsx)',
      durationMs,
      metrics: [
        { label: 'Format', value: 'Excel (.xlsx)' },
        { label: 'Rows', value: String(rows.length) },
        { label: 'Columns', value: String(activeColIndices.length) },
      ],
    });
  };

  // Export to CSV (.csv)
  const handleExportCsv = () => {
    const start = performance.now();
    const activeColIndices = columnRoles
      .map((role, idx) => ({ role, idx }))
      .filter((col) => col.role !== 'ignore');

    const outHeaders: string[] = activeColIndices.map((col) => {
      const h = headers[col.idx]?.trim();
      return h && h.length > 0 ? h : ROLE_LABELS[col.role];
    });

    const csvData: string[][] = [outHeaders];

    for (const r of rows) {
      const rowCells: string[] = [];
      for (const { role, idx } of activeColIndices) {
        const raw = (r[idx] ?? '').trim();
        if (!raw) {
          rowCells.push('');
          continue;
        }

        if (role === 'date') {
          const parsed = parseDate(raw, datePreference);
          rowCells.push(parsed.isoDate ?? raw);
        } else {
          rowCells.push(raw);
        }
      }
      csvData.push(rowCells);
    }

    const csvContent = toCsv(csvData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    setCsvUrl(url);

    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `${file ? file.name.replace(/\.pdf$/i, '') : 'statement'}.csv`;
    downloadLink.setAttribute('data-receipt-download', 'true');
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    const durationMs = Math.round(performance.now() - start);
    announceCompletion({
      operation: 'Export CSV',
      durationMs,
      metrics: [
        { label: 'Format', value: 'CSV' },
        { label: 'Rows', value: String(rows.length) },
        { label: 'Columns', value: String(activeColIndices.length) },
      ],
    });
  };

  return (
    <AppShell currentToolId="pdf-to-excel" currentGroupId="pdf">
      <section
        id="tool"
        tabIndex={-1}
        className="mx-auto max-w-6xl space-y-8 px-4 py-8 focus:outline-none sm:px-6 lg:px-8"
      >
        {/* Header & Hero */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-md border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              100% In-Browser
            </span>
            <span className="inline-flex items-center rounded-md border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              Zero Server Egress
            </span>
            <span className="inline-flex items-center rounded-md border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              Reconciled Balance Integrity
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {brief ? brief.heading : 'Bank Statement & PDF Table to Excel'}
          </h1>
          {brief ? (
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {brief.lede}
            </p>
          ) : (
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Convert PDF bank statements and financial tables directly into
              clean Excel (<code className="font-mono text-xs">.xlsx</code>) and{' '}
              <code className="font-mono text-xs">.csv</code> spreadsheets. Runs
              entirely inside your browser tab — confidential transaction
              records, balances, and account numbers never leave your device.
            </p>
          )}
        </div>

        {brief ? <PracticeBriefPanel brief={brief} /> : null}

        {/* Global Error Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Guardrail G7: Scanned / Image-only Document Refusal State */}
        {isScannedRefusal && (
          <div
            role="alert"
            className="space-y-4 rounded-xl border border-destructive/40 bg-destructive/5 p-6 sm:p-8"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-1 h-6 w-6 shrink-0 text-destructive" />
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">
                  Scanned / Image-Only PDF Refused
                </h2>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    &ldquo;{scannedFileName}&rdquo;
                  </span>{' '}
                  contains no readable digital text layer.
                </p>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-border/80 bg-background/80 p-4 text-xs text-muted-foreground sm:text-sm">
              <p className="font-medium text-foreground">
                Why we refuse this instead of guessing:
              </p>
              <p>
                Converting scanned photos or flat images requires optical
                character recognition (OCR). In banking records, optical OCR
                frequently misinterprets numeric digits (such as mistaking{' '}
                <span className="font-mono">8</span> for{' '}
                <span className="font-mono">3</span> or dropping decimal
                points), which can silently corrupt a ledger. We refuse to
                generate unverifiable financial numbers.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                How to get clean financial data:
              </h3>
              <ul className="list-inside list-disc space-y-1.5 text-xs text-muted-foreground sm:text-sm">
                <li>
                  <strong className="text-foreground">
                    Download the digital PDF:
                  </strong>{' '}
                  Log in to your banking portal and download the original
                  statement PDF directly. Modern banks issue electronic PDFs
                  with full selectable text.
                </li>
                <li>
                  <strong className="text-foreground">
                    Export direct CSV / OFX / QIF:
                  </strong>{' '}
                  Nearly all banks offer a direct &ldquo;Export
                  Transactions&rdquo; button. Direct exports are 100% accurate
                  and require no table parsing.
                </li>
                <li>
                  <strong className="text-foreground">
                    Scan with desktop OCR:
                  </strong>{' '}
                  If you only have paper sheets, scan them using your
                  scanner&apos;s searchable PDF setting to embed high-confidence
                  text before uploading.
                </li>
              </ul>
            </div>

            <div className="pt-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    if (!file) return;
                    void offerFile(file).then(() =>
                      window.location.assign('/pdf/ocr'),
                    );
                  }}
                >
                  Read this scan with OCR
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose Another PDF
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Upload Dropzone (when no active document) */}
        {!file && !isScannedRefusal && (
          <div
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                void handleProcessPdf(e.dataTransfer.files[0]);
              }
            }}
            onDragOver={(e) => e.preventDefault()}
            className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card p-8 text-center transition-colors hover:border-foreground/40 sm:p-12"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              aria-label="Upload PDF statement"
              className="sr-only"
              id="pdf-file-picker"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  void handleProcessPdf(e.target.files[0]);
                }
              }}
            />
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <UploadCloud className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-medium text-foreground">
              Drop your bank statement or PDF table here
            </h2>
            <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">
              Select any digital PDF statement (up to{' '}
              {formatBytes(MAX_PDF_BYTES)})
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-5"
              disabled={isProcessing}
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {isProcessing ? 'Reading Statement...' : 'Choose PDF Statement'}
            </Button>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <span>
                100% private. Processed exclusively in local tab memory.
              </span>
            </div>
          </div>
        )}

        {/* Active Document Workspace */}
        {file && !isScannedRefusal && rows.length > 0 && (
          <div className="space-y-6">
            {/* Top document bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-muted-foreground" />
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    {file.name}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {pageCount} {pageCount === 1 ? 'page' : 'pages'} •{' '}
                    {rows.length} extracted transactions •{' '}
                    {formatBytes(file.size)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetAll}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  New File
                </Button>
              </div>
            </div>

            {/* The page, with the grid on it. The tool's whole claim to being
                trustworthy is that you can see what it read and correct it. */}
            {pdfBytes && columnEdges.length >= 2 ? (
              <div className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Check the columns
                  </h3>
                </div>
                <PdfGridOverlay
                  bytes={pdfBytes}
                  pageNumber={overlayPage}
                  pageCount={pageCount}
                  onPageChange={setOverlayPage}
                  columnEdges={columnEdges}
                  rowEdges={pageGrids[overlayPage - 1]?.rowEdges ?? []}
                  onColumnEdgesChange={handleColumnEdgesChange}
                  source={columnSource}
                />
              </div>
            ) : null}

            {/* Confidence & Facts Panel (Guardrail G5: No fake % score!) */}
            <div className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Extraction Facts &amp; Reconciliation
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* Fact 1: Document Scale */}
                <div className="rounded-lg border border-border/60 bg-background p-3.5">
                  <span className="text-xs text-muted-foreground font-medium">
                    Statement Volume
                  </span>
                  <div className="mt-1 text-base font-semibold text-foreground">
                    {rows.length} Rows across {pageCount} Pages
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Multi-line description continuations merged automatically
                  </div>
                </div>

                {/* Fact: where the columns came from. This is a statement of
                    fact about the document, not a quality score. */}
                <div className="rounded-lg border border-border/60 bg-background p-3.5">
                  <span className="text-xs text-muted-foreground font-medium">
                    How the columns were found
                  </span>
                  <div className="mt-1 text-base font-semibold text-foreground">
                    {columnSource === 'rules'
                      ? 'Read from the drawn lines'
                      : 'Worked out from the spacing'}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {columnSource === 'rules'
                      ? 'This PDF draws its table borders, so the column positions are stated rather than estimated.'
                      : 'This PDF draws no table lines, so the columns were estimated. Check them on the page above.'}
                  </div>
                </div>

                {/* Fact: what needs checking, counted and named — never scored. */}
                <div className="rounded-lg border border-border/60 bg-background p-3.5">
                  <span className="text-xs text-muted-foreground font-medium">
                    Cells to check
                  </span>
                  <div className="mt-1 text-base font-semibold text-foreground">
                    {cellFlags.length === 0
                      ? 'Nothing flagged'
                      : (summariseFlags(cellFlags) ?? '')}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {cellFlags.length === 0
                      ? 'Every date and amount read cleanly, and the running balance continues throughout.'
                      : 'Each one is listed below with the reason. We do not publish an accuracy percentage, because we cannot measure your document.'}
                  </div>
                </div>

                {/* Fact 2: Date Interpretation */}
                <div className="rounded-lg border border-border/60 bg-background p-3.5">
                  <span className="text-xs text-muted-foreground font-medium">
                    Date Interpretation
                  </span>
                  {settledDateFormat ? (
                    <div>
                      <div className="mt-1 flex items-center gap-1.5 text-base font-semibold text-foreground">
                        <CheckCircle2 className="h-4 w-4 text-foreground" />
                        <span>Settled: {settledDateFormat}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Disambiguated by day values greater than 12
                      </div>
                    </div>
                  ) : isDateAmbiguous ? (
                    <div>
                      <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <HelpCircle className="h-4 w-4" />
                        <span>Ambiguous (All days &le; 12)</span>
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-xs">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name="datePref"
                            value="DD/MM/YYYY"
                            checked={datePreference === 'DD/MM/YYYY'}
                            onChange={() => setDatePreference('DD/MM/YYYY')}
                            className="text-foreground"
                          />
                          <span>DD/MM/YYYY</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name="datePref"
                            value="MM/DD/YYYY"
                            checked={datePreference === 'MM/DD/YYYY'}
                            onChange={() => setDatePreference('MM/DD/YYYY')}
                            className="text-foreground"
                          />
                          <span>MM/DD/YYYY</span>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="mt-1 text-base font-semibold text-foreground">
                        Standard
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Formatted per row detection
                      </div>
                    </div>
                  )}
                </div>

                {/* Fact 3: Running Balance Integrity */}
                <div className="rounded-lg border border-border/60 bg-background p-3.5">
                  <span className="text-xs text-muted-foreground font-medium">
                    Balance Reconciliation
                  </span>
                  {reconciliationReport?.hasBalanceColumn ? (
                    /*
                      A row whose amount could not be parsed is skipped by the
                      reconciler rather than counted as a mismatch, so a
                      statement where NOTHING could be checked arrives here
                      with mismatchCount 0 and used to be certified "100%
                      Reconciled" under a tick. That is the worst possible
                      failure for this panel: it is read precisely by people
                      deciding whether to trust the export. Nothing is
                      reconciled until at least one row was actually checked.
                    */
                    reconciliationReport.reconciledCount === 0 ? (
                      <div>
                        <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                          <AlertTriangle className="h-4 w-4" />
                          <span>Not checked</span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          A balance column was found, but no row could be
                          checked against it — the amounts on this statement did
                          not parse. Verify the closing balance yourself.
                        </div>
                      </div>
                    ) : reconciliationReport.mismatchCount === 0 ? (
                      <div>
                        <div className="mt-1 flex items-center gap-1.5 text-base font-semibold text-foreground">
                          <CheckCircle2 className="h-4 w-4 text-foreground" />
                          <span>100% Reconciled</span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          All {reconciliationReport.reconciledCount} checked
                          rows match their balance movement (
                          {reconciliationReport.chronologicalDirection})
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                          <AlertTriangle className="h-4 w-4" />
                          <span>
                            {reconciliationReport.mismatchCount} Discrepancies
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {reconciliationReport.mismatchedRows[0]?.error ||
                            'Balance difference does not equal transaction amount'}
                        </div>
                      </div>
                    )
                  ) : (
                    <div>
                      <div className="mt-1 text-sm font-medium text-muted-foreground">
                        No Balance Column
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Assign a column to &ldquo;Running Balance&rdquo; to
                        enable check
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Interactive Grid & Column Role Pickers */}
            <div className="space-y-3 rounded-xl border border-border bg-card p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    Table Preview &amp; Column Mapping
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Assign column roles to ensure dates and amounts format
                    correctly in Excel. Edit any cell or delete unwanted rows.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddRow}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add Row
                  </Button>
                </div>
              </div>

              {/* What needs a look, in reading order, each with its reason.
                  A list you can walk beats a score you cannot check. */}
              {cellFlags.length > 0 ? (
                <div
                  className="rounded-lg border border-destructive/40 bg-destructive/5 p-4"
                  data-testid="cell-flags"
                >
                  <h4 className="text-sm font-semibold text-foreground">
                    {summariseFlags(cellFlags)}
                  </h4>
                  <ul className="mt-2 space-y-1.5">
                    {cellFlags.slice(0, MAX_LISTED_FLAGS).map((flag) => (
                      <li
                        key={`${flag.rowIndex}:${flag.columnIndex}:${flag.reason}`}
                        className="text-xs text-muted-foreground"
                      >
                        <span className="font-medium text-foreground">
                          Row {flag.rowIndex + 1}
                          {flag.columnIndex >= 0
                            ? `, ${headers[flag.columnIndex]?.trim() || `column ${flag.columnIndex + 1}`}`
                            : ''}
                          :
                        </span>{' '}
                        {flag.message}
                      </li>
                    ))}
                  </ul>
                  {cellFlags.length > MAX_LISTED_FLAGS ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      And {cellFlags.length - MAX_LISTED_FLAGS} more, each
                      outlined in the table below.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {/* Table Container */}
              <div className="overflow-x-auto rounded-lg border border-border bg-background">
                <table className="w-full border-collapse text-left text-xs sm:text-sm">
                  <thead>
                    {/* Role Pickers Header Row */}
                    <tr className="border-b border-border bg-muted/50">
                      {columnRoles.map((role, colIdx) => (
                        <th key={colIdx} className="min-w-[150px] p-2.5">
                          <div className="space-y-1">
                            <label
                              htmlFor={`role-select-${colIdx}`}
                              className="block text-[11px] font-medium text-muted-foreground"
                            >
                              Column {colIdx + 1} Role
                            </label>
                            <select
                              id={`role-select-${colIdx}`}
                              aria-label={`Column ${colIdx + 1} Role`}
                              value={role}
                              onChange={(e) =>
                                handleRoleChange(
                                  colIdx,
                                  e.target.value as ColumnRole,
                                )
                              }
                              className="h-8 w-full rounded border border-border bg-background px-2 text-xs font-medium text-foreground focus:border-foreground focus:outline-none"
                            >
                              <option value="date">Date</option>
                              <option value="description">Description</option>
                              <option value="debit">Debit (-)</option>
                              <option value="credit">Credit (+)</option>
                              <option value="amount">Amount (Signed)</option>
                              <option value="balance">Running Balance</option>
                              <option value="ignore">Ignore (Omit)</option>
                            </select>
                          </div>
                        </th>
                      ))}
                      <th className="w-10 p-2.5">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>

                    {/* Detected Column Names Row */}
                    <tr className="border-b border-border bg-muted/20">
                      {headers.map((h, colIdx) => (
                        <th
                          key={colIdx}
                          className="p-2.5 font-semibold text-foreground"
                        >
                          <input
                            type="text"
                            value={h}
                            aria-label={`Column ${colIdx + 1} Header`}
                            onChange={(e) => {
                              const updated = [...headers];
                              updated[colIdx] = e.target.value;
                              setHeaders(updated);
                            }}
                            className="h-7 w-full rounded border border-transparent bg-transparent px-1 font-semibold text-foreground hover:border-border focus:border-foreground focus:bg-background focus:outline-none"
                          />
                        </th>
                      ))}
                      <th className="p-2.5">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-border/60">
                    {rows.map((row, rowIdx) => (
                      <tr
                        key={rowIdx}
                        className="transition-colors hover:bg-muted/30"
                      >
                        {row.map((cellValue, colIdx) => {
                          const isIgnored = columnRoles[colIdx] === 'ignore';
                          const flag = flagsByCell.get(`${rowIdx}:${colIdx}`);
                          return (
                            <td
                              key={colIdx}
                              data-flagged={flag ? flag.reason : undefined}
                              className={`p-2 ${
                                isIgnored ? 'opacity-40 line-through' : ''
                              } ${flag ? 'bg-destructive/5' : ''}`}
                            >
                              <input
                                type="text"
                                value={cellValue}
                                // The reason travels with the cell, so the
                                // flag is readable where the problem is and
                                // not only in the list below.
                                title={flag?.message}
                                aria-label={
                                  flag
                                    ? `Row ${rowIdx + 1} Column ${colIdx + 1}. Needs a look: ${flag.message}`
                                    : `Row ${rowIdx + 1} Column ${colIdx + 1}`
                                }
                                aria-invalid={flag ? true : undefined}
                                onChange={(e) =>
                                  handleCellChange(
                                    rowIdx,
                                    colIdx,
                                    e.target.value,
                                  )
                                }
                                className={`h-7 w-full rounded border bg-transparent px-1 text-xs text-foreground hover:border-border focus:border-foreground focus:bg-background focus:outline-none ${
                                  flag
                                    ? 'border-destructive/50'
                                    : 'border-transparent'
                                }`}
                              />
                            </td>
                          );
                        })}
                        <td className="p-2 text-right">
                          <button
                            type="button"
                            aria-label={`Delete row ${rowIdx + 1}`}
                            onClick={() => handleDeleteRow(rowIdx)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Export Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 sm:p-6">
              <div>
                <h4 className="text-sm font-semibold text-foreground">
                  Ready to Export
                </h4>
                <p className="text-xs text-muted-foreground">
                  Generate Excel with native numeric formats or lightweight RFC
                  4180 CSV
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  onClick={() => void handleExportXlsx()}
                  data-receipt-download="true"
                >
                  <ArrowDownToLine className="mr-2 h-4 w-4" />
                  Download Excel (.xlsx)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExportCsv}
                  data-receipt-download="true"
                >
                  <ArrowDownToLine className="mr-2 h-4 w-4" />
                  Download CSV (.csv)
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
