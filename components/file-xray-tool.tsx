'use client';

/**
 * File X-ray: one dropzone for any file, and a ranked list of what is inside it.
 *
 * **Why this page exists next to five others.** There are already tool pages for
 * photo metadata, PDF metadata, Word metadata and video metadata, and each is
 * better than this one at its own format. All four share a problem: you have to
 * already know that the risk exists, and which format carries it, before you can
 * find the page that shows it. Nobody wonders whether their holiday photo knows
 * where their house is. This page answers the question people do ask -- *what is
 * actually in this file?* -- and needs no guess about the format to do it.
 *
 * **What the layout is for.** The engine returns findings ranked by category, so
 * the reader meets a location before a page count. The rows carry a plain
 * sentence about consequences rather than a field name and a hex value, and the
 * `technical` group is folded away by default: it is true, harmless, and the
 * reason a metadata table normally reads as noise.
 */

import {
  AlertTriangle,
  Clock,
  Eraser,
  EyeOff,
  FileSearch,
  Fingerprint,
  Info,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  Sliders,
  UserRound,
  X,
} from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import {
  CATEGORY_ORDER,
  cleanFileName,
  mimeTypeFor,
  stripFile,
  xrayFile,
  type XrayCategory,
  type XrayFinding,
  type XrayReport,
  type XrayStripResult,
} from '@/lib/tools/xray';

/**
 * 100 MB, above the 50 MB the photo page allows.
 *
 * This tool accepts video, where 50 MB is a short clip, and the work it does on
 * a large file is bounded: the image and PDF paths read headers, and the OOXML
 * path reads the archive index plus two small parts. Only the MP4 demuxer walks
 * the container, and it does that over a `ByteSource` rather than a copy.
 */
const MAX_FILE_BYTES = 100 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** How each group is introduced, titled and iconified. */
const CATEGORY_META: Readonly<
  Record<
    XrayCategory,
    {
      title: string;
      blurb: string;
      Icon: typeof MapPin;
    }
  >
> = {
  location: {
    title: 'Where you were',
    blurb:
      'Coordinates written into the file by the device that made it. Precise enough to identify a building.',
    Icon: MapPin,
  },
  identity: {
    title: 'Who you are',
    blurb:
      'Names of people and organisations, saved automatically by the software that wrote the file.',
    Icon: UserRound,
  },
  'hidden-content': {
    title: 'What the file still remembers',
    blurb:
      'Text held inside the file that opening it normally does not show you.',
    Icon: EyeOff,
  },
  device: {
    title: 'Which machine made it',
    blurb:
      'Fingerprints that link this file to your hardware, your software, and your other files.',
    Icon: Fingerprint,
  },
  timeline: {
    title: 'When it really happened',
    blurb:
      'Timestamps and edit counts, which can disagree with the story the file is presented with.',
    Icon: Clock,
  },
  technical: {
    title: 'Harmless technical details',
    blurb:
      'True, dull, and kept when you clean the file. Here so the report is complete.',
    Icon: Sliders,
  },
};

const SEVERITY_LABEL: Readonly<Record<XrayFinding['severity'], string>> = {
  high: 'Exposing',
  medium: 'Revealing',
  low: 'Minor',
};

