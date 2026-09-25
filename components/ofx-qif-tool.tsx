'use client';

import {
  AlertCircle,
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Filter,
  Info,
  RotateCcw,
  Search,
  ShieldCheck,
  Table as TableIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import {
  parseFinance,
  reconcile,
  type FinanceAccount,
  type FinanceParseResult,
  type FinanceTransaction,
  type ReconcileResult,
} from '@/lib/formats/finance';
import { toCsv } from '@/lib/tools/spreadsheet/csv';
import { writeXlsx } from '@/lib/tools/spreadsheet/xlsx-writer';

type DownloadReceipt = {
  format: 'csv' | 'xlsx';
  url: string;
  name: string;
  rows: number;
  reconciled: boolean;
};

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

function formatCurrencyAmount(
  amount: number | null,
  currency?: string,
): string {
  if (amount === null || !Number.isFinite(amount)) return '—';
  const prefix = currency ? `${currency} ` : '';
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (amount < 0) {
    return `-${prefix}${formatted}`;
  }
  return `${prefix}${formatted}`;
}

export function OfxQifTool() {
  const [result, setResult] = useState<FinanceParseResult | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileBytes, setFileBytes] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<DownloadReceipt | null>(null);

  // Active account filter if multiple accounts exist
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');

  // Search query in transactions table
  const [searchQuery, setSearchQuery] = useState<string>('');

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
    setResult(null);
    setFileName('');
    setFileBytes(0);
    setLoading(false);
    setLoadingStep('');
    setError(null);
    setReceipt(null);
    setSelectedAccountId('all');
    setSearchQuery('');
    setCurrentPage(1);
  }, [receipt]);

  const handleFile = useCallback(
    async (file: File) => {
      resetAll();
      const lower = file.name.toLowerCase();
      const isSupported =
        lower.endsWith('.ofx') ||
        lower.endsWith('.qif') ||
        lower.endsWith('.qfx') ||
        lower.endsWith('.sgml') ||
        lower.endsWith('.xml') ||
        lower.endsWith('.txt');

      if (!isSupported) {
        setError(
          'Please select a valid OFX, QFX, or QIF financial statement document (.ofx, .qif, .qfx, .sgml, .xml).',
        );
        return;
      }
      if (file.size > MAX_BYTES) {
        setError(
          `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum supported size is 50 MB.`,
        );
        return;
      }

      setLoading(true);
      setLoadingStep('Reading file bytes into memory...');

      try {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);

        setLoadingStep('Parsing financial statement structure...');
        const parsed = await parseFinance(bytes);

        if (!parsed.transactions.length && !parsed.accounts.length) {
          setError(
            'No accounts or transaction entries were found in this statement document.',
          );
          setLoading(false);
          return;
        }

        setFileName(file.name);
        setFileBytes(file.size);
        setResult(parsed);
        if (parsed.accounts.length > 0) {
          setSelectedAccountId(parsed.accounts[0]?.id ?? 'all');
        } else {
          setSelectedAccountId('all');
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to parse the financial statement.';
        setError(message);
      } finally {
        setLoading(false);
        setLoadingStep('');
      }
    },
    [resetAll],
  );

  const activeAccount: FinanceAccount | undefined = useMemo(() => {
    if (!result || selectedAccountId === 'all') return undefined;
    return result.accounts.find((acc) => acc.id === selectedAccountId);
  }, [result, selectedAccountId]);

  // Filtered transactions by account
  const accountTransactions: readonly FinanceTransaction[] = useMemo(() => {
    if (!result) return [];
    if (selectedAccountId === 'all') return result.transactions;
    return result.transactions.filter(
      (tx) => tx.accountId === selectedAccountId,
    );
  }, [result, selectedAccountId]);

  // Search filtered transactions for table
  const filteredTransactions: readonly FinanceTransaction[] = useMemo(() => {
    if (!searchQuery.trim()) return accountTransactions;
    const q = searchQuery.toLowerCase();
    return accountTransactions.filter((tx) => {
      const payee = tx.payee?.toLowerCase() ?? '';
      const memo = tx.memo?.toLowerCase() ?? '';
      const category = tx.category?.toLowerCase() ?? '';
      const reference = tx.reference?.toLowerCase() ?? '';
      const type = tx.type?.toLowerCase() ?? '';
      const rawAmount = tx.rawAmount?.toLowerCase() ?? '';
      return (
        payee.includes(q) ||
        memo.includes(q) ||
        category.includes(q) ||
        reference.includes(q) ||
        type.includes(q) ||
        rawAmount.includes(q)
      );
    });
  }, [accountTransactions, searchQuery]);

  // Calculated totals for active account / selection
  const totals = useMemo(() => {
    let debits = 0;
    let credits = 0;
    for (const tx of accountTransactions) {
      if (tx.amount < 0) {
        debits += Math.abs(tx.amount);
      } else {
        credits += tx.amount;
      }
    }
    const net = credits - debits;
    return { debits, credits, net };
  }, [accountTransactions]);

  // Reconciliation analysis
  const reconciliationReport: ReconcileResult | null = useMemo(() => {
    if (!result) return null;
    const opening =
      activeAccount?.openingBalance ??
      (selectedAccountId === 'all' ? result.openingBalance : null);
    const closing =
      activeAccount?.closingBalance ??
      (selectedAccountId === 'all' ? result.closingBalance : null);

    if (opening === null || closing === null) {
      return {
        balanced: false,
        delta: null,
        reason: 'no-opening-balance',
      };
    }

    return reconcile({
      opening,
      transactions: accountTransactions.map((tx) => tx.amount),
      closing,
    });
  }, [result, activeAccount, selectedAccountId, accountTransactions]);

  const totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredTransactions.slice(start, start + PAGE_SIZE);
  }, [filteredTransactions, currentPage]);

  const handleExportCsv = useCallback(() => {
    if (!result) return;
    const baseName = fileName.replace(/\.[^/.]+$/u, '') || 'statement';
    const csvFileName = `${baseName}-export.csv`;

    const header = [
      'Date',
      'Account',
      'Type',
      'Payee',
      'Memo',
      'Category',
      'Reference',
      'Amount',
      'Currency',
    ];

    const rows: string[][] = [header];
    for (const tx of accountTransactions) {
      rows.push([
        tx.date ?? '',
        tx.accountId,
        tx.type ?? '',
        tx.payee ?? '',
        tx.memo ?? '',
        tx.category ?? '',
        tx.reference ?? '',
        tx.amount.toFixed(2),
        tx.currency ?? activeAccount?.currency ?? '',
      ]);
    }

    const csvText = toCsv(rows);
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    if (receipt?.url) {
      URL.revokeObjectURL(receipt.url);
    }

    setReceipt({
      format: 'csv',
      url,
      name: csvFileName,
      rows: accountTransactions.length,
      reconciled: reconciliationReport?.balanced === true,
    });

    announceCompletion({
      operation: 'ofx-qif-convert',
      durationMs: 0,
      metrics: [
        { label: 'Format', value: 'CSV' },
        { label: 'Status', value: 'Complete' },
      ],
    });
  }, [
    result,
    fileName,
    accountTransactions,
    activeAccount,
    receipt,
    reconciliationReport,
  ]);

  const handleExportXlsx = useCallback(async () => {
    if (!result) return;
    const baseName = fileName.replace(/\.[^/.]+$/u, '') || 'statement';
    const xlsxFileName = `${baseName}-export.xlsx`;

    const header = [
      'Date',
      'Account',
      'Type',
      'Payee',
      'Memo',
      'Category',
      'Reference',
      'Amount',
      'Currency',
    ];

    const rows: (string | number)[][] = [header];
    for (const tx of accountTransactions) {
      rows.push([
        tx.date ?? '',
        tx.accountId,
        tx.type ?? '',
        tx.payee ?? '',
        tx.memo ?? '',
        tx.category ?? '',
        tx.reference ?? '',
        tx.amount,
        tx.currency ?? activeAccount?.currency ?? '',
      ]);
    }

    const { bytes } = await writeXlsx([
      {
        name: 'Transactions',
        rows,
      },
    ]);

    const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);

    if (receipt?.url) {
      URL.revokeObjectURL(receipt.url);
    }

    setReceipt({
      format: 'xlsx',
      url,
      name: xlsxFileName,
      rows: accountTransactions.length,
      reconciled: reconciliationReport?.balanced === true,
    });

    announceCompletion({
      operation: 'ofx-qif-convert',
      durationMs: 0,
      metrics: [
        { label: 'Format', value: 'XLSX' },
        { label: 'Status', value: 'Complete' },
      ],
    });
  }, [
    result,
    fileName,
    accountTransactions,
    activeAccount,
    receipt,
    reconciliationReport,
  ]);

  return (
    <AppShell currentToolId="ofx-qif-converter" currentGroupId="finance">
      <section
        id="tool"
        tabIndex={-1}
        className="mx-auto max-w-5xl space-y-8 px-4 py-8 focus:outline-none sm:px-6 lg:px-8"
      >
        {/* Caveat & Privacy Notice */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-foreground/90">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">
                Local-Only Statement Parsing &amp; Balance Reconciliation
              </p>
              <p>
                Financial statement conversion happens entirely inside your
                browser. No files, transaction records, bank names, or balance
                amounts are uploaded or shared. Supports OFX (1.x SGML, 2.x XML)
                and QIF banking, card, and investment statements.
              </p>
              <p className="text-xs text-muted-foreground">
                Note: OFX and QIF files contain structured records. Visual bank
                letterhead logos and marketing attachments are not part of
                standard interchange specifications and will not appear in the
                tabular spreadsheet export.
              </p>
            </div>
          </div>
        </div>

        {/* Dropzone Section */}
        {!result && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Select OFX or QIF Statement File
            </h2>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) void handleFile(file);
              }}
              className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30 bg-card p-12 text-center transition-colors hover:border-primary/50 focus-within:border-primary"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".ofx,.qif,.qfx,.sgml,.xml,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                }}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label="Choose OFX or QIF file"
              />
              <div className="mb-4 rounded-full bg-primary/10 p-4 text-primary">
                <FileText className="h-8 w-8" />
              </div>
              <p className="text-base font-medium text-foreground">
                Drop your OFX or QIF statement here, or{' '}
                <span className="text-primary underline">browse</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Supports .ofx, .qif, .qfx files up to 50 MB. 100% private
                in-browser parsing.
              </p>
            </div>

            {loading && (
              <div className="flex items-center justify-center gap-3 rounded-lg border border-border bg-card p-4 text-sm text-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span>{loadingStep || 'Processing statement...'}</span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="space-y-1">
                  <p className="font-semibold">Unable to process statement</p>
                  <p>{error}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Statement Overview & Controls */}
        {result && (
          <div className="space-y-6">
            {/* Header / Reset bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <TableIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    {fileName}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {(fileBytes / 1024).toFixed(1)} KB &bull; Format:{' '}
                    <span className="font-medium uppercase text-foreground">
                      {result.format}{' '}
                      {result.version ? `(${result.version})` : ''}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetAll}
                  className="flex items-center gap-1.5"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Choose Another File</span>
                </Button>
              </div>
            </div>

            {/* Account Switcher if multiple accounts exist */}
            {result.accounts.length > 1 && (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">
                  Select Account:
                </span>
                <select
                  value={selectedAccountId}
                  onChange={(e) => {
                    setSelectedAccountId(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">
                    All Accounts ({result.accounts.length})
                  </option>
                  {result.accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.id} {acc.type ? `(${acc.type})` : ''}{' '}
                      {acc.currency ? `[${acc.currency}]` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Summary Cards */}
            <div>
              <h2 className="sr-only">Statement Summary</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">
                    Opening Balance
                  </p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {formatCurrencyAmount(
                      activeAccount?.openingBalance ?? result.openingBalance,
                      activeAccount?.currency,
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activeAccount?.statementStart
                      ? `From ${activeAccount.statementStart}`
                      : 'Initial balance'}
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">Total Inflows</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    +
                    {formatCurrencyAmount(
                      totals.credits,
                      activeAccount?.currency,
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">Total credits</p>
                </div>

                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">
                    Total Outflows
                  </p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    -
                    {formatCurrencyAmount(
                      totals.debits,
                      activeAccount?.currency,
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">Total debits</p>
                </div>

                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">
                    Closing Balance
                  </p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {formatCurrencyAmount(
                      activeAccount?.closingBalance ?? result.closingBalance,
                      activeAccount?.currency,
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activeAccount?.statementEnd
                      ? `To ${activeAccount.statementEnd}`
                      : 'Final balance'}
                  </p>
                </div>
              </div>
            </div>

            {/* Balance Reconciliation Alert Banner */}
            <div>
              <h2 className="sr-only">Balance Reconciliation</h2>
              {reconciliationReport && (
                <div>
                  {reconciliationReport.balanced ? (
                    <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 p-4 text-foreground">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                      <div className="text-sm">
                        <span className="font-semibold">
                          Statement Reconciled:{' '}
                        </span>
                        Opening balance + credits − debits matches closing
                        balance exactly (difference is 0.00).
                      </div>
                    </div>
                  ) : reconciliationReport.delta !== null ? (
                    <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-destructive">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                      <div className="text-sm">
                        <p className="font-bold">
                          Reconciliation Discrepancy Detected
                        </p>
                        <p className="mt-0.5">
                          Closing balance deviates from opening balance plus net
                          transactions by{' '}
                          <span className="font-mono font-semibold">
                            {formatCurrencyAmount(
                              reconciliationReport.delta,
                              activeAccount?.currency,
                            )}
                          </span>
                          . Review transactions below to ensure no records are
                          omitted or duplicated.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                      <Info className="h-5 w-5 shrink-0 text-primary" />
                      <div>
                        Opening balance not provided in statement header. Net
                        transaction sum is{' '}
                        <span className="font-semibold text-foreground">
                          {formatCurrencyAmount(
                            totals.net,
                            activeAccount?.currency,
                          )}
                        </span>{' '}
                        across {accountTransactions.length} transactions.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Export Actions & Download Receipt */}
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="mb-3 text-base font-semibold text-foreground">
                Export Transactions to Spreadsheet
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={handleExportCsv}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  <span>Download CSV</span>
                </Button>
                <Button
                  onClick={handleExportXlsx}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Download Excel (.xlsx)</span>
                </Button>
                <span className="text-xs text-muted-foreground">
                  Includes {accountTransactions.length} transactions with date,
                  type, payee, memo, and formatted amounts.
                </span>
              </div>

              {receipt && (
                <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-primary/20 bg-primary/5 p-3.5">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-foreground">
                      Ready:{' '}
                      <span className="font-semibold">{receipt.name}</span> (
                      {receipt.rows} rows exported)
                    </span>
                  </div>
                  <a
                    href={receipt.url}
                    download={receipt.name}
                    data-receipt-download
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    <ArrowDownToLine className="h-3.5 w-3.5" />
                    <span>Save {receipt.format.toUpperCase()}</span>
                  </a>
                </div>
              )}
            </div>

            {/* Transactions Preview Table */}
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    Transaction Review
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Showing {filteredTransactions.length} of{' '}
                    {accountTransactions.length} transactions
                  </p>
                </div>
                <div className="relative w-full max-w-xs">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search payee, memo, reference..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2.5 font-medium">Date</th>
                      <th className="px-3 py-2.5 font-medium">Type</th>
                      <th className="px-3 py-2.5 font-medium">
                        Payee / Description
                      </th>
                      <th className="px-3 py-2.5 font-medium">
                        Memo / Category
                      </th>
                      <th className="px-3 py-2.5 font-medium">Reference</th>
                      <th className="px-3 py-2.5 text-right font-medium">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedTransactions.length > 0 ? (
                      paginatedTransactions.map((tx, idx) => (
                        <tr
                          key={tx.id || `${tx.accountId}-${tx.date}-${idx}`}
                          className="hover:bg-muted/20"
                        >
                          <td className="whitespace-nowrap px-3 py-2.5 font-mono text-muted-foreground">
                            {tx.date || '—'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5">
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {tx.type || 'TX'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 font-medium text-foreground">
                            {tx.payee || '—'}
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">
                            {tx.memo || tx.category || '—'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 font-mono text-muted-foreground">
                            {tx.reference || '—'}
                          </td>
                          <td
                            className={`whitespace-nowrap px-3 py-2.5 text-right font-mono font-medium ${
                              tx.amount < 0
                                ? 'text-destructive'
                                : 'text-foreground'
                            }`}
                          >
                            {tx.amount < 0
                              ? `-${Math.abs(tx.amount).toFixed(2)}`
                              : `+${tx.amount.toFixed(2)}`}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-8 text-center text-muted-foreground"
                        >
                          No transactions match the search filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
