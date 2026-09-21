/* oxlint-disable */
'use client';

import {
  Calculator,
  Check,
  CheckCircle2,
  Clipboard,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import {
  MATH_OPERATIONS,
  runMathOperation,
  type MathOperation,
} from '@/lib/tools/math-workbench';

function defaults(operation: MathOperation) {
  return Object.fromEntries(
    operation.fields.map((field) => [field.id, field.defaultValue]),
  );
}

function elapsed(value: number) {
  return value < 1000
    ? `${value.toFixed(1)} ms`
    : `${(value / 1000).toFixed(2)} s`;
}

/*
  One from->to unit pair, pre-set, with the facts about it worked out at build
  time by the same function the tool runs. `app/convert/[pair]/page.tsx`
  computes this and passes it in; nothing here is written by hand, so the
  sentence above the converter and the number the converter returns cannot
  disagree. The type is declared here rather than imported so that the pair
  registry -- 512 entries -- stays out of the client bundle.
*/
export interface ConversionPairView {
  title: string;
  summary: string;
  /** What the numbers prove about this pair; '' when nothing was proved. */
  relationship: string;
  examples: readonly { input: string; output: string }[];
  from: string;
  to: string;
  /** Unit key -> label, for this converter only. */
  units: Record<string, string>;
  /** `${from}|${to}` -> pair slug, for this converter only. */
  routes: Record<string, string>;
}

/** The reverse pair first, then the other conversions out of and into it. */
function relatedPairs(pair: ConversionPairView) {
  const label = (from: string, to: string) =>
    `${pair.units[from] ?? from} to ${pair.units[to] ?? to}`;
  return Object.entries(pair.routes)
    .map(([key, slug]) => {
      const [from = '', to = ''] = key.split('|');
      return { from, to, slug, label: label(from, to) };
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
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 12);
}

/*
  `initialOperationId` is what gives each calculator its own address.

  All 67 of these used to answer on one URL, `/math/workbench?tool=<id>`, with
  one title for all of them — so "median calculator" and "margin of error
  calculator" were the same page as far as a search engine is concerned, and
  neither could rank for its own name. `app/math/[tool]/page.tsx` now renders
  this same component once per operation at `/math/<id>`, with that
  operation's own title and description.

  When the prop is set, the path already decides which tool is open, so the
  query-string sync below stands down and picking another tool navigates to
  that tool's page instead of rewriting a parameter. `/math/workbench` keeps
  working unchanged for anyone who has it bookmarked.
*/
export function MathWorkbenchTool({
  initialOperationId,
  pair,
}: {
  initialOperationId?: string;
  pair?: ConversionPairView;
} = {}) {
  const routed = MATH_OPERATIONS.find((item) => item.id === initialOperationId);
  const [operationId, setOperationId] = useState(
    routed?.id ?? 'basic-calculator',
  );
  const operation = useMemo(
    () =>
      MATH_OPERATIONS.find((item) => item.id === operationId) ??
      MATH_OPERATIONS[0],
    [operationId],
  );
  const [values, setValues] = useState<Record<string, string>>(() => ({
    ...defaults(routed ?? MATH_OPERATIONS[0]),
    // The pair in the URL is the pair the converter opens on. Without this the
    // page would promise "centimetres to inches" and show the converter's own
    // default units, which is the mismatch the whole route exists to end.
    ...(pair ? { from: pair.from, to: pair.to } : {}),
  }));
  const [output, setOutput] = useState('');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

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
    const selected = MATH_OPERATIONS.find((item) => item.id === requested);
    if (!selected) {
      // A URL must not claim an operation the page is not showing.
      const url = new URL(window.location.href);
      url.searchParams.set('tool', MATH_OPERATIONS[0].id);
      window.history.replaceState(null, '', `${url.pathname}${url.search}`);
      return;
    }
    setOperationId(selected.id);
    setValues(defaults(selected));
  }, [operationId]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const selectOperation = (nextId: string) => {
    const next =
      MATH_OPERATIONS.find((item) => item.id === nextId) ?? MATH_OPERATIONS[0];
    // On a per-tool page, each tool is a real page: go to it, so the address
    // bar, the back button and a crawler all agree on what is open.
    if (routed) {
      window.location.assign(`/math/${next.id}`);
      return;
    }
    setOperationId(next.id);
    setValues(defaults(next));
    setOutput('');
    setError('');
    const url = new URL(window.location.href);
    url.searchParams.set('tool', next.id);
    window.history.replaceState(null, '', `${url.pathname}${url.search}`);
  };

  const update = (id: string, value: string) => {
    // On a pair page the units are the address. Choosing different ones means
    // a different question, so it goes to that question's page rather than
    // leaving the title, the factor and the worked examples describing a
    // conversion the converter is no longer doing. A combination with no page
    // of its own -- the same unit twice, or a pair another converter already
    // answers -- is just applied here.
    if (pair && (id === 'from' || id === 'to')) {
      const from = id === 'from' ? value : values.from;
      const to = id === 'to' ? value : values.to;
      const slug = pair.routes[`${from}|${to}`];
      if (slug) {
        window.location.assign(`/convert/${slug}`);
        return;
      }
    }
    setValues((current) => ({ ...current, [id]: value }));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      calculate();
    }, 250);
    return () => clearTimeout(timer);
  }, [values, operation.id]);

  const calculate = () => {
    const started = performance.now();
    try {
      const nextOutput = runMathOperation(operation.id, values);
      const completedIn = performance.now() - started;
      setOutput(nextOutput);
      setDuration(completedIn);
      setError('');
      announceCompletion({
        operation: operation.name,
        durationMs: completedIn,
        summary: operation.description,
        metrics: [{ label: 'Result', value: 'Ready' }],
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'The calculation could not be completed.',
      );
    }
  };

  return (
    <AppShell currentToolId="math-workbench">
      <section
        id="tool"
        tabIndex={-1}
        className="min-w-0 px-4 py-7 sm:px-8 lg:px-10 lg:py-9"
      >
        <div className="mx-auto max-w-5xl">
          <header className="flex flex-col justify-between gap-5 border-b pb-7 sm:flex-row sm:items-start">
            <div>
              {/*
                On a per-tool page the heading is the tool, not the workspace.
                A page titled "Median calculator" whose only <h1> reads "Math &
                unit workbench" is telling a reader and a search engine two
                different things about what it is, and the heading is the one
                they both weigh most.
              */}
              <p className="text-xs font-medium text-muted-foreground">
                {pair
                  ? `Unit conversion / ${operation.name}`
                  : `Calculators / ${MATH_OPERATIONS.length} related tools`}
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                {pair
                  ? pair.title
                  : routed
                    ? routed.name
                    : 'Math & unit workbench'}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                {/*
                  `local-source-policy.test.ts` bans the no-upload phrasing as
                  an unproved release claim (rule 23, decision 15), comments
                  included, and the guard is right: a page may describe where
                  the work happens, which is a fact about the code, but it may
                  not assert a result about the wire that only the egress
                  protocol establishes. That evidence lives on /proof.
                */}
                {pair
                  ? pair.summary
                  : routed
                    ? `${routed.description} It runs in this browser tab.`
                    : 'Arithmetic, statistics, number theory, geometry, and unit conversion in one local workspace.'}
              </p>
            </div>
            <span className="flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold">
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              On-device prototype
            </span>
          </header>

          {/*
            The part of the page that is only true of this pair, and the reason
            the route is not another near-template family. Every string below
            was produced at build time by running the converter, so the factor
            and the examples are the tool's own output rather than prose about
            it -- they cannot drift, and they are different on every page.
          */}
          {pair ? (
            <section className="mt-6 rounded-xl border bg-card p-4 sm:p-5">
              <h2 className="text-base font-semibold">
                {pair.units[pair.from] ?? pair.from} to{' '}
                {pair.units[pair.to] ?? pair.to}, worked out
              </h2>
              {pair.relationship ? (
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {pair.relationship}
                </p>
              ) : null}
              <dl className="tabular mt-4 grid gap-2 sm:grid-cols-2">
                {pair.examples.map((example) => (
                  <div
                    key={example.input}
                    className="flex items-baseline justify-between gap-3 rounded-lg bg-muted px-3 py-2 font-mono text-sm"
                  >
                    <dt>{example.input}</dt>
                    <dd className="font-semibold">= {example.output}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          <div className="mt-6 grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
            <section className="rounded-xl border bg-card p-4">
              <label htmlFor="math-operation" className="text-sm font-semibold">
                Calculator
              </label>
              <select
                id="math-operation"
                value={operation.id}
                onChange={(event) => selectOperation(event.target.value)}
                className="focus-ring mt-2 h-11 w-full rounded-lg border bg-background px-3 text-sm"
              >
                {MATH_OPERATIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <div className="mt-4 rounded-lg bg-muted p-3">
                <Calculator aria-hidden="true" className="size-4" />
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
                  <p className="font-semibold">Couldn’t calculate a result</p>
                  <p className="mt-1 text-muted-foreground">{error}</p>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                {operation.fields.map((field) => (
                  <label key={field.id} className="text-sm font-semibold">
                    {field.label}
                    {field.type === 'select' ? (
                      <select
                        value={values[field.id] ?? field.defaultValue}
                        onChange={(event) =>
                          update(field.id, event.target.value)
                        }
                        className="focus-ring mt-2 h-11 w-full rounded-lg border bg-background px-3 text-sm"
                      >
                        {field.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        value={values[field.id] ?? ''}
                        placeholder={field.placeholder}
                        inputMode={field.type === 'number' ? 'decimal' : 'text'}
                        onChange={(event) =>
                          update(field.id, event.target.value)
                        }
                        className="focus-ring mt-2 h-11 w-full rounded-lg border bg-background px-3 font-mono text-sm"
                      />
                    )}
                  </label>
                ))}
              </div>
              <div className="mt-5 flex justify-end min-h-11 items-center">
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Sparkles
                    aria-hidden="true"
                    className="size-4 text-muted-foreground/50"
                  />
                  Auto-calculating
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
                    Done — {operation.name}
                  </h2>
                  <pre className="mt-3 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-4 font-mono text-base leading-7">
                    {output}
                  </pre>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Copy result"
                  /* The completion card is offered off this click. Copying is
                     this tool's "download": it has no file to save. */
                  data-receipt-download=""
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
                    {elapsed(duration)}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-muted-foreground">Method</p>
                  <p className="mt-1 text-sm font-semibold">
                    Deterministic local formula
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          {/*
            Without these every pair page is reachable only from the sitemap.
            The reverse conversion comes first because it is the one people
            want next, then the rest of this converter's grid.
          */}
          {pair ? (
            <nav
              aria-label="Related conversions"
              className="mt-8 border-t pt-6"
            >
              <h2 className="text-sm font-semibold">Related conversions</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {relatedPairs(pair).map((entry) => (
                  <li key={entry.slug}>
                    <a
                      href={`/convert/${entry.slug}`}
                      className="focus-ring inline-flex rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                    >
                      {entry.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          <footer className="mt-8 border-t py-5 text-xs leading-5 text-muted-foreground">
            Local JavaScript · Results use finite-number and exact-integer
            guards · Formula-specific assumptions are shown with each tool
          </footer>
        </div>
      </section>
    </AppShell>
  );
}
