'use client';

import {
  ArrowRight,
  CheckCircle2,
  Clipboard,
  Download,
  FileCode2,
  LockKeyhole,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { RelatedTools } from '@/components/related-tools';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import type { RelatedTool } from '@/lib/seo/related-tools';
import { convertTable, type TableFormat } from '@/lib/tools/notation/table';

/*
  One file-format pair, pre-set, with the worked example beside it produced at
  build time by the same functions this component calls in the browser.

  `app/convert/[pair]/page.tsx` computes the view and passes it in; the pair
  registry -- a hundred and three entries -- stays on the server, exactly as the
  unit-pair page keeps its five hundred and twelve out of the client bundle.
  The type is declared here rather than imported for the same reason.
*/
export interface FormatPairView {
  title: string;
  summary: string;
  /** What the conversion measurably does, in the converter's own numbers. */
  measured: string;
  /** The fixture written in the source format. */
  sample: string;
  /** What the converter returned for it when the page was built. */
  output: string;
  from: string;
  to: string;
  /** Format token -> display name, for the two selects. */
  formats: Record<string, string>;
  /** `${from}|${to}` -> the page that answers it. */
  routes: Record<string, string>;
  /** Extension a download gets. */
  extension: string;
}

/** A pair page's siblings: the reverse first, then out of and into this one. */
function relatedPairs(pair: FormatPairView) {
  return Object.entries(pair.routes)
    .map(([key, href]) => {
      const [from = '', to = ''] = key.split('|');
      return {
        from,
        to,
        href,
        label: `${pair.formats[from] ?? from} to ${pair.formats[to] ?? to}`,
      };
    })
    .filter((entry) => entry.from !== pair.from || entry.to !== pair.to)
    .map((entry) => ({
      ...entry,
      rank:
        entry.from === pair.to && entry.to === pair.from
          ? 0
          : entry.from === pair.from
            ? 1
            : entry.to === pair.to
              ? 2
              : 3,
    }))
    .filter((entry) => entry.rank < 3)
    .sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label))
    .slice(0, 14);
}

