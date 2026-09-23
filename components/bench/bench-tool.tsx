'use client';

import {
  Download,
  FolderInput,
  FolderOutput,
  Play,
  Square,
} from 'lucide-react';
import { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AppShell } from '@/components/app-shell';
import { SmartDropzone } from '@/components/smart-dropzone';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import { KERNEL_OPERATIONS } from '@/lib/kernel/registry';
import type { KernelOperation } from '@/lib/kernel/types';
import { searchTools } from '@/lib/tools/catalog';
import {
  buildReceipt,
  receiptToJson,
  receiptToText,
  type BenchReceipt,
} from '@/lib/bench/receipt';
import {
  runBench,
  runBenchInput,
  zipBenchOutputs,
  type BenchInput,
  type BenchOutput,
} from '@/lib/bench/run';

type Outcome = Awaited<ReturnType<typeof runBench>>[number];
type BenchFileHandle = {
  kind: 'file';
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<{
    write(data: Blob): Promise<void>;
    close(): Promise<void>;
  }>;
};
type DirectoryHandle = {
  kind: 'directory';
  name: string;
  values(): AsyncIterableIterator<BenchFileHandle | DirectoryHandle>;
  getFileHandle(
    name: string,
    options: { create: true },
  ): Promise<BenchFileHandle>;
};

declare global {
  interface Window {
    showDirectoryPicker?: (options?: {
      mode?: 'read' | 'readwrite';
    }) => Promise<DirectoryHandle>;
  }
}

const DEFAULT_TEMPLATE = '{name}-{operation}.{ext}';

function defaults(operation: KernelOperation) {
  return Object.fromEntries(
    operation.params.map((item) => [item.id, item.defaultValue]),
  );
}

