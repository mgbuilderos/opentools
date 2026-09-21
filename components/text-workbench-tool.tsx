/* oxlint-disable */
'use client';

import {
  ArrowDownToLine,
  Check,
  CheckCircle2,
  Clipboard,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Type,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { RelatedTools } from '@/components/related-tools';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import type { RelatedTool } from '@/lib/seo/related-tools';
import {
  runTextOperation,
  TEXT_OPERATIONS,
  type TextOperationId,
  type TextOperationOptions,
} from '@/lib/tools/text-workbench';

const TEXT_LIMIT = 2_000_000;

function duration(value: number) {
  return value < 1000
    ? `${value.toFixed(1)} ms`
    : `${(value / 1000).toFixed(2)} s`;
}

function downloadText(value: string) {
  const url = URL.createObjectURL(
    new Blob([value], { type: 'text/plain;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = 'text-workbench-result.txt';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

/*
  `initialOperationId` and `routedBasePath` let this workbench also serve as one
  tool on its own page. All 33 text tools used to answer on /text/workbench
  behind a `?tool=` parameter with one shared title, so none could rank for its
  own name and none reached the sitemap. app/text/[tool]/page.tsx now renders
  this component once per operation at /text/<id>. Unset, behaviour is
  unchanged and /text/workbench keeps working.
*/
export function TextWorkbenchTool({
  initialOperationId,
  routedBasePath,
  relatedTools = [],
}: {
  initialOperationId?: string;
  routedBasePath?: string;
  /** Built by `lib/seo/related-tools.ts` in the route file; see there. */
  relatedTools?: readonly RelatedTool[];
} = {}) {
  const routed = TEXT_OPERATIONS.find((item) => item.id === initialOperationId);
  const [operationId, setOperationId] = useState<TextOperationId>(
    (routed?.id as TextOperationId) ?? 'word-counter',
  );
  const [input, setInput] = useState('');
  const [find, setFind] = useState('');
  const [replacement, setReplacement] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(true);
  const [numericOption, setNumericOption] = useState(3);
  const [separator, setSeparator] = useState(',');
  const [normalization, setNormalization] =
    useState<TextOperationOptions['normalization']>('NFC');
  const [sortDirection, setSortDirection] =
    useState<TextOperationOptions['sortDirection']>('ascending');
  const [candidates, setCandidates] = useState('');
  const [output, setOutput] = useState('');
  const [summary, setSummary] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  const operation = useMemo(
    () =>
      TEXT_OPERATIONS.find((item) => item.id === operationId) ??
      TEXT_OPERATIONS[0],
    [operationId],
  );

  // The URL decides which operation is open, and it has to keep deciding
  // after hydration. In production Cloudflare injects its analytics beacon
  // into the HTML at the edge, so the served markup is not what React
  // rendered; when React recovers from that it rebuilds the tree, and a
  // one-shot selection scheduled in an effect is thrown away with it.
  // Re-applying whenever the URL and the state disagree converges rather
  // than racing, and costs nothing once they agree. Same fix as
  // SchemaWorkbenchTool; these three were missed by it.
  // oxlint-disable-next-line react/react-compiler -- this effect exists to
  // synchronise React state to an external system, the address bar, which is
  // what the rule's own guidance says an effect is for.
  useEffect(() => {
    if (routed) return; // The path decides on a per-tool page.
    const requested = new URLSearchParams(window.location.search).get('tool');
    if (!requested || requested === operationId) return;
    if (!TEXT_OPERATIONS.some((item) => item.id === requested)) {
      // A URL must not claim an operation the page is not showing.
      const url = new URL(window.location.href);
      url.searchParams.set('tool', 'word-counter');
      window.history.replaceState(null, '', `${url.pathname}${url.search}`);
      return;
    }
    setOperationId(requested as TextOperationId);
  }, [operationId]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const clearResult = () => {
    setOutput('');
    setSummary('');
    setError('');
  };

  const selectOperation = (next: TextOperationId) => {
    // On a per-tool page each tool is a real page: go to it.
    if (routed) {
      window.location.assign(`${routedBasePath}/${next}`);
      return;
    }
    setOperationId(next);
    clearResult();
    const url = new URL(window.location.href);
    url.searchParams.set('tool', next);
    window.history.replaceState(null, '', `${url.pathname}${url.search}`);
  };

  const run = () => {
    const started = performance.now();
    try {
      if (input.length > TEXT_LIMIT) {
        throw new Error(
          'Text is limited to 2,000,000 characters in this candidate.',
        );
      }
      const result = runTextOperation(operationId, input, {
        find,
        replacement,
        caseSensitive,
        repeatCount: numericOption,
        count: numericOption,
        separator,
        normalization,
        sortDirection,
        candidates,
      });
      const completedIn = performance.now() - started;
      setOutput(result.output);
      setSummary(result.summary);
      setElapsed(completedIn);
      setError('');
      announceCompletion({
        operation: operation.name,
        durationMs: completedIn,
        summary: result.summary,
        metrics: [
          { label: 'Input', value: `${input.length.toLocaleString()} chars` },
          {
            label: 'Output',
            value: `${result.output.length.toLocaleString()} chars`,
          },
        ],
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'The text operation could not be completed.',
      );
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      // Nothing to work on yet. Every operation here throws "Enter some text
      // first." on empty input, and this effect runs once on mount, so the
      // page opened with a red error box -- and the error effect above moved
      // keyboard focus onto it -- before the visitor had typed a character.
      // Measured on 31 of the routes the catalog advertises.
      if (!input) {
        clearResult();
        return;
      }
      run();
    }, 250);
    return () => clearTimeout(timer);
  }, [
    operationId,
    input,
    find,
    replacement,
    caseSensitive,
    numericOption,
    separator,
    normalization,
    sortDirection,
    candidates,
  ]);

  return (
    <AppShell currentToolId="text-workbench">
      <section
        id="tool"
        tabIndex={-1}
        className="min-w-0 px-4 py-7 sm:px-8 lg:px-10 lg:py-9"
      >
        <div className="mx-auto max-w-5xl">
          <header className="flex flex-col justify-between gap-5 border-b pb-7 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Text & data / 33 related tools
              </p>
              {/* On a per-tool page the heading is the tool, not the workspace. */}
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                {routed ? routed.name : 'Text workbench'}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                {routed
                  ? routed.description
                  : 'Count, clean, transform, inspect, and translate text in one compact local workspace.'}
              </p>
            </div>
            <span className="flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold">
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              On-device prototype
            </span>
          </header>

          <div className="mt-6 grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
            <section className="rounded-xl border bg-card p-4">
              <label htmlFor="text-operation" className="text-sm font-semibold">
                Text tool
              </label>
              <select
                id="text-operation"
                value={operationId}
                onChange={(event) =>
                  selectOperation(event.target.value as TextOperationId)
                }
                className="focus-ring mt-2 h-11 w-full rounded-lg border bg-background px-3 text-sm"
              >
                {TEXT_OPERATIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <div className="mt-4 rounded-lg bg-muted p-3">
                <Type aria-hidden="true" className="size-4" />
                <p className="mt-2 text-sm font-semibold">{operation.name}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {operation.description}
                </p>
              </div>
            </section>

            <section className="rounded-xl border bg-card p-4 sm:p-5">
              {error ? (
                <div
                  ref={errorRef}
                  role="alert"
                  tabIndex={-1}
                  className="focus-ring mb-4 rounded-lg border border-destructive/35 bg-destructive/5 p-3 text-sm"
                >
                  <p className="font-semibold">Couldn’t create a result</p>
                  <p className="mt-1 text-muted-foreground">{error}</p>
                </div>
              ) : null}

              {operation.needsInput === false ? null : (
                <div>
                  <label
                    htmlFor="text-workbench-input"
                    className="text-sm font-semibold"
                  >
                    {operation.inputLabel}
                  </label>
                  <textarea
                    id="text-workbench-input"
                    value={input}
                    onChange={(event) => {
                      setInput(event.target.value);
                    }}
                    spellCheck={false}
                    className="focus-ring mt-2 min-h-56 w-full resize-y rounded-lg border bg-muted/45 p-4 font-mono text-sm leading-6"
                    placeholder="Paste or type text here"
                  />
                </div>
              )}

              {operation.optionKind === 'find' ||
              operation.optionKind === 'regex' ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-semibold">
                    {operation.optionKind === 'regex'
                      ? 'Regular expression'
                      : 'Find'}
                    <input
                      value={find}
                      onChange={(event) => {
                        setFind(event.target.value);
                      }}
                      className="focus-ring mt-2 h-11 w-full rounded-lg border bg-background px-3 font-mono text-sm"
                    />
                  </label>
                  <label className="text-sm font-semibold">
                    Replace with
                    <input
                      value={replacement}
                      onChange={(event) => {
                        setReplacement(event.target.value);
                      }}
                      className="focus-ring mt-2 h-11 w-full rounded-lg border bg-background px-3 font-mono text-sm"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={caseSensitive}
                      onChange={(event) => {
                        setCaseSensitive(event.target.checked);
                      }}
                    />
                    Case sensitive
                  </label>
                </div>
              ) : null}

              {operation.optionKind === 'repeat' ||
              operation.optionKind === 'count' ? (
                <label className="mt-4 block max-w-xs text-sm font-semibold">
                  {operation.optionKind === 'repeat'
                    ? 'Repeat count'
                    : 'Number to generate'}
                  <input
                    type="number"
                    min={1}
                    max={operation.id === 'lorem-ipsum-generator' ? 20 : 100}
                    value={numericOption}
                    onChange={(event) => {
                      setNumericOption(Number(event.target.value));
                    }}
                    className="focus-ring mt-2 h-11 w-full rounded-lg border bg-background px-3"
                  />
                </label>
              ) : null}

              {operation.optionKind === 'separator' ? (
                <label className="mt-4 block max-w-xs text-sm font-semibold">
                  Literal separator
                  <input
                    value={separator}
                    onChange={(event) => {
                      setSeparator(event.target.value);
                    }}
                    className="focus-ring mt-2 h-11 w-full rounded-lg border bg-background px-3 font-mono"
                  />
                </label>
              ) : null}

              {operation.optionKind === 'normalization' ? (
                <label className="mt-4 block max-w-xs text-sm font-semibold">
                  Unicode form
                  <select
                    value={normalization}
                    onChange={(event) => {
                      setNormalization(
                        event.target
                          .value as TextOperationOptions['normalization'],
                      );
                    }}
                    className="focus-ring mt-2 h-11 w-full rounded-lg border bg-background px-3"
                  >
                    <option>NFC</option>
                    <option>NFD</option>
                    <option>NFKC</option>
                    <option>NFKD</option>
                  </select>
                </label>
              ) : null}

              {operation.optionKind === 'sort' ? (
                <label className="mt-4 block max-w-xs text-sm font-semibold">
                  Sort direction
                  <select
                    value={sortDirection}
                    onChange={(event) => {
                      setSortDirection(
                        event.target
                          .value as TextOperationOptions['sortDirection'],
                      );
                    }}
                    className="focus-ring mt-2 h-11 w-full rounded-lg border bg-background px-3"
                  >
                    <option value="ascending">Ascending</option>
                    <option value="descending">Descending</option>
                  </select>
                </label>
              ) : null}

              {operation.optionKind === 'candidates' ? (
                <label className="mt-4 block text-sm font-semibold">
                  Candidate words · one per line
                  <textarea
                    value={candidates}
                    onChange={(event) => {
                      setCandidates(event.target.value);
                    }}
                    className="focus-ring mt-2 min-h-28 w-full rounded-lg border bg-background p-3 font-mono text-sm"
                  />
                </label>
              ) : null}

              <div className="mt-4 flex justify-end min-h-11 items-center">
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Sparkles
                    aria-hidden="true"
                    className="size-4 text-muted-foreground/50"
                  />
                  Auto-running locally
                </span>
              </div>
            </section>
          </div>

          {output ? (
            <section
              aria-live="polite"
              className="mt-4 overflow-hidden rounded-xl border bg-card"
            >
              <div className="flex items-start justify-between gap-4 p-4 sm:p-5">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 text-base font-semibold">
                    <CheckCircle2
                      aria-hidden="true"
                      className="size-5 text-success"
                    />
                    Done — {summary}
                  </h2>
                  <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-4 font-mono text-sm leading-6">
                    {output}
                  </pre>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Copy result"
                    onClick={() => {
                      navigator.clipboard
                        .writeText(output)
                        .then(() => {
                          setCopied(true);
                          window.setTimeout(() => setCopied(false), 1800);
                        })
                        .catch(() => setCopied(false));
                    }}
                  >
                    {copied ? (
                      <Check aria-hidden="true" />
                    ) : (
                      <Clipboard aria-hidden="true" />
                    )}
                  </Button>
                  <Button
                    data-receipt-download
                    variant="ghost"
                    size="icon"
                    aria-label="Download result"
                    onClick={() => downloadText(output)}
                  >
                    <ArrowDownToLine aria-hidden="true" />
                  </Button>
                </div>
              </div>
              <div className="grid border-t sm:grid-cols-3">
                <div className="border-b p-4 sm:border-b-0 sm:border-r">
                  <p className="text-xs text-muted-foreground">Processing</p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
                    <ShieldCheck
                      aria-hidden="true"
                      className="size-4 text-success"
                    />
                    In this tab
                  </p>
                </div>
                <div className="border-b p-4 sm:border-b-0 sm:border-r">
                  <p className="text-xs text-muted-foreground">Completed in</p>
                  <p className="tabular mt-1 text-sm font-semibold">
                    {duration(elapsed)}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-muted-foreground">Input</p>
                  <p className="tabular mt-1 text-sm font-semibold">
                    {input.length.toLocaleString()} characters
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          <RelatedTools tools={relatedTools} />

          <footer className="mt-8 border-t py-5 text-xs text-muted-foreground">
            Local JavaScript · 2,000,000-character limit · No client-side
            analytics · Formal multi-browser egress proof pending
          </footer>
        </div>
      </section>
    </AppShell>
  );
}