function SeverityBadge({ severity }: { severity: XrayFinding['severity'] }) {
  /*
     Weight rather than hue carries the ranking. The palette here is
     monochrome by contract (`scripts/design-system-qc.mjs` fails the build on a
     colour utility), and a severity scale built only from colour would be
     unreadable to a colour-blind reader anyway. `destructive` is the one
     semantic token that applies, and it is spent on the top level only.
  */
  const className =
    severity === 'high'
      ? 'border-destructive/40 bg-destructive/10 text-foreground'
      : severity === 'medium'
        ? 'border-border bg-muted text-foreground'
        : 'border-border bg-background text-muted-foreground';
  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${className}`}
    >
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

function FindingRow({ finding }: { finding: XrayFinding }) {
  return (
    <li className="border-b px-4 py-3.5 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{finding.label}</p>
          <p className="mt-1 break-words font-mono text-xs leading-5 text-foreground">
            {finding.value}
          </p>
        </div>
        <SeverityBadge severity={finding.severity} />
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        {finding.consequence}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {finding.source}
        </span>
        {finding.mapUrl ? (
          /*
            The only outbound link in the tool, and it is a link: nothing is
            requested to build this page, and the coordinates go to OpenStreetMap
            only if the reader decides to click. `rel="noreferrer"` keeps this
            page's address out of the referrer header when they do.
          */
          <a
            href={finding.mapUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="focus-ring rounded text-[11px] font-semibold underline underline-offset-2"
          >
            Show this spot on a map
          </a>
        ) : null}
      </div>
    </li>
  );
}

export function FileXrayTool() {
  const [report, setReport] = useState<XrayReport | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [stripped, setStripped] = useState<XrayStripResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const reset = useCallback(() => {
    setReport(null);
    setBytes(null);
    setStripped(null);
    setError('');
    setShowTechnical(false);
  }, []);

  const processFile = useCallback(async (file: File) => {
    setError('');
    setStripped(null);
    setShowTechnical(false);

    if (file.size === 0) {
      setError(`${file.name} is empty, so there is nothing to look inside.`);
      errorRef.current?.focus();
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(
        `${file.name} is ${formatBytes(file.size)}. This tool reads files up to ${formatBytes(MAX_FILE_BYTES)}.`,
      );
      errorRef.current?.focus();
      return;
    }

    setBusy('Reading the file…');
    try {
      const buffer = await file.arrayBuffer();
      const fileBytes = new Uint8Array(buffer);
      const result = await xrayFile(fileBytes, file.name);
      setBytes(fileBytes);
      setReport(result);
    } catch (err) {
      // `xrayFile` handles its own failures, so reaching here means the file
      // could not be read off disk at all.
      setError(
        err instanceof Error
          ? err.message
          : 'This file could not be opened. It may have been moved or is still downloading.',
      );
      errorRef.current?.focus();
    } finally {
      setBusy('');
    }
  }, []);

  const handleStrip = useCallback(async () => {
    if (!report || !bytes) return;
    setError('');
    setBusy('Removing what it found…');
    const startedAt = Date.now();
    try {
      const result = await stripFile(bytes, report.format);
      setStripped(result);
      announceCompletion({
        operation: 'File X-ray',
        durationMs: Date.now() - startedAt,
        summary: `Cleaned ${report.fileName ?? 'the file'}.`,
        metrics: [
          { label: 'Original', value: formatBytes(result.originalSize) },
          { label: 'Cleaned', value: formatBytes(result.cleanedSize) },
          { label: 'Removed', value: String(result.removed.length) },
        ],
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'This file could not be cleaned here.',
      );
      errorRef.current?.focus();
    } finally {
      setBusy('');
    }
  }, [bytes, report]);

  const download = useCallback(() => {
    if (!stripped || !report) return;
    const blob = new Blob([stripped.bytes as BlobPart], {
      type: mimeTypeFor(stripped.format),
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = cleanFileName(report.fileName ?? 'file');
    anchor.click();
    URL.revokeObjectURL(url);
  }, [report, stripped]);

  const grouped = useMemo(() => {
    if (!report) return [];
    return CATEGORY_ORDER.map((category) => ({
      category,
      findings: report.findings.filter(
        (finding) => finding.category === category,
      ),
    })).filter((group) => group.findings.length > 0);
  }, [report]);

  const exposingCount = useMemo(
    () =>
      report?.findings.filter((finding) => finding.severity === 'high')
        .length ?? 0,
    [report],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragOver(false);
      const file = event.dataTransfer.files[0];
      if (file) void processFile(file);
    },
    [processFile],
  );

  return (
    <AppShell currentToolId="file-xray">
      <section
        id="tool"
        tabIndex={-1}
        className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-12"
      >
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col justify-between gap-5 border-b pb-8 sm:flex-row sm:items-start">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span>File</span>
                <span aria-hidden="true">/</span>
                <span>X-ray</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                File X-ray
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                Drop any file and see what is hidden inside it. GPS coordinates
                in a photo. A camera&rsquo;s serial number. The author name in a
                PDF. Text you deleted from a Word file that is still in there.
                Every finding is explained, and most can be removed in one
                click. Nothing leaves this tab.
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
                <p className="font-semibold">Could not read this file</p>
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

          {!report ? (
            <div
              onDrop={handleDrop}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              className={`mt-8 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
                isDragOver
                  ? 'border-primary bg-accent/30'
                  : 'border-border bg-card'
              }`}
            >
              <div className="flex size-14 items-center justify-center rounded-2xl border bg-background">
                <FileSearch
                  aria-hidden="true"
                  className="size-7 text-muted-foreground"
                />
              </div>
              <p className="mt-4 text-base font-semibold">
                Drop a file here, or browse
              </p>
              <p className="mt-1.5 max-w-md text-xs leading-5 text-muted-foreground">
                Photos (JPEG, PNG, WebP), PDFs, Word, Excel and PowerPoint
                files, MP4 video and ZIP archives, up to{' '}
                {formatBytes(MAX_FILE_BYTES)}. The file is read in your browser
                and never uploaded.
              </p>
              <label className="mt-6">
                <span className="sr-only">Choose a file</span>
                <input
                  ref={fileRef}
                  id="file-xray-input"
                  type="file"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void processFile(file);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  disabled={Boolean(busy)}
                  onClick={() => fileRef.current?.click()}
                  className="cursor-pointer"
                >
                  {busy ? busy : 'Select a file'}
                </Button>
              </label>
            </div>
          ) : null}

          {report ? (
            <div className="mt-8">
              {/* The headline: one sentence saying whether this matters. */}
              <div className="rounded-2xl border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {report.hasSensitiveFindings ? (
                        <AlertTriangle
                          aria-hidden="true"
                          className="size-4 text-destructive"
                        />
                      ) : (
                        <ShieldCheck
                          aria-hidden="true"
                          className="size-4 text-success"
                        />
                      )}
                      <p className="text-base font-semibold">
                        {report.hasSensitiveFindings
                          ? exposingCount > 0
                            ? `${exposingCount} thing${exposingCount === 1 ? '' : 's'} in this file identify you or where you were`
                            : 'This file carries more than it shows'
                          : 'Nothing personal found in this file'}
                      </p>
                    </div>
                    <p className="mt-1.5 break-all font-mono text-xs text-muted-foreground">
                      {report.fileName} · {report.formatLabel} ·{' '}
                      {formatBytes(report.fileSizeBytes)} ·{' '}
                      {report.findings.length} finding
                      {report.findings.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {report.canStrip && !stripped ? (
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        disabled={Boolean(busy)}
                        onClick={() => void handleStrip()}
                      >
                        <Eraser
                          aria-hidden="true"
                          className="mr-1.5 size-3.5"
                        />
                        {busy ? busy : 'Remove all of it'}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={reset}
                    >
                      Check another file
                    </Button>
                  </div>
                </div>

                {/*
                  Said plainly rather than hidden: a reader who has just learned
                  their spreadsheet names their employer must not be left
                  hunting for a button that was never going to be there.
                */}
                {!report.canStrip && report.hasSensitiveFindings ? (
                  <p className="mt-4 flex items-start gap-2 rounded-lg border bg-muted/50 p-3 text-xs leading-5 text-muted-foreground">
                    <Info
                      aria-hidden="true"
                      className="mt-0.5 size-3.5 shrink-0"
                    />
                    <span>
                      This tool can read {report.formatLabel.toLowerCase()}s but
                      cannot clean one yet, so there is no remove button. To
                      strip it today, open the file in the program that made it
                      and clear the document properties by hand.
                    </span>
                  </p>
                ) : null}

                {report.warnings.map((warning) => (
                  <p
                    key={warning}
                    className="mt-4 flex items-start gap-2 rounded-lg border bg-muted/50 p-3 text-xs leading-5 text-muted-foreground"
                  >
                    <Info
                      aria-hidden="true"
                      className="mt-0.5 size-3.5 shrink-0"
                    />
                    <span>{warning}</span>
                  </p>
                ))}
              </div>

              {stripped ? (
                <output className="mt-4 block rounded-2xl border border-success/40 bg-success/5 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-base font-semibold">
                        <ShieldCheck aria-hidden="true" className="size-4" />
                        {stripped.alreadyClean
                          ? 'This file was already clean'
                          : 'Cleaned'}
                      </p>
                      <p className="mt-1.5 font-mono text-xs text-muted-foreground">
                        {formatBytes(stripped.originalSize)} →{' '}
                        {formatBytes(stripped.cleanedSize)}
                      </p>
                      <ul className="mt-3 space-y-1 text-xs leading-5 text-muted-foreground">
                        {stripped.removed.map((item) => (
                          <li key={item}>Removed: {item}</li>
                        ))}
                      </ul>
                    </div>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      data-receipt-download
                      onClick={download}
                    >
                      Download cleaned file
                    </Button>
                  </div>

                  {/*
                    A Word file is cleaned by accepting its tracked changes,
                    because that is the only way the deleted text goes away. That
                    edits the document, so it is stated before the download
                    rather than discovered afterwards.
                  */}
                  {stripped.contentChanged ? (
                    <p className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/35 bg-destructive/5 p-3 text-xs leading-5">
                      <AlertTriangle
                        aria-hidden="true"
                        className="mt-0.5 size-3.5 shrink-0"
                      />
                      <span>{stripped.contentChanged}</span>
                    </p>
                  ) : null}
                </output>
              ) : null}

              {grouped.map(({ category, findings }) => {
                const meta = CATEGORY_META[category];
                const isTechnical = category === 'technical';
                const open = !isTechnical || showTechnical;
                return (
                  <section key={category} className="mt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-2.5">
                        <meta.Icon
                          aria-hidden="true"
                          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                        />
                        <div>
                          <h2 className="text-sm font-semibold">
                            {meta.title}
                            <span className="ml-2 font-mono text-[10px] font-normal uppercase tracking-wider text-muted-foreground">
                              {findings.length}
                            </span>
                          </h2>
                          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
                            {meta.blurb}
                          </p>
                        </div>
                      </div>
                      {isTechnical ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-expanded={open}
                          onClick={() => setShowTechnical((prior) => !prior)}
                        >
                          {open ? 'Hide' : 'Show'}
                        </Button>
                      ) : null}
                    </div>
                    {open ? (
                      <ul className="mt-3 overflow-hidden rounded-xl border bg-card">
                        {findings.map((finding) => (
                          <FindingRow key={finding.id} finding={finding} />
                        ))}
                      </ul>
                    ) : null}
                  </section>
                );
              })}

              {report.findings.length === 0 ? (
                <p className="mt-6 rounded-xl border bg-card p-5 text-sm text-muted-foreground">
                  Nothing was found to report. Either the file never carried
                  metadata, or it has already been stripped.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}
