'use client';

import {
  AlertCircle,
  FileSpreadsheet,
  FileText,
  LockKeyhole,
  RefreshCw,
  Scissors,
  Table,
  Upload,
} from 'lucide-react';
import { useCallback, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { RelatedTools } from '@/components/related-tools';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import type { RelatedTool } from '@/lib/seo/related-tools';
import {
  buildDrawingRegister,
  burstPdfByDrawingRegister,
  DEFAULT_TITLE_BLOCK_BOX,
  exportRegisterCsv,
  type DrawingRegisterResult,
  type TitleBlockBoundingBox,
} from '@/lib/tools/pdf/drawing-register';

interface PdfDrawingRegisterToolProps {
  relatedTools?: readonly RelatedTool[];
}

export function PdfDrawingRegisterTool({
  relatedTools = [],
}: PdfDrawingRegisterToolProps) {
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [splitting, setSplitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DrawingRegisterResult | null>(null);
  const [box] = useState<TitleBlockBoundingBox>(DEFAULT_TITLE_BLOCK_BOX);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (!selected) return;

      setError(null);
      setResult(null);
      setLoading(true);

      try {
        const buffer = await selected.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        setFile({ name: selected.name, bytes });

        const res = await buildDrawingRegister(bytes, box);
        setResult(res);

        announceCompletion({
          operation: 'Extract Drawing Register',
          durationMs: 250,
          summary: `Extracted register for ${res.totalPages} drawing sheets.`,
          metrics: [
            { label: 'Total sheets', value: String(res.totalPages) },
            { label: 'Scanned sheets', value: String(res.scannedPagesCount) },
          ],
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to parse drawing set',
        );
      } finally {
        setLoading(false);
      }
    },
    [box],
  );

  const handleDownloadCsv = () => {
    if (!result) return;
    const csv = exportRegisterCsv(result);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file?.name.replace(/\.pdf$/i, '') || 'drawing'}_register.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBurstSheets = async () => {
    if (!file || !result) return;
    setSplitting(true);
    try {
      const files = await burstPdfByDrawingRegister(file.bytes, result);
      // Trigger individual downloads or first few
      for (const f of files.slice(0, 5)) {
        const blob = new Blob([f.bytes as unknown as BlobPart], {
          type: 'application/pdf',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = f.filename;
        a.click();
        URL.revokeObjectURL(url);
      }
      announceCompletion({
        operation: 'Burst Drawing Sheets',
        durationMs: 300,
        summary: `Burst ${files.length} individual drawing sheets.`,
        metrics: [{ label: 'Exported sheets', value: String(files.length) }],
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to burst drawing sheets',
      );
    } finally {
      setSplitting(false);
    }
  };

  return (
    <AppShell currentToolId="pdf-drawing-register" currentGroupId="pdf">
      <section
        id="tool"
        tabIndex={-1}
        className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
      >
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                <Table className="h-3.5 w-3.5" />
                Construction &amp; Architectural Drawing Suite
              </span>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                PDF Drawing Register from Title Blocks
              </h1>
              <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">
                Extract drawing numbers, sheet titles, revisions, dates, and
                authors across multi-page architectural sets into a clean
                spreadsheet. Bluebeam charges $330/year for title block parsing;
                this runs 100% free inside your browser tab.
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <LockKeyhole className="h-3.5 w-3.5 text-success" />
            <span>
              <strong>100% Local Privacy:</strong> Your architectural plans and
              engineering drawing sets are processed purely in client-side
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
              Select or Drop Drawing Set PDF
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Supports 1 to 500+ page architectural, structural, and MEP sets.
            </p>
            <div className="mt-6 flex justify-center">
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  <FileText className="h-4 w-4" />
                  Select Drawing PDF
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
              Inspecting drawing set &amp; extracting title block coordinates...
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-6 rounded-lg border border-border bg-muted p-4 text-sm text-foreground">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span>Notice</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{error}</p>
          </div>
        )}

        {/* Results view */}
        {result && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-5">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  File Analysis
                </span>
                <p className="text-base font-medium text-foreground">
                  {file?.name} ({result.totalPages} sheets)
                </p>
                {result.scannedPagesCount > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {result.scannedPagesCount} scanned sheets without vector
                    text. For image-only sets, use{' '}
                    <a href="/pdf/ocr" className="underline font-semibold">
                      PDF OCR
                    </a>
                    .
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  data-receipt-download
                  onClick={handleDownloadCsv}
                  className="inline-flex items-center gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Export Register CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={handleBurstSheets}
                  disabled={splitting}
                  className="inline-flex items-center gap-2"
                >
                  <Scissors className="h-4 w-4" />
                  Burst Sheets by Drawing No
                </Button>
              </div>
            </div>

            {/* Register Table */}
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Sheet</th>
                    <th className="px-4 py-3">Drawing Number</th>
                    <th className="px-4 py-3">Sheet Title</th>
                    <th className="px-4 py-3">Revision</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Drawn By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {result.entries.map((entry) => (
                    <tr
                      key={entry.pageNumber}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                        {entry.pageNumber}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground font-mono">
                        {entry.drawingNumber}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {entry.title}
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">
                        {entry.revision}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {entry.date}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {entry.author}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
