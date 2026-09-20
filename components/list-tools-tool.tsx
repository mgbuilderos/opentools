'use client';

import React, { useCallback, useId, useMemo, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  Check,
  Copy,
  FileCheck2,
  FileDown,
  FilePlus2,
  GitCompare,
  Layers,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Split,
  TableProperties,
  UploadCloud,
} from 'lucide-react';

import { announceCompletion } from '@/lib/completion';
import { Button } from '@/components/ui/button';
import {
  compareLists,
  deduplicateList,
  extractListTable,
  LIST_PRIVACY_NOTICE,
  mergeLists,
  normalizeList,
  serializeListTable,
  splitByColumnValue,
  splitByRowCount,
  type ColumnNormalizer,
  type ListTable,
  type NormalizeColumnRule,
} from '@/lib/tools/lists/hygiene';
import { detectDelimiter, parseCsv } from '@/lib/tools/spreadsheet/csv';
import { AppShell } from '@/components/app-shell';

type Mode = 'dedup' | 'merge' | 'split' | 'compare' | 'normalize';

export function ListToolsTool() {
  const fileInputA = useRef<HTMLInputElement>(null);
  const fileInputB = useRef<HTMLInputElement>(null);

  const [activeMode, setActiveMode] = useState<Mode>('dedup');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // List A (Primary)
  const [filenameA, setFilenameA] = useState<string>('');
  const [tableA, setTableA] = useState<ListTable | null>(null);

  // List B (Secondary, for merge & compare)
  const [filenameB, setFilenameB] = useState<string>('');
  const [tableB, setTableB] = useState<ListTable | null>(null);

  // Deduplication state
  const [dedupColIdx, setDedupColIdx] = useState<number>(0);
  const [dedupCaseSensitive, setDedupCaseSensitive] = useState<boolean>(false);
  const [dedupKeep, setDedupKeep] = useState<'first' | 'last'>('first');

  // Merge state
  const [mergeMode, setMergeMode] = useState<'union_columns' | 'match_headers'>(
    'union_columns',
  );

  // Split state
  const [splitType, setSplitType] = useState<'rows' | 'column'>('rows');
  const [splitRowCount, setSplitRowCount] = useState<number>(1000);
  const [splitColIdx, setSplitColIdx] = useState<number>(0);

  // Compare state
  const [compareColA, setCompareColA] = useState<number>(0);
  const [compareColB, setCompareColB] = useState<number>(0);
  const [compareCaseSensitive, setCompareCaseSensitive] =
    useState<boolean>(false);
  const [compareViewTab, setCompareViewTab] = useState<
    'inBoth' | 'onlyA' | 'onlyB'
  >('inBoth');

  // Normalization state
  const [normRules, setNormRules] = useState<ColumnNormalizer[]>([]);

  // Generated download URLs
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const dedupColSelectId = useId();
  const dedupKeepSelectId = useId();
  const splitRowsInputId = useId();
  const splitColSelectId = useId();
  const compareColASelectId = useId();
  const compareColBSelectId = useId();

  // Load List A
  const handleFileA = useCallback(async (fileList: FileList | File[]) => {
    setErrorMessage(null);
    const file = fileList[0];
    if (!file) return;

    try {
      const text = await file.text();
      const delimiter = detectDelimiter(text);
      const rows = parseCsv(text, delimiter);
      const table = extractListTable(rows);

      if (table.headers.length === 0 && table.rows.length === 0) {
        throw new Error(
          'The selected file is empty or could not be parsed as tabular CSV.',
        );
      }

      setFilenameA(file.name);
      setTableA(table);
      setDedupColIdx(0);
      setSplitColIdx(0);
      setCompareColA(0);

      // Initialize default normalization rules for common columns
      const initialRules: ColumnNormalizer[] = [];
      table.headers.forEach((h, idx) => {
        const lower = h.toLowerCase();
        if (lower.includes('email')) {
          initialRules.push({ columnIndex: idx, rule: 'email' });
        } else if (
          lower.includes('phone') ||
          lower.includes('mobile') ||
          lower.includes('tel')
        ) {
          initialRules.push({ columnIndex: idx, rule: 'phone_digits' });
        } else if (
          lower.includes('name') ||
          lower.includes('city') ||
          lower.includes('state')
        ) {
          initialRules.push({ columnIndex: idx, rule: 'titlecase' });
        }
      });
      setNormRules(initialRules);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to parse CSV file.',
      );
    }
  }, []);

  // Load List B
  const handleFileB = useCallback(async (fileList: FileList | File[]) => {
    setErrorMessage(null);
    const file = fileList[0];
    if (!file) return;

    try {
      const text = await file.text();
      const delimiter = detectDelimiter(text);
      const rows = parseCsv(text, delimiter);
      const table = extractListTable(rows);

      if (table.headers.length === 0 && table.rows.length === 0) {
        throw new Error('Second list is empty or could not be parsed.');
      }

      setFilenameB(file.name);
      setTableB(table);
      setCompareColB(0);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to parse second CSV file.',
      );
    }
  }, []);

  // Computed results based on active mode
  const dedupResult = useMemo(() => {
    if (!tableA) return null;
    return deduplicateList(tableA, {
      keyColumnIndex: dedupColIdx,
      caseSensitive: dedupCaseSensitive,
      keep: dedupKeep,
    });
  }, [tableA, dedupColIdx, dedupCaseSensitive, dedupKeep]);

  const mergeResult = useMemo(() => {
    if (!tableA || !tableB) return null;
    return mergeLists(tableA, tableB, { mode: mergeMode });
  }, [tableA, tableB, mergeMode]);

  const splitByCountResult = useMemo(() => {
    if (!tableA || splitType !== 'rows') return null;
    const base = filenameA.replace(/\.[^/.]+$/, '');
    return splitByRowCount(tableA, splitRowCount, base);
  }, [tableA, splitType, filenameA, splitRowCount]);

  const splitByColResult = useMemo(() => {
    if (!tableA || splitType !== 'column') return null;
    const base = filenameA.replace(/\.[^/.]+$/, '');
    return splitByColumnValue(tableA, splitColIdx, base);
  }, [tableA, splitType, filenameA, splitColIdx]);

  const compareResult = useMemo(() => {
    if (!tableA || !tableB) return null;
    return compareLists(tableA, tableB, {
      keyColumnA: compareColA,
      keyColumnB: compareColB,
      caseSensitive: compareCaseSensitive,
    });
  }, [tableA, tableB, compareColA, compareColB, compareCaseSensitive]);

  const normResult = useMemo(() => {
    if (!tableA) return null;
    return normalizeList(tableA, { rules: normRules });
  }, [tableA, normRules]);

  // Current active output table for preview & download
  const currentOutputTable = useMemo((): ListTable | null => {
    switch (activeMode) {
      case 'dedup':
        return dedupResult ? dedupResult.table : null;
      case 'merge':
        return mergeResult ? mergeResult.table : null;
      case 'split':
        return (
          splitByCountResult?.chunks[0]?.table ??
          splitByColResult?.groups[0]?.table ??
          null
        );
      case 'compare':
        if (!compareResult) return null;
        if (compareViewTab === 'inBoth') return compareResult.inBoth;
        if (compareViewTab === 'onlyA') return compareResult.onlyInA;
        return compareResult.onlyInB;
      case 'normalize':
        return normResult ? normResult.table : null;
    }
  }, [
    activeMode,
    dedupResult,
    mergeResult,
    splitByCountResult,
    splitByColResult,
    compareResult,
    compareViewTab,
    normResult,
  ]);

  // Helper to trigger single table download
  const handleDownloadTable = useCallback(
    (
      table: ListTable,
      filename: string,
      opName: string,
      metrics: Array<{ label: string; value: string }>,
    ) => {
      const csv = serializeListTable(table);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(url);

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.setAttribute('data-receipt-download', 'true');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      announceCompletion({
        operation: opName,
        durationMs: 35,
        summary: `Processed ${table.rows.length} rows into ${filename}.`,
        metrics: metrics,
      });
    },
    [downloadUrl],
  );

  const handleCopyPreview = useCallback(async () => {
    if (!currentOutputTable) return;
    const csv = serializeListTable(currentOutputTable);
    try {
      await navigator.clipboard.writeText(csv);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      setErrorMessage('Failed to copy CSV to clipboard.');
    }
  }, [currentOutputTable]);

  const resetAll = useCallback(() => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setTableA(null);
    setTableB(null);
    setFilenameA('');
    setFilenameB('');
    setDownloadUrl(null);
    setErrorMessage(null);
    if (fileInputA.current) fileInputA.current.value = '';
    if (fileInputB.current) fileInputB.current.value = '';
  }, [downloadUrl]);

  return (
    <AppShell currentToolId="list-hygiene" currentGroupId="text-data">
      <section id="tool" tabIndex={-1} className="w-full focus:outline-none">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Customer List Hygiene & Deduplicator
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              De-duplicate by key column, merge subscriber databases, split
              large recipient lists, compare segments, and clean PII records.
              Runs 100% locally in your browser memory.
            </p>
          </div>

          {/* Prominent Privacy Guarantee Banner */}
          <div className="flex items-start gap-3 rounded-xl border border-border bg-card/60 p-4 text-xs text-muted-foreground sm:text-sm">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-foreground" />
            <div>
              <div className="font-semibold text-foreground">
                Sensitive Data Privacy Guarantee
              </div>
              <p className="mt-0.5 leading-relaxed">{LIST_PRIVACY_NOTICE}</p>
            </div>
          </div>

          {/* Hidden File Inputs */}
          <input
            ref={fileInputA}
            type="file"
            id="csv-file-input-a"
            aria-label="Upload primary CSV list"
            accept=".csv,.txt,text/csv,text/plain"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) void handleFileA(e.target.files);
            }}
          />
          <input
            ref={fileInputB}
            type="file"
            id="csv-file-input-b"
            aria-label="Upload secondary CSV list"
            accept=".csv,.txt,text/csv,text/plain"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) void handleFileB(e.target.files);
            }}
          />

          {/* Primary File Dropzone when no list loaded */}
          {!tableA && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer.files)
                  void handleFileA(e.dataTransfer.files);
              }}
              className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card/50 p-8 text-center transition-colors hover:border-foreground/30 sm:p-12"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-foreground">
                <UploadCloud className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-foreground sm:text-lg">
                Drop a CSV contact list here, or browse
              </h2>
              <p className="mt-1.5 max-w-md text-xs text-muted-foreground sm:text-sm">
                Handles standard RFC 4180 CSVs, Excel UTF-8 BOM, multiline
                fields, commas in quotes, and European semicolon files.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputA.current?.click()}
                >
                  <FilePlus2 className="mr-2 h-4 w-4" />
                  Select CSV File
                </Button>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
            >
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Main Work Area */}
          {tableA && (
            <div className="space-y-6">
              {/* Top Toolbar & Summary Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-foreground">
                    <TableProperties className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground sm:text-base">
                      {filenameA}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {tableA.rows.length.toLocaleString()} records •{' '}
                      {tableA.headers.length} columns
                    </div>
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
                    Load Different File
                  </Button>
                </div>
              </div>

              {/* Mode Selection Tabs */}
              <div className="flex flex-wrap gap-2 border-b border-border pb-3">
                <button
                  type="button"
                  onClick={() => setActiveMode('dedup')}
                  className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors sm:text-sm ${
                    activeMode === 'dedup'
                      ? 'bg-foreground text-background font-semibold shadow-sm'
                      : 'border border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <FileCheck2 className="h-4 w-4" />
                  De-duplicate
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMode('merge')}
                  className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors sm:text-sm ${
                    activeMode === 'merge'
                      ? 'bg-foreground text-background font-semibold shadow-sm'
                      : 'border border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Layers className="h-4 w-4" />
                  Merge Two Lists
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMode('split')}
                  className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors sm:text-sm ${
                    activeMode === 'split'
                      ? 'bg-foreground text-background font-semibold shadow-sm'
                      : 'border border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Split className="h-4 w-4" />
                  Split List
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMode('compare')}
                  className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors sm:text-sm ${
                    activeMode === 'compare'
                      ? 'bg-foreground text-background font-semibold shadow-sm'
                      : 'border border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <GitCompare className="h-4 w-4" />
                  Compare Lists
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMode('normalize')}
                  className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors sm:text-sm ${
                    activeMode === 'normalize'
                      ? 'bg-foreground text-background font-semibold shadow-sm'
                      : 'border border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  Normalise & Clean
                </button>
              </div>

              {/* Mode Controls Panel */}
              <div className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-5">
                {/* 1. Deduplication Controls */}
                {activeMode === 'dedup' && dedupResult && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <label
                          htmlFor={dedupColSelectId}
                          className="block text-xs font-medium text-muted-foreground mb-1.5"
                        >
                          Key Column for Deduplication
                        </label>
                        <select
                          id={dedupColSelectId}
                          value={dedupColIdx}
                          onChange={(e) =>
                            setDedupColIdx(Number(e.target.value))
                          }
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                        >
                          {tableA.headers.map((h, i) => (
                            <option key={i} value={i}>
                              {h || `Column ${i + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor={dedupKeepSelectId}
                          className="block text-xs font-medium text-muted-foreground mb-1.5"
                        >
                          Keep Record Occurrence
                        </label>
                        <select
                          id={dedupKeepSelectId}
                          value={dedupKeep}
                          onChange={(e) =>
                            setDedupKeep(e.target.value as 'first' | 'last')
                          }
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                        >
                          <option value="first">Keep First Occurrence</option>
                          <option value="last">Keep Last Occurrence</option>
                        </select>
                      </div>

                      <div className="flex items-end pb-2">
                        <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={dedupCaseSensitive}
                            onChange={(e) =>
                              setDedupCaseSensitive(e.target.checked)
                            }
                            className="h-4 w-4 rounded border-border"
                          />
                          <span>Case-sensitive matching</span>
                        </label>
                      </div>
                    </div>

                    {/* Dedup Metrics Summary */}
                    <div className="grid grid-cols-3 gap-3 rounded-lg border border-border bg-muted/40 p-3 text-center sm:p-4">
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Original Records
                        </div>
                        <div className="text-base font-semibold text-foreground">
                          {dedupResult.originalCount.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Duplicates Removed
                        </div>
                        <div className="text-base font-semibold text-foreground">
                          {dedupResult.duplicatesRemoved.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Clean Unique Records
                        </div>
                        <div className="text-base font-semibold text-foreground">
                          {dedupResult.uniqueCount.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button
                        type="button"
                        onClick={() =>
                          handleDownloadTable(
                            dedupResult.table,
                            `dedup_${filenameA}`,
                            'List Deduplication',
                            [
                              {
                                label: 'Original',
                                value: String(dedupResult.originalCount),
                              },
                              {
                                label: 'Duplicates Removed',
                                value: String(dedupResult.duplicatesRemoved),
                              },
                              {
                                label: 'Clean Records',
                                value: String(dedupResult.uniqueCount),
                              },
                            ],
                          )
                        }
                      >
                        <FileDown className="mr-2 h-4 w-4" />
                        Download De-duplicated CSV
                      </Button>
                    </div>
                  </div>
                )}

                {/* 2. Merge Controls */}
                {activeMode === 'merge' && (
                  <div className="space-y-4">
                    {!tableB ? (
                      <div className="rounded-lg border border-dashed border-border p-6 text-center">
                        <p className="text-xs text-muted-foreground sm:text-sm">
                          Select a secondary CSV file to merge with{' '}
                          <span className="font-semibold text-foreground">
                            {filenameA}
                          </span>
                          .
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-3"
                          onClick={() => fileInputB.current?.click()}
                        >
                          <FilePlus2 className="mr-2 h-4 w-4" />
                          Choose Second CSV List
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                          <div>
                            <span className="text-xs text-muted-foreground">
                              Merging with:{' '}
                            </span>
                            <span className="text-sm font-semibold text-foreground">
                              {filenameB}
                            </span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({tableB.rows.length} rows,{' '}
                              {tableB.headers.length} cols)
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setTableB(null);
                              setFilenameB('');
                            }}
                          >
                            Change
                          </Button>
                        </div>

                        <div className="flex flex-wrap gap-4">
                          <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                            <input
                              type="radio"
                              name="mergeMode"
                              checked={mergeMode === 'union_columns'}
                              onChange={() => setMergeMode('union_columns')}
                              className="h-4 w-4"
                            />
                            <span>
                              Union Columns (include all columns from both
                              lists)
                            </span>
                          </label>
                          <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                            <input
                              type="radio"
                              name="mergeMode"
                              checked={mergeMode === 'match_headers'}
                              onChange={() => setMergeMode('match_headers')}
                              className="h-4 w-4"
                            />
                            <span>
                              Match Primary Headers (discard unmapped columns in
                              second list)
                            </span>
                          </label>
                        </div>

                        {mergeResult && (
                          <>
                            <div className="grid grid-cols-3 gap-3 rounded-lg border border-border bg-muted/40 p-3 text-center sm:p-4">
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  List A Rows
                                </div>
                                <div className="text-base font-semibold text-foreground">
                                  {mergeResult.totalRowsA.toLocaleString()}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  List B Rows
                                </div>
                                <div className="text-base font-semibold text-foreground">
                                  {mergeResult.totalRowsB.toLocaleString()}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  Combined Rows
                                </div>
                                <div className="text-base font-semibold text-foreground">
                                  {mergeResult.combinedRows.toLocaleString()}
                                </div>
                              </div>
                            </div>

                            <div className="pt-2">
                              <Button
                                type="button"
                                onClick={() =>
                                  handleDownloadTable(
                                    mergeResult.table,
                                    `merged_${filenameA}`,
                                    'List Merge',
                                    [
                                      {
                                        label: 'List A Rows',
                                        value: String(mergeResult.totalRowsA),
                                      },
                                      {
                                        label: 'List B Rows',
                                        value: String(mergeResult.totalRowsB),
                                      },
                                      {
                                        label: 'Combined Rows',
                                        value: String(mergeResult.combinedRows),
                                      },
                                    ],
                                  )
                                }
                              >
                                <FileDown className="mr-2 h-4 w-4" />
                                Download Merged CSV
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Split Controls */}
                {activeMode === 'split' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                        <input
                          type="radio"
                          name="splitType"
                          checked={splitType === 'rows'}
                          onChange={() => setSplitType('rows')}
                          className="h-4 w-4"
                        />
                        <span>
                          Split by Row Count (e.g. 1,000 rows per chunk)
                        </span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                        <input
                          type="radio"
                          name="splitType"
                          checked={splitType === 'column'}
                          onChange={() => setSplitType('column')}
                          className="h-4 w-4"
                        />
                        <span>
                          Split by Column Value (e.g. by Country, Plan, or
                          Status)
                        </span>
                      </label>
                    </div>

                    {splitType === 'rows' ? (
                      <div className="max-w-xs space-y-1.5">
                        <label
                          htmlFor={splitRowsInputId}
                          className="block text-xs font-medium text-muted-foreground"
                        >
                          Max Rows per File
                        </label>
                        <input
                          id={splitRowsInputId}
                          type="number"
                          min="1"
                          max="100000"
                          value={splitRowCount}
                          onChange={(e) =>
                            setSplitRowCount(
                              Math.max(1, Number(e.target.value)),
                            )
                          }
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                        />
                        {splitByCountResult && (
                          <p className="text-xs text-muted-foreground">
                            Will produce {splitByCountResult.chunks.length}{' '}
                            parts.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="max-w-xs space-y-1.5">
                        <label
                          htmlFor={splitColSelectId}
                          className="block text-xs font-medium text-muted-foreground"
                        >
                          Column to Group by
                        </label>
                        <select
                          id={splitColSelectId}
                          value={splitColIdx}
                          onChange={(e) =>
                            setSplitColIdx(Number(e.target.value))
                          }
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                        >
                          {tableA.headers.map((h, i) => (
                            <option key={i} value={i}>
                              {h || `Column ${i + 1}`}
                            </option>
                          ))}
                        </select>
                        {splitByColResult && (
                          <p className="text-xs text-muted-foreground">
                            Found {splitByColResult.groups.length} distinct
                            groups.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Download Split Chunks Grid */}
                    <div className="space-y-2 pt-2 border-t border-border">
                      <div className="text-xs font-semibold text-foreground">
                        Generated Parts:
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {splitType === 'rows' &&
                          splitByCountResult?.chunks.map((chunk) => (
                            <div
                              key={chunk.partNumber}
                              className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs"
                            >
                              <div>
                                <span className="font-semibold text-foreground">
                                  {chunk.filename}
                                </span>
                                <span className="ml-2 text-muted-foreground">
                                  ({chunk.rowCount} rows)
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleDownloadTable(
                                    chunk.table,
                                    chunk.filename,
                                    'List Split',
                                    [
                                      {
                                        label: 'Part',
                                        value: String(chunk.partNumber),
                                      },
                                      {
                                        label: 'Rows',
                                        value: String(chunk.rowCount),
                                      },
                                    ],
                                  )
                                }
                              >
                                <ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" />
                                Download
                              </Button>
                            </div>
                          ))}

                        {splitType === 'column' &&
                          splitByColResult?.groups.map((group) => (
                            <div
                              key={group.groupValue}
                              className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs"
                            >
                              <div>
                                <span className="font-semibold text-foreground">
                                  {group.groupValue}
                                </span>
                                <span className="ml-2 text-muted-foreground">
                                  ({group.rowCount} rows)
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleDownloadTable(
                                    group.table,
                                    group.filename,
                                    'List Group Split',
                                    [
                                      {
                                        label: 'Group',
                                        value: group.groupValue,
                                      },
                                      {
                                        label: 'Rows',
                                        value: String(group.rowCount),
                                      },
                                    ],
                                  )
                                }
                              >
                                <ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" />
                                Download
                              </Button>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Compare Controls */}
                {activeMode === 'compare' && (
                  <div className="space-y-4">
                    {!tableB ? (
                      <div className="rounded-lg border border-dashed border-border p-6 text-center">
                        <p className="text-xs text-muted-foreground sm:text-sm">
                          Select a secondary CSV file to compare against{' '}
                          <span className="font-semibold text-foreground">
                            {filenameA}
                          </span>
                          .
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-3"
                          onClick={() => fileInputB.current?.click()}
                        >
                          <FilePlus2 className="mr-2 h-4 w-4" />
                          Choose Second CSV List
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label
                              htmlFor={compareColASelectId}
                              className="block text-xs font-medium text-muted-foreground mb-1.5"
                            >
                              Match Column in List A ({filenameA})
                            </label>
                            <select
                              id={compareColASelectId}
                              value={compareColA}
                              onChange={(e) =>
                                setCompareColA(Number(e.target.value))
                              }
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                            >
                              {tableA.headers.map((h, i) => (
                                <option key={i} value={i}>
                                  {h || `Column ${i + 1}`}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label
                              htmlFor={compareColBSelectId}
                              className="block text-xs font-medium text-muted-foreground mb-1.5"
                            >
                              Match Column in List B ({filenameB})
                            </label>
                            <select
                              id={compareColBSelectId}
                              value={compareColB}
                              onChange={(e) =>
                                setCompareColB(Number(e.target.value))
                              }
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                            >
                              {tableB.headers.map((h, i) => (
                                <option key={i} value={i}>
                                  {h || `Column ${i + 1}`}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                            <input
                              type="checkbox"
                              checked={compareCaseSensitive}
                              onChange={(e) =>
                                setCompareCaseSensitive(e.target.checked)
                              }
                              className="h-4 w-4 rounded border-border"
                            />
                            <span>Case-sensitive key matching</span>
                          </label>
                        </div>

                        {compareResult && (
                          <>
                            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                              <button
                                type="button"
                                onClick={() => setCompareViewTab('inBoth')}
                                className={`rounded-lg border p-3 text-center transition-colors ${
                                  compareViewTab === 'inBoth'
                                    ? 'border-foreground bg-muted font-semibold text-foreground'
                                    : 'border-border bg-card text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                <div className="text-xs">In Both Lists</div>
                                <div className="text-lg font-bold">
                                  {compareResult.countInBoth}
                                </div>
                              </button>

                              <button
                                type="button"
                                onClick={() => setCompareViewTab('onlyA')}
                                className={`rounded-lg border p-3 text-center transition-colors ${
                                  compareViewTab === 'onlyA'
                                    ? 'border-foreground bg-muted font-semibold text-foreground'
                                    : 'border-border bg-card text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                <div className="text-xs">
                                  Only in {filenameA}
                                </div>
                                <div className="text-lg font-bold">
                                  {compareResult.countOnlyInA}
                                </div>
                              </button>

                              <button
                                type="button"
                                onClick={() => setCompareViewTab('onlyB')}
                                className={`rounded-lg border p-3 text-center transition-colors ${
                                  compareViewTab === 'onlyB'
                                    ? 'border-foreground bg-muted font-semibold text-foreground'
                                    : 'border-border bg-card text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                <div className="text-xs">
                                  Only in {filenameB}
                                </div>
                                <div className="text-lg font-bold">
                                  {compareResult.countOnlyInB}
                                </div>
                              </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 pt-2">
                              <Button
                                type="button"
                                onClick={() => {
                                  const target =
                                    compareViewTab === 'inBoth'
                                      ? compareResult.inBoth
                                      : compareViewTab === 'onlyA'
                                        ? compareResult.onlyInA
                                        : compareResult.onlyInB;
                                  const label =
                                    compareViewTab === 'inBoth'
                                      ? 'in_both'
                                      : compareViewTab === 'onlyA'
                                        ? 'only_in_A'
                                        : 'only_in_B';
                                  handleDownloadTable(
                                    target,
                                    `compare_${label}_${filenameA}`,
                                    `List Comparison (${label})`,
                                    [
                                      { label: 'Segment', value: label },
                                      {
                                        label: 'Rows',
                                        value: String(target.rows.length),
                                      },
                                    ],
                                  );
                                }}
                              >
                                <FileDown className="mr-2 h-4 w-4" />
                                Download{' '}
                                {compareViewTab === 'inBoth'
                                  ? 'In Both'
                                  : compareViewTab === 'onlyA'
                                    ? 'Only in A'
                                    : 'Only in B'}{' '}
                                Segment
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 5. Normalization Controls */}
                {activeMode === 'normalize' && (
                  <div className="space-y-4">
                    <div className="text-xs text-muted-foreground">
                      Assign standardization rules per column (e.g. lowercase
                      emails, titlecase names, strip non-digits from phones):
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {tableA.headers.map((header, colIdx) => {
                        const activeRule =
                          normRules.find((r) => r.columnIndex === colIdx)
                            ?.rule ?? 'none';
                        return (
                          <div
                            key={colIdx}
                            className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5"
                          >
                            <div
                              className="text-xs font-semibold text-foreground truncate"
                              title={header}
                            >
                              {header || `Column ${colIdx + 1}`}
                            </div>
                            <select
                              aria-label={`Normalization rule for ${header || `Column ${colIdx + 1}`}`}
                              value={activeRule}
                              onChange={(e) => {
                                const rule = e.target.value;
                                setNormRules((prev) => {
                                  const filtered = prev.filter(
                                    (r) => r.columnIndex !== colIdx,
                                  );
                                  if (rule === 'none') return filtered;
                                  return [
                                    ...filtered,
                                    {
                                      columnIndex: colIdx,
                                      rule: rule as NormalizeColumnRule,
                                    },
                                  ];
                                });
                              }}
                              className="w-full rounded border border-border bg-background px-2.5 py-1 text-xs text-foreground"
                            >
                              <option value="none">No transformation</option>
                              <option value="trim">Trim whitespace</option>
                              <option value="titlecase">
                                Title Case (Names)
                              </option>
                              <option value="email">
                                Clean Email (lowercase, strip space)
                              </option>
                              <option value="phone_digits">
                                Standardize Phone (digits only)
                              </option>
                              <option value="lowercase">Lowercase all</option>
                              <option value="uppercase">UPPERCASE all</option>
                            </select>
                          </div>
                        );
                      })}
                    </div>

                    {normResult && (
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
                        <div className="text-xs text-muted-foreground">
                          {normResult.cellsModified} cell(s) modified across{' '}
                          {tableA.rows.length} records.
                        </div>
                        <Button
                          type="button"
                          onClick={() =>
                            handleDownloadTable(
                              normResult.table,
                              `normalized_${filenameA}`,
                              'List Normalization',
                              [
                                {
                                  label: 'Rows',
                                  value: String(normResult.table.rows.length),
                                },
                                {
                                  label: 'Cells Modified',
                                  value: String(normResult.cellsModified),
                                },
                              ],
                            )
                          }
                        >
                          <FileDown className="mr-2 h-4 w-4" />
                          Download Normalised CSV
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Table Preview */}
              {currentOutputTable && (
                <div className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-foreground">
                      Data Preview (
                      {currentOutputTable.rows.length.toLocaleString()} rows)
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyPreview}
                    >
                      {isCopied ? (
                        <Check className="mr-1.5 h-3.5 w-3.5" />
                      ) : (
                        <Copy className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      {isCopied ? 'Copied' : 'Copy CSV'}
                    </Button>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-border bg-muted/60 text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 font-mono text-[10px] uppercase">
                            #
                          </th>
                          {currentOutputTable.headers.map((h, i) => (
                            <th key={i} className="px-3 py-2 font-medium">
                              {h || `Col ${i + 1}`}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {currentOutputTable.rows
                          .slice(0, 10)
                          .map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-muted/30">
                              <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
                                {rIdx + 1}
                              </td>
                              {currentOutputTable.headers.map((_, cIdx) => (
                                <td
                                  key={cIdx}
                                  className="px-3 py-2 text-foreground truncate max-w-[200px]"
                                >
                                  {row[cIdx] ?? ''}
                                </td>
                              ))}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {currentOutputTable.rows.length > 10 && (
                    <p className="text-[11px] text-muted-foreground text-center">
                      Showing first 10 rows of{' '}
                      {currentOutputTable.rows.length.toLocaleString()} records.
                      Full dataset included in download.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
