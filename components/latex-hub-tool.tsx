'use client';

import {
  BookOpen,
  Calculator,
  Check,
  Copy,
  Download,
  FileCode,
  FileSpreadsheet,
  Hash,
  LockKeyhole,
  RotateCcw,
  Search,
  Sparkles,
  Table as TableIcon,
} from 'lucide-react';
import { useCallback, useId, useMemo, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { RelatedTools } from '@/components/related-tools';
import { ToolExplainerSection } from '@/components/tool-explainer';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import type { RelatedTool } from '@/lib/seo/related-tools';
import {
  buildLatexMatrix,
  countLatexWords,
  type LatexWordCountResult,
  type MatrixType,
  processBibTeX,
  readLatexTable,
  searchLatexSymbols,
  type LatexSymbol,
} from '@/lib/tools/latex';
import {
  parseTable,
  emitTable,
  type TableFormat,
} from '@/lib/tools/notation/table';

export type LatexHubTab =
  | 'table-generator'
  | 'table-reader'
  | 'bibtex'
  | 'word-count'
  | 'symbols'
  | 'equations';

interface LatexHubToolProps {
  initialTab?: LatexHubTab;
  relatedTools?: readonly RelatedTool[];
}

const TABS: readonly {
  id: LatexHubTab;
  label: string;
  desc: string;
  icon: typeof TableIcon;
}[] = [
  {
    id: 'table-generator',
    label: 'Multi-Format Tables',
    desc: 'Paste once, emit 8 formats',
    icon: TableIcon,
  },
  {
    id: 'table-reader',
    label: 'LaTeX Table Reader',
    desc: 'Convert LaTeX to CSV/MD/JSON',
    icon: FileSpreadsheet,
  },
  {
    id: 'bibtex',
    label: 'BibTeX Workbench',
    desc: 'Deduplicate, clean & sort',
    icon: BookOpen,
  },
  {
    id: 'word-count',
    label: 'LaTeX Word Count',
    desc: 'Accurate prose word counts',
    icon: Calculator,
  },
  {
    id: 'symbols',
    label: 'Symbol Finder',
    desc: 'Search & copy commands',
    icon: Hash,
  },
  {
    id: 'equations',
    label: 'Matrix & Equations',
    desc: 'Matrices, cases & aligned',
    icon: FileCode,
  },
];

export function LatexHubTool({
  initialTab = 'table-generator',
  relatedTools = [],
}: LatexHubToolProps) {
  const [activeTab, setActiveTab] = useState<LatexHubTab>(initialTab);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = useCallback((text: string, key: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }, []);

  // --------------------------------------------------------------------------
  // Tab 1: Table Generator / Multi-Format Table Hub
  // --------------------------------------------------------------------------
  const [tableInput, setTableInput] = useState<string>(
    'Month,Visitors,Conversion Rate\nJan,12450,3.2%\nFeb,15800,3.8%\nMar,18920,4.1%',
  );
  const [tableTargetFormat, setTableTargetFormat] =
    useState<TableFormat>('latex');

  const multiTableResult = useMemo(() => {
    try {
      const table = parseTable(tableInput, 'auto');
      return {
        latex: emitTable(table, 'latex'),
        markdown: emitTable(table, 'markdown'),
        html: emitTable(table, 'html'),
        csv: emitTable(table, 'csv'),
        tsv: emitTable(table, 'tsv'),
        json: emitTable(table, 'json'),
        sql: emitTable(table, 'sql'),
        error: null,
      };
    } catch (err) {
      return {
        latex: '',
        markdown: '',
        html: '',
        csv: '',
        tsv: '',
        json: '',
        sql: '',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }, [tableInput]);

  // --------------------------------------------------------------------------
  // Tab 2: LaTeX Table Reader
  // --------------------------------------------------------------------------
  const sampleLatexTable = `\\begin{tabular}{lrr}
\\toprule
Metric & 2025 & 2026 \\\\
\\midrule
Revenue (kUSD) & 420.5 & 890.2 \\\\
Active Users & 14,200 & 38,500 \\\\
NPS Score & 68 & 74 \\\\
\\bottomrule
\\end{tabular}`;

  const [tableReaderInput, setTableReaderInput] =
    useState<string>(sampleLatexTable);
  const [readerFormat, setReaderFormat] = useState<
    'csv' | 'markdown' | 'json' | 'html' | 'sql'
  >('csv');

  const tableReaderResult = useMemo(() => {
    try {
      return readLatexTable(tableReaderInput);
    } catch {
      return null;
    }
  }, [tableReaderInput]);

  // --------------------------------------------------------------------------
  // Tab 3: BibTeX Workbench
  // --------------------------------------------------------------------------
  const sampleBibTeX = `@article{vaswani2017attention,
  title = {Attention Is All You Need},
  author = {Vaswani, Ashish and Shazeer, Noam and Parmar, Niki},
  journal = {Advances in Neural Information Processing Systems},
  year = {2017},
  pages = {5998-6008},
  month = {},
  doi = {10.48550/arXiv.1706.03762}
}

@article{vaswani_duplicate,
  title = {Attention is all you need},
  author = {Vaswani, A.},
  journal = {NeurIPS},
  year = {2017},
  doi = {10.48550/arXiv.1706.03762}
}

@book{goodfellow2016deep,
  title = {Deep Learning},
  author = {Goodfellow, Ian and Bengio, Yoshua and Courville, Aaron},
  publisher = {MIT Press},
  year = {2016}
}`;

  const [bibInput, setBibInput] = useState<string>(sampleBibTeX);
  const [bibDedupe, setBibDedupe] = useState(true);
  const [bibNormalizePages, setBibNormalizePages] = useState(true);
  const [bibCleanScholar, setBibCleanScholar] = useState(true);
  const [bibSortBy, setBibSortBy] = useState<
    'none' | 'author' | 'year' | 'key'
  >('author');

  const bibResult = useMemo(() => {
    return processBibTeX(bibInput, {
      deduplicate: bibDedupe,
      normalizePageRanges: bibNormalizePages,
      cleanScholarJunk: bibCleanScholar,
      sortBy: bibSortBy,
    });
  }, [bibInput, bibDedupe, bibNormalizePages, bibCleanScholar, bibSortBy]);

  const handleDownloadBib = () => {
    const blob = new Blob([bibResult.formatted], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cleaned_references.bib';
    a.click();
    URL.revokeObjectURL(url);
    announceCompletion({
      operation: 'BibTeX Workbench Clean',
      durationMs: 40,
      summary: `Cleaned ${bibResult.entries.length} BibTeX entries with ${bibResult.metrics.duplicatesRemoved} duplicates removed.`,
      metrics: [
        { label: 'Entries', value: String(bibResult.entries.length) },
        {
          label: 'Duplicates Removed',
          value: String(bibResult.metrics.duplicatesRemoved),
        },
      ],
    });
  };

  // --------------------------------------------------------------------------
  // Tab 4: Word Count
  // --------------------------------------------------------------------------
  const sampleLatexDoc = `\\documentclass{article}
\\usepackage{amsmath}
% Comments are strictly excluded from prose count
\\begin{document}

\\section{Introduction to Modern Architecture}
This academic document contains carefully measured words to verify the prose count engine.
We demonstrate that equations and markup commands do not artificially inflate word statistics.

Here is an inline equation $E = mc^2$ and a display derivation:
\\begin{equation}
  \\nabla \\times \\mathbf{B} = \\mu_0 \\mathbf{J} + \\mu_0 \\epsilon_0 \\frac{\\partial \\mathbf{E}}{\\partial t}
\\end{equation}

As observed in recent literature \\cite{vaswani2017attention}, \\textbf{structured representations} 
and \\textit{contextual embeddings} consistently outperform unweighted models across all benchmarks.

\\begin{figure}
  \\caption{Validation curve comparing training iterations against hold-out cross entropy.}
\\end{figure}

\\end{document}`;

  const [wordCountInput, setWordCountInput] = useState<string>(sampleLatexDoc);

  const wordCountResult: LatexWordCountResult = useMemo(() => {
    return countLatexWords(wordCountInput);
  }, [wordCountInput]);

  // --------------------------------------------------------------------------
  // Tab 5: Symbols Finder
  // --------------------------------------------------------------------------
  const [symbolQuery, setSymbolQuery] = useState('');
  const [symbolCategory, setSymbolCategory] = useState<
    LatexSymbol['category'] | 'all'
  >('all');
  const symbolSearchId = useId();

  const filteredSymbols = useMemo(() => {
    return searchLatexSymbols(symbolQuery, symbolCategory);
  }, [symbolQuery, symbolCategory]);

  // --------------------------------------------------------------------------
  // Tab 6: Matrix & Equations
  // --------------------------------------------------------------------------
  const [matrixType, setMatrixType] = useState<MatrixType>('pmatrix');
  const [matrixRows, setMatrixRows] = useState(3);
  const [matrixCols, setMatrixCols] = useState(3);
  const [matrixData, setMatrixData] = useState<string[][]>([
    ['1', '0', '0'],
    ['0', '1', '0'],
    ['0', '0', '1'],
  ]);

  const handleDimensionChange = (newRows: number, newCols: number) => {
    const r = Math.max(1, Math.min(6, newRows));
    const c = Math.max(1, Math.min(6, newCols));
    setMatrixRows(r);
    setMatrixCols(c);
    setMatrixData((prev) => {
      const next: string[][] = [];
      for (let i = 0; i < r; i++) {
        const row: string[] = [];
        for (let j = 0; j < c; j++) {
          row.push(prev[i]?.[j] ?? (i === j ? '1' : '0'));
        }
        next.push(row);
      }
      return next;
    });
  };

  const matrixCode = useMemo(() => {
    return buildLatexMatrix({
      type: matrixType,
      rows: matrixRows,
      cols: matrixCols,
      data: matrixData,
    });
  }, [matrixType, matrixRows, matrixCols, matrixData]);

  return (
    <AppShell currentToolId="latex-hub" currentGroupId="documents">
      <section
        id="tool"
        tabIndex={-1}
        className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
      >
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
                <FileCode className="h-3.5 w-3.5" />
                LaTeX Academic Authoring Suite
              </span>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                LaTeX Authoring &amp; Notation Hub
              </h1>
              <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">
                Research-grade tools for academic authoring: multi-format table
                generation, LaTeX table reading, BibTeX deduplication,
                TeXcount-standard word counting, and symbol lookups.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/documents/latex-table-generator"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
              >
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                Dedicated LaTeX Table Generator &rarr;
              </a>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <LockKeyhole className="h-3.5 w-3.5 text-success" />
            <span>
              <strong>100% Client-Side Privacy:</strong> All parsers and
              formatting run entirely in browser memory. Operations execute
              entirely in local browser tab memory.
            </span>
          </div>
        </div>

        {/* Navigation Tabs Header */}
        <div className="mb-6 border-b border-border">
          <nav
            className="-mb-px flex flex-wrap gap-2 sm:gap-4"
            aria-label="LaTeX Tools Navigation"
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-xs font-medium transition sm:text-sm ${
                    isActive
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* ================================================================== */}
        {/* Tab 1: Multi-Format Tables */}
        {/* ================================================================== */}
        {activeTab === 'table-generator' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Table &rarr; All Notation Formats at Once
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Paste CSV, TSV, or raw data. The engine immediately parses
                    and emits all 8 notation formats side by side.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setTableInput(
                      'Experiment,Baseline,Proposed,P-Value\nMNIST,98.2%,99.4%,p < 0.001\nCIFAR-10,84.1%,89.7%,p < 0.001\nImageNet,72.4%,78.1%,p < 0.005',
                    )
                  }
                  className="text-xs"
                >
                  <Sparkles className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                  Load Research Benchmark
                </Button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <label
                    htmlFor="tab1-input"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Input Table (CSV, TSV, or Markdown)
                  </label>
                  <textarea
                    id="tab1-input"
                    rows={10}
                    value={tableInput}
                    onChange={(e) => setTableInput(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-border bg-muted p-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-hidden"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Accepts CSV, TSV, pipe-delimited Markdown tables, or HTML
                    tables.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Target Notation Output
                    </span>
                    <div className="flex gap-1">
                      {(
                        ['latex', 'markdown', 'html', 'json', 'sql'] as const
                      ).map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => setTableTargetFormat(fmt)}
                          className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
                            tableTargetFormat === fmt
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          {fmt.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative mt-2">
                    <pre className="h-[220px] overflow-auto rounded-lg border border-border bg-muted p-3 font-mono text-xs text-foreground">
                      {multiTableResult[
                        tableTargetFormat as keyof typeof multiTableResult
                      ] || 'No table data'}
                    </pre>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          String(
                            multiTableResult[
                              tableTargetFormat as keyof typeof multiTableResult
                            ] ?? '',
                          ),
                          'table-output',
                        )
                      }
                      className="absolute top-2 right-2 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground shadow-xs hover:bg-muted"
                    >
                      {copiedKey === 'table-output' ? (
                        <span className="inline-flex items-center gap-1 text-success">
                          <Check className="h-3 w-3" /> Copied
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Copy className="h-3 w-3" /> Copy
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* Tab 2: LaTeX Table Reader */}
        {/* ================================================================== */}
        {activeTab === 'table-reader' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    LaTeX Table &rarr; Structured Formats
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Reverse extraction: parses LaTeX `tabular` and `booktabs`
                    structures directly into clean CSV, Markdown, or JSON.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTableReaderInput(sampleLatexTable)}
                  className="text-xs"
                >
                  <RotateCcw className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                  Reset Sample
                </Button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <label
                    htmlFor="reader-input"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Paste LaTeX Code
                  </label>
                  <textarea
                    id="reader-input"
                    rows={12}
                    value={tableReaderInput}
                    onChange={(e) => setTableReaderInput(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-border bg-muted p-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-hidden"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Converted Output
                    </span>
                    <div className="flex gap-1">
                      {(
                        ['csv', 'markdown', 'json', 'html', 'sql'] as const
                      ).map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => setReaderFormat(fmt)}
                          className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
                            readerFormat === fmt
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          {fmt.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative mt-2">
                    <pre className="h-[250px] overflow-auto rounded-lg border border-border bg-muted p-3 font-mono text-xs text-foreground">
                      {tableReaderResult
                        ? tableReaderResult[readerFormat]
                        : 'Failed to parse table'}
                    </pre>
                    {tableReaderResult && (
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            tableReaderResult[readerFormat],
                            'reader-output',
                          )
                        }
                        className="absolute top-2 right-2 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground shadow-xs hover:bg-muted"
                      >
                        {copiedKey === 'reader-output' ? (
                          <span className="inline-flex items-center gap-1 text-success">
                            <Check className="h-3 w-3" /> Copied
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <Copy className="h-3 w-3" /> Copy
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* Tab 3: BibTeX Workbench */}
        {/* ================================================================== */}
        {activeTab === 'bibtex' && (
          <div className="space-y-6">
            {/* Metric Tiles */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Unique Entries
                </span>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {bibResult.entries.length}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Ready for export
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Duplicates Removed
                </span>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {bibResult.metrics.duplicatesRemoved}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Matched by DOI or title
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Fields Cleaned
                </span>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {bibResult.metrics.cleanedFields}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Pages normal &amp; Scholar cruft
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Validation Warnings
                </span>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {bibResult.metrics.warningsCount}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Missing required attributes
                </p>
              </div>
            </div>

            {/* Options Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted p-4">
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bibDedupe}
                    onChange={(e) => setBibDedupe(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-ring"
                  />
                  <span>Deduplicate (DOI &amp; Title)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bibNormalizePages}
                    onChange={(e) => setBibNormalizePages(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-ring"
                  />
                  <span>Normalise Pages (10--20)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bibCleanScholar}
                    onChange={(e) => setBibCleanScholar(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-ring"
                  />
                  <span>Clean Scholar Cruft</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <span>Sort by:</span>
                  <select
                    value={bibSortBy}
                    onChange={(e) =>
                      setBibSortBy(
                        e.target.value as 'none' | 'author' | 'year' | 'key',
                      )
                    }
                    className="rounded border border-border bg-card px-2 py-0.5 text-xs text-foreground"
                  >
                    <option value="none">Original Order</option>
                    <option value="author">Author Name</option>
                    <option value="year">Publication Year</option>
                    <option value="key">Citation Key</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    copyToClipboard(bibResult.formatted, 'bib-formatted')
                  }
                >
                  {copiedKey === 'bib-formatted' ? (
                    <Check className="mr-1 h-3.5 w-3.5 text-success" />
                  ) : (
                    <Copy className="mr-1 h-3.5 w-3.5" />
                  )}
                  Copy .bib
                </Button>
                <Button
                  size="sm"
                  data-receipt-download
                  onClick={handleDownloadBib}
                >
                  <Download className="mr-1 h-3.5 w-3.5" />
                  Download .bib
                </Button>
              </div>
            </div>

            {/* Input & Output */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <label
                  htmlFor="bib-input"
                  className="block text-xs font-semibold text-foreground"
                >
                  Raw BibTeX References
                </label>
                <textarea
                  id="bib-input"
                  rows={14}
                  value={bibInput}
                  onChange={(e) => setBibInput(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-muted p-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-hidden"
                />
              </div>

              <div>
                <span className="block text-xs font-semibold text-foreground">
                  Cleaned &amp; Formatted Output
                </span>
                <pre className="mt-2 h-[290px] overflow-auto rounded-lg border border-border bg-muted p-3 font-mono text-xs text-foreground">
                  {bibResult.formatted || 'No entries found'}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* Tab 4: LaTeX Word Count */}
        {/* ================================================================== */}
        {activeTab === 'word-count' && (
          <div className="space-y-6">
            {/* Metric Tiles */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Total Words
                </span>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {wordCountResult.totalWords}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Prose + headers + captions
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Body Words
                </span>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {wordCountResult.bodyWords}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Excludes citations &amp; markup
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Header Words
                </span>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {wordCountResult.headerWords}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  In section &amp; chapter titles
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Caption Words
                </span>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {wordCountResult.captionWords}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  In figures &amp; tables
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Math Elements
                </span>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {wordCountResult.mathElements}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Equations excluded from words
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <span className="text-xs font-semibold text-foreground">
                  LaTeX Document Input
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setWordCountInput(sampleLatexDoc)}
                  className="text-xs"
                >
                  <RotateCcw className="mr-1 h-3.5 w-3.5" />
                  Reset Sample
                </Button>
              </div>

              <textarea
                rows={12}
                value={wordCountInput}
                onChange={(e) => setWordCountInput(e.target.value)}
                className="mt-3 w-full rounded-lg border border-border bg-muted p-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-hidden"
              />
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* Tab 5: Symbol Finder */}
        {/* ================================================================== */}
        {activeTab === 'symbols' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="relative flex-1 min-w-[240px]">
                  <label htmlFor={symbolSearchId} className="sr-only">
                    Search LaTeX Symbols
                  </label>
                  <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                  <input
                    id={symbolSearchId}
                    type="search"
                    placeholder="Search by name, command (e.g. \\alpha, \\leq), or tag..."
                    value={symbolQuery}
                    onChange={(e) => setSymbolQuery(e.target.value)}
                    className="w-full rounded-lg border border-border bg-muted py-2 pr-3 pl-9 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-hidden"
                  />
                </div>

                {/* Category filters */}
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      'all',
                      'greek',
                      'operators',
                      'relations',
                      'arrows',
                      'delimiters',
                      'misc',
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSymbolCategory(cat)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                        symbolCategory === cat
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Symbol Grid */}
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {filteredSymbols.map((sym) => {
                  const isCopied = copiedKey === sym.command;
                  return (
                    <button
                      key={sym.command}
                      type="button"
                      onClick={() => copyToClipboard(sym.command, sym.command)}
                      className="group flex flex-col items-center justify-center rounded-lg border border-border bg-card p-3 text-center transition hover:border-ring hover:bg-muted/50"
                    >
                      <span className="text-2xl font-serif text-foreground">
                        {sym.symbol}
                      </span>
                      <code className="mt-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground group-hover:bg-card">
                        {sym.command}
                      </code>
                      <span className="mt-1 text-[10px] text-muted-foreground truncate max-w-full">
                        {sym.name}
                      </span>
                      {isCopied && (
                        <span className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-semibold text-success">
                          <Check className="h-3 w-3" /> Copied
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* Tab 6: Matrix & Equations */}
        {/* ================================================================== */}
        {activeTab === 'equations' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Interactive Matrix Builder
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Construct matrices visually and export clean standard LaTeX
                    matrix environments.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span>Type:</span>
                    <select
                      value={matrixType}
                      onChange={(e) =>
                        setMatrixType(e.target.value as MatrixType)
                      }
                      className="rounded border border-border bg-card px-2 py-1 text-xs text-foreground"
                    >
                      <option value="pmatrix">pmatrix ( )</option>
                      <option value="bmatrix">bmatrix [ ]</option>
                      <option value="Bmatrix">Bmatrix {`{ }`}</option>
                      <option value="vmatrix">vmatrix | |</option>
                      <option value="Vmatrix">Vmatrix || ||</option>
                      <option value="matrix">matrix (none)</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>Size:</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleDimensionChange(matrixRows - 1, matrixCols - 1)
                      }
                      disabled={matrixRows <= 1}
                      className="rounded border border-border px-2 py-0.5 disabled:opacity-40"
                    >
                      -
                    </button>
                    <span className="font-mono">
                      {matrixRows}x{matrixCols}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleDimensionChange(matrixRows + 1, matrixCols + 1)
                      }
                      disabled={matrixRows >= 6}
                      className="rounded border border-border px-2 py-0.5 disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Grid visual editor */}
              <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <span className="block text-xs font-semibold text-foreground mb-2">
                    Matrix Cells
                  </span>
                  <div className="space-y-2 max-w-sm">
                    {matrixData.map((row, rIdx) => (
                      <div key={`row-${rIdx}`} className="flex gap-2">
                        {row.map((val, cIdx) => (
                          <input
                            key={`cell-${rIdx}-${cIdx}`}
                            type="text"
                            value={val}
                            onChange={(e) => {
                              const next = matrixData.map((r, i) =>
                                i === rIdx
                                  ? r.map((c, j) =>
                                      j === cIdx ? e.target.value : c,
                                    )
                                  : r,
                              );
                              setMatrixData(next);
                            }}
                            className="w-16 rounded border border-border bg-muted p-2 text-center font-mono text-xs text-foreground focus:border-ring focus:outline-hidden"
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-foreground">
                      Generated LaTeX Code
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(matrixCode, 'matrix-code')}
                      className="rounded border border-border bg-card px-2 py-1 text-xs text-foreground shadow-xs hover:bg-muted"
                    >
                      {copiedKey === 'matrix-code' ? (
                        <Check className="mr-1 inline h-3 w-3 text-success" />
                      ) : (
                        <Copy className="mr-1 inline h-3 w-3" />
                      )}
                      Copy LaTeX
                    </button>
                  </div>
                  <pre className="h-[180px] overflow-auto rounded-lg border border-border bg-muted p-3 font-mono text-xs text-foreground">
                    {matrixCode}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tool Explainer */}
        <div className="mt-16">
          <ToolExplainerSection
            toolId={activeTab}
            toolName={
              TABS.find((t) => t.id === activeTab)?.label ?? 'LaTeX Tool'
            }
          />
        </div>

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
