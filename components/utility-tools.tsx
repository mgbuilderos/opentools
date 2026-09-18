'use client';

import {
  ArrowDownToLine,
  Check,
  CheckCircle2,
  Clipboard,
  FileKey2,
  Fingerprint,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import {
  calculatePercentage,
  calendarAge,
  convertTimestamp,
  dateDifference,
  decodeBase64Text,
  encodeBase64Text,
  formatNumber,
  generateUuids,
  hashBytes,
  type HashAlgorithm,
  type PercentageMode,
} from '@/lib/tools/utility';

const TEXT_LIMIT = 2_000_000;
const HASH_FILE_LIMIT = 500 * 1024 * 1024;

function duration(value: number) {
  return value < 1000
    ? `${value.toFixed(1)} ms`
    : `${(value / 1000).toFixed(2)} s`;
}

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MiB`;
}

function copyText(value: string, onDone: (copied: boolean) => void) {
  navigator.clipboard
    .writeText(value)
    .then(() => {
      onDone(true);
      window.setTimeout(() => onDone(false), 1800);
    })
    .catch(() => onDone(false));
}

function downloadText(value: string, name: string) {
  const url = URL.createObjectURL(
    new Blob([value], { type: 'text/plain;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function UtilityFrame({
  id,
  category,
  title,
  description,
  children,
}: {
  id: string;
  category: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <AppShell currentToolId={id}>
      <section
        id="tool"
        tabIndex={-1}
        className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-12"
      >
        <div className="mx-auto max-w-5xl">
          <header className="flex flex-col justify-between gap-5 border-b pb-8 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {category} / Local utility
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
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
          </header>
          {children}
          <footer className="mt-10 border-t py-6 text-xs leading-5 text-muted-foreground">
            Local JavaScript · No client-side analytics · Formal multi-browser
            egress proof pending
          </footer>
        </div>
      </section>
    </AppShell>
  );
}

function ErrorNotice({ message }: { message: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus(), [message]);
  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      className="focus-ring mt-5 rounded-xl border border-destructive/35 bg-destructive/5 p-4 text-sm"
    >
      <p className="font-semibold">Couldn’t create a result</p>
      <p className="mt-1 text-muted-foreground">{message}</p>
    </div>
  );
}

function Result({
  value,
  summary,
  elapsed,
  fileName,
}: {
  value: string;
  summary: string;
  elapsed: number;
  fileName?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <section
      aria-live="polite"
      className="mt-5 overflow-hidden rounded-2xl border bg-card"
    >
      <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-success/10 text-success">
            <CheckCircle2 aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-[-0.02em]">
              Done — {summary}
            </h2>
            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-muted p-4 font-mono text-sm leading-6">
              {value}
            </pre>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={() => copyText(value, setCopied)}
            aria-label="Copy result"
          >
            {copied ? (
              <Check aria-hidden="true" />
            ) : (
              <Clipboard aria-hidden="true" />
            )}
          </Button>
          {fileName ? (
            <Button
              data-receipt-download
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={() => downloadText(value, fileName)}
              aria-label="Download result"
            >
              <ArrowDownToLine aria-hidden="true" />
            </Button>
          ) : null}
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
          <p className="text-xs text-muted-foreground">Completed in</p>
          <p className="tabular mt-1 text-sm font-semibold">
            {duration(elapsed)}
          </p>
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

function TextTransformTool({ mode }: { mode: 'encode' | 'decode' }) {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const isEncode = mode === 'encode';
  const run = () => {
    const started = performance.now();
    try {
      if (input.length > TEXT_LIMIT)
        throw new Error(
          'Text is limited to 2,000,000 characters in this candidate.',
        );
      const next = isEncode ? encodeBase64Text(input) : decodeBase64Text(input);
      const completedIn = performance.now() - started;
      setOutput(next);
      setElapsed(completedIn);
      setError('');
      announceCompletion({
        operation: `Base64 ${isEncode ? 'encoder' : 'decoder'}`,
        durationMs: completedIn,
        summary: `Your ${isEncode ? 'encoded' : 'decoded'} text is ready.`,
        metrics: [
          { label: 'Output', value: `${next.length.toLocaleString()} chars` },
        ],
      });
    } catch (caught) {
      setOutput('');
      setError(
        caught instanceof Error
          ? caught.message
          : 'The text could not be processed.',
      );
    }
  };
  return (
    <UtilityFrame
      id={`base64-${mode}`}
      category="Developer"
      title={`Base64 ${isEncode ? 'encoder' : 'decoder'}`}
      description={`${isEncode ? 'Encode UTF-8 text as standard Base64' : 'Decode standard Base64 into UTF-8 text'} without sending it away.`}
    >
      {error ? <ErrorNotice message={error} /> : null}
      <section className="mt-8 rounded-2xl border bg-card p-5 sm:p-6">
        <label className="text-sm font-semibold" htmlFor="base64-input">
          {isEncode ? 'Text to encode' : 'Base64 to decode'}
        </label>
        <textarea
          id="base64-input"
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            setOutput('');
            setError('');
          }}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          className="focus-ring mt-3 min-h-56 w-full resize-y rounded-xl border bg-muted/45 p-4 font-mono text-sm leading-6"
          placeholder={
            isEncode ? 'Paste text here' : 'UGFzdGUgQmFzZTY0IGhlcmU='
          }
        />
        <div className="mt-4 flex justify-end">
          <Button className="h-11 min-w-40" disabled={!input} onClick={run}>
            <Sparkles aria-hidden="true" />
            {isEncode ? 'Encode text' : 'Decode text'}
          </Button>
        </div>
      </section>
      {output ? (
        <Result
          value={output}
          summary={`${input.length.toLocaleString()} characters ${isEncode ? 'encoded' : 'decoded'}`}
          elapsed={elapsed}
          fileName={isEncode ? 'encoded-base64.txt' : 'decoded.txt'}
        />
      ) : null}
    </UtilityFrame>
  );
}

export function Base64EncoderTool() {
  return <TextTransformTool mode="encode" />;
}
export function Base64DecoderTool() {
  return <TextTransformTool mode="decode" />;
}

export function UuidGeneratorTool() {
  const [count, setCount] = useState(1);
  const [output, setOutput] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const run = () => {
    const started = performance.now();
    try {
      const next = generateUuids(count).join('\n');
      const completedIn = performance.now() - started;
      setOutput(next);
      setElapsed(completedIn);
      setError('');
      announceCompletion({
        operation: 'UUID generator',
        durationMs: completedIn,
        summary: `${count.toLocaleString()} ${count === 1 ? 'UUID' : 'UUIDs'} generated.`,
        metrics: [{ label: 'UUIDs', value: count.toLocaleString() }],
      });
    } catch (caught) {
      setOutput('');
      setError(
        caught instanceof Error
          ? caught.message
          : 'UUIDs could not be generated.',
      );
    }
  };
  return (
    <UtilityFrame
      id="uuid-generator"
      category="Developer"
      title="UUID generator"
      description="Generate one or many cryptographically random UUID v4 values in your browser."
    >
      {error ? <ErrorNotice message={error} /> : null}
      <section className="mt-8 rounded-2xl border bg-card p-5 sm:p-6">
        <label htmlFor="uuid-count" className="text-sm font-semibold">
          Number of UUIDs
        </label>
        <input
          id="uuid-count"
          type="number"
          min={1}
          max={100}
          value={count}
          onChange={(event) => {
            setCount(Number(event.target.value));
            setOutput('');
          }}
          className="focus-ring mt-3 h-11 w-full rounded-xl border bg-muted/45 px-4 sm:max-w-xs"
        />
        <div className="mt-4">
          <Button className="h-11 min-w-40" onClick={run}>
            <Fingerprint aria-hidden="true" />
            Generate UUIDs
          </Button>
        </div>
      </section>
      {output ? (
        <Result
          value={output}
          summary={`${count} ${count === 1 ? 'UUID' : 'UUIDs'} generated`}
          elapsed={elapsed}
          fileName="uuids.txt"
        />
      ) : null}
    </UtilityFrame>
  );
}

export function TimestampTool() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const run = () => {
    const started = performance.now();
    try {
      const result = convertTimestamp(input);
      const completedIn = performance.now() - started;
      setOutput(
        `UTC: ${result.iso}\nUnix seconds: ${result.unixSeconds}\nUnix milliseconds: ${result.unixMilliseconds}`,
      );
      setElapsed(completedIn);
      setError('');
      announceCompletion({
        operation: 'Unix timestamp converter',
        durationMs: completedIn,
        summary: 'UTC, Unix seconds, and Unix milliseconds are ready.',
        // CompletionValueDialog requires at least one metric; without this the
        // completion is announced and then silently dropped.
        metrics: [
          { label: 'UTC', value: result.iso },
          { label: 'Unix seconds', value: String(result.unixSeconds) },
        ],
      });
    } catch (caught) {
      setOutput('');
      setError(
        caught instanceof Error
          ? caught.message
          : 'The timestamp could not be converted.',
      );
    }
  };
  return (
    <UtilityFrame
      id="unix-timestamp"
      category="Developer"
      title="Unix timestamp converter"
      description="Convert Unix seconds, Unix milliseconds, or an ISO date into exact UTC values."
    >
      {error ? <ErrorNotice message={error} /> : null}
      <section className="mt-8 rounded-2xl border bg-card p-5 sm:p-6">
        <label htmlFor="timestamp-input" className="text-sm font-semibold">
          Timestamp or ISO date
        </label>
        <input
          id="timestamp-input"
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            setOutput('');
            setError('');
          }}
          spellCheck={false}
          className="focus-ring mt-3 h-11 w-full rounded-xl border bg-muted/45 px-4 font-mono"
          placeholder="1704067200 or 2024-01-01T00:00:00Z"
        />
        <div className="mt-4">
          <Button
            className="h-11 min-w-40"
            disabled={!input.trim()}
            onClick={run}
          >
            Convert timestamp
          </Button>
        </div>
      </section>
      {output ? (
        <Result
          value={output}
          summary="timestamp converted to UTC"
          elapsed={elapsed}
        />
      ) : null}
    </UtilityFrame>
  );
}

export function PercentageTool() {
  const [mode, setMode] = useState<PercentageMode>('percent-of');
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [output, setOutput] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const labels: Record<PercentageMode, [string, string]> = {
    'percent-of': ['Percentage', 'Value'],
    'what-percent': ['Part', 'Whole'],
    change: ['Starting value', 'Ending value'],
  };
  const run = () => {
    const started = performance.now();
    try {
      const result = calculatePercentage(mode, Number(first), Number(second));
      const next = `${formatNumber(result)}${mode === 'percent-of' ? '' : '%'}`;
      const completedIn = performance.now() - started;
      setOutput(next);
      setElapsed(completedIn);
      setError('');
      announceCompletion({
        operation: 'Percentage calculator',
        durationMs: completedIn,
        summary: 'Your percentage result is ready.',
        metrics: [{ label: 'Result', value: next }],
      });
    } catch (caught) {
      setOutput('');
      setError(
        caught instanceof Error
          ? caught.message
          : 'The percentage could not be calculated.',
      );
    }
  };
  return (
    <UtilityFrame
      id="percentage-calculator"
      category="Math"
      title="Percentage calculator"
      description="Answer common percentage questions with explicit inputs and no hidden rounding."
    >
      {error ? <ErrorNotice message={error} /> : null}
      <section className="mt-8 rounded-2xl border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['percent-of', 'X% of Y'],
              ['what-percent', 'X is what % of Y'],
              ['change', '% change'],
            ] as [PercentageMode, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => {
                setMode(value);
                setOutput('');
                setError('');
              }}
              className="focus-ring min-h-11 rounded-xl border px-4 py-2 text-sm font-medium aria-pressed:bg-foreground aria-pressed:text-background"
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {[first, second].map((value, index) => (
            <label key={index} className="text-sm font-semibold">
              {labels[mode][index]}
              <input
                type="number"
                value={value}
                onChange={(event) => {
                  (index === 0 ? setFirst : setSecond)(event.target.value);
                  setOutput('');
                  setError('');
                }}
                className="focus-ring mt-2 h-11 w-full rounded-xl border bg-muted/45 px-4"
              />
            </label>
          ))}
        </div>
        <div className="mt-4">
          <Button
            className="h-11 min-w-40"
            disabled={first === '' || second === ''}
            onClick={run}
          >
            Calculate
          </Button>
        </div>
      </section>
      {output ? (
        <Result
          value={output}
          summary="percentage calculated"
          elapsed={elapsed}
        />
      ) : null}
    </UtilityFrame>
  );
}

function DatePairTool({ age }: { age: boolean }) {
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [output, setOutput] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const run = () => {
    const started = performance.now();
    try {
      if (!first || !second) throw new Error('Choose both calendar dates.');
      let produced: string;
      if (age) {
        const result = calendarAge(first, second);
        produced = `${result.years} years, ${result.months} months, ${result.days} days\n${result.totalDays.toLocaleString()} total days`;
        setOutput(produced);
      } else {
        const days = dateDifference(first, second);
        produced = `${days.toLocaleString()} ${days === 1 ? 'day' : 'days'}`;
        setOutput(produced);
      }
      const completedIn = performance.now() - started;
      setElapsed(completedIn);
      setError('');
      announceCompletion({
        operation: age ? 'Age calculator' : 'Date difference calculator',
        durationMs: completedIn,
        summary: age
          ? 'Your calendar age result is ready.'
          : 'The exact calendar-day difference is ready.',
        // See the note above: no metrics means no completion card.
        metrics: [
          {
            label: age ? 'Calendar age' : 'Difference',
            value: produced.replace('\n', ' · '),
          },
        ],
      });
    } catch (caught) {
      setOutput('');
      setError(
        caught instanceof Error
          ? caught.message
          : 'The dates could not be calculated.',
      );
    }
  };
  return (
    <UtilityFrame
      id={age ? 'age-calculator' : 'date-difference'}
      category="Date"
      title={age ? 'Age calculator' : 'Date difference calculator'}
      description={
        age
          ? 'Calculate calendar age in years, months, days, and total days.'
          : 'Count exact calendar days between two dates without daylight-saving drift.'
      }
    >
      {error ? <ErrorNotice message={error} /> : null}
      <section className="mt-8 rounded-2xl border bg-card p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            {age ? 'Birth date' : 'First date'}
            <input
              type="date"
              value={first}
              onChange={(event) => {
                setFirst(event.target.value);
                setOutput('');
                setError('');
              }}
              className="focus-ring mt-2 h-11 w-full rounded-xl border bg-muted/45 px-4"
            />
          </label>
          <label className="text-sm font-semibold">
            {age ? 'Age on date' : 'Second date'}
            <input
              type="date"
              value={second}
              onChange={(event) => {
                setSecond(event.target.value);
                setOutput('');
                setError('');
              }}
              className="focus-ring mt-2 h-11 w-full rounded-xl border bg-muted/45 px-4"
            />
          </label>
        </div>
        <div className="mt-4">
          <Button
            className="h-11 min-w-40"
            disabled={!first || !second}
            onClick={run}
          >
            Calculate {age ? 'age' : 'difference'}
          </Button>
        </div>
      </section>
      {output ? (
        <Result
          value={output}
          summary={
            age ? 'calendar age calculated' : 'date difference calculated'
          }
          elapsed={elapsed}
        />
      ) : null}
    </UtilityFrame>
  );
}

export function DateDifferenceTool() {
  return <DatePairTool age={false} />;
}
export function AgeCalculatorTool() {
  return <DatePairTool age />;
}

export function FileHashTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>('SHA-256');
  const [output, setOutput] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!file) return;
    const started = performance.now();
    setBusy(true);
    setOutput('');
    setError('');
    try {
      if (file.size > HASH_FILE_LIMIT)
        throw new Error('Files are limited to 500 MB in this candidate.');
      const next = await hashBytes(await file.arrayBuffer(), algorithm);
      const completedIn = performance.now() - started;
      setOutput(next);
      setElapsed(completedIn);
      announceCompletion({
        operation: 'File hash calculator',
        durationMs: completedIn,
        summary: `${algorithm} checksum created for the selected file.`,
        metrics: [
          { label: 'File size', value: fileSize(file.size) },
          { label: 'Algorithm', value: algorithm },
        ],
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'The file could not be hashed.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <UtilityFrame
      id="file-hash"
      category="File"
      title="File hash calculator"
      description="Calculate SHA-256, SHA-384, or SHA-512 for a local file using the browser cryptography API."
    >
      {error ? <ErrorNotice message={error} /> : null}
      <section className="mt-8 rounded-2xl border bg-card p-5 sm:p-6">
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setOutput('');
            setError('');
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="focus-ring flex min-h-28 w-full items-center justify-center rounded-xl border border-dashed bg-muted/35 p-5 text-center"
        >
          <span>
            <FileKey2 aria-hidden="true" className="mx-auto size-6" />
            <span className="mt-2 block text-sm font-semibold">
              {file ? file.name : 'Choose a file'}
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {file
                ? `${(file.size / 1024).toFixed(1)} KB`
                : 'Up to 500 MB · file stays in this browser'}
            </span>
          </span>
        </button>
        <label className="mt-4 block text-sm font-semibold">
          Hash algorithm
          <select
            value={algorithm}
            disabled={busy}
            onChange={(event) => {
              setAlgorithm(event.target.value as HashAlgorithm);
              setOutput('');
            }}
            className="focus-ring mt-2 h-11 w-full rounded-xl border bg-background px-4 sm:max-w-xs"
          >
            <option>SHA-256</option>
            <option>SHA-384</option>
            <option>SHA-512</option>
          </select>
        </label>
        <div className="mt-4">
          <Button
            className="h-11 min-w-40"
            disabled={!file || busy}
            onClick={() => void run()}
          >
            {busy ? 'Calculating…' : 'Calculate hash'}
          </Button>
        </div>
      </section>
      {output ? (
        <Result
          value={output}
          summary={`${algorithm} calculated`}
          elapsed={elapsed}
          fileName={`${file?.name ?? 'file'}.${algorithm.toLowerCase().replace('-', '')}`}
        />
      ) : null}
    </UtilityFrame>
  );
}
