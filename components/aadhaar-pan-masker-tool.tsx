'use client';

import {
  ArrowDownToLine,
  Check,
  Clipboard,
  FileText,
  LockKeyhole,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { PracticeBriefPanel } from '@/components/practice-brief';
import { Button } from '@/components/ui/button';
import type { PracticeBrief } from '@/lib/practice-briefs';
import { toolMeta } from '@/lib/tools/tool-meta';
import type {
  IdMaskRequest,
  IdMaskResponse,
  MaskResult,
  PanMaskStyle,
  RecheckFinding,
} from '@/lib/tools/id-mask/protocol';

/** Extensions read as plain text. Anything else is refused, not guessed at. */
const TEXT_EXTENSIONS = ['.txt', '.csv', '.tsv', '.json', '.md', '.log'];
const MAX_BYTES = 20 * 1024 * 1024;
const LISTED_FINDINGS = 50;

type Outcome = {
  output: string;
  result: MaskResult;
  findings: RecheckFinding[];
  durationMs: number;
};

type SourceFile = { name: string; extension: string };

function createWorker() {
  return new Worker(new URL('../workers/id-mask.worker.ts', import.meta.url), {
    type: 'module',
    name: 'id-mask-engine',
  });
}

function extensionOf(name: string) {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot).toLowerCase() : '';
}

function formatDuration(durationMs: number) {
  return durationMs < 1000
    ? `${Math.max(1, Math.round(durationMs))} ms`
    : `${(durationMs / 1000).toFixed(2)} s`;
}

const plural = (count: number, one: string, many: string) =>
  `${count.toLocaleString()} ${count === 1 ? one : many}`;

/**
 * `brief` re-points this page at one profession without forking the tool.
 * See the same prop on `pdf-to-excel-tool.tsx` for why it exists.
 */
