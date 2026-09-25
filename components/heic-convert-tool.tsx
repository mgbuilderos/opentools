'use client';

import { ArrowDownToLine, FileImage, LockKeyhole, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { announceCompletion } from '@/lib/completion';
import {
  convertImage,
  ImageConvertError,
  type ConvertResult,
} from '@/lib/tools/image-convert/convert';
import {
  ACCEPTED_IMAGE_EXTENSIONS,
  requireImageFormat,
} from '@/lib/tools/image-convert/formats';

/** Twenty photographs at once is the most a tab converts without swapping. */
const MAX_FILES = 20;
/** A 48 MP HEIC is about 12 MB; 50 MB leaves room for a burst frame. */
const MAX_INPUT_BYTES = 50 * 1024 * 1024;

/**
 * The decoder's real transfer cost, measured 2026-09-24 by gzipping the files
 * the package actually ships: libheif.js 91,255 B -> 29,122 B and libheif.wasm
 * 1.36 MB -> 0.45 MB. npm's 8.37 MB is the unpacked directory and was quoted as
 * the download in four places before anyone weighed it.
 */
const DECODER_TRANSFER = '0.5 MB';

const NOTICES_URL = [
  'https:',
  '//',
  'github.com/mgbuilderos/opentools/blob/main/THIRD_PARTY_NOTICES.md',
].join('');

interface Converted {
  name: string;
  url: string;
  bytes: number;
  width: number;
  height: number;
  usedDecoder: boolean;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function outputName(inputName: string, extension: string) {
  const stem = inputName.replace(/\.[^.]+$/u, '') || 'photo';
  return `${stem}.${extension}`;
}

export interface HeicConvertToolProps {
  /** `jpg` or `png`. Decides the encoder and every word on the page. */
  targetFormatId: string;
}

/**
 * HEIC in, JPEG or PNG out, in the tab.
 *
 * ONE COMPONENT, TWO ROUTES. `/image/heic-to-jpg` and `/image/heic-to-png` are
 * the same job with a different encoder, and the person searching for one is
 * not the person searching for the other: a JPEG is what a form accepts, a PNG
 * is what keeps every pixel. Two addresses, one implementation, and the target
 * is a prop rather than a query parameter so each page is its own self-canonical
 * URL rather than two views of one.
 */
export function HeicConvertTool({ targetFormatId }: HeicConvertToolProps) {
  const target = requireImageFormat(targetFormatId);

  const sibling =
    target.id === 'jpg'
      ? {
          href: '/image/heic-to-png',
          label: 'Need a PNG instead, with nothing re-compressed?',
        }
      : {
          href: '/image/heic-to-jpg',
          label: 'Need a smaller file for an upload form? Convert to JPG.',
        };

  const fileRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [results, setResults] = useState<Converted[]>([]);

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
            `“${file.name}” is ${formatBytes(file.size)}. The limit on this page is ${formatBytes(MAX_INPUT_BYTES)}, which is larger than any photograph a phone takes.`,
          );
        }
        setBusy(
          files.length === 1
            ? 'Converting…'
            : `Converting ${index + 1} of ${files.length}…`,
        );
        // Sequential on purpose: each decode holds the full bitmap, and four
        // 48 MP photographs in flight at once is how a tab dies.
        const result: ConvertResult = await convertImage(
          file,
          'heic',
          target.id,
        );
        done.push({
          name: outputName(file.name, target.extension),
          url: URL.createObjectURL(result.blob),
          bytes: result.blob.size,
          width: result.width,
          height: result.height,
          usedDecoder: result.usedDecoder,
        });
      }
      setResults(done);
      announceCompletion({
        operation: `HEIC to ${target.name}`,
        durationMs: Math.round(performance.now() - started),
        summary:
          done.length === 1
            ? `Converted one photo to ${target.name}.`
            : `Converted ${done.length} photos to ${target.name}.`,
        metrics: [
          { label: 'Photos', value: String(done.length) },
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
          : 'That file could not be read as a HEIC photo. If it came from somewhere other than a phone camera, it may be a different format wearing the wrong extension.',
      );
      errorRef.current?.focus();
    } finally {
      setBusy('');
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const usedDecoder = results.some((one) => one.usedDecoder);

  return (
    <AppShell currentToolId="heic-converter">
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
                <span>HEIC to {target.name}</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Convert HEIC to {target.name}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                Turn the photos an iPhone saves as .heic into {target.name}{' '}
                files that Windows, Word and every upload form will open. The
                photo is read and written inside this tab — it is never sent
                anywhere.
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
            <label htmlFor="heic-file" className="text-sm font-semibold">
              Choose HEIC photos
            </label>
            <input
              ref={fileRef}
              id="heic-file"
              type="file"
              multiple
              accept={[
                'image/heic',
                'image/heif',
                ...ACCEPTED_IMAGE_EXTENSIONS,
              ].join(',')}
              className="focus-ring mt-3 block w-full rounded-lg border bg-background p-2.5 text-sm"
              disabled={Boolean(busy)}
              onChange={(event) => onChooseFiles(event.target.files ?? [])}
            />
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Up to {MAX_FILES} photos, {formatBytes(MAX_INPUT_BYTES)} each.
              Output is {target.name} — {target.summary}.{' '}
              {/*
                Plain `<a>`, like the rest of the site: `next/link` is banned by
                lib/tools/local-source-policy.test.ts. This is also the inbound
                link that keeps the sibling page out of the orphan report, so it
                is a link a crawler sees rather than a client-side route change.
              */}
              <a
                className="focus-ring underline underline-offset-4"
                href={sibling.href}
              >
                {sibling.label}
              </a>
            </p>
          </div>

          <div className="mt-6 rounded-2xl border bg-card p-5">
            <h2 className="text-sm font-semibold">
              What this page downloads, and when
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Your browser is asked to open the photo first. Safari can read
              HEIC on its own and nothing extra is fetched. Chrome, Edge and
              Firefox cannot, so the page then fetches a {DECODER_TRANSFER}{' '}
              decoder from this site and runs it here in a worker. That is the
              only network request your photo causes, and the photo itself is
              not part of it.
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              The decoder is libheif, licensed{' '}
              <a
                className="focus-ring underline underline-offset-4"
                href={NOTICES_URL}
                rel="noreferrer"
                target="_blank"
              >
                LGPL-3.0
              </a>
              . It is served as its own file rather than baked into the page, so
              it stays a component you can read, replace or rebuild.
            </p>
          </div>

          {busy ? (
            <p aria-live="polite" className="mt-6 text-sm font-medium">
              {busy}
            </p>
          ) : null}

          {results.length > 0 ? (
            <section className="mt-6 rounded-2xl border bg-card p-5">
              <h2 className="text-sm font-semibold">
                {results.length === 1
                  ? 'Your photo'
                  : `Your ${results.length} photos`}
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
                    {/*
                      A plain anchor rather than a Button: the href is the file
                      itself, so saving needs no script, and the e2e suite can
                      take the download from a link that exists in the markup.
                    */}
                    <a
                      data-receipt-download
                      className="focus-ring inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-semibold"
                      download={one.name}
                      href={one.url}
                    >
                      <ArrowDownToLine aria-hidden="true" className="size-4" />
                      Save {target.name}
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                <FileImage aria-hidden="true" className="mt-0.5 size-3.5" />
                <span>
                  {usedDecoder
                    ? `This browser cannot read HEIC, so the decoder ran here in a worker. `
                    : `This browser reads HEIC on its own, so no decoder was downloaded. `}
                  Re-encoding does not carry EXIF across, so the location and
                  camera fields in the original are not in the {target.name}{' '}
                  file.
                </span>
              </p>
            </section>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}
