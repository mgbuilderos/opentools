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

export function MathWorkbenchTool() {
  const [operationId, setOperationId] = useState('basic-calculator');
  const operation = useMemo(
    () =>
      MATH_OPERATIONS.find((item) => item.id === operationId) ??
      MATH_OPERATIONS[0],
    [operationId],
  );
  const [values, setValues] = useState<Record<string, string>>(() =>
    defaults(MATH_OPERATIONS[0]),
  );
  const [output, setOutput] = useState('');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('tool');
    const selected = MATH_OPERATIONS.find((item) => item.id === requested);
    if (selected) {
      const frame = requestAnimationFrame(() => {
        setOperationId(selected.id);
        setValues(defaults(selected));
      });
      return () => cancelAnimationFrame(frame);
    }
  }, []);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const selectOperation = (nextId: string) => {
    const next =
      MATH_OPERATIONS.find((item) => item.id === nextId) ?? MATH_OPERATIONS[0];
    setOperationId(next.id);
    setValues(defaults(next));
    setOutput('');
    setError('');
    const url = new URL(window.location.href);
    url.searchParams.set('tool', next.id);
    window.history.replaceState(null, '', `${url.pathname}${url.search}`);
  };

  const update = (id: string, value: string) => {
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
              <p className="text-xs font-medium text-muted-foreground">
                Calculators / {MATH_OPERATIONS.length} related tools
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Math & unit workbench
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Arithmetic, statistics, number theory, geometry, and unit
                conversion in one local workspace.
              </p>
            </div>
            <span className="flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold">
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              On-device prototype
            </span>
          </header>

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

          <footer className="mt-8 border-t py-5 text-xs leading-5 text-muted-foreground">
            Local JavaScript · Results use finite-number and exact-integer
            guards · Formula-specific assumptions are shown with each tool
          </footer>
        </div>
      </section>
    </AppShell>
  );
}
