'use client';

import {
  AlertCircle,
  FileText,
  LockKeyhole,
  RefreshCw,
  Scissors,
  Split,
  Upload,
} from 'lucide-react';
import { useCallback, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { RelatedTools } from '@/components/related-tools';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import type { RelatedTool } from '@/lib/seo/related-tools';
import {
  executePdfBurst,
  planPdfBurst,
  type BurstPlan,
  type BurstRule,
  type BurstRuleType,
} from '@/lib/tools/pdf/burst';

interface PdfBurstToolProps {
  relatedTools?: readonly RelatedTool[];
}

export function PdfBurstTool({ relatedTools = [] }: PdfBurstToolProps) {
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ruleType, setRuleType] = useState<BurstRuleType>('regex-pattern');
  const [pattern, setPattern] = useState<string>(
    '(?:INV|INVOICE|STATEMENT|ACCT)[-: ]*([A-Za-z0-9_-]+)',
  );
  const [namingTemplate, setNamingTemplate] = useState<string>(
    'Invoice_{match}.pdf',
  );
  const [fixedInterval, setFixedInterval] = useState<number>(1);
  const [plan, setPlan] = useState<BurstPlan | null>(null);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (!selected) return;

      setError(null);
      setPlan(null);
      setLoading(true);

      try {
        const buffer = await selected.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        setFile({ name: selected.name, bytes });

        const rule: BurstRule = {
          type: ruleType,
          pattern: pattern.trim(),
          namingTemplate: namingTemplate.trim(),
          fixedInterval,
        };

        const burstPlan = await planPdfBurst(bytes, rule);
        setPlan(burstPlan);

        announceCompletion({
          operation: 'Plan PDF Burst',
          durationMs: 180,
          summary: `Planned ${burstPlan.segments.length} split documents from ${burstPlan.totalSourcePages} pages.`,
          metrics: [
            { label: 'Total pages', value: String(burstPlan.totalSourcePages) },
            {
              label: 'Output documents',
              value: String(burstPlan.segments.length),
            },
          ],
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to inspect PDF text and plan burst',
        );
      } finally {
        setLoading(false);
      }
    },
    [ruleType, pattern, namingTemplate, fixedInterval],
  );

  const handleUpdatePlan = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const rule: BurstRule = {
        type: ruleType,
        pattern: pattern.trim(),
        namingTemplate: namingTemplate.trim(),
        fixedInterval,
      };
      const burstPlan = await planPdfBurst(file.bytes, rule);
      setPlan(burstPlan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update plan');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteBurst = async () => {
    if (!file || !plan) return;
    setExecuting(true);
    try {
      const outputs = await executePdfBurst(file.bytes, plan);
      for (const out of outputs.slice(0, 5)) {
        const blob = new Blob([out.bytes as unknown as BlobPart], {
          type: 'application/pdf',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = out.filename;
        a.setAttribute('data-receipt-download', 'true');
        a.click();
        URL.revokeObjectURL(url);
      }
      announceCompletion({
        operation: 'Execute PDF Burst',
        durationMs: 250,
        summary: `Burst ${outputs.length} separate PDF documents.`,
        metrics: [{ label: 'Exported files', value: String(outputs.length) }],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to burst PDF');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <AppShell currentToolId="pdf-burst" currentGroupId="pdf">
      <section
        id="tool"
        tabIndex={-1}
        className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
      >
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                <Split className="h-3.5 w-3.5" />
                Document Processing &amp; Batch Splitting
              </span>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                Burst PDF by Rule and Dynamic Naming
              </h1>
              <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">
                Split 500+ page bulk statements, invoices, and payroll runs by
                blank pages, regex text patterns, or account value changes — and
                dynamically name every output PDF from the matched text. EverMap
                AutoSplit charges $149 and PDF-eXPLODE charges $595; this bursts
                locally in your browser tab.
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <LockKeyhole className="h-3.5 w-3.5 text-success" />
            <span>
              <strong>100% Client-Side Privacy:</strong> Confidential payroll,
              billing, and customer statements never leave your browser memory.
            </span>
          </div>
        </div>

        {/* Rule Controls */}
        <div className="mb-6 rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">
            Burst Rule Configuration
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="burst-strategy"
                className="text-xs font-medium text-muted-foreground"
              >
                Burst Strategy
              </label>
              <select
                id="burst-strategy"
                value={ruleType}
                onChange={(e) => setRuleType(e.target.value as BurstRuleType)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="regex-pattern">
                  Split on Regex Match (Invoice/Account ID)
                </option>
                <option value="value-change">Split when Value Changes</option>
                <option value="blank-page">
                  Split on Blank Separator Pages
                </option>
                <option value="fixed-interval">Split every N pages</option>
              </select>
            </div>

            {(ruleType === 'regex-pattern' || ruleType === 'value-change') && (
              <div>
                <label
                  htmlFor="burst-regex"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Regex Pattern
                </label>
                <input
                  id="burst-regex"
                  type="text"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  placeholder="e.g. INV-(\d+)"
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            )}

            {ruleType === 'fixed-interval' && (
              <div>
                <label
                  htmlFor="burst-interval"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Page Interval
                </label>
                <input
                  id="burst-interval"
                  type="number"
                  min="1"
                  value={fixedInterval}
                  onChange={(e) =>
                    setFixedInterval(parseInt(e.target.value) || 1)
                  }
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="burst-template"
                className="text-xs font-medium text-muted-foreground"
              >
                Naming Template ({'{match}'}, {'{index}'}, {'{page}'})
              </label>
              <input
                id="burst-template"
                type="text"
                value={namingTemplate}
                onChange={(e) => setNamingTemplate(e.target.value)}
                placeholder="Invoice_{match}.pdf"
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          {file && (
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleUpdatePlan}
                disabled={loading}
              >
                Re-calculate Burst Plan
              </Button>
            </div>
          )}
        </div>

        {/* Upload Zone */}
        {!file && (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Upload className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-foreground">
              Select or Drop Multi-Document PDF
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Batch statements, consolidated invoices, payroll slips, or tax
              reports.
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

        {/* Loading */}
        {loading && (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-3 text-sm font-medium text-foreground">
              Analyzing text streams and calculating document boundaries...
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-lg border border-border bg-muted p-4 text-sm text-foreground">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span>Notice</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{error}</p>
          </div>
        )}

        {/* Plan Results */}
        {plan && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-5">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Burst Segmentation Plan
                </span>
                <p className="text-base font-medium text-foreground">
                  {file?.name}: {plan.totalSourcePages} pages partitioned into{' '}
                  {plan.segments.length} documents
                </p>
              </div>
              <Button
                data-receipt-download
                onClick={handleExecuteBurst}
                disabled={executing || plan.segments.length === 0}
                className="inline-flex items-center gap-2"
              >
                <Scissors className="h-4 w-4" />
                Burst &amp; Download Documents
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Doc #</th>
                    <th className="px-4 py-3">Output Filename</th>
                    <th className="px-4 py-3">Page Range</th>
                    <th className="px-4 py-3">Pages</th>
                    <th className="px-4 py-3">Matched Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {plan.segments.map((seg) => (
                    <tr
                      key={seg.segmentIndex}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {seg.segmentIndex}
                      </td>
                      <td className="px-4 py-3 font-semibold font-mono text-foreground">
                        {seg.filename}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono">
                        Page {seg.startPage} – {seg.endPage}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {seg.pageCount}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-foreground">
                        {seg.matchedText || '—'}
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
