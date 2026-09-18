/* oxlint-disable */
'use client';

import {
  Check,
  CheckCircle2,
  Clipboard,
  Download,
  FileArchive,
  Files,
  Gauge,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import {
  FILE_WORKBENCH_OPERATIONS,
  type FileWorkbenchOperation,
  type FileWorkbenchResult,
  runFileWorkbenchOperation,
} from '@/lib/tools/file-workbench';
import { useHandoffFile } from '@/lib/handoff';

function defaults(operation: FileWorkbenchOperation) {
  return Object.fromEntries(
    operation.fields.map((field) => [field.id, field.defaultValue]),
  );
}

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MiB`;
}

function elapsed(milliseconds: number) {
  return milliseconds < 1000
    ? `${milliseconds.toFixed(1)} ms`
    : `${(milliseconds / 1000).toFixed(2)} s`;
}

export function FileWorkbenchTool() {
  const initial = FILE_WORKBENCH_OPERATIONS[0];
  const [operationId, setOperationId] = useState(initial.id);
  const operation = useMemo(
    () =>
      FILE_WORKBENCH_OPERATIONS.find((item) => item.id === operationId) ??
      initial,
    [operationId, initial],
  );
  const [values, setValues] = useState<Record<string, string>>(() =>
    defaults(initial),
  );
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<FileWorkbenchResult | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [running, setRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  // The URL decides which operation is open, and it has to keep deciding
  // after hydration. In production Cloudflare injects its analytics beacon
  // into the HTML at the edge, so the served markup is not what React
  // rendered; when React recovers from that it rebuilds the tree, and a
  // one-shot selection scheduled in an effect is thrown away with it.
  // Re-applying whenever the URL and the state disagree converges rather
  // than racing, and costs nothing once they agree.
  // oxlint-disable-next-line react/react-compiler -- this effect exists to
  // synchronise React state to an external system, the address bar, which is
  // what the rule's own guidance says an effect is for.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('tool');
    if (!requested || requested === operationId) return;
    const selected = FILE_WORKBENCH_OPERATIONS.find(
      (item) => item.id === requested,
    );
    if (!selected) {
      // Match SchemaWorkbenchTool: a URL must not claim an operation the
      // page is not showing.
      const url = new URL(window.location.href);
      url.searchParams.set('tool', initial.id);
      window.history.replaceState(null, '', `${url.pathname}${url.search}`);
      return;
    }
    setOperationId(selected.id);
    setValues(defaults(selected));
  }, [operationId, initial.id]);

  useEffect(() => {
    inputRef.current?.toggleAttribute(
      'webkitdirectory',
      Boolean(operation.directory),
    );
  }, [operation.directory]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  // A file dropped into the smart dropzone on another page arrives here.
  useHandoffFile((file) => setFiles([file]));

  const selectOperation = (nextId: string) => {
    const next =
      FILE_WORKBENCH_OPERATIONS.find((item) => item.id === nextId) ?? initial;
    setOperationId(next.id);
    setValues(defaults(next));
    setFiles([]);
    setResult(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
    const url = new URL(window.location.href);
    url.searchParams.set('tool', next.id);
    window.history.replaceState(null, '', `${url.pathname}${url.search}`);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!running && (files.length > 0 || !operation.requiresFiles)) {
        void execute();
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [files, values, operation.id]);

  const execute = async () => {
    setRunning(true);
    setError('');
    const started = Date.now();
    try {
      if (files.some((file) => file.size > 256 * 1024 * 1024))
        throw new Error('Each selected file must be 256 MiB or smaller.');
      if (files.reduce((sum, file) => sum + file.size, 0) > 512 * 1024 * 1024)
        throw new Error('Selected files must total 512 MiB or less.');
      const inputs = await Promise.all(
        files.map(async (file) => {
          const bytes = new Uint8Array(await file.arrayBuffer());
          return {
            name: file.name,
            path: file.webkitRelativePath || file.name,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified,
            bytes,
          };
        }),
      );
      const nextResult = await runFileWorkbenchOperation(
        operation.id,
        values,
        inputs,
      );
      const completedIn = Date.now() - started;
      const inputBytes = files.reduce((sum, file) => sum + file.size, 0);
      setResult(nextResult);
      setDuration(completedIn);
      announceCompletion({
        operation: operation.name,
        durationMs: completedIn,
        summary: nextResult.summary,
        metrics: [
          { label: 'Files', value: String(files.length) },
          { label: 'Input', value: fileSize(inputBytes) },
          { label: 'Downloads', value: String(nextResult.downloads.length) },
        ],
      });
    } catch (caught) {
      setResult(null);
      setError(
        caught instanceof Error
          ? caught.message
          : 'The file operation could not be completed.',
      );
    } finally {
      setRunning(false);
    }
  };

  const download = (index: number) => {
    const generated = result?.downloads[index];
    if (!generated) return;
    const copy = new Uint8Array(generated.bytes.length);
    copy.set(generated.bytes);
    const url = URL.createObjectURL(new Blob([copy], { type: generated.type }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = generated.name;
    anchor.click();
    // Deferred by a tick, like every other download helper in this app: a
    // blob URL revoked in the same tick as the click can be gone before the
    // browser has fetched it.
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const selectedBytes = files.reduce((sum, file) => sum + file.size, 0);

  return (
    <AppShell currentToolId="file-workbench">
      <section
        id="tool"
        tabIndex={-1}
        className="min-w-0 px-4 py-7 sm:px-8 lg:px-10 lg:py-9"
      >
        <div className="mx-auto max-w-5xl">
          <header className="flex flex-col justify-between gap-5 border-b pb-6 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Files & local bytes / {FILE_WORKBENCH_OPERATIONS.length} related
                tools
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                File workbench
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Inspect, hash, split, join, rename, encode, and package selected
                bytes inside this browser tab. Originals are never overwritten.
              </p>
            </div>
            <span className="flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold">
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              Runs in this tab
            </span>
          </header>

          <div className="mt-5 grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
            <section className="rounded-xl border bg-card p-4">
              <label htmlFor="file-operation" className="text-sm font-semibold">
                File tool
              </label>
              <select
                id="file-operation"
                value={operation.id}
                onChange={(event) => selectOperation(event.target.value)}
                className="focus-ring mt-2 h-11 w-full rounded-lg border bg-background px-3 text-sm"
              >
                {FILE_WORKBENCH_OPERATIONS.map((item) => (
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

              {operation.requiresFiles ? (
                <label className="block rounded-xl border border-dashed bg-muted/35 p-5 text-center">
                  <Files aria-hidden="true" className="mx-auto size-6" />
                  <span className="mt-2 block text-sm font-semibold">
                    {operation.directory
                      ? 'Choose a folder'
                      : operation.multiple
                        ? 'Choose files'
                        : 'Choose one file'}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    256 MiB each · 512 MiB combined · files stay in this tab
                  </span>
                  <input
                    ref={inputRef}
                    type="file"
                    multiple={operation.multiple || operation.directory}
                    onChange={(event) => {
                      setFiles(Array.from(event.target.files ?? []));
                      setResult(null);
                      setError('');
                    }}
                    className="focus-ring mx-auto mt-3 block min-h-11 max-w-full py-2 text-xs file:mr-3 file:min-h-7 file:rounded-md file:border-0 file:bg-muted file:px-3 file:font-semibold"
                  />
                </label>
              ) : null}

              {files.length ? (
                <div className="mt-4 rounded-lg bg-muted p-3 text-xs">
                  <p className="font-semibold">
                    {files.length} {files.length === 1 ? 'file' : 'files'} ·{' '}
                    {fileSize(selectedBytes)}
                  </p>
                  <ul className="mt-2 max-h-28 space-y-1 overflow-auto font-mono text-muted-foreground">
                    {files.slice(0, 100).map((file, index) => (
                      <li key={`${file.name}-${file.lastModified}-${index}`}>
                        {file.webkitRelativePath || file.name} ·{' '}
                        {fileSize(file.size)}
                      </li>
                    ))}
                  </ul>
                  {files.length > 100 ? (
                    <p className="mt-2 text-muted-foreground">
                      + {files.length - 100} more selected files
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
                          setValues((current) => ({
                            ...current,
                            [field.id]: event.target.value,
                          }))
                        }
                        className="focus-ring mt-2 h-11 w-full rounded-lg border bg-background px-3 text-sm"
                      >
                        {field.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        value={values[field.id] ?? ''}
                        rows={6}
                        onChange={(event) =>
                          setValues((current) => ({
                            ...current,
                            [field.id]: event.target.value,
                          }))
                        }
                        className="focus-ring mt-2 min-h-32 w-full resize-y rounded-lg border bg-background px-3 py-2 font-mono text-sm leading-6"
                      />
                    ) : (
                      <input
                        type={field.type}
                        value={values[field.id] ?? ''}
                        inputMode={field.type === 'number' ? 'numeric' : 'text'}
                        onChange={(event) =>
                          setValues((current) => ({
                            ...current,
                            [field.id]: event.target.value,
                          }))
                        }
                        className="focus-ring mt-2 h-11 w-full rounded-lg border bg-background px-3 font-mono text-sm"
                      />
                    )}
                  </label>
                ))}
              </div>

              <div className="mt-5 flex justify-end min-h-11 items-center">
                {running && (
                  <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <FileArchive
                      aria-hidden="true"
                      className="size-4 animate-pulse"
                    />
                    Reading local bytes...
                  </span>
                )}
              </div>
            </section>
          </div>

          {result ? (
            <section
              aria-live="polite"
              className="mt-4 overflow-hidden rounded-xl border bg-card"
            >
              <div className="p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-base font-semibold">
                    <CheckCircle2
                      aria-hidden="true"
                      className="size-5 text-success"
                    />
                    {result.summary}
                  </h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Copy result details"
                    onClick={() => {
                      navigator.clipboard
                        .writeText(result.output)
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
                <pre className="mt-3 max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-4 font-mono text-sm leading-6">
                  {result.output}
                </pre>
                {result.downloads.length ? (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      New local downloads · {result.downloads.length}
                    </p>
                    <div className="mt-2 grid max-h-72 gap-2 overflow-auto sm:grid-cols-2">
                      {result.downloads.map((generated, index) => (
                        <Button
                          data-receipt-download
                          key={`${generated.name}-${index}`}
                          variant="outline"
                          className="justify-between"
                          onClick={() => download(index)}
                        >
                          <span className="truncate">{generated.name}</span>
                          <span className="ml-3 flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                            {fileSize(generated.bytes.length)}
                            <Download aria-hidden="true" className="size-4" />
                          </span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="grid border-t sm:grid-cols-3">
                <div className="border-b p-4 sm:border-b-0 sm:border-r">
                  <p className="text-xs text-muted-foreground">Privacy</p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
                    <ShieldCheck
                      aria-hidden="true"
                      className="size-4 text-success"
                    />
                    Processed in this browser tab
                  </p>
                </div>
                <div className="border-b p-4 sm:border-b-0 sm:border-r">
                  <p className="text-xs text-muted-foreground">Completed in</p>
                  <p className="tabular mt-1 text-sm font-semibold">
                    {elapsed(duration)}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-muted-foreground">
                    Selected input
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {files.length} files · {fileSize(selectedBytes)}
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          <footer className="mt-7 border-t py-5 text-xs leading-5 text-muted-foreground">
            Local File, Blob, Streams, and Web Crypto APIs · No overwrite
            permission · Clear the tab to release selected file references
          </footer>
        </div>
      </section>
    </AppShell>
  );
}
