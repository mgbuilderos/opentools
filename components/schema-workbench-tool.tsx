'use client';

import {
  Check,
  CheckCircle2,
  Clipboard,
  Download,
  Gauge,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';

interface WorkbenchField {
  id: string;
  label: string;
  type: 'number' | 'text' | 'textarea' | 'select' | 'file';
  defaultValue: string;
  placeholder?: string;
  accept?: string;
  maxBytes?: number;
  options?: readonly { value: string; label: string }[];
}

interface WorkbenchOperation {
  id: string;
  name: string;
  description: string;
  fields: readonly WorkbenchField[];
  notice?: string;
  outputExtension?: string;
}

interface SchemaWorkbenchToolProps {
  currentToolId: string;
  eyebrow: string;
  title: string;
  introduction: string;
  selectorLabel: string;
  actionLabel: string;
  methodLabel: string;
  operations: readonly WorkbenchOperation[];
  initialOperationId: string;
  run: (
    operationId: string,
    values: Record<string, string>,
  ) => string | Promise<string>;
}

function defaults(operation: WorkbenchOperation) {
  return Object.fromEntries(
    operation.fields.map((field) => [field.id, field.defaultValue]),
  );
}

function elapsed(value: number) {
  return value < 1000
    ? `${value.toFixed(1)} ms`
    : `${(value / 1000).toFixed(2)} s`;
}

export function SchemaWorkbenchTool({
  currentToolId,
  eyebrow,
  title,
  introduction,
  selectorLabel,
  actionLabel,
  methodLabel,
  operations,
  initialOperationId,
  run,
}: SchemaWorkbenchToolProps) {
  const initial =
    operations.find((operation) => operation.id === initialOperationId) ??
    operations[0];
  const [operationId, setOperationId] = useState(initial.id);
  const operation = useMemo(
    () => operations.find((item) => item.id === operationId) ?? operations[0],
    [operationId, operations],
  );
  const [values, setValues] = useState<Record<string, string>>(() =>
    defaults(initial),
  );
  const [output, setOutput] = useState('');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [running, setRunning] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('tool');
    const selected = operations.find((item) => item.id === requested);
    if (selected) {
      const frame = requestAnimationFrame(() => {
        setOperationId(selected.id);
        setValues(defaults(selected));
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [operations]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const selectOperation = (nextId: string) => {
    const next = operations.find((item) => item.id === nextId) ?? operations[0];
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
    setOutput('');
    setError('');
  };

  const updateFile = (field: WorkbenchField, file?: File) => {
    setOutput('');
    setError('');
    if (!file) {
      setValues((current) => ({ ...current, [field.id]: '' }));
      return;
    }
    const maximum = field.maxBytes ?? 5_000_000;
    if (file.size > maximum) {
      setError(
        `Choose a file no larger than ${(maximum / 1_000_000).toFixed(1)} MB.`,
      );
      return;
    }
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') update(field.id, reader.result);
    });
    reader.addEventListener('error', () => {
      setError('The selected file could not be read in this browser.');
    });
    reader.readAsDataURL(file);
  };

  const execute = async () => {
    const started = performance.now();
    setRunning(true);
    try {
      setOutput(await run(operation.id, values));
      setDuration(performance.now() - started);
      setError('');
    } catch (caught) {
      setOutput('');
      setError(
        caught instanceof Error
          ? caught.message
          : 'The operation could not be completed.',
      );
    } finally {
      setRunning(false);
    }
  };

  const download = () => {
    const extension = operation.outputExtension ?? 'txt';
    const mime =
      extension === 'html'
        ? 'text/html'
        : extension === 'json'
          ? 'application/json'
          : extension === 'csv'
            ? 'text/csv'
            : extension === 'svg'
              ? 'image/svg+xml'
              : 'text/plain';
    const blob = new Blob([output], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${operation.id}.${extension}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell currentToolId={currentToolId}>
      <section
        id="tool"
        tabIndex={-1}
        className="min-w-0 px-4 py-7 sm:px-8 lg:px-10 lg:py-9"
      >
        <div className="mx-auto max-w-5xl">
          <header className="flex flex-col justify-between gap-5 border-b pb-6 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {eyebrow} / {operations.length} related tools
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                {title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                {introduction}
              </p>
            </div>
            <span className="flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold">
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              Runs in this tab
            </span>
          </header>

          <div className="mt-5 grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
            <section className="rounded-xl border bg-card p-4">
              <label
                htmlFor={`${currentToolId}-operation`}
                className="text-sm font-semibold"
              >
                {selectorLabel}
              </label>
              <select
                id={`${currentToolId}-operation`}
                value={operation.id}
                onChange={(event) => selectOperation(event.target.value)}
                className="focus-ring mt-2 h-11 w-full rounded-lg border bg-background px-3 text-sm"
              >
                {operations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <div className="mt-4 rounded-lg bg-muted p-3">
                <Gauge aria-hidden="true" className="size-4" />
                <p className="mt-2 text-sm font-semibold">{operation.name}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {operation.description}
                </p>
                {operation.notice ? (
                  <p className="mt-2 border-t pt-2 text-xs leading-5 text-muted-foreground">
                    {operation.notice}
                  </p>
                ) : null}
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
                  <p className="font-semibold">Couldn’t complete this tool</p>
                  <p className="mt-1 text-muted-foreground">{error}</p>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                {operation.fields.map((field) => (
                  <label
                    key={field.id}
                    className={`text-sm font-semibold ${field.type === 'textarea' ? 'sm:col-span-2' : ''}`}
                  >
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
                    ) : field.type === 'file' ? (
                      <>
                        <input
                          type="file"
                          accept={field.accept}
                          onChange={(event) =>
                            updateFile(field, event.target.files?.[0])
                          }
                          className="focus-ring mt-2 block min-h-11 w-full rounded-lg border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm file:font-semibold"
                        />
                        <span className="mt-1 block text-xs font-normal text-muted-foreground">
                          {values[field.id]
                            ? 'Selected and held only in this tab'
                            : 'No file selected'}
                        </span>
                      </>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        value={values[field.id] ?? ''}
                        placeholder={field.placeholder}
                        rows={6}
                        onChange={(event) =>
                          update(field.id, event.target.value)
                        }
                        className="focus-ring mt-2 min-h-32 w-full resize-y rounded-lg border bg-background px-3 py-2 font-mono text-sm leading-6"
                      />
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
              <div className="mt-5 flex justify-end">
                <Button
                  className="h-11 min-w-44"
                  disabled={running}
                  onClick={() => void execute()}
                >
                  <Sparkles aria-hidden="true" />
                  {running ? 'Working…' : actionLabel}
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
                <div className="min-w-0 grow">
                  <h2 className="flex items-center gap-2 text-base font-semibold">
                    <CheckCircle2
                      aria-hidden="true"
                      className="size-5 text-success"
                    />
                    Done — {operation.name}
                  </h2>
                  {operation.outputExtension === 'svg' ? (
                    <div className="mt-3 rounded-lg bg-muted p-4">
                      <Image
                        src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(output)}`}
                        alt={`${operation.name} result preview`}
                        width={720}
                        height={720}
                        unoptimized
                        className="mx-auto max-h-[34rem] max-w-full rounded-md bg-white object-contain"
                      />
                      <details className="mt-3 border-t pt-3">
                        <summary className="cursor-pointer text-xs font-semibold">
                          View SVG source
                        </summary>
                        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-5">
                          {output}
                        </pre>
                      </details>
                    </div>
                  ) : (
                    <pre className="mt-3 max-h-[34rem] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-4 font-mono text-sm leading-6">
                      {output}
                    </pre>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Download result as .${operation.outputExtension ?? 'txt'}`}
                    onClick={download}
                  >
                    <Download aria-hidden="true" />
                  </Button>
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
                </div>
              </div>
              <div className="grid border-t sm:grid-cols-3">
                <div className="border-b p-4 sm:border-b-0 sm:border-r">
                  <p className="text-xs text-muted-foreground">Privacy</p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
                    <ShieldCheck
                      aria-hidden="true"
                      className="size-4 text-success"
                    />
                    Nothing was uploaded
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
                  <p className="mt-1 text-sm font-semibold">{methodLabel}</p>
                </div>
              </div>
            </section>
          ) : null}

          <footer className="mt-7 border-t py-5 text-xs leading-5 text-muted-foreground">
            Local JavaScript · Inputs remain in this browser tab · Tool-specific
            assumptions and limits are stated before execution
          </footer>
        </div>
      </section>
    </AppShell>
  );
}
