'use client';

import {
  AlertCircle,
  ArrowLeftRight,
  ArrowRight,
  CheckCircle2,
  FileCode,
  FileDown,
  FileSpreadsheet,
  FileText,
  LockKeyhole,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import { AppShell } from '@/components/app-shell';
import { RelatedTools } from '@/components/related-tools';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import type { RelatedTool } from '@/lib/seo/related-tools';
import {
  comparePdfs,
  generateAnnotatedPdf,
  generateChangeListCsv,
  generateRedlineDocx,
  type PdfDiffChange,
  type PdfDiffResult,
} from '@/lib/tools/diff/pdf';
import { createSampleContracts } from '@/lib/tools/diff/pdf/sample';
import { NoTextLayerError } from '@/lib/tools/diff/pdf/types';

interface PdfCompareToolProps {
  relatedTools?: readonly RelatedTool[];
}

export function PdfCompareTool({ relatedTools = [] }: PdfCompareToolProps) {
  const [fileA, setFileA] = useState<{
    name: string;
    bytes: Uint8Array;
  } | null>(null);
  const [fileB, setFileB] = useState<{
    name: string;
    bytes: Uint8Array;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedDocName, setScannedDocName] = useState<string | null>(null);
  const [result, setResult] = useState<PdfDiffResult | null>(null);

  // Viewer state
  const [pageA, setPageA] = useState(1);
  const [pageB, setPageB] = useState(1);
  const [selectedChangeId, setSelectedChangeId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<
    'all' | 'insert' | 'delete' | 'move' | 'format'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');

  const searchInputId = useId();

  // Handle sample documents
  const handleLoadSample = useCallback(async () => {
    setLoading(true);
    setError(null);
    setScannedDocName(null);
    try {
      const sample = await createSampleContracts();
      setFileA({ name: sample.docAName, bytes: sample.docABytes });
      setFileB({ name: sample.docBName, bytes: sample.docBBytes });

      const diffResult = await comparePdfs(sample.docABytes, sample.docBBytes, {
        docAName: sample.docAName,
        docBName: sample.docBName,
      });

      setResult(diffResult);
      setPageA(1);
      setPageB(1);
      setSelectedChangeId(diffResult.changes[0]?.id ?? null);
      announceCompletion({
        operation: 'Compare PDF Documents',
        durationMs: 150,
        summary: `Comparison complete: ${diffResult.summary.totalChanges} total changes detected between ${sample.docAName} and ${sample.docBName}.`,
        metrics: [
          {
            label: 'Substantive changes',
            value: String(
              diffResult.summary.insertions +
                diffResult.summary.deletions +
                diffResult.summary.moves,
            ),
          },
          {
            label: 'Total changes',
            value: String(diffResult.summary.totalChanges),
          },
        ],
      });
    } catch (err) {
      if (err instanceof NoTextLayerError) {
        setScannedDocName(err.documentName ?? null);
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Run comparison
  const handleRunComparison = useCallback(async () => {
    if (!fileA || !fileB) return;
    setLoading(true);
    setError(null);
    setScannedDocName(null);
    try {
      const diffResult = await comparePdfs(fileA.bytes, fileB.bytes, {
        docAName: fileA.name,
        docBName: fileB.name,
      });
      setResult(diffResult);
      setPageA(1);
      setPageB(1);
      setSelectedChangeId(diffResult.changes[0]?.id ?? null);
      announceCompletion({
        operation: 'Compare PDF Documents',
        durationMs: 150,
        summary: `Comparison complete: ${diffResult.summary.totalChanges} total changes detected between ${fileA.name} and ${fileB.name}.`,
        metrics: [
          {
            label: 'Substantive changes',
            value: String(
              diffResult.summary.insertions +
                diffResult.summary.deletions +
                diffResult.summary.moves,
            ),
          },
          {
            label: 'Total changes',
            value: String(diffResult.summary.totalChanges),
          },
        ],
      });
    } catch (err) {
      if (err instanceof NoTextLayerError) {
        setScannedDocName(err.documentName ?? null);
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setLoading(false);
    }
  }, [fileA, fileB]);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    side: 'A' | 'B',
  ) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const buffer = await f.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      if (side === 'A') {
        setFileA({ name: f.name, bytes });
      } else {
        setFileB({ name: f.name, bytes });
      }
      setResult(null);
      setError(null);
      setScannedDocName(null);
    } catch (err) {
      setError(
        `Failed to read ${f.name}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  // Downloads
  const handleDownloadAnnotatedPdf = async () => {
    if (!result || !fileB) return;
    try {
      const annotatedBytes = await generateAnnotatedPdf(fileB.bytes, result);
      const blob = new Blob([annotatedBytes as unknown as BlobPart], {
        type: 'application/pdf',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileB.name.replace(/\.pdf$/iu, '')}_annotated_changes.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        `Failed to generate annotated PDF: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  const handleDownloadRedlineDocx = async () => {
    if (!result) return;
    try {
      const docxBytes = await generateRedlineDocx(result);
      const blob = new Blob([docxBytes as unknown as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contract_redline_comparison.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        `Failed to generate Redline DOCX: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  const handleDownloadChangeListCsv = () => {
    if (!result) return;
    try {
      const csv = generateChangeListCsv(result);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comparison_change_list.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        `Failed to export CSV: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  // Filtered changes
  const filteredChanges = useMemo(() => {
    if (!result) return [];
    return result.changes.filter((c) => {
      if (typeFilter !== 'all' && c.type !== typeFilter) return false;
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase();
        const textMatch =
          c.originalText?.toLowerCase().includes(query) ||
          c.revisedText?.toLowerCase().includes(query) ||
          c.description.toLowerCase().includes(query);
        if (!textMatch) return false;
      }
      return true;
    });
  }, [result, typeFilter, searchQuery]);

  // Handle selecting a change
  const selectChange = (change: PdfDiffChange) => {
    setSelectedChangeId(change.id);
    if (change.pageA !== undefined) {
      setPageA(change.pageA);
    }
    if (change.pageB !== undefined) {
      setPageB(change.pageB);
    }
  };

  return (
    <AppShell currentToolId="pdf-compare" currentGroupId="pdf">
      <section
        id="tool"
        tabIndex={-1}
        className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
      >
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                <ArrowLeftRight className="h-3.5 w-3.5" />
                Legal &amp; Contract Diff Engine
              </span>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                Compare PDF Documents
              </h1>
              <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">
                Whole-document stream comparison with true reflow resilience.
                Detects insertions, deletions, moved clauses, and formatting
                changes separately without polluting substantive revisions.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadSample}
                disabled={loading}
                className="inline-flex items-center gap-1.5 text-xs"
              >
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                Load Sample Contracts
              </Button>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <LockKeyhole className="h-3.5 w-3.5 text-success" />
            <span>
              <strong>100% Client-Side Privacy:</strong> Document diffing, Word
              redlines, and annotations occur entirely in your browser memory.
              Operations execute entirely in local browser tab memory.
            </span>
          </div>
        </div>

        {/* Upload Section */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Document A */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Original Baseline (Document A)
              </span>
              {fileA && (
                <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs text-foreground">
                  <FileText className="h-3 w-3" />
                  {(fileA.bytes.length / 1024).toFixed(0)} KB
                </span>
              )}
            </div>
            <div className="mt-3">
              <label
                htmlFor="file-a-upload"
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 p-6 text-center transition hover:border-ring dark:bg-muted/30"
              >
                <FileText className="h-8 w-8 text-muted-foreground" />
                <span className="mt-2 text-xs font-medium text-foreground">
                  {fileA ? fileA.name : 'Choose Original PDF'}
                </span>
                <span className="mt-1 text-[11px] text-muted-foreground">
                  Drag and drop or browse from local disk
                </span>
                <input
                  id="file-a-upload"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => handleFileChange(e, 'A')}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          {/* Document B */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Revised / Counterparty (Document B)
              </span>
              {fileB && (
                <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs text-foreground">
                  <FileText className="h-3 w-3" />
                  {(fileB.bytes.length / 1024).toFixed(0)} KB
                </span>
              )}
            </div>
            <div className="mt-3">
              <label
                htmlFor="file-b-upload"
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 p-6 text-center transition hover:border-ring dark:bg-muted/30"
              >
                <FileText className="h-8 w-8 text-muted-foreground" />
                <span className="mt-2 text-xs font-medium text-foreground">
                  {fileB ? fileB.name : 'Choose Revised PDF'}
                </span>
                <span className="mt-1 text-[11px] text-muted-foreground">
                  Drag and drop or browse from local disk
                </span>
                <input
                  id="file-b-upload"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => handleFileChange(e, 'B')}
                  className="sr-only"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Action Button */}
        {fileA && fileB && !result && (
          <div className="mt-6 flex justify-center">
            <Button
              size="lg"
              onClick={handleRunComparison}
              disabled={loading}
              className="inline-flex items-center gap-2 px-8 py-3 text-sm font-semibold"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Comparing text streams &amp; reflow...
                </>
              ) : (
                <>
                  <ArrowLeftRight className="h-4 w-4" />
                  Compare Documents
                </>
              )}
            </Button>
          </div>
        )}

        {/* Refusal / Error Alert */}
        {error && (
          <div className="mt-6 rounded-xl border border-border bg-muted p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-destructive shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-foreground">
                  {scannedDocName
                    ? `Scanned Document Detected: ${scannedDocName}`
                    : 'Comparison Notice'}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">{error}</p>
                {scannedDocName && (
                  <div className="mt-3">
                    <a
                      href="/pdf/ocr"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90"
                    >
                      Open PDF OCR Tool to Recognize Text First
                      <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Diff Results Dashboard */}
        {result && (
          <div className="mt-8 space-y-6">
            {/* Metric Tiles (Strictly zero arbitrary scores) */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Substantive Changes
                </span>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {result.summary.insertions +
                    result.summary.deletions +
                    result.summary.moves}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Excludes formatting shifts
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Insertions
                </span>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {result.summary.insertions}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  New clauses / text
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
                <span className="text-[11px] font-semibold text-destructive uppercase">
                  Deletions
                </span>
                <p className="mt-1 text-2xl font-bold text-destructive">
                  {result.summary.deletions}
                </p>
                <p className="mt-1 text-[11px] text-destructive/70">
                  Removed text
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Moved Clauses
                </span>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {result.summary.moves}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Relocated sections
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Formatting-Only
                </span>
                <p className="mt-1 text-2xl font-bold text-muted-foreground">
                  {result.summary.formatOnly}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Font / style changes
                </p>
              </div>
            </div>

            {/* Downloads Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted px-5 py-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-xs font-medium text-foreground">
                  Comparison ready. Export professional redlines or audit lists:
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  data-receipt-download
                  onClick={handleDownloadAnnotatedPdf}
                  className="inline-flex items-center gap-1.5 text-xs"
                >
                  <FileDown className="h-3.5 w-3.5 text-destructive" />
                  Annotated PDF
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  data-receipt-download
                  onClick={handleDownloadRedlineDocx}
                  className="inline-flex items-center gap-1.5 text-xs"
                >
                  <FileCode className="h-3.5 w-3.5 text-foreground" />
                  Redline (.docx)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  data-receipt-download
                  onClick={handleDownloadChangeListCsv}
                  className="inline-flex items-center gap-1.5 text-xs"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-success" />
                  Change List (.csv)
                </Button>
              </div>
            </div>

            {/* Main Interactive Comparison Workspace */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Visual Side-by-Side Viewers (8 cols) */}
              <div className="space-y-4 lg:col-span-7 xl:col-span-8">
                <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <span className="text-xs font-bold text-foreground uppercase">
                      Visual Document Comparison
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Highlights:{' '}
                      <span className="font-semibold text-foreground">
                        Green (Added)
                      </span>{' '}
                      ·{' '}
                      <span className="font-semibold text-destructive">
                        Red (Deleted)
                      </span>{' '}
                      ·{' '}
                      <span className="font-semibold text-foreground">
                        Orange (Moved)
                      </span>{' '}
                      ·{' '}
                      <span className="font-semibold text-muted-foreground">
                        Indigo (Format)
                      </span>
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* Left Canvas: Document A */}
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">
                          Doc A (Original)
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPageA((p) => Math.max(1, p - 1))}
                            disabled={pageA <= 1}
                            className="rounded border border-border px-2 py-0.5 disabled:opacity-40"
                          >
                            ‹
                          </button>
                          <span>
                            {pageA} / {result.summary.pageCountA}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setPageA((p) =>
                                Math.min(result.summary.pageCountA, p + 1),
                              )
                            }
                            disabled={pageA >= result.summary.pageCountA}
                            className="rounded border border-border px-2 py-0.5 disabled:opacity-40"
                          >
                            ›
                          </button>
                        </div>
                      </div>

                      {fileA && (
                        <DocumentCanvasOverlay
                          bytes={fileA.bytes}
                          pageNumber={pageA}
                          side="A"
                          changes={result.changes}
                          selectedChangeId={selectedChangeId}
                          onSelectChange={selectChange}
                        />
                      )}
                    </div>

                    {/* Right Canvas: Document B */}
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">
                          Doc B (Revised)
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPageB((p) => Math.max(1, p - 1))}
                            disabled={pageB <= 1}
                            className="rounded border border-border px-2 py-0.5 disabled:opacity-40"
                          >
                            ‹
                          </button>
                          <span>
                            {pageB} / {result.summary.pageCountB}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setPageB((p) =>
                                Math.min(result.summary.pageCountB, p + 1),
                              )
                            }
                            disabled={pageB >= result.summary.pageCountB}
                            className="rounded border border-border px-2 py-0.5 disabled:opacity-40"
                          >
                            ›
                          </button>
                        </div>
                      </div>

                      {fileB && (
                        <DocumentCanvasOverlay
                          bytes={fileB.bytes}
                          pageNumber={pageB}
                          side="B"
                          changes={result.changes}
                          selectedChangeId={selectedChangeId}
                          onSelectChange={selectChange}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Change List & Inspector (5 cols) */}
              <div className="space-y-4 lg:col-span-5 xl:col-span-4">
                <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold text-foreground uppercase">
                      Change Inspector ({filteredChanges.length})
                    </h2>
                  </div>

                  {/* Filter Tabs */}
                  <div className="mt-3 flex flex-wrap gap-1 border-b border-border pb-2.5">
                    {(
                      ['all', 'insert', 'delete', 'move', 'format'] as const
                    ).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTypeFilter(t)}
                        className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${
                          typeFilter === t
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {t === 'all'
                          ? 'All'
                          : t === 'insert'
                            ? 'Inserts'
                            : t === 'delete'
                              ? 'Deletes'
                              : t === 'move'
                                ? 'Moves'
                                : 'Formatting'}
                      </button>
                    ))}
                  </div>

                  {/* Search */}
                  <div className="mt-3 relative">
                    <label htmlFor={searchInputId} className="sr-only">
                      Search changes
                    </label>
                    <Search className="pointer-events-none absolute top-2.5 left-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      id={searchInputId}
                      type="search"
                      placeholder="Search text in changes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-border bg-muted py-1.5 pr-3 pl-8 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-hidden"
                    />
                  </div>

                  {/* Changes Scroll List */}
                  <div className="mt-3 max-h-[520px] space-y-2.5 overflow-y-auto pr-1">
                    {filteredChanges.length === 0 ? (
                      <div className="py-8 text-center text-xs text-muted-foreground">
                        No changes match the selected filter.
                      </div>
                    ) : (
                      filteredChanges.map((change) => {
                        const isSelected = change.id === selectedChangeId;
                        return (
                          <button
                            key={change.id}
                            type="button"
                            onClick={() => selectChange(change)}
                            className={`w-full rounded-lg border p-3 text-left transition ${
                              isSelected
                                ? 'border-ring bg-accent ring-1 ring-ring'
                                : 'border-border bg-card hover:border-border hover:bg-muted/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                  change.type === 'insert'
                                    ? 'bg-secondary text-secondary-foreground'
                                    : change.type === 'delete'
                                      ? 'bg-destructive/10 text-destructive'
                                      : change.type === 'move'
                                        ? 'bg-muted text-foreground'
                                        : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {change.type}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {change.type === 'move'
                                  ? `p.${change.movedFromPage} → p.${change.movedToPage}`
                                  : change.pageB
                                    ? `Page ${change.pageB}`
                                    : `Page ${change.pageA}`}
                              </span>
                            </div>

                            <p className="mt-1.5 text-xs font-semibold text-foreground">
                              {change.description}
                            </p>

                            {change.originalText && (
                              <div className="mt-2 rounded bg-destructive/5 p-1.5 text-[11px] text-destructive">
                                <span className="font-bold text-[9px] uppercase tracking-wider text-destructive block mb-0.5">
                                  Prior (Doc A):
                                </span>
                                <span className="line-through">
                                  {change.originalText}
                                </span>
                              </div>
                            )}

                            {change.revisedText && (
                              <div className="mt-1.5 rounded bg-secondary p-1.5 text-[11px] text-secondary-foreground">
                                <span className="font-bold text-[9px] uppercase tracking-wider text-foreground block mb-0.5">
                                  Revised (Doc B):
                                </span>
                                <span>{change.revisedText}</span>
                              </div>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Related Tools */}
        {relatedTools.length > 0 && (
          <div className="mt-16 border-t border-border pt-8">
            <RelatedTools tools={relatedTools} />
          </div>
        )}
      </section>
    </AppShell>
  );
}

/**
 * Visual Canvas with DOM Overlay for changes
 */
interface DocumentCanvasOverlayProps {
  bytes: Uint8Array;
  pageNumber: number;
  side: 'A' | 'B';
  changes: PdfDiffChange[];
  selectedChangeId: string | null;
  onSelectChange: (change: PdfDiffChange) => void;
}

function DocumentCanvasOverlay({
  bytes,
  pageNumber,
  side,
  changes,
  selectedChangeId,
  onSelectChange,
}: DocumentCanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [rendered, setRendered] = useState<{
    width: number;
    height: number;
    viewBox: [number, number, number, number];
  } | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let task: { destroy: () => Promise<void> } | null = null;

    async function draw() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      try {
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        if (
          !pdfjs.GlobalWorkerOptions.workerSrc &&
          typeof Worker !== 'undefined'
        ) {
          try {
            const workerModule =
              await import('pdfjs-dist/legacy/build/pdf.worker.mjs?url');
            if (workerModule.default) {
              pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
            }
          } catch {
            /* worker resolves itself in node */
          }
        }

        const copy = new Uint8Array(bytes.length);
        copy.set(bytes);
        const loading = pdfjs.getDocument({
          data: copy,
          useSystemFonts: false,
        });
        task = loading;
        const doc = await loading.promise;
        if (cancelled) return;

        const page = await doc.getPage(pageNumber);
        const base = page.getViewport({ scale: 1 });
        const targetWidth = 440; // width per side
        const scale = targetWidth / base.width;
        const viewport = page.getViewport({ scale });
        const ratio = Math.min(globalThis.devicePixelRatio || 1, 2);

        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.clearRect(0, 0, viewport.width, viewport.height);
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        if (cancelled) return;

        const box = base.viewBox as number[];
        setRendered({
          width: viewport.width,
          height: viewport.height,
          viewBox: [box[0] ?? 0, box[1] ?? 0, box[2] ?? 595, box[3] ?? 842],
        });
        setRenderError(null);
      } catch (err) {
        if (cancelled) return;
        setRenderError(err instanceof Error ? err.message : String(err));
      }
    }

    void draw();
    return () => {
      cancelled = true;
      void task?.destroy();
    };
  }, [bytes, pageNumber]);

  // Relevant changes on this page
  const pageChanges = useMemo(() => {
    return changes.filter((c) => {
      if (side === 'A') {
        return (
          c.pageA === pageNumber ||
          (c.type === 'move' && c.movedFromPage === pageNumber)
        );
      }
      return (
        c.pageB === pageNumber ||
        (c.type === 'move' && c.movedToPage === pageNumber)
      );
    });
  }, [changes, side, pageNumber]);

  /** Inline overlay colours — kept as raw CSS to avoid Tailwind palette classes */
  const overlayColors: Record<
    string,
    { bg: string; border: string; ring: string; bgHover: string }
  > = {
    insert: {
      bg: 'rgba(52,211,153,0.25)',
      border: 'rgba(16,185,129,1)',
      ring: 'rgba(16,185,129,0.8)',
      bgHover: 'rgba(52,211,153,0.40)',
    },
    delete: {
      bg: 'rgba(251,113,133,0.25)',
      border: 'rgba(225,29,72,1)',
      ring: 'rgba(225,29,72,0.8)',
      bgHover: 'rgba(251,113,133,0.40)',
    },
    move: {
      bg: 'rgba(251,191,36,0.25)',
      border: 'rgba(217,119,6,1)',
      ring: 'rgba(217,119,6,0.8)',
      bgHover: 'rgba(251,191,36,0.40)',
    },
    format: {
      bg: 'rgba(129,140,248,0.25)',
      border: 'rgba(99,102,241,1)',
      ring: 'rgba(99,102,241,0.8)',
      bgHover: 'rgba(129,140,248,0.40)',
    },
  };

  return (
    <div
      ref={frameRef}
      className="relative flex items-center justify-center overflow-hidden rounded-lg border border-border bg-muted p-2"
      style={{ minHeight: 520 }}
    >
      <canvas ref={canvasRef} className="rounded shadow-sm bg-card" />

      {renderError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/90 p-4 text-center text-xs text-destructive">
          Page render failed: {renderError}
        </div>
      )}

      {/* Overlaid DOM elements for each changed bounding box */}
      {rendered &&
        pageChanges.map((change) => {
          const box = side === 'A' ? change.boxA : change.boxB;
          if (!box) return null;

          const [x0, y0, x1, y1] = rendered.viewBox;
          const spanX = x1 - x0 || 1;
          const spanY = y1 - y0 || 1;

          const left = ((box.x - x0) / spanX) * rendered.width;
          // PDF y is bottom-up; canvas is top-down
          const top = ((y1 - (box.y + box.height)) / spanY) * rendered.height;
          const width = (box.width / spanX) * rendered.width;
          const height = (box.height / spanY) * rendered.height;

          const isSelected = change.id === selectedChangeId;
          const palette = overlayColors[change.type] ?? overlayColors.format;

          return (
            <button
              key={`${side}_${change.id}`}
              type="button"
              tabIndex={0}
              aria-label={`${change.type} change: ${change.description}`}
              onClick={() => onSelectChange(change)}
              className="absolute cursor-pointer rounded-xs border transition"
              style={{
                left: `${Math.max(0, left - 2)}px`,
                top: `${Math.max(0, top - 2)}px`,
                width: `${Math.max(12, width + 4)}px`,
                height: `${Math.max(10, height + 4)}px`,
                backgroundColor: isSelected ? palette.bgHover : palette.bg,
                borderColor: palette.border,
                boxShadow: isSelected ? `0 0 0 2px ${palette.ring}` : undefined,
              }}
              title={change.description}
            />
          );
        })}
    </div>
  );
}
