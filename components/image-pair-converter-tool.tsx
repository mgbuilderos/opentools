'use client';

import { ArrowDownToLine, ArrowRight, LockKeyhole, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { RelatedTools } from '@/components/related-tools';
import { announceCompletion } from '@/lib/completion';
import type { RelatedTool } from '@/lib/seo/related-tools';
import {
  convertImage,
  ImageConvertError,
} from '@/lib/tools/image-convert/convert';

/*
  One image conversion pair, pre-set, with the same converter behind every page.

  `app/convert/[pair]/page.tsx` computes the view and passes it in, exactly as
  it does for the unit pairs and the file-format pairs: the registry stays on
  the server and the type is declared here rather than imported, so none of the
  other fifteen pairs reaches this page's client bundle.
*/

/** Twenty photographs at once is the most a tab converts without swapping. */
const MAX_FILES = 20;
const MAX_INPUT_BYTES = 50 * 1024 * 1024;

export interface ImagePairView {
  title: string;
  summary: string;
  /** What this conversion does to the file, in its own terms. */
  measured: string;
  from: string;
  to: string;
  /** Format token -> display name, for the sibling links. */
  formats: Record<string, string>;
  /** `${from}|${to}` -> the page that answers it. */
  routes: Record<string, string>;
  extension: string;
  /** True when the source format costs the reader a decoder download. */
  needsDecoder: boolean;
}

interface Converted {
  name: string;
  url: string;
  bytes: number;
  width: number;
  height: number;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function outputName(inputName: string, extension: string) {
  const stem = inputName.replace(/\.[^.]+$/u, '') || 'image';
  return `${stem}.${extension}`;
}

/** The reverse of this pair first, then everything else out of this format. */
function siblingPairs(pair: ImagePairView) {
  const entries = Object.entries(pair.routes).map(([key, href]) => {
    const [from = '', to = ''] = key.split('|');
    return {
      from,
      to,
      href,
      label: `${pair.formats[from] ?? from} to ${pair.formats[to] ?? to}`,
    };
  });
  const reverse = entries.filter(
    (entry) => entry.from === pair.to && entry.to === pair.from,
  );
  const sameSource = entries.filter(
    (entry) => entry.from === pair.from && entry.to !== pair.to,
  );
  const sameTarget = entries.filter(
    (entry) => entry.to === pair.to && entry.from !== pair.from,
  );
  return [...reverse, ...sameSource, ...sameTarget].slice(0, 8);
}

export function ImagePairConverterTool({
  pair,
  relatedTools,
}: {
  pair: ImagePairView;
  relatedTools: readonly RelatedTool[];
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [results, setResults] = useState<Converted[]>([]);

  const fromName = pair.formats[pair.from] ?? pair.from;
  const toName = pair.formats[pair.to] ?? pair.to;

  async function onChooseFiles(list: FileList | File[]) {
    const files = Array.from(list);
    if (files.length === 0) return;
    setError('');
    for (const result of results) URL.revokeObjectURL(result.url);
    setResults([]);

    if (files.length > MAX_FILES) {
      setError(
        `That is ${files.length} files. This page converts ${MAX_FILES} at a time, so the tab does not run out of memory part-way through.`,
      );
      return;
    }

    const started = performance.now();
    const done: Converted[] = [];
    try {
      for (const [index, file] of files.entries()) {
        if (file.size > MAX_INPUT_BYTES) {
          throw new ImageConvertError(
            `“${file.name}” is ${formatBytes(file.size)}, and the limit on this page is ${formatBytes(MAX_INPUT_BYTES)}.`,
          );
        }
        setBusy(
          files.length === 1
            ? 'Converting…'
            : `Converting ${index + 1} of ${files.length}…`,
        );
        // Sequential: each decode holds the whole uncompressed picture, and
        // several large ones in flight is how a tab dies rather than how it
        // goes faster.
        const result = await convertImage(file, pair.from, pair.to);
        done.push({
          name: outputName(file.name, pair.extension),
          url: URL.createObjectURL(result.blob),
          bytes: result.blob.size,
          width: result.width,
          height: result.height,
        });
      }
      setResults(done);
      announceCompletion({
        operation: `${fromName} to ${toName}`,
        durationMs: Math.round(performance.now() - started),
        summary:
          done.length === 1
            ? `Converted one image to ${toName}.`
            : `Converted ${done.length} images to ${toName}.`,
        metrics: [
          { label: 'Images', value: String(done.length) },
          {
            label: 'Saved',
            value: formatBytes(done.reduce((sum, one) => sum + one.bytes, 0)),
          },
        ],
      });
    } catch (thrown) {
      for (const one of done) URL.revokeObjectURL(one.url);
      setError(
        thrown instanceof ImageConvertError
          ? thrown.message
          : `That file could not be read as ${fromName}. It may be damaged, or it may be a different format wearing the wrong extension.`,
      );
      errorRef.current?.focus();
    } finally {
      setBusy('');
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <AppShell currentToolId="image-optimize">
      <section
        id="tool"
        tabIndex={-1}
        className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-12"
      >
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col justify-between gap-5 border-b pb-8 sm:flex-row sm:items-start">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span>{fromName}</span>
                <ArrowRight aria-hidden="true" className="size-3" />
                <span>{toName}</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                {pair.title}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                {pair.summary}
              </p>
            </div>
            <span className="flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold">
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              Runs in this tab
            </span>
          </div>

          {error ? (
            <div
              ref={errorRef}
              role="alert"
              tabIndex={-1}
              className="focus-ring mt-6 flex items-start justify-between gap-4 rounded-xl border border-destructive/35 bg-destructive/5 p-4 text-sm"
            >
              <div>
                <p className="font-semibold">Couldn’t do that</p>
                <p className="mt-1 whitespace-pre-line text-muted-foreground">
                  {error}
                </p>
              </div>
              <button
                type="button"
                className="focus-ring rounded p-1"
                onClick={() => setError('')}
                aria-label="Dismiss error"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
          ) : null}

          <div className="mt-8 rounded-2xl border bg-card p-5">
            <label htmlFor="image-pair-file" className="text-sm font-semibold">
              Choose {fromName} files
            </label>
            <input
              ref={fileRef}
              id="image-pair-file"
              type="file"
              multiple
              accept="image/*"
              className="focus-ring mt-3 block w-full rounded-lg border bg-background p-2.5 text-sm"
              disabled={Boolean(busy)}
              onChange={(event) => onChooseFiles(event.target.files ?? [])}
            />
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Up to {MAX_FILES} images, {formatBytes(MAX_INPUT_BYTES)} each.
              Output is {toName}.
            </p>
          </div>

          <section className="mt-6 rounded-2xl border bg-card p-5">
            <h2 className="text-sm font-semibold">
              What this conversion changes
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {pair.measured}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Re-encoding does not carry EXIF across, so the camera settings and
              any location in the original are not written into the {toName}{' '}
              file. Keep the original if you need them.
              {pair.needsDecoder
                ? ' This browser may not read the source format on its own; where it cannot, a half-megabyte decoder is fetched from this site and run here in a worker, and your picture is no part of that request.'
                : ' The decoder is the one your browser already carries, so nothing is downloaded to do this.'}
            </p>
          </section>

          {busy ? (
            <p aria-live="polite" className="mt-6 text-sm font-medium">
              {busy}
            </p>
          ) : null}

          {results.length > 0 ? (
            <section className="mt-6 rounded-2xl border bg-card p-5">
              <h2 className="text-sm font-semibold">
                {results.length === 1
                  ? 'Your image'
                  : `Your ${results.length} images`}
              </h2>
              <ul className="mt-4 divide-y">
                {results.map((one) => (
                  <li
                    key={one.url}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{one.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {one.width} × {one.height} px · {formatBytes(one.bytes)}
                      </p>
                    </div>
                    <a
                      data-receipt-download
                      className="focus-ring inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-semibold"
                      download={one.name}
                      href={one.url}
                    >
                      <ArrowDownToLine aria-hidden="true" className="size-4" />
                      Save {toName}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="mt-6 rounded-2xl border bg-card p-5">
            <h2 className="text-sm font-semibold">The other conversions</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Each has its own page, set to that pair when it opens.
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {siblingPairs(pair).map((sibling) => (
                <li key={sibling.href}>
                  {/* Plain anchors: `next/link` is banned by
                      lib/tools/local-source-policy.test.ts, and a crawler that
                      runs no JavaScript still has to see these. */}
                  <a
                    className="focus-ring inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium"
                    href={sibling.href}
                  >
                    {sibling.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <RelatedTools tools={relatedTools} />
        </div>
      </section>
    </AppShell>
  );
}
