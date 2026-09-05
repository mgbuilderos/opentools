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
import { Button } from '@/components/ui/button';
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

export function TextWorkbenchTool() {
  const [operationId, setOperationId] =
    useState<TextOperationId>('word-counter');
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

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('tool');
    if (TEXT_OPERATIONS.some((item) => item.id === requested)) {
      const frame = requestAnimationFrame(() =>
        setOperationId(requested as TextOperationId),
      );
      return () => cancelAnimationFrame(frame);
    }
  }, []);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const clearResult = () => {
    setOutput('');
    setSummary('');
    setError('');
  };

  const selectOperation = (next: TextOperationId) => {
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
      setOutput(result.output);
      setSummary(result.summary);
      setElapsed(performance.now() - started);
      setError('');
    } catch (caught) {
      setOutput('');
      setSummary('');
      setError(
        caught instanceof Error
          ? caught.message
          : 'The text operation could not be completed.',
      );
    }
  };

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
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Text workbench
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Count, clean, transform, inspect, and translate text in one
                compact local workspace.
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
                      clearResult();
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
                        clearResult();
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
                        clearResult();
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
                        clearResult();
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
                      clearResult();
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
                      clearResult();
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
                      clearResult();
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
                      clearResult();
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
                      clearResult();
                    }}
                    className="focus-ring mt-2 min-h-28 w-full rounded-lg border bg-background p-3 font-mono text-sm"
                  />
                </label>
              ) : null}

              <div className="mt-4 flex justify-end">
                <Button
                  className="h-11 min-w-44"
                  disabled={operation.needsInput !== false && !input}
                  onClick={run}
                >
                  <Sparkles aria-hidden="true" />
                  Run {operation.name}
                </Button>
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

          <footer className="mt-8 border-t py-5 text-xs text-muted-foreground">
            Local JavaScript · 2,000,000-character limit · No analytics · Formal
            multi-browser egress proof pending
          </footer>
        </div>
      </section>
    </AppShell>
  );
}
