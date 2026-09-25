'use client';

import {
  AlertCircle,
  Download,
  FileText,
  LockKeyhole,
  Printer,
  RefreshCw,
  Upload,
} from 'lucide-react';
import { useCallback, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { RelatedTools } from '@/components/related-tools';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import type { RelatedTool } from '@/lib/seo/related-tools';
import {
  runPdfPreflight,
  type PreflightReport,
} from '@/lib/tools/pdf/preflight';

interface PdfPreflightToolProps {
  relatedTools?: readonly RelatedTool[];
}

export function PdfPreflightTool({ relatedTools = [] }: PdfPreflightToolProps) {
  const [file, setFile] = useState<{ name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<PreflightReport | null>(null);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (!selected) return;

      setError(null);
      setReport(null);
      setLoading(true);
      setFile({ name: selected.name });

      try {
        const buffer = await selected.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const res = await runPdfPreflight(bytes);
        setReport(res);

        announceCompletion({
          operation: 'PDF Print Preflight Check',
          durationMs: 200,
          summary: `Preflight check completed for ${selected.name} (${res.totalPages} pages).`,
          metrics: [
            { label: 'Pages', value: String(res.totalPages) },
            {
              label: 'Unembedded fonts',
              value: String(res.summary.unembeddedFontsCount),
            },
            {
              label: 'RGB images',
              value: String(res.summary.rgbImagesCount),
            },
          ],
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to inspect PDF object model',
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const handleExportJson = useCallback(() => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file?.name?.replace(/\.[^.]+$/, '') ?? 'document'}-preflight-report.json`;
    a.setAttribute('data-receipt-download', 'true');
    a.click();
    URL.revokeObjectURL(url);
  }, [file, report]);

  return (
    <AppShell currentToolId="pdf-preflight" currentGroupId="pdf">
      <section
        id="tool"
        tabIndex={-1}
        className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
      >
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                <Printer className="h-3.5 w-3.5" />
                Commercial Print &amp; Press Quality
              </span>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                PDF Print Preflight Checker
              </h1>
              <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">
                Verify bleed boxes (≥ 3 mm / 8.5 pt), TrimBox alignment, font
                embedding, and image placed resolution (PPI) before sending to
                press. This inspects your PDF object hierarchy 100% locally in
                your browser.
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <LockKeyhole className="h-3.5 w-3.5 text-success" />
            <span>
              <strong>100% Client-Side Privacy:</strong> PDF object streams,
              font descriptors, and image metadata are inspected purely in
              memory.
            </span>
          </div>
        </div>

        {/* Upload Zone */}
        {!file && (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Upload className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-foreground">
              Select or Drop Press PDF
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Inspect books, brochures, flyers, catalogs, and packaging artwork.
            </p>
            <div className="mt-6 flex justify-center">
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  <FileText className="h-4 w-4" />
                  Select PDF File
                </span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileUpload}
                  className="sr-only"
                />
              </label>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-3 text-sm font-medium text-foreground">
              Parsing PDF dictionaries, font descriptors, and image XObjects...
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-6 rounded-lg border border-border bg-muted p-4 text-sm text-foreground">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span>Inspection Error</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{error}</p>
          </div>
        )}

        {/* Results view */}
        {report && (
          <div className="space-y-8">
            {/* File Overview and Export */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-5">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  File Analyzed
                </span>
                <p className="text-base font-medium text-foreground">
                  {file?.name} ({report.totalPages} pages)
                </p>
              </div>
              <Button
                data-receipt-download
                onClick={handleExportJson}
                className="inline-flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export Preflight Report (JSON)
              </Button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Trim &amp; Bleed
                </span>
                <p className="mt-1 text-xl font-bold text-foreground">
                  {report.summary.missingBleedCount === 0 ? (
                    <span className="text-success">Standard Bleed</span>
                  ) : (
                    <span className="text-destructive">
                      {report.summary.missingBleedCount} Issues
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  ≥ 8.5 pt (3mm) margin check
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Font Embedding
                </span>
                <p className="mt-1 text-xl font-bold text-foreground">
                  {report.summary.unembeddedFontsCount === 0 ? (
                    <span className="text-success">100% Embedded</span>
                  ) : (
                    <span className="text-destructive">
                      {report.summary.unembeddedFontsCount} Unembedded
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {report.summary.totalFonts} total fonts analyzed
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Image Color Space
                </span>
                <p className="mt-1 text-xl font-bold text-foreground">
                  {report.summary.rgbImagesCount === 0 ? (
                    <span className="text-success">Press Ready</span>
                  ) : (
                    <span className="text-muted-foreground font-semibold">
                      {report.summary.rgbImagesCount} RGB Images
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {report.summary.cmykImagesCount} CMYK images found
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Image Resolution
                </span>
                <p className="mt-1 text-xl font-bold text-foreground">
                  {report.summary.lowResImagesCount === 0 ? (
                    <span className="text-success">≥ 300 PPI</span>
                  ) : (
                    <span className="text-destructive">
                      {report.summary.lowResImagesCount} &lt; 300 PPI
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {report.summary.totalImages} images placed
                </p>
              </div>
            </div>

            {/* Scope Notice */}
            <div className="rounded-xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                Engineering Scope Boundary:{' '}
              </span>
              {report.outOfScopeNotice}
            </div>

            {/* Detailed Page-by-Page Findings */}
            <div className="rounded-xl border border-border bg-card">
              <div className="border-b border-border bg-muted/30 px-6 py-4">
                <h3 className="text-sm font-semibold text-foreground">
                  Page-by-Page Preflight Findings ({report.totalPages} Pages)
                </h3>
              </div>

              <div className="divide-y divide-border">
                {report.pages.map((p) => (
                  <div key={p.pageNumber} className="p-5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-foreground">
                        Page {p.pageNumber}
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-semibold ${
                          p.issues.length === 0
                            ? 'bg-success/10 text-success'
                            : 'bg-destructive/10 text-destructive'
                        }`}
                      >
                        {p.issues.length === 0
                          ? 'READY FOR PRESS'
                          : `${p.issues.length} ISSUES`}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                      <div>
                        MediaBox: {Math.round(p.mediaBox.width)} ×{' '}
                        {Math.round(p.mediaBox.height)} pt
                      </div>
                      <div>
                        Bleed Margin:{' '}
                        {p.bleedWidthPt > 0 ? `${p.bleedWidthPt} pt` : 'None'}{' '}
                        {p.hasStandardBleed ? '(Standard)' : ''}
                      </div>
                    </div>

                    {p.issues.length > 0 && (
                      <ul className="mt-3 space-y-1 rounded bg-muted/30 p-3 text-xs text-destructive">
                        {p.issues.map((iss, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="mt-0.5 block h-1.5 w-1.5 rounded-full bg-destructive" />
                            <span>{iss}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {relatedTools.length > 0 && (
          <div className="mt-12 border-t border-border pt-8">
            <RelatedTools tools={relatedTools} />
          </div>
        )}
      </section>
    </AppShell>
  );
}
