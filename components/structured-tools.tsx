'use client';

import {
  ArrowDownToLine,
  Check,
  CheckCircle2,
  Clipboard,
  FileUp,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { publicTools } from '@/lib/tools/catalog';
import {
  csvToJson,
  transformJson,
  type JsonTransformMode,
} from '@/lib/tools/structured';

type TextReceipt = {
  durationMs: number;
  inputCharacters: number;
  outputCharacters: number;
  detail: string;
};

function formatDuration(durationMs: number) {
  return durationMs < 1000
    ? `${durationMs.toFixed(1)} ms`
    : `${(durationMs / 1000).toFixed(2)} s`;
}

function downloadText(value: string, fileName: string, type: string) {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function ToolHeader({
  category,
  title,
  description,
}: {
  category: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col justify-between gap-5 border-b pb-8 sm:flex-row sm:items-start">
      <div>
        <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span>{category}</span>
          <span aria-hidden="true">/</span>
          <span>Structured content</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
          {description}
        </p>
      </div>
      <span className="flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold">
        <LockKeyhole aria-hidden="true" className="size-3.5" /> On-device
        prototype
      </span>
    </div>
  );
}

function ErrorNotice({
  message,
  clear,
}: {
  message: string;
  clear: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      className="focus-ring mt-6 flex items-start justify-between gap-4 rounded-xl border border-destructive/35 bg-destructive/5 p-4 text-sm"
    >
      <div>
        <p className="font-semibold">Couldn’t create a result</p>
        <p className="mt-1 text-muted-foreground">{message}</p>
      </div>
      <button
        type="button"
        onClick={clear}
        className="focus-ring rounded-md p-1"
        aria-label="Dismiss error"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}

function ResultReceipt({ receipt }: { receipt: TextReceipt }) {
  return (
    <section
      aria-labelledby="receipt-heading"
      className="mt-5 overflow-hidden rounded-2xl border bg-card"
    >
      <div className="flex items-start gap-3 p-5 sm:p-6">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-success/10 text-success">
          <CheckCircle2 aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2
            id="receipt-heading"
            className="text-lg font-semibold tracking-[-0.02em]"
          >
            Done — {receipt.detail}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {receipt.inputCharacters.toLocaleString()} input characters →{' '}
            {receipt.outputCharacters.toLocaleString()} output characters ·{' '}
            <span className="tabular">
              {formatDuration(receipt.durationMs)}
            </span>
          </p>
        </div>
      </div>
      <div className="grid border-t sm:grid-cols-3">
        <div className="border-b p-4 sm:border-b-0 sm:border-r sm:p-5">
          <p className="text-xs text-muted-foreground">Processing</p>
          <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck aria-hidden="true" className="size-4 text-success" />
            In this tab
          </p>
        </div>
        <div className="border-b p-4 sm:border-b-0 sm:border-r sm:p-5">
          <p className="text-xs text-muted-foreground">Input</p>
          <p className="mt-1 text-sm font-semibold">Unchanged</p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-xs text-muted-foreground">Release assurance</p>
          <p className="mt-1 text-sm font-semibold">
            Formal egress proof pending
          </p>
        </div>
      </div>
    </section>
  );
}

function EditorPair({
  input,
  output,
  onInput,
  copied,
  onCopy,
  onDownload,
  inputLabel,
  placeholder,
}: {
  input: string;
  output: string;
  onInput: (value: string) => void;
  copied: boolean;
  onCopy: () => void;
  onDownload: () => void;
  inputLabel: string;
  placeholder: string;
}) {
  return (
    <div className="mt-8 grid gap-5 xl:grid-cols-2">
      <section
        aria-labelledby="data-input-heading"
        className="rounded-2xl border bg-card"
      >
        <div className="flex items-center justify-between border-b px-4 py-3 sm:px-5">
          <div>
            <h2 id="data-input-heading" className="text-sm font-semibold">
              {inputLabel}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Stays in this browser tab
            </p>
          </div>
          <span className="tabular text-xs text-muted-foreground">
            {input.length.toLocaleString()} characters
          </span>
        </div>
        <textarea
          value={input}
          onChange={(event) => onInput(event.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          className="focus-ring min-h-80 w-full resize-y bg-transparent p-5 font-mono text-[13px] leading-6 outline-none placeholder:text-muted-foreground/70"
        />
      </section>
      <section
        aria-labelledby="data-output-heading"
        className="rounded-2xl border bg-card"
      >
        <div className="flex min-h-[61px] items-center justify-between border-b px-4 py-3 sm:px-5">
          <div>
            <h2 id="data-output-heading" className="text-sm font-semibold">
              Result
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Created only after validation
            </p>
          </div>
          {output ? (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={onCopy}
                aria-label="Copy result"
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
                className="h-9 w-9"
                onClick={onDownload}
                aria-label="Download result"
              >
                <ArrowDownToLine aria-hidden="true" />
              </Button>
            </div>
          ) : null}
        </div>
        <pre
          aria-live="polite"
          className="min-h-80 overflow-auto whitespace-pre-wrap break-words p-5 font-mono text-[13px] leading-6"
        >
          {output || (
            <span className="font-sans text-muted-foreground/70">
              A validated result will appear here.
            </span>
          )}
        </pre>
      </section>
    </div>
  );
}

export function JsonTool() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [mode, setMode] = useState<JsonTransformMode>('pretty');
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<TextReceipt | null>(null);
  const [copied, setCopied] = useState(false);
  const manifest = publicTools.find((tool) => tool.id === 'json-format')!;

  const run = () => {
    const started = performance.now();
    try {
      const next = transformJson(input, mode);
      setOutput(next);
      setError('');
      setCopied(false);
      setReceipt({
        durationMs: performance.now() - started,
        inputCharacters: input.length,
        outputCharacters: next.length,
        detail:
          mode === 'minify'
            ? 'valid JSON minified'
            : mode === 'sort'
              ? 'valid JSON formatted and sorted'
              : 'valid JSON formatted',
      });
    } catch (caught) {
      setOutput('');
      setReceipt(null);
      setError(
        caught instanceof Error
          ? caught.message
          : 'JSON could not be processed.',
      );
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
      setError('Clipboard access was blocked. Download the JSON instead.');
    }
  };
  const clear = () => {
    setInput('');
    setOutput('');
    setError('');
    setReceipt(null);
    setCopied(false);
  };

  return (
    <AppShell currentToolId="json-format">
      <section
        id="tool"
        className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-12"
      >
        <div className="mx-auto max-w-5xl">
          <ToolHeader
            category="Data"
            title="JSON formatter"
            description="Validate, format, minify, or recursively sort JSON without sending the payload to a server."
          />
          {error ? (
            <ErrorNotice message={error} clear={() => setError('')} />
          ) : null}
          <EditorPair
            input={input}
            output={output}
            onInput={(value) => {
              setInput(value);
              setOutput('');
              setError('');
              setReceipt(null);
              setCopied(false);
            }}
            copied={copied}
            onCopy={() => void copy()}
            onDownload={() =>
              downloadText(
                output,
                'formatted.json',
                'application/json;charset=utf-8',
              )
            }
            inputLabel="JSON input"
            placeholder={'{\n  "project": "local tools"\n}'}
          />
          <section className="mt-5 rounded-2xl border bg-muted/55 p-4 sm:p-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold">Output style</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(['pretty', 'minify', 'sort'] as JsonTransformMode[]).map(
                    (item) => (
                      <button
                        key={item}
                        type="button"
                        aria-pressed={mode === item}
                        onClick={() => {
                          setMode(item);
                          setOutput('');
                          setError('');
                          setReceipt(null);
                          setCopied(false);
                        }}
                        className="focus-ring min-h-11 rounded-xl border bg-background px-4 py-2 text-sm font-medium capitalize aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background"
                      >
                        {item === 'pretty' ? 'Format' : item}
                      </button>
                    ),
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {input || output ? (
                  <Button variant="ghost" className="h-11" onClick={clear}>
                    <Trash2 aria-hidden="true" />
                    Clear
                  </Button>
                ) : null}
                <Button
                  className="h-11 min-w-40"
                  disabled={!input.trim()}
                  onClick={run}
                >
                  <Sparkles aria-hidden="true" />
                  Process JSON
                </Button>
              </div>
            </div>
          </section>
          {receipt ? <ResultReceipt receipt={receipt} /> : null}
          <footer className="mt-10 flex flex-col gap-3 border-t py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              Candidate {manifest.version} · Local JavaScript · Input limit
              follows available tab memory
            </p>
            <a
              href="/data/csv-to-json"
              className="focus-ring rounded font-semibold text-foreground hover:underline"
            >
              Next: CSV to JSON →
            </a>
          </footer>
        </div>
      </section>
    </AppShell>
  );
}

export function CsvToJsonTool() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<TextReceipt | null>(null);
  const [copied, setCopied] = useState(false);
  const manifest = publicTools.find((tool) => tool.id === 'csv-to-json')!;

  const run = () => {
    const started = performance.now();
    try {
      const result = csvToJson(input);
      setOutput(result.json);
      setError('');
      setCopied(false);
      setReceipt({
        durationMs: performance.now() - started,
        inputCharacters: input.length,
        outputCharacters: result.json.length,
        detail: `${result.rows.length.toLocaleString()} rows × ${result.headers.length.toLocaleString()} columns converted`,
      });
    } catch (caught) {
      setOutput('');
      setReceipt(null);
      setError(
        caught instanceof Error
          ? caught.message
          : 'CSV could not be processed.',
      );
    }
  };
  const chooseFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setError('This candidate limits CSV files to 20 MB.');
      return;
    }
    try {
      setInput(await file.text());
      setSourceName(file.name);
      setOutput('');
      setReceipt(null);
      setError('');
    } catch {
      setError('The browser could not read that file.');
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
      setError('Clipboard access was blocked. Download the JSON instead.');
    }
  };
  const clear = () => {
    setInput('');
    setOutput('');
    setSourceName('');
    setError('');
    setReceipt(null);
    setCopied(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <AppShell currentToolId="csv-to-json">
      <section
        id="tool"
        className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-12"
      >
        <div className="mx-auto max-w-5xl">
          <ToolHeader
            category="Data"
            title="CSV to JSON"
            description="Parse quoted CSV, validate the row shape, and create JSON entirely inside this browser tab."
          />
          {error ? (
            <ErrorNotice message={error} clear={() => setError('')} />
          ) : null}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(event) => void chooseFile(event.target.files?.[0])}
            />
            <Button
              variant="outline"
              className="h-11"
              onClick={() => fileRef.current?.click()}
            >
              <FileUp aria-hidden="true" />
              Choose CSV
            </Button>
            <span className="text-xs text-muted-foreground">
              {sourceName || 'Or paste CSV below · 20 MB file limit'}
            </span>
          </div>
          <EditorPair
            input={input}
            output={output}
            onInput={(value) => {
              setInput(value);
              setSourceName('');
              setOutput('');
              setError('');
              setReceipt(null);
              setCopied(false);
            }}
            copied={copied}
            onCopy={() => void copy()}
            onDownload={() =>
              downloadText(
                output,
                'converted.json',
                'application/json;charset=utf-8',
              )
            }
            inputLabel="CSV input"
            placeholder={'name,role\nAda,Engineer'}
          />
          <section className="mt-5 rounded-2xl border bg-muted/55 p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                The first row becomes keys. Quoted commas, escaped quotes, CRLF,
                and quoted line breaks are supported. Duplicate headers and
                uneven rows stop with a precise error.
              </p>
              <div className="flex shrink-0 gap-2">
                {input || output ? (
                  <Button variant="ghost" className="h-11" onClick={clear}>
                    <Trash2 aria-hidden="true" />
                    Clear
                  </Button>
                ) : null}
                <Button
                  className="h-11 min-w-40"
                  disabled={!input.trim()}
                  onClick={run}
                >
                  <Sparkles aria-hidden="true" />
                  Convert to JSON
                </Button>
              </div>
            </div>
          </section>
          {receipt ? <ResultReceipt receipt={receipt} /> : null}
          <footer className="mt-10 flex flex-col gap-3 border-t py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              Candidate {manifest.version} · Local JavaScript · Values remain
              strings by design
            </p>
            <a
              href="/image/optimize"
              className="focus-ring rounded font-semibold text-foreground hover:underline"
            >
              Next: Optimize image →
            </a>
          </footer>
        </div>
      </section>
    </AppShell>
  );
}
