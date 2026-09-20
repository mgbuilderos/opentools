'use client';

import { Check, Clipboard, FileText, LockKeyhole, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import {
  BatchLocalPromise,
  BatchRunnerPanel,
  useFileBatchRunner,
} from '@/components/batch-runner';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import {
  formatExactBytes,
  OCR_MAX_INITIAL_DOWNLOAD_BYTES,
} from '@/lib/tools/ocr/assets';
import { createOcrSession } from '@/lib/tools/ocr/runtime';
import type { OcrProgress, OcrResult } from '@/lib/tools/ocr/types';

const MAX_IMAGE_BYTES = 40 * 1024 * 1024;
const ACCEPTED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/bmp',
]);

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function textName(name: string) {
  const stem = name.replace(/\.(?:png|jpe?g|webp|bmp)$/iu, '');
  return `${stem || 'image'}-text.txt`;
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function ImageToTextTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const runner = useFileBatchRunner();
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<Record<number, OcrResult>>({});
  const [engineProgress, setEngineProgress] = useState<OcrProgress | null>(
    null,
  );
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => {
    if (copied === null) return;
    const timer = setTimeout(() => setCopied(null), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  const assetDisclosure = formatExactBytes(OCR_MAX_INITIAL_DOWNLOAD_BYTES);
  const resultEntries = useMemo(
    () =>
      Object.entries(results)
        .map(([index, result]) => ({ index: Number(index), result }))
        .sort((a, b) => a.index - b.index),
    [results],
  );

  function reset() {
    runner.reset();
    setFiles([]);
    setResults({});
    setEngineProgress(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  }

  function chooseFiles(list: FileList | null) {
    if (!list?.length) return;
    const next = [...list];
    const invalid = next.find(
      (file) => !ACCEPTED_TYPES.has(file.type) || file.size > MAX_IMAGE_BYTES,
    );
    if (invalid) {
      setError(
        !ACCEPTED_TYPES.has(invalid.type)
          ? `${invalid.name} is not a PNG, JPEG, WebP or BMP image.`
          : `${invalid.name} is ${formatBytes(invalid.size)}. Images must be no larger than ${formatBytes(MAX_IMAGE_BYTES)} each.`,
      );
      return;
    }
    runner.reset();
    setFiles(next);
    setResults({});
    setEngineProgress(null);
    setError('');
  }

  async function run() {
    if (files.length === 0 || runner.running) return;
    setError('');
    setResults({});
    const startedAt = performance.now();
    const sessionHolder: {
      promise: ReturnType<typeof createOcrSession> | null;
    } = { promise: null };
    let characterCount = 0;

    try {
      await runner.start(files, async (file, index, signal) => {
        sessionHolder.promise ??= createOcrSession(setEngineProgress, signal);
        const session = await sessionHolder.promise;
        const result = await session.recognise(file, {
          signal,
          onProgress: setEngineProgress,
        });
        characterCount += result.text.length;
        setResults((current) => ({ ...current, [index]: result }));
        return {
          status: 'done' as const,
          output: {
            blob: new Blob([result.text], { type: 'text/plain;charset=utf-8' }),
            fileName: textName(file.name),
          },
        };
      });
      const durationMs = performance.now() - startedAt;
      announceCompletion({
        operation: 'Image to text',
        durationMs,
        summary: `${files.length} ${files.length === 1 ? 'image' : 'images'} checked in this browser.`,
        metrics: [
          { label: 'Files', value: files.length.toLocaleString() },
          {
            label: 'Characters',
            value: characterCount.toLocaleString(),
          },
        ],
      });
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError')) {
        setError(
          cause instanceof Error
            ? cause.message
            : 'The images could not be read.',
        );
      }
    } finally {
      if (sessionHolder.promise) {
        const created = await sessionHolder.promise.catch(() => null);
        await created?.terminate();
      }
      setEngineProgress(null);
    }
  }

  async function copyResult(index: number, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(index);
    } catch {
      setError(
        'Copy was blocked by this browser. Select the text below instead.',
      );
    }
  }

  return (
    <AppShell currentToolId="image-to-text">
      <section
        id="tool"
        tabIndex={-1}
        className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-12"
      >
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col justify-between gap-5 border-b pb-8 sm:flex-row sm:items-start">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span>Image</span>
                <span aria-hidden="true">/</span>
                <span>To text</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Image to text
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                Read selectable English text from screenshots, photos and scans.
                The recogniser runs in a dedicated worker on this device.
              </p>
            </div>
            <span className="flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold">
              <LockKeyhole aria-hidden="true" className="size-3.5" /> On-device
              OCR
            </span>
          </div>

          <div className="mt-6 rounded-xl border bg-muted/40 p-4 text-sm leading-6">
            <p className="font-semibold">
              English recognition, loaded on request
            </p>
            <p className="mt-1 text-muted-foreground">
              Choosing files downloads nothing. Starting OCR downloads at most{' '}
              <strong>{assetDisclosure}</strong> from this site, then the
              browser caches those versioned assets. Recognition can misread
              blurred, skewed or stylised text; highlighted words are the
              recogniser&apos;s measured low-confidence results and should be
              checked.
            </p>
          </div>

          {error ? (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-destructive/35 bg-destructive/5 p-4 text-sm"
            >
              <p className="font-semibold">Couldn&apos;t finish OCR</p>
              <p className="mt-1 text-muted-foreground">{error}</p>
            </div>
          ) : null}

          <section className="mt-8 rounded-2xl border bg-card p-5 sm:p-6">
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,image/bmp,.png,.jpg,.jpeg,.webp,.bmp"
              aria-label="Choose images for text recognition"
              className="sr-only"
              onChange={(event) => chooseFiles(event.target.files)}
            />
            {files.length === 0 ? (
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-muted-foreground">
                  Choose one image for a text result, or several for sequential
                  batch OCR and a ZIP of text files.
                </p>
                <Button
                  className="h-11"
                  onClick={() => inputRef.current?.click()}
                >
                  <FileText aria-hidden="true" className="mr-2 size-4" /> Choose
                  images
                </Button>
                <BatchLocalPromise />
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">
                    {files.length} {files.length === 1 ? 'image' : 'images'}{' '}
                    ready
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {files.map((file) => file.name).join(', ')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => inputRef.current?.click()}
                  >
                    Choose another
                  </Button>
                  <Button
                    variant="outline"
                    aria-label="Clear chosen images"
                    onClick={reset}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </div>
            )}

            {files.length === 1 && runner.outcomes.length === 0 ? (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button
                  className="h-11"
                  disabled={runner.running}
                  onClick={() => void run()}
                >
                  {runner.running
                    ? 'Reading image…'
                    : `Download ${assetDisclosure} and read text`}
                </Button>
                {runner.running ? (
                  <Button
                    variant="outline"
                    className="h-11"
                    disabled={runner.cancelRequested}
                    onClick={runner.cancel}
                  >
                    {runner.cancelRequested ? 'Stopping…' : 'Cancel'}
                  </Button>
                ) : null}
                {runner.running && engineProgress ? (
                  <output
                    aria-live="polite"
                    className="text-sm text-muted-foreground"
                  >
                    {engineProgress.status} ·{' '}
                    {Math.round(engineProgress.progress * 100)}%
                  </output>
                ) : null}
              </div>
            ) : null}
          </section>

          {files.length > 1 ? (
            <BatchRunnerPanel
              files={files}
              runner={runner}
              startLabel={`Download ${assetDisclosure} and read ${files.length} images`}
              zipName="image-text-results.zip"
              onStart={() => void run()}
              onClear={reset}
            />
          ) : null}

          {runner.running && files.length > 1 && engineProgress ? (
            <p role="status" className="mt-3 text-sm text-muted-foreground">
              {engineProgress.status} ·{' '}
              {Math.round(engineProgress.progress * 100)}%
            </p>
          ) : null}

          <div className="mt-6 space-y-5">
            {resultEntries.map(({ index, result }) => {
              const file = files[index];
              if (!file) return null;
              return (
                <section
                  key={`${file.name}-${index}`}
                  className="rounded-2xl border bg-card p-5 sm:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">{file.name}</h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Page confidence {result.confidence.toFixed(1)} ·{' '}
                        {result.words.length.toLocaleString()} words ·{' '}
                        {result.width} × {result.height} px
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void copyResult(index, result.text)}
                      >
                        {copied === index ? (
                          <Check aria-hidden="true" />
                        ) : (
                          <Clipboard aria-hidden="true" />
                        )}
                        {copied === index ? 'Copied' : 'Copy text'}
                      </Button>
                      <Button
                        size="sm"
                        data-receipt-download
                        onClick={() =>
                          downloadBlob(
                            new Blob([result.text], {
                              type: 'text/plain;charset=utf-8',
                            }),
                            textName(file.name),
                          )
                        }
                      >
                        Download .txt
                      </Button>
                    </div>
                  </div>

                  <textarea
                    aria-label={`Recognised text from ${file.name}`}
                    value={result.text}
                    readOnly
                    className="mt-4 min-h-40 w-full resize-y rounded-lg border bg-background p-3 font-mono text-sm leading-6"
                  />

                  <div className="mt-4 rounded-lg border bg-background p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Confidence review
                    </p>
                    <p className="mt-2 flex flex-wrap gap-x-1.5 gap-y-1 text-sm leading-7">
                      {result.words.map((word, wordIndex) =>
                        word.lowConfidence ? (
                          <mark
                            key={`${word.text}-${wordIndex}`}
                            title={`${word.confidence.toFixed(1)} confidence`}
                            className="rounded bg-amber-200 px-0.5 text-amber-950"
                          >
                            {word.text}
                          </mark>
                        ) : (
                          <span key={`${word.text}-${wordIndex}`}>
                            {word.text}
                          </span>
                        ),
                      )}
                    </p>
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
