'use client';

import {
  ArrowDownToLine,
  Check,
  CheckCircle2,
  Clipboard,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { publicTools } from '@/lib/tools/catalog';
import {
  countWords,
  textCaseOptions,
  transformText,
  type TextCaseMode,
} from '@/lib/tools/text-case';

type Receipt = {
  durationMs: number;
  outputCharacters: number;
  words: number;
};

function formatDuration(durationMs: number) {
  if (durationMs < 0.1) return '<0.1 ms';
  if (durationMs < 1000) return `${durationMs.toFixed(1)} ms`;
  return `${(durationMs / 1000).toFixed(2)} s`;
}

export function ToolWorkspace() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [mode, setMode] = useState<TextCaseMode>('sentence');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const manifest = publicTools.find(
    (tool) => tool.id === 'text-case-converter',
  )!;

  const runTransform = () => {
    if (!input) return;

    performance.clearMarks('text-transform-start');
    performance.clearMarks('text-result-visible');
    performance.clearMeasures('text-transform-job');
    performance.mark('text-transform-start');

    const nextOutput = transformText(input, mode);
    setOutput(nextOutput);
    setCopied(false);

    requestAnimationFrame(() => {
      performance.mark('text-result-visible');
      const measurement = performance.measure(
        'text-transform-job',
        'text-transform-start',
        'text-result-visible',
      );
      setReceipt({
        durationMs: measurement.duration,
        outputCharacters: nextOutput.length,
        words: countWords(nextOutput),
      });
    });
  };

  const copyOutput = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setCopyError(false);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
  };

  const downloadOutput = () => {
    const url = URL.createObjectURL(
      new Blob([output], { type: 'text/plain;charset=utf-8' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'converted-text.txt';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const clearAll = () => {
    setInput('');
    setOutput('');
    setReceipt(null);
    setCopied(false);
    setCopyError(false);
  };

  return (
    <AppShell currentToolId="text-case-converter">
      <section
        id="tool"
        className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-12"
      >
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col justify-between gap-5 border-b pb-8 sm:flex-row sm:items-start">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                <span>Text</span>
                <span aria-hidden="true">/</span>
                <span>Case converter</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Text case converter
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                Fix capitalization without uploading, signing in, or waiting for
                a server.
              </p>
            </div>
            <button
              type="button"
              className="focus-ring flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold"
              aria-label="Local processing status. Release proof is pending."
            >
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              On-device prototype
            </button>
          </div>

          <div className="mt-8 grid gap-5 xl:grid-cols-2">
            <section
              aria-labelledby="input-heading"
              className="rounded-2xl border bg-card"
            >
              <div className="flex items-center justify-between border-b px-4 py-3 sm:px-5">
                <div>
                  <h2 id="input-heading" className="text-sm font-semibold">
                    Your text
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
                onChange={(event) => {
                  setInput(event.target.value);
                  setOutput('');
                  setReceipt(null);
                  setCopied(false);
                  setCopyError(false);
                }}
                placeholder="Paste or type text here…"
                aria-label="Text to convert"
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                className="focus-ring min-h-64 w-full resize-y bg-transparent p-5 text-[15px] leading-7 outline-none placeholder:text-muted-foreground/70"
              />
            </section>

            <section
              aria-labelledby="output-heading"
              className="rounded-2xl border bg-card"
            >
              <div className="flex min-h-[61px] items-center justify-between border-b px-4 py-3 sm:px-5">
                <div>
                  <h2 id="output-heading" className="text-sm font-semibold">
                    Result
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Original text stays unchanged
                  </p>
                </div>
                {output ? (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={copyOutput}
                      aria-label="Copy converted text"
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
                      onClick={downloadOutput}
                      aria-label="Download converted text"
                    >
                      <ArrowDownToLine aria-hidden="true" />
                    </Button>
                  </div>
                ) : null}
              </div>
              <div
                aria-live="polite"
                className="min-h-64 whitespace-pre-wrap p-5 text-[15px] leading-7"
              >
                {output || (
                  <span className="text-muted-foreground/70">
                    Your converted text will appear here.
                  </span>
                )}
              </div>
            </section>
          </div>

          {copyError ? (
            <output className="mt-3 block text-sm text-destructive">
              Clipboard access was blocked. Download the text file instead.
            </output>
          ) : null}

          <section
            aria-labelledby="options-heading"
            className="mt-5 rounded-2xl border bg-muted/55 p-4 sm:p-5"
          >
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 id="options-heading" className="text-sm font-semibold">
                  Choose the result
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {textCaseOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={mode === option.id}
                      onClick={() => {
                        setMode(option.id);
                        setOutput('');
                        setReceipt(null);
                        setCopied(false);
                        setCopyError(false);
                      }}
                      className="focus-ring min-h-11 rounded-xl border bg-background px-4 py-2 text-sm font-medium transition-colors aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                {input || output ? (
                  <Button
                    variant="ghost"
                    className="h-11 px-4"
                    onClick={clearAll}
                  >
                    <Trash2 aria-hidden="true" />
                    Clear
                  </Button>
                ) : null}
                <Button
                  className="h-11 min-w-40 px-5 text-sm"
                  disabled={!input}
                  onClick={runTransform}
                >
                  <Sparkles aria-hidden="true" />
                  Convert text
                </Button>
              </div>
            </div>
          </section>

          {receipt ? (
            <section
              aria-labelledby="receipt-heading"
              className="mt-5 overflow-hidden rounded-2xl border bg-card"
            >
              <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-success/10 text-success">
                    <CheckCircle2 aria-hidden="true" className="size-5" />
                  </span>
                  <div>
                    <h2
                      id="receipt-heading"
                      className="text-lg font-semibold tracking-[-0.02em]"
                    >
                      Done — {receipt.outputCharacters.toLocaleString()}{' '}
                      characters ready
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {receipt.words.toLocaleString()} words · result visible in{' '}
                      <span className="tabular">
                        {formatDuration(receipt.durationMs)}
                      </span>
                    </p>
                  </div>
                </div>
                <Button className="h-11 px-5" onClick={copyOutput}>
                  {copied ? (
                    <Check aria-hidden="true" />
                  ) : (
                    <Clipboard aria-hidden="true" />
                  )}
                  {copied ? 'Copied' : 'Copy result'}
                </Button>
              </div>
              <div className="grid border-t sm:grid-cols-3">
                <div className="border-b p-4 sm:border-b-0 sm:border-r sm:p-5">
                  <p className="text-xs text-muted-foreground">Processing</p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
                    <ShieldCheck
                      aria-hidden="true"
                      className="size-4 text-success"
                    />
                    In this tab
                  </p>
                </div>
                <div className="border-b p-4 sm:border-b-0 sm:border-r sm:p-5">
                  <p className="text-xs text-muted-foreground">Original</p>
                  <p className="mt-1 text-sm font-semibold">Unchanged</p>
                </div>
                <div className="p-4 sm:p-5">
                  <p className="text-xs text-muted-foreground">
                    Release assurance
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    Formal egress proof pending
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          <footer className="mt-10 flex flex-col gap-3 border-t py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              Canary {manifest.version} · Local JavaScript · No analytics in
              this preview
            </p>
            <a
              href="/pdf/merge"
              className="focus-ring rounded font-semibold text-foreground hover:underline"
            >
              Next: Merge PDF →
            </a>
          </footer>
        </div>
      </section>
    </AppShell>
  );
}
