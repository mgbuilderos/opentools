'use client';

import {
  AlertCircle,
  ArrowDownToLine,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  LockKeyhole,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useId, useMemo, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import { RelatedTools } from '@/components/related-tools';
import type { RelatedTool } from '@/lib/seo/related-tools';
import {
  auditWorkbook,
  generateWorkbookAuditXlsx,
  type FindingSeverity,
  type WorkbookAuditResult,
} from '@/lib/tools/audit/workbook';
import { createAuditFixtureWorkbook } from '@/lib/tools/audit/workbook/fixture';

interface WorkbookAuditToolProps {
  relatedTools?: readonly RelatedTool[];
}

export function WorkbookAuditTool({
  relatedTools = [],
}: WorkbookAuditToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WorkbookAuditResult | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<
    'all' | 'structural' | 'statistical'
  >('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | FindingSeverity>(
    'all',
  );
  const [sheetFilter, setSheetFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fileInputId = useId();

  async function handleFile(selectedFile: File) {
    if (!selectedFile.name.toLowerCase().endsWith('.xlsx')) {
      setError('Please upload a Microsoft Excel .xlsx workbook.');
      return;
    }

    setLoading(true);
    setError(null);
    setFile(selectedFile);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const auditResult = await auditWorkbook(
        new Uint8Array(buffer),
        selectedFile.name,
      );
      setResult(auditResult);
      announceCompletion({
        operation: 'Workbook Audit',
        durationMs: 150,
        summary: `Identified ${auditResult.summary.totalFindings} checkable findings across ${auditResult.summary.sheetCount} sheets.`,
        metrics: [
          {
            label: 'Total findings',
            value: String(auditResult.summary.totalFindings),
          },
          {
            label: 'Cells audited',
            value: String(auditResult.summary.totalCellsAudited),
          },
        ],
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to parse and audit workbook.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadSample() {
    setLoading(true);
    setError(null);
    try {
      const sampleBytes = await createAuditFixtureWorkbook();
      const auditResult = await auditWorkbook(
        sampleBytes,
        'audit-inspection-sample.xlsx',
      );
      setFile(
        new File(
          [sampleBytes as unknown as BlobPart],
          'audit-inspection-sample.xlsx',
          {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
        ),
      );
      setResult(auditResult);
      announceCompletion({
        operation: 'Workbook Audit',
        durationMs: 150,
        summary: `Analyzed inspection sample: ${auditResult.summary.totalFindings} findings identified.`,
        metrics: [
          {
            label: 'Total findings',
            value: String(auditResult.summary.totalFindings),
          },
          {
            label: 'Cells audited',
            value: String(auditResult.summary.totalCellsAudited),
          },
        ],
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load sample workbook.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadReport() {
    if (!result) return;
    try {
      const xlsxBytes = await generateWorkbookAuditXlsx(result);
      const blob = new Blob([xlsxBytes as unknown as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${result.summary.fileName.replace(/\.xlsx$/iu, '')}-Audit-Report.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to generate audit report.',
      );
    }
  }

  function handleExportCsv() {
    if (!result) return;
    const headers = [
      'ID',
      'Category',
      'Sheet',
      'Location',
      'Severity',
      'Finding Class',
      'Title',
      'Description',
      'Remedy',
    ];
    const rows = result.findings.map((f) => [
      f.id,
      f.category,
      f.sheet ?? '',
      f.cell ?? f.range ?? '',
      f.severity,
      f.findingClass,
      `"${f.title.replace(/"/gu, '""')}"`,
      `"${f.message.replace(/"/gu, '""')}"`,
      `"${(f.remedy ?? '').replace(/"/gu, '""')}"`,
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.join(',')),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.summary.fileName.replace(/\.xlsx$/iu, '')}-findings.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const filteredFindings = useMemo(() => {
    if (!result) return [];
    return result.findings.filter((f) => {
      if (categoryFilter !== 'all' && f.category !== categoryFilter)
        return false;
      if (severityFilter !== 'all' && f.severity !== severityFilter)
        return false;
      if (sheetFilter !== 'all' && f.sheet !== sheetFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesClass = f.findingClass.toLowerCase().includes(query);
        const matchesTitle = f.title.toLowerCase().includes(query);
        const matchesMessage = f.message.toLowerCase().includes(query);
        const matchesCell = f.cell?.toLowerCase().includes(query);
        const matchesSheet = f.sheet?.toLowerCase().includes(query);
        if (
          !matchesClass &&
          !matchesTitle &&
          !matchesMessage &&
          !matchesCell &&
          !matchesSheet
        ) {
          return false;
        }
      }
      return true;
    });
  }, [result, categoryFilter, severityFilter, sheetFilter, searchQuery]);

  return (
    <AppShell currentToolId="data-workbook-audit" currentGroupId="spreadsheets">
      <section
        id="tool"
        tabIndex={-1}
        className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-12"
      >
        <div className="mx-auto max-w-6xl space-y-8">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
              Spreadsheet & Data Inspection
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Excel Workbook Audit & Formula Inspector
            </h1>
            <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">
              Deep forensic audit of Microsoft Excel workbooks. Detects
              hardcoded constants in formulas, broken formula runs, error cells,
              circular references, hidden sheets, mixed column types, and
              statistical anomalies with zero server uploads.
            </p>
          </div>
          {/* Upload & Guarantee Header */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
              <div>
                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-foreground" />
                  Select Workbook to Inspect
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload any{' '}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    .xlsx
                  </code>{' '}
                  file. Analysis runs entirely inside your browser tab.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full border border-border">
                <LockKeyhole className="w-3.5 h-3.5" />
                100% Client-Side Inspection · Zero Server Transmission
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-center gap-4">
              <label
                htmlFor={fileInputId}
                className="flex-1 w-full flex items-center justify-center gap-3 px-6 py-4 border-2 border-dashed border-border hover:border-foreground rounded-lg cursor-pointer bg-muted/30 transition-colors"
              >
                <FileSpreadsheet className="w-6 h-6 text-zinc-400" />
                <div className="text-left">
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 block">
                    {file ? file.name : 'Choose an Excel workbook (.xlsx)'}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 block mt-0.5">
                    Click to browse or drop file here
                  </span>
                </div>
                <input
                  id={fileInputId}
                  type="file"
                  accept=".xlsx"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFile(f);
                  }}
                />
              </label>

              <span className="text-xs text-zinc-400 font-medium">OR</span>

              <Button
                type="button"
                variant="outline"
                onClick={handleLoadSample}
                disabled={loading}
                className="w-full sm:w-auto flex items-center gap-2 h-14 px-6 border-border hover:bg-muted"
              >
                <Sparkles className="w-4 h-4 text-foreground" />
                Load Sample Inspection Workbook
              </Button>
            </div>

            {error && (
              <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/35 text-sm text-destructive flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Inspection Error</p>
                  <p className="mt-0.5">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Audit Results View */}
          {result && (
            <div className="space-y-6">
              {/* Metric Tiles (NO arbitrary quality score!) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                  <span className="text-xs font-medium text-muted-foreground block">
                    Total Findings
                  </span>
                  <span className="text-2xl font-bold text-foreground mt-1 block">
                    {result.summary.totalFindings}
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">
                    Fact-based findings
                  </span>
                </div>

                <div className="bg-destructive/5 p-4 rounded-xl border border-destructive/35 shadow-sm">
                  <span className="text-xs font-semibold text-destructive block">
                    Critical
                  </span>
                  <span className="text-2xl font-bold text-destructive mt-1 block">
                    {result.summary.criticalCount}
                  </span>
                  <span className="text-[11px] text-destructive/80 mt-0.5 block">
                    Errors, breaks, cycles
                  </span>
                </div>

                <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                  <span className="text-xs font-medium text-foreground block">
                    Warnings
                  </span>
                  <span className="text-2xl font-bold text-foreground mt-1 block">
                    {result.summary.warningCount}
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">
                    Constants, gaps, outliers
                  </span>
                </div>

                <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                  <span className="text-xs font-medium text-muted-foreground block">
                    Info
                  </span>
                  <span className="text-2xl font-bold text-foreground mt-1 block">
                    {result.summary.infoCount}
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">
                    Hidden items, rounds
                  </span>
                </div>

                <div className="bg-white dark:bg-zinc-900/80 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block">
                    Formulas
                  </span>
                  <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1 block">
                    {result.summary.formulaCount}
                  </span>
                  <span className="text-[11px] text-zinc-400 mt-0.5 block">
                    Formula cells verified
                  </span>
                </div>

                <div className="bg-white dark:bg-zinc-900/80 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block">
                    Sheets
                  </span>
                  <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1 block">
                    {result.summary.sheetCount}
                  </span>
                  <span className="text-[11px] text-zinc-400 mt-0.5 block">
                    Audited worksheets
                  </span>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">
                  Audited:{' '}
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {result.summary.fileName}
                  </span>
                  <span className="text-zinc-400 dark:text-zinc-500 ml-2">
                    ({result.summary.totalCellsAudited.toLocaleString()} cells)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleDownloadReport}
                    data-receipt-download
                    className="font-medium flex items-center gap-2 text-xs h-9 px-4"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Audit Report (.xlsx)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExportCsv}
                    data-receipt-download
                    className="text-xs h-9 px-3 flex items-center gap-1.5"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    Export CSV
                  </Button>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {(['all', 'structural', 'statistical'] as const).map(
                    (cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${
                          categoryFilter === cat
                            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                            : 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {cat}{' '}
                        {cat !== 'all' && `(${result.summary.byCategory[cat]})`}
                      </button>
                    ),
                  )}
                </div>

                {/* Severity & Sheet Selector */}
                <div className="flex items-center gap-2">
                  <select
                    value={severityFilter}
                    onChange={(e) =>
                      setSeverityFilter(
                        e.target.value as 'all' | FindingSeverity,
                      )
                    }
                    className="text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-zinc-700 dark:text-zinc-300"
                  >
                    <option value="all">All Severities</option>
                    <option value="critical">
                      Critical ({result.summary.criticalCount})
                    </option>
                    <option value="warning">
                      Warning ({result.summary.warningCount})
                    </option>
                    <option value="info">
                      Info ({result.summary.infoCount})
                    </option>
                  </select>

                  <select
                    value={sheetFilter}
                    onChange={(e) => setSheetFilter(e.target.value)}
                    className="text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-zinc-700 dark:text-zinc-300"
                  >
                    <option value="all">All Sheets</option>
                    {result.summary.auditedSheets.map((s) => (
                      <option key={s} value={s}>
                        Sheet: {s}
                      </option>
                    ))}
                  </select>

                  {/* Search */}
                  <div className="relative min-w-[160px]">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search findings..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="text-xs pl-8 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-lg w-full text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>

              {/* Findings List */}
              <div className="space-y-3">
                {filteredFindings.length === 0 ? (
                  <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <CheckCircle2 className="w-8 h-8 text-foreground mx-auto" />
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mt-2">
                      No findings matching the selected filters.
                    </p>
                  </div>
                ) : (
                  filteredFindings.map((finding) => (
                    <div
                      key={finding.id}
                      className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800/80 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-800/50">
                        <div className="flex items-center gap-2">
                          {/* Severity Badge */}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                              finding.severity === 'critical'
                                ? 'bg-destructive/15 text-destructive border border-destructive/30'
                                : finding.severity === 'warning'
                                  ? 'bg-muted text-foreground border border-border'
                                  : 'bg-secondary text-secondary-foreground border border-border'
                            }`}
                          >
                            {finding.severity}
                          </span>

                          {/* Location */}
                          <span className="text-xs font-mono font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-2 py-0.5 rounded">
                            {finding.sheet ? `${finding.sheet}!` : ''}
                            {finding.cell ?? finding.range ?? 'Sheet-level'}
                          </span>

                          {/* Class */}
                          <span className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">
                            {finding.findingClass.replace(/-/gu, ' ')}
                          </span>
                        </div>

                        <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                          {finding.id}
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {finding.title}
                      </h3>

                      <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed">
                        {finding.message}
                      </p>

                      {finding.remedy && (
                        <div className="mt-2.5 p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 flex items-start gap-2">
                          <ShieldCheck className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                              Recommended Remedy:{' '}
                            </span>
                            {finding.remedy}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Related Tools */}
          {relatedTools.length > 0 && <RelatedTools tools={relatedTools} />}
        </div>
      </section>
    </AppShell>
  );
}