export function AadhaarPanMaskerTool({
  brief,
}: { brief?: PracticeBrief } = {}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLTextAreaElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestRef = useRef(0);
  const [input, setInput] = useState('');
  const [source, setSource] = useState<SourceFile | null>(null);
  const [panMask, setPanMask] = useState<PanMaskStyle>('last4');
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const manifest = toolMeta('aadhaar-pan-masker');

  useEffect(
    () => () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    },
    [],
  );

  /** Any change to the input or options makes the old result stale. */
  const resetResult = () => {
    requestRef.current += 1;
    setRunning(false);
    setOutcome(null);
    setAcknowledged(false);
    setCopied(false);
    setCopyError(false);
  };

  const chooseFile = async (file?: File) => {
    if (!file) return;
    resetResult();
    setError('');
    const extension = extensionOf(file.name);
    if (!TEXT_EXTENSIONS.includes(extension)) {
      setError(
        `${file.name} is not a text file this tool reads. It reads .txt, .csv, .tsv, .json, .md and .log files only. It does not read images, scans or PDFs, so a scanned card cannot be masked here.`,
      );
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('This tool reads text files up to 20 MB.');
      return;
    }
    try {
      const text = await file.text();
      if (text.slice(0, 65536).includes('\u0000')) {
        setError(
          `${file.name} contains binary data, not plain text, so it was not read.`,
        );
        return;
      }
      setInput(text);
      setSource({ name: file.name, extension });
    } catch {
      setError('The browser could not read that file.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const run = () => {
    if (!input || running) return;
    resetResult();
    setError('');
    setRunning(true);
    const id = requestRef.current;
    const started = performance.now();
    try {
      workerRef.current ??= createWorker();
      const worker = workerRef.current;
      worker.onmessage = (event: MessageEvent<IdMaskResponse>) => {
        const message = event.data;
        if (message.id !== requestRef.current) return;
        setRunning(false);
        if (message.type === 'error') {
          setError('Masking stopped unexpectedly. Your text is unchanged.');
          return;
        }
        setOutcome({
          output: message.result.output,
          result: message.result,
          findings: message.findings,
          durationMs: performance.now() - started,
        });
      };
      worker.onerror = () => {
        worker.terminate();
        workerRef.current = null;
        setRunning(false);
        setError('Masking stopped unexpectedly. Your text is unchanged.');
      };
      const request: IdMaskRequest = { id, text: input, panMask };
      worker.postMessage(request);
    } catch {
      setRunning(false);
      setError('Masking could not start. Your text is unchanged.');
    }
  };

  const clearAll = () => {
    resetResult();
    setInput('');
    setSource(null);
    setError('');
  };

  const blocked = Boolean(outcome?.findings.length) && !acknowledged;

  const copyOutput = async () => {
    if (!outcome || blocked) return;
    try {
      await navigator.clipboard.writeText(outcome.output);
      setCopied(true);
      setCopyError(false);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
  };

  const downloadName = source
    ? `${source.name.slice(0, source.name.length - source.extension.length)}-masked${source.extension}`
    : 'masked-text.txt';

  const downloadOutput = () => {
    if (!outcome || blocked) return;
    const url = URL.createObjectURL(
      new Blob([outcome.output], { type: 'text/plain;charset=utf-8' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadName;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const showFinding = (finding: RecheckFinding) => {
    const area = outputRef.current;
    if (!area) return;
    area.focus();
    area.setSelectionRange(finding.start, finding.end);
  };

  const masked = outcome
    ? outcome.result.aadhaarChecksumValid + outcome.result.aadhaarShapeOnly
    : 0;

  return (
    <AppShell currentToolId="aadhaar-pan-masker">
      <section
        id="tool"
        tabIndex={-1}
        className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-12"
      >
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col justify-between gap-5 border-b pb-8 sm:flex-row sm:items-start">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                <span>{brief ? brief.eyebrow : 'India & life admin'}</span>
                {brief ? null : (
                  <>
                    <span aria-hidden="true">/</span>
                    <span>Aadhaar and PAN masker</span>
                  </>
                )}
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                {brief ? brief.heading : 'Mask Aadhaar and PAN numbers'}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                {brief
                  ? brief.lede
                  : 'Detects and masks Aadhaar and PAN numbers in text on your device. Aadhaar numbers are masked the way a masked Aadhaar is: the first 8 digits are hidden.'}
              </p>
            </div>
            <span className="flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold">
              <LockKeyhole aria-hidden="true" className="size-3.5" /> On-device
              prototype
            </span>
          </div>

          {brief ? <PracticeBriefPanel brief={brief} /> : null}

          <section
            aria-labelledby="scope-heading"
            className="mt-6 rounded-2xl border bg-muted/55 p-4 text-sm leading-6 sm:p-5"
          >
            <h2 id="scope-heading" className="font-semibold">
              This tool reads text only. It does not read images, scans or PDFs.
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>
                Paste text, or open a .txt, .csv, .tsv, .json, .md or .log file.
                A photo or scan of a card is not read, so it is not masked.
              </li>
              <li>
                PAN numbers show their last 4 characters by default. You can
                hide all 10 instead.
              </li>
              <li>
                16-digit numbers, such as card numbers and Aadhaar Virtual IDs,
                are not masked. They are counted so you can check them.
              </li>
              <li>
                To mask a single number you type in, use the{' '}
                <a
                  href="/life-admin/aadhaar-masking-tool"
                  className="focus-ring underline underline-offset-4"
                >
                  Aadhaar masking tool
                </a>{' '}
                or the{' '}
                <a
                  href="/life-admin/pan-masking-tool"
                  className="focus-ring underline underline-offset-4"
                >
                  PAN masking tool
                </a>
                . They run the same engine as this page, so they hide exactly
                the same digits.
              </li>
              <li>
                This is an independent tool. It is not made, approved or
                endorsed by UIDAI or the Income Tax Department.
              </li>
            </ul>
          </section>

          {error ? (
            <div
              role="alert"
              className="mt-6 flex items-start justify-between gap-4 rounded-xl border border-destructive/35 bg-destructive/5 p-4 text-sm"
            >
              <p>{error}</p>
              <button
                type="button"
                onClick={() => setError('')}
                aria-label="Dismiss error"
                className="focus-ring rounded-lg border p-1.5"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
          ) : null}

          <section
            aria-labelledby="input-heading"
            className="mt-6 rounded-2xl border bg-card"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
              <div>
                <h2 id="input-heading" className="text-sm font-semibold">
                  Your text
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {source
                    ? `From ${source.name} · stays in this browser tab`
                    : 'Stays in this browser tab and is not saved'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="tabular text-xs text-muted-foreground">
                  {input.length.toLocaleString()} characters
                </span>
                <input
                  ref={fileRef}
                  type="file"
                  accept={TEXT_EXTENSIONS.join(',')}
                  aria-label="Open a text file"
                  className="sr-only"
                  onChange={(event) => void chooseFile(event.target.files?.[0])}
                />
                <Button
                  variant="outline"
                  className="h-10"
                  onClick={() => fileRef.current?.click()}
                >
                  <FileText aria-hidden="true" /> Open a text file
                </Button>
              </div>
            </div>
            <textarea
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                setSource(null);
                resetResult();
              }}
              placeholder="Paste text that contains Aadhaar or PAN numbers…"
              aria-label="Text to mask"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              autoComplete="off"
              className="focus-ring min-h-56 w-full resize-y bg-transparent p-5 font-mono text-sm leading-6 outline-none placeholder:text-muted-foreground/70"
            />
          </section>

          <section
            aria-labelledby="options-heading"
            className="mt-5 rounded-2xl border bg-muted/55 p-4 sm:p-5"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <fieldset>
                <legend id="options-heading" className="text-sm font-semibold">
                  PAN numbers
                </legend>
                <div className="mt-3 flex flex-col gap-2 text-sm sm:flex-row sm:gap-5">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="pan-mask"
                      value="last4"
                      checked={panMask === 'last4'}
                      onChange={() => {
                        setPanMask('last4');
                        resetResult();
                      }}
                      className="accent-foreground"
                    />
                    Show last 4 (<span className="font-mono">XXXXXX234F</span>)
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="pan-mask"
                      value="all"
                      checked={panMask === 'all'}
                      onChange={() => {
                        setPanMask('all');
                        resetResult();
                      }}
                      className="accent-foreground"
                    />
                    Hide all 10 (<span className="font-mono">XXXXXXXXXX</span>)
                  </label>
                </div>
              </fieldset>
              <div className="flex gap-2">
                {input || outcome ? (
                  <Button
                    variant="ghost"
                    className="h-11 px-4"
                    onClick={clearAll}
                  >
                    <Trash2 aria-hidden="true" /> Clear
                  </Button>
                ) : null}
                <Button
                  className="h-11 min-w-44 px-5"
                  disabled={!input || running}
                  onClick={run}
                >
                  <ScanSearch aria-hidden="true" />
                  {running ? 'Masking…' : 'Mask numbers'}
                </Button>
              </div>
            </div>
          </section>

          {outcome ? (
            <section
              aria-labelledby="result-heading"
              className="mt-5 overflow-hidden rounded-2xl border bg-card"
            >
              <div className="border-b p-5 sm:p-6">
                <h2
                  id="result-heading"
                  className="text-lg font-semibold tracking-[-0.02em]"
                >
                  {masked + outcome.result.pan === 0
                    ? 'No Aadhaar or PAN numbers found'
                    : `Masked ${plural(masked, 'Aadhaar number', 'Aadhaar numbers')} and ${plural(outcome.result.pan, 'PAN', 'PANs')}`}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Finished in {formatDuration(outcome.durationMs)} in this
                  browser tab.
                </p>
                <dl
                  aria-label="Masking report"
                  className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"
                >
                  <div className="rounded-xl border p-3">
                    <dt className="text-xs text-muted-foreground">
                      Aadhaar, checksum valid
                    </dt>
                    <dd
                      data-testid="count-aadhaar-valid"
                      className="tabular mt-1 text-lg font-semibold"
                    >
                      {outcome.result.aadhaarChecksumValid.toLocaleString()}
                    </dd>
                  </div>
                  <div className="rounded-xl border p-3">
                    <dt className="text-xs text-muted-foreground">
                      Aadhaar, shape only (checksum fails)
                    </dt>
                    <dd
                      data-testid="count-aadhaar-shape"
                      className="tabular mt-1 text-lg font-semibold"
                    >
                      {outcome.result.aadhaarShapeOnly.toLocaleString()}
                    </dd>
                  </div>
                  <div className="rounded-xl border p-3">
                    <dt className="text-xs text-muted-foreground">PAN</dt>
                    <dd
                      data-testid="count-pan"
                      className="tabular mt-1 text-lg font-semibold"
                    >
                      {outcome.result.pan.toLocaleString()}
                    </dd>
                  </div>
                  <div className="rounded-xl border p-3">
                    <dt className="text-xs text-muted-foreground">
                      Long numbers not masked (13+ digits)
                    </dt>
                    <dd
                      data-testid="count-long-runs"
                      className="tabular mt-1 text-lg font-semibold"
                    >
                      {outcome.result.longNumberRuns.toLocaleString()}
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  A shape-only number fails the Aadhaar checksum, perhaps
                  because of a typo. It is masked anyway.
                  {outcome.result.longNumberRuns > 0
                    ? ' Long numbers, such as card numbers or 16-digit Virtual IDs, are left as they are: check them yourself.'
                    : ''}
                </p>
              </div>

              {outcome.findings.length > 0 ? (
                <div
                  role="alert"
                  aria-labelledby="recheck-heading"
                  className="border-b border-destructive/35 bg-destructive/5 p-5 sm:p-6"
                >
                  <h3
                    id="recheck-heading"
                    className="flex items-center gap-2 text-base font-semibold text-destructive"
                  >
                    <ShieldAlert aria-hidden="true" className="size-5" />
                    Not clean:{' '}
                    {plural(outcome.findings.length, 'place', 'places')} in the
                    result still{' '}
                    {outcome.findings.length === 1 ? 'looks' : 'look'} like an
                    Aadhaar or PAN number
                  </h3>
                  <p className="mt-2 text-sm leading-6">
                    A second, looser check read the masked result and found
                    numbers the masker did not change. They may be real numbers
                    written in an unusual way. Look at each one before you use
                    the result.
                  </p>
                  <ul
                    className="mt-3 flex flex-wrap gap-2"
                    aria-label="Places to check"
                  >
                    {outcome.findings
                      .slice(0, LISTED_FINDINGS)
                      .map((finding) => (
                        <li key={`${finding.start}:${finding.end}`}>
                          <button
                            type="button"
                            onClick={() => showFinding(finding)}
                            className="focus-ring rounded-lg border bg-background px-3 py-1.5 text-xs font-medium"
                          >
                            Line {finding.line}, column {finding.column} ·{' '}
                            {finding.kind === 'pan-shape'
                              ? 'PAN-like'
                              : '12 digits'}
                          </button>
                        </li>
                      ))}
                  </ul>
                  {outcome.findings.length > LISTED_FINDINGS ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      and{' '}
                      {(
                        outcome.findings.length - LISTED_FINDINGS
                      ).toLocaleString()}{' '}
                      more
                    </p>
                  ) : null}
                  <label className="mt-4 flex items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={acknowledged}
                      onChange={(event) =>
                        setAcknowledged(event.target.checked)
                      }
                      className="mt-1 accent-foreground"
                    />
                    <span>
                      I have checked these places and want to copy or download
                      the result anyway.
                    </span>
                  </label>
                </div>
              ) : (
                <output className="flex items-start gap-2 border-b p-5 text-sm sm:px-6">
                  <ShieldCheck
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-success"
                  />
                  <span>
                    Re-check passed: a second, looser check read the result and
                    found nothing that looks like an unmasked Aadhaar or PAN
                    number.
                  </span>
                </output>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <label
                  htmlFor="masked-output"
                  className="text-sm font-semibold"
                >
                  Masked text
                </label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="h-10"
                    disabled={blocked}
                    onClick={() => void copyOutput()}
                  >
                    {copied ? (
                      <Check aria-hidden="true" />
                    ) : (
                      <Clipboard aria-hidden="true" />
                    )}
                    {copied ? 'Copied' : 'Copy masked text'}
                  </Button>
                  <Button
                    className="h-10"
                    disabled={blocked}
                    onClick={downloadOutput}
                  >
                    <ArrowDownToLine aria-hidden="true" /> Download{' '}
                    {downloadName}
                  </Button>
                </div>
              </div>
              <textarea
                id="masked-output"
                ref={outputRef}
                readOnly
                value={outcome.output}
                spellCheck={false}
                className="focus-ring min-h-56 w-full resize-y border-t bg-transparent p-5 font-mono text-sm leading-6 outline-none"
              />
              {copyError ? (
                <p className="border-t p-4 text-sm text-destructive">
                  Clipboard access was blocked. Download the file instead.
                </p>
              ) : null}
            </section>
          ) : null}

          <footer className="mt-10 border-t py-6 text-xs text-muted-foreground">
            Candidate {manifest.version} · Local JavaScript · Browser worker
          </footer>
        </div>
      </section>
    </AppShell>
  );
}