function flatten(outcomes: readonly Outcome[]) {
  return outcomes.flatMap((item) =>
    item.status === 'done' ? item.output : [],
  );
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

async function readDirectory(
  handle: DirectoryHandle,
  prefix = '',
): Promise<BenchInput[]> {
  const inputs: BenchInput[] = [];
  for await (const entry of handle.values()) {
    if (entry.kind === 'file') {
      const file = await entry.getFile();
      inputs.push({ file, name: file.name, path: `${prefix}${file.name}` });
    } else {
      inputs.push(...(await readDirectory(entry, `${prefix}${entry.name}/`)));
    }
  }
  return inputs;
}

export function BenchTool() {
  const directoryInput = useRef<HTMLInputElement>(null);
  const filesInput = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const [inputs, setInputs] = useState<BenchInput[]>([]);
  const [inputMode, setInputMode] = useState<
    'files' | 'folder-zip' | 'folder-write'
  >('files');
  const [outputDirectory, setOutputDirectory] =
    useState<DirectoryHandle | null>(null);
  const [query, setQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState('text:word-counter');
  const operation =
    KERNEL_OPERATIONS.find(
      (item) => `${item.source}:${item.id}` === selectedKey,
    ) ?? KERNEL_OPERATIONS[0]!;
  const [params, setParams] = useState<Record<string, string>>(() =>
    defaults(operation),
  );
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [outcomes, setOutcomes] = useState<readonly Outcome[]>([]);
  const [receipt, setReceipt] = useState<BenchReceipt | null>(null);
  const [preview, setPreview] = useState<BenchOutput | null>(null);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const folderWriteSupported = useSyncExternalStore(
    () => () => {},
    () => Boolean(window.showDirectoryPicker),
    () => false,
  );

  const matches = useMemo(() => {
    const terms = query
      .toLocaleLowerCase()
      .trim()
      .split(/\s+/u)
      .filter(Boolean);
    const catalogIds = new Set(
      query.trim()
        ? searchTools(query).map((item) => item.resultId ?? item.id)
        : [],
    );
    return KERNEL_OPERATIONS.filter((item) => {
      const text =
        `${item.name} ${item.description} ${item.id} ${item.source}`.toLocaleLowerCase();
      return (
        terms.every((term) => text.includes(term)) || catalogIds.has(item.id)
      );
    }).slice(0, 50);
  }, [query]);

  const takeFiles = (list: FileList | null, mode: typeof inputMode) => {
    if (!list) return;
    setInputs(
      Array.from(list, (file) => ({
        file,
        name: file.name,
        path: file.webkitRelativePath || file.name,
      })),
    );
    setInputMode(mode);
    setOutcomes([]);
    setReceipt(null);
    setPreview(null);
  };

  const chooseWritableFolder = async () => {
    if (!window.showDirectoryPicker) return;
    const source = await window.showDirectoryPicker({ mode: 'read' });
    setInputs(await readDirectory(source));
    setInputMode('folder-write');
    setOutputDirectory(null);
    setReceipt(null);
  };

  const chooseOutputFolder = async () => {
    if (!window.showDirectoryPicker) return;
    setOutputDirectory(await window.showDirectoryPicker({ mode: 'readwrite' }));
  };

  const selectOperation = (key: string) => {
    const next = KERNEL_OPERATIONS.find(
      (item) => `${item.source}:${item.id}` === key,
    );
    if (!next) return;
    setSelectedKey(key);
    setParams(defaults(next));
    setPreview(null);
    setOutcomes([]);
    setReceipt(null);
  };

  const dryRun = async () => {
    if (!inputs[0]) return setError('Choose at least one file first.');
    setError('');
    const signal = new AbortController().signal;
    try {
      const result = await runBenchInput({
        input: inputs[0],
        index: 0,
        operation,
        params,
        template,
        signal,
      });
      setPreview(result[0] ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The dry run failed.');
    }
  };

  const execute = async () => {
    if (!inputs.length) return setError('Choose at least one file first.');
    if (inputMode === 'folder-write' && !outputDirectory)
      return setError(
        'Choose a separate output folder before write-back. Originals are never overwritten.',
      );
    setRunning(true);
    setError('');
    setOutcomes([]);
    setReceipt(null);
    const abort = new AbortController();
    controller.current = abort;
    try {
      const result = await runBench({
        inputs,
        operation,
        params,
        template,
        signal: abort.signal,
        onProgress: ({ completed, total }) => setProgress({ completed, total }),
      });
      setOutcomes(result);
      const completedReceipt = buildReceipt({
        generatedAt: new Date().toISOString(),
        operation,
        params,
        inputs,
        outcomes: result,
        environment: navigator.userAgent,
      });
      setReceipt(completedReceipt);
      const outputs = flatten(result);
      if (outputDirectory) {
        for (const output of outputs) {
          const handle = await outputDirectory.getFileHandle(output.fileName, {
            create: true,
          });
          const writable = await handle.createWritable();
          await writable.write(output.blob);
          await writable.close();
        }
      }
      announceCompletion({
        operation: `Bench: ${operation.name}`,
        durationMs: completedReceipt.durationMs,
        summary: `${outputs.length} outputs from ${inputs.length} inputs; nothing uploaded.`,
        metrics: [
          { label: 'Files', value: String(inputs.length) },
          {
            label: 'Completed',
            value: String(
              result.filter((item) => item.status === 'done').length,
            ),
          },
          { label: 'Uploaded', value: '0 bytes' },
        ],
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'The batch could not be completed.',
      );
    } finally {
      setRunning(false);
      controller.current = null;
    }
  };

  const downloadZip = async () => {
    const outputs = flatten(outcomes);
    download(
      new Blob([Uint8Array.from(await zipBenchOutputs(outputs))], {
        type: 'application/zip',
      }),
      'opentools-bench-results.zip',
    );
  };

  return (
    <AppShell currentToolId="bench">
      <main
        id="tool"
        tabIndex={-1}
        className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8"
      >
        <header className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Private folder automation
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">The Bench</h1>
          <p className="max-w-3xl text-muted-foreground">
            Drop a folder, pick an operation, preview the first real result,
            then run every file locally. Nothing leaves this browser.
          </p>
        </header>

        <section
          className="grid gap-4 rounded-xl border bg-card p-5 lg:grid-cols-3"
          aria-labelledby="input-heading"
        >
          <div className="space-y-2 lg:col-span-3">
            <h2 id="input-heading" className="text-lg font-semibold">
              1. Choose inputs
            </h2>
            <p className="text-sm text-muted-foreground">
              {folderWriteSupported
                ? 'This browser can read a folder and write results to a separate folder you explicitly choose.'
                : 'This browser provides folders read-only; completed results come back as a ZIP.'}
            </p>
          </div>
          {folderWriteSupported ? (
            <Button
              variant="outline"
              onClick={() => void chooseWritableFolder()}
            >
              <FolderInput />
              Choose folder with write-back
            </Button>
          ) : null}
          <Button
            variant="outline"
            onClick={() => directoryInput.current?.click()}
          >
            <FolderInput />
            Choose folder for ZIP
          </Button>
          <Button variant="outline" onClick={() => filesInput.current?.click()}>
            <FolderInput />
            Choose files
          </Button>
          <input
            ref={directoryInput}
            className="hidden"
            type="file"
            multiple
            onChange={(event) => takeFiles(event.target.files, 'folder-zip')}
            {...({ webkitdirectory: '' } as Record<string, string>)}
          />
          <input
            ref={filesInput}
            className="hidden"
            type="file"
            multiple
            onChange={(event) => takeFiles(event.target.files, 'files')}
          />
          <div className="lg:col-span-3">
            <SmartDropzone
              multiple
              onFilesSelected={(files) => {
                setInputs(
                  files.map((file) => ({
                    file,
                    name: file.name,
                    path: file.name,
                  })),
                );
                setInputMode('files');
                setOutcomes([]);
                setReceipt(null);
                setPreview(null);
              }}
            />
          </div>
          {inputMode === 'folder-write' ? (
            <Button variant="outline" onClick={() => void chooseOutputFolder()}>
              <FolderOutput />
              {outputDirectory
                ? `Output: ${outputDirectory.name}`
                : 'Choose separate output folder'}
            </Button>
          ) : null}
          <p className="text-sm lg:col-span-3" data-testid="input-summary">
            {inputs.length
              ? `${inputs.length} files ready (${inputMode.replace('-', ' ')})`
              : 'No files selected.'}
          </p>
        </section>

        <section
          className="grid gap-5 rounded-xl border bg-card p-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]"
          aria-labelledby="operation-heading"
        >
          <div className="space-y-3">
            <h2 id="operation-heading" className="text-lg font-semibold">
              2. Pick the operation
            </h2>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search 631 operations"
              aria-label="Search operations"
              className="h-10 w-full rounded-lg border bg-background px-3"
            />
            <select
              aria-label="Operation"
              value={selectedKey}
              onChange={(event) => selectOperation(event.target.value)}
              size={8}
              className="w-full rounded-lg border bg-background p-2"
            >
              {matches.map((item) => (
                <option
                  key={`${item.source}:${item.id}`}
                  value={`${item.source}:${item.id}`}
                >
                  {item.name} — {item.source}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-3">
            <h3 className="font-semibold">{operation.name}</h3>
            <p className="text-sm text-muted-foreground">
              {operation.description}
            </p>
            {operation.notice ? (
              <p className="rounded-lg border p-3 text-sm">
                {operation.notice}
              </p>
            ) : null}
            {operation.params.map((param) => (
              <label key={param.id} className="grid gap-1 text-sm">
                {param.label}
                {param.type === 'select' ? (
                  <select
                    value={params[param.id] ?? param.defaultValue}
                    onChange={(event) => {
                      setParams({ ...params, [param.id]: event.target.value });
                      setReceipt(null);
                    }}
                    className="h-10 rounded-lg border bg-background px-3"
                  >
                    {param.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : param.type === 'boolean' ? (
                  <input
                    type="checkbox"
                    checked={
                      (params[param.id] ?? param.defaultValue) === 'true'
                    }
                    onChange={(event) => {
                      setParams({
                        ...params,
                        [param.id]: String(event.target.checked),
                      });
                      setReceipt(null);
                    }}
                  />
                ) : (
                  <input
                    type={param.type === 'number' ? 'number' : 'text'}
                    value={params[param.id] ?? param.defaultValue}
                    onChange={(event) => {
                      setParams({ ...params, [param.id]: event.target.value });
                      setReceipt(null);
                    }}
                    className="h-10 rounded-lg border bg-background px-3"
                  />
                )}
              </label>
            ))}
          </div>
        </section>

        <section
          className="space-y-4 rounded-xl border bg-card p-5"
          aria-labelledby="run-heading"
        >
          <h2 id="run-heading" className="text-lg font-semibold">
            3. Preview, then run
          </h2>
          <label className="grid gap-1 text-sm">
            Output name template
            <input
              value={template}
              onChange={(event) => {
                setTemplate(event.target.value);
                setReceipt(null);
              }}
              className="h-10 rounded-lg border bg-background px-3 font-mono"
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Tokens: {'{name} {ext} {index} {operation} {date}'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={running || !inputs.length}
              onClick={() => void dryRun()}
            >
              Dry run first file
            </Button>
            <Button
              disabled={running || !inputs.length}
              onClick={() => void execute()}
            >
              <Play />
              Run {inputs.length || ''} files
            </Button>
            {running ? (
              <Button
                variant="destructive"
                onClick={() => controller.current?.abort()}
              >
                <Square />
                Cancel
              </Button>
            ) : null}
            {!outputDirectory && flatten(outcomes).length ? (
              <Button variant="outline" onClick={() => void downloadZip()}>
                <Download />
                Download results ZIP
              </Button>
            ) : null}
          </div>
          {preview ? (
            <div
              className="rounded-lg border p-3 text-sm"
              data-testid="dry-run"
            >
              First result: <strong>{preview.fileName}</strong> —{' '}
              {preview.summary}
            </div>
          ) : null}
          {running ? (
            <output>
              Processed {progress.completed} of {progress.total}
            </output>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          {outcomes.length ? (
            <ul className="divide-y rounded-lg border" data-testid="outcomes">
              {outcomes.map((item) => (
                <li
                  key={`${item.index}:${item.input.path}`}
                  className="grid gap-1 p-3 text-sm sm:grid-cols-[1fr_auto]"
                >
                  <span>{item.input.path}</span>
                  <span>
                    {item.status === 'done'
                      ? `${item.output.length} output${item.output.length === 1 ? '' : 's'}`
                      : item.reason}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {receipt ? (
            <section
              className="space-y-3 rounded-lg border bg-background p-4"
              aria-labelledby="receipt-heading"
            >
              <div>
                <h3 id="receipt-heading" className="font-semibold">
                  Run receipt
                </h3>
                <p className="text-sm text-muted-foreground">
                  Generated locally from this completed run. Keep either format
                  with your records.
                </p>
              </div>
              <pre
                className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs"
                data-testid="receipt"
              >
                {receiptToText(receipt)}
              </pre>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    download(
                      new Blob([receiptToText(receipt)], {
                        type: 'text/plain;charset=utf-8',
                      }),
                      'receipt.txt',
                    )
                  }
                >
                  <Download />
                  Download receipt.txt
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    download(
                      new Blob([receiptToJson(receipt)], {
                        type: 'application/json;charset=utf-8',
                      }),
                      'receipt.json',
                    )
                  }
                >
                  <Download />
                  Download receipt.json
                </Button>
              </div>
            </section>
          ) : null}
        </section>
      </main>
    </AppShell>
  );
}