export function FormatConverterTool({
  pair,
  index,
  relatedTools = [],
}: {
  pair: FormatPairView;
  /** Every pair, for the hub page; omitted on a pair page. */
  index?: readonly { href: string; label: string }[];
  /** Built by `lib/seo/related-tools.ts` in the route file; see there. */
  relatedTools?: readonly RelatedTool[];
}) {
  const [input, setInput] = useState(pair.sample);
  const [output, setOutput] = useState(pair.output);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  const siblings = useMemo(() => relatedPairs(pair), [pair]);
  const formatOptions = useMemo(
    () => Object.entries(pair.formats),
    [pair.formats],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!input.trim()) {
        setOutput('');
        setError('');
        return;
      }
      try {
        const converted = convertTable(
          input,
          pair.from as TableFormat,
          pair.to as TableFormat,
        );
        setOutput(converted);
        setError('');
        announceCompletion({
          operation: pair.title,
          durationMs: 0,
          summary: pair.summary,
          metrics: [
            { label: 'Output', value: `${converted.split('\n').length} lines` },
            { label: 'Format', value: pair.formats[pair.to] ?? pair.to },
          ],
        });
      } catch (caught) {
        setOutput('');
        setError(
          caught instanceof Error
            ? caught.message
            : 'That input could not be read as this format.',
        );
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [input, pair]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  /*
    Picking different formats is a different question, so it goes to that
    question's page rather than leaving the title, the description and the
    worked example describing a conversion the tool is no longer doing. Seven
    combinations are answered by a hand-written page elsewhere on the site; the
    route table carries their address too, so those go there instead of 404ing.
  */
  const choose = (side: 'from' | 'to', value: string) => {
    const from = side === 'from' ? value : pair.from;
    const to = side === 'to' ? value : pair.to;
    const href = pair.routes[`${from}|${to}`];
    if (href) window.location.assign(href);
  };

  const copy = () => {
    void navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  const download = () => {
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `converted.${pair.extension}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell currentToolId="format-converter">
      <section
        id="tool"
        tabIndex={-1}
        className="min-w-0 px-4 py-7 sm:px-8 lg:px-10 lg:py-9"
      >
        <div className="mx-auto max-w-5xl">
          <header className="flex flex-col justify-between gap-5 border-b pb-7 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                File formats / {formatOptions.length} formats, every pair
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                {pair.title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                {pair.summary}
              </p>
            </div>
            <span className="flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold">
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              On-device prototype
            </span>
          </header>

          {/*
            The part of the page that is only true of this pair. Both strings
            were produced at build time by running the converter on one
            fixture, so the example and the tool cannot disagree.
          */}
          <section className="mt-6 rounded-xl border bg-card p-4 sm:p-5">
            <h2 className="text-base font-semibold">
              {pair.formats[pair.from] ?? pair.from} to{' '}
              {pair.formats[pair.to] ?? pair.to}, worked out
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {pair.measured}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">
                  {pair.formats[pair.from] ?? pair.from} in
                </p>
                <pre className="mt-2 max-h-52 overflow-auto whitespace-pre rounded-lg bg-muted p-3 font-mono text-xs leading-5">
                  {pair.sample}
                </pre>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">
                  {pair.formats[pair.to] ?? pair.to} out
                </p>
                <pre className="mt-2 max-h-52 overflow-auto whitespace-pre rounded-lg bg-muted p-3 font-mono text-xs leading-5">
                  {pair.output}
                </pre>
              </div>
            </div>
          </section>

          <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
            <label className="text-sm font-semibold">
              From
              <select
                value={pair.from}
                onChange={(event) => choose('from', event.target.value)}
                className="focus-ring mt-2 h-11 w-full rounded-lg border bg-background px-3 text-sm"
              >
                {formatOptions.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <ArrowRight
              aria-hidden="true"
              className="mb-3 hidden size-4 text-muted-foreground sm:block"
            />
            <label className="text-sm font-semibold">
              To
              <select
                value={pair.to}
                onChange={(event) => choose('to', event.target.value)}
                className="focus-ring mt-2 h-11 w-full rounded-lg border bg-background px-3 text-sm"
              >
                {formatOptions.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error ? (
            <div
              ref={errorRef}
              role="alert"
              tabIndex={-1}
              className="focus-ring mt-4 rounded-lg border border-destructive/35 bg-destructive/5 p-3 text-sm"
            >
              <p className="font-semibold">
                Couldn’t read that as {pair.formats[pair.from] ?? pair.from}
              </p>
              <p className="mt-1 text-muted-foreground">{error}</p>
            </div>
          ) : null}

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border bg-card p-4 sm:p-5">
              <label
                htmlFor="format-input"
                className="flex items-center gap-2 text-sm font-semibold"
              >
                <FileCode2 aria-hidden="true" className="size-4" />
                Your {pair.formats[pair.from] ?? pair.from}
              </label>
              <textarea
                id="format-input"
                value={input}
                spellCheck={false}
                onChange={(event) => setInput(event.target.value)}
                rows={14}
                className="focus-ring mt-2 w-full rounded-lg border bg-background p-3 font-mono text-sm"
              />
            </section>

            <section
              aria-live="polite"
              className="rounded-xl border bg-card p-4 sm:p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2
                    aria-hidden="true"
                    className="size-4 text-success"
                  />
                  {pair.formats[pair.to] ?? pair.to} result
                </h2>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Copy result"
                    onClick={copy}
                    disabled={!output}
                  >
                    <Clipboard aria-hidden="true" className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Download .${pair.extension}`}
                    data-receipt-download
                    onClick={download}
                    disabled={!output}
                  >
                    <Download aria-hidden="true" className="size-4" />
                  </Button>
                </div>
              </div>
              {copied ? (
                <p className="mt-2 text-xs text-muted-foreground">Copied.</p>
              ) : null}
              <pre className="mt-2 h-[21rem] overflow-auto whitespace-pre rounded-lg bg-muted p-3 font-mono text-sm leading-6">
                {output}
              </pre>
            </section>
          </div>

          {index ? (
            <section className="mt-6 rounded-xl border bg-card p-4 sm:p-5">
              <h2 className="text-base font-semibold">
                Every conversion, one page each
              </h2>
              <ul className="mt-3 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                {index.map((entry) => (
                  <li key={entry.href}>
                    <a
                      href={entry.href}
                      className="focus-ring block rounded px-1 py-1 text-sm text-muted-foreground hover:text-foreground"
                    >
                      {entry.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : siblings.length > 0 ? (
            <section className="mt-6 rounded-xl border bg-card p-4 sm:p-5">
              <h2 className="text-base font-semibold">
                Conversions next to this one
              </h2>
              <ul className="mt-3 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                {siblings.map((entry) => (
                  <li key={entry.href}>
                    <a
                      href={entry.href}
                      className="focus-ring block rounded px-1 py-1 text-sm text-muted-foreground hover:text-foreground"
                    >
                      {entry.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {relatedTools.length > 0 ? (
            <RelatedTools tools={relatedTools} />
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}
