'use client';

import {
  AlertTriangle,
  Building,
  CheckCircle2,
  Clock,
  FileCheck,
  History,
  LockKeyhole,
  MessageSquare,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  UploadCloud,
  User,
  X,
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import {
  readDocxMetadata,
  stripDocxMetadata,
  type DocxMetadataReport,
  type TrackedChangesPolicy,
} from '@/lib/tools/docx/metadata';

// Our own guard, not a limit the browser imposes. A .docx is a ZIP and the
// whole thing is read into memory to inspect it, so this keeps a very large
// file from locking the tab up. Say so plainly below rather than blaming the
// browser for a number we picked.
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

interface LoadedDocx {
  name: string;
  size: number;
  bytes: Uint8Array;
  metadata: DocxMetadataReport;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDuration(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return 'Not recorded';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours}h ${remaining}m (${minutes} total minutes)`;
}

function getCleanFileName(
  originalName: string,
  policy: TrackedChangesPolicy,
): string {
  const dotIdx = originalName.lastIndexOf('.');
  const base = dotIdx === -1 ? originalName : originalName.slice(0, dotIdx);
  const ext = dotIdx === -1 ? '.docx' : originalName.slice(dotIdx);
  return `${base}_clean_${policy}${ext}`;
}

export function DocxMetadataTool() {
  const [loaded, setLoaded] = useState<LoadedDocx | null>(null);
  const [error, setError] = useState<string>('');
  const [busy, setBusy] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Policy options
  const [policy, setPolicy] = useState<TrackedChangesPolicy>('keep');
  const [stripComments, setStripComments] = useState(true);
  const [stripRsids, setStripRsids] = useState(true);
  const [stripProps, setStripProps] = useState(true);

  // Completion state
  const [cleanSummary, setCleanSummary] = useState<{
    originalSize: number;
    cleanedSize: number;
    policy: TrackedChangesPolicy;
    fileName: string;
  } | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const processFile = useCallback(async (file: File) => {
    setError('');
    setCleanSummary(null);

    if (file.size > MAX_FILE_BYTES) {
      setError(
        `File is too large (${formatBytes(file.size)}). This tool reads the whole document into memory, so it stops at ${formatBytes(MAX_FILE_BYTES)} to keep the page responsive.`,
      );
      errorRef.current?.focus();
      return;
    }

    setBusy('Analyzing Word document metadata...');
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const report = await readDocxMetadata(bytes, file.name);

      setLoaded({
        name: file.name,
        size: file.size,
        bytes,
        metadata: report,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not parse metadata from this Word document. Please ensure it is a valid .docx file.',
      );
      errorRef.current?.focus();
    } finally {
      setBusy('');
    }
  }, []);

  const handleChoose = (file?: File) => {
    if (!file) return;
    void processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleReset = () => {
    setLoaded(null);
    setCleanSummary(null);
    setError('');
    setBusy('');
    setPolicy('keep');
    if (fileRef.current) {
      fileRef.current.value = '';
    }
  };

  const handleCleanAndDownload = async () => {
    if (!loaded) return;

    setBusy('Sanitizing document and packaging .docx...');
    const started = performance.now();
    try {
      const cleanedBytes = await stripDocxMetadata(loaded.bytes, {
        trackedChanges: policy,
        stripComments,
        stripRsids,
        stripProperties: stripProps,
      });
      const durationMs = performance.now() - started;

      const cleanBlob = new Blob([cleanedBytes as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const cleanUrl = URL.createObjectURL(cleanBlob);
      const cleanName = getCleanFileName(loaded.name, policy);

      const downloadLink = document.createElement('a');
      downloadLink.href = cleanUrl;
      downloadLink.download = cleanName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      setTimeout(() => {
        URL.revokeObjectURL(cleanUrl);
      }, 10000);

      setCleanSummary({
        originalSize: loaded.size,
        cleanedSize: cleanedBytes.length,
        policy,
        fileName: cleanName,
      });

      announceCompletion({
        operation: 'Word document metadata stripper',
        durationMs,
        summary: `Cleaned ${loaded.name} with revision policy: ${policy}.`,
        metrics: [
          { label: 'Original size', value: formatBytes(loaded.size) },
          { label: 'Cleaned size', value: formatBytes(cleanedBytes.length) },
          { label: 'Revisions', value: policy },
        ],
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to sanitize document metadata.',
      );
      errorRef.current?.focus();
    } finally {
      setBusy('');
    }
  };

  const meta = loaded?.metadata;
  const core = meta?.core;
  const app = meta?.app;
  const tracked = meta?.trackedChanges;
  const comments = meta?.comments ?? [];
  const custom = meta?.custom ?? [];
  const rsids = meta?.rsids;

  const hasAuthorData = Boolean(
    core &&
    (core.creator ||
      core.lastModifiedBy ||
      core.title ||
      core.subject ||
      core.description ||
      core.keywords ||
      core.category ||
      core.created ||
      core.modified ||
      core.revision),
  );

  const hasAppData = Boolean(
    app &&
    (app.company ||
      app.manager ||
      app.totalTimeMinutes !== null ||
      app.template ||
      app.application),
  );

  return (
    <AppShell currentToolId="docx-metadata">
      <section
        id="tool"
        tabIndex={-1}
        className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-12"
      >
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <div className="flex flex-col justify-between gap-5 border-b pb-8 sm:flex-row sm:items-start">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span>Document</span>
                <span aria-hidden="true">/</span>
                <span>Metadata</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Word Document (.docx) Metadata Stripper & Inspector
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                Inspect author identity, company info, editing duration, machine
                RSIDs, reviewer comments, and secret deleted text in tracked
                changes. Purge identifying metadata or finalize revisions
                directly in your browser.
              </p>
            </div>
            <span className="flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold">
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              Runs in this tab
            </span>
          </div>

          {/* Error display */}
          {error ? (
            <div
              ref={errorRef}
              tabIndex={-1}
              role="alert"
              className="mt-6 flex items-start justify-between gap-4 rounded-xl border border-destructive/35 bg-destructive/5 p-4 text-sm"
            >
              <div>
                <p className="font-semibold text-destructive">
                  Unable to process document
                </p>
                <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">
                  {error}
                </p>
              </div>
              <button
                type="button"
                className="rounded p-1 text-muted-foreground hover:text-foreground"
                onClick={() => setError('')}
                aria-label="Dismiss error"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
          ) : null}

          {/* Upload Dropzone */}
          {!loaded ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`mt-8 flex min-h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
                isDragOver
                  ? 'border-primary bg-accent/30'
                  : 'border-border bg-card'
              }`}
            >
              <div className="flex size-14 items-center justify-center rounded-2xl border bg-background">
                <UploadCloud
                  aria-hidden="true"
                  className="size-7 text-muted-foreground"
                />
              </div>
              <p className="mt-4 text-base font-semibold">
                Choose a Word document or drop it here
              </p>
              <p className="mt-1.5 max-w-md text-xs leading-5 text-muted-foreground">
                Accepts .docx files up to 50 MB. Inspected and cleaned entirely
                in your browser tab.
              </p>
              <label className="mt-6">
                <span className="sr-only">Choose a document</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => handleChoose(e.target.files?.[0])}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  disabled={Boolean(busy)}
                  onClick={() => fileRef.current?.click()}
                  className="cursor-pointer"
                >
                  {busy || 'Select .docx document'}
                </Button>
              </label>
            </div>
          ) : null}

          {/* Busy indicator */}
          {busy ? (
            <output className="mt-4 block text-sm text-muted-foreground">
              {busy}
            </output>
          ) : null}

          {/* Document Content View */}
          {loaded && meta ? (
            <div className="mt-6 space-y-6">
              {/* File Summary Header & Primary Actions */}
              <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-2xl border bg-background text-foreground">
                    <FileCheck className="size-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {loaded.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(loaded.size)} · Microsoft Word Document
                      (.docx)
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    data-receipt-download
                    disabled={Boolean(busy)}
                    onClick={handleCleanAndDownload}
                    className="flex items-center gap-1.5"
                  >
                    <ShieldCheck aria-hidden="true" className="size-4" />
                    Clean & download .docx
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    className="flex items-center gap-1.5"
                  >
                    <RotateCcw aria-hidden="true" className="size-4" />
                    Clear
                  </Button>
                </div>
              </div>

              {/* Success output if stripped */}
              {cleanSummary ? (
                <output className="block rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <CheckCircle2
                      aria-hidden="true"
                      className="size-4 text-foreground"
                    />
                    Document sanitized and downloaded successfully
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Downloaded{' '}
                    <span className="font-mono font-medium">
                      {cleanSummary.fileName}
                    </span>
                    . Identifying properties, reviewer comments, and machine
                    RSIDs were purged. Revisions were handled using the &ldquo;
                    {cleanSummary.policy}&rdquo; policy.
                  </p>
                  <dl className="mt-4 grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
                    <div>
                      <dt className="text-muted-foreground">Original size</dt>
                      <dd className="font-semibold text-foreground">
                        {formatBytes(cleanSummary.originalSize)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Cleaned size</dt>
                      <dd className="font-semibold text-foreground">
                        {formatBytes(cleanSummary.cleanedSize)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Revision policy</dt>
                      <dd className="font-semibold text-foreground capitalize">
                        {cleanSummary.policy}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Sensitive data</dt>
                      <dd className="font-semibold text-foreground">Purged</dd>
                    </div>
                  </dl>
                </output>
              ) : null}

              {/* Status Alert */}
              <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/20 p-4 text-xs leading-5">
                {meta.hasSensitiveData ? (
                  <ShieldAlert className="mt-0.5 size-5 shrink-0 text-foreground" />
                ) : (
                  <ShieldCheck className="mt-0.5 size-5 shrink-0 text-foreground" />
                )}
                <div>
                  <p className="font-semibold text-foreground">
                    {meta.hasSensitiveData
                      ? 'Identifying metadata or tracked changes detected'
                      : 'No significant identifying metadata found'}
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    {meta.hasSensitiveData
                      ? 'This document carries personal or organization markers, editing history, or comments that may reveal author identities and private working drafts.'
                      : 'This document does not carry obvious author identities or revision markers.'}
                  </p>
                </div>
              </div>

              {/* Tracked Changes Policy & Stripping Options Panel */}
              <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-foreground">
                    Cleaning & Revision Options
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Tracked changes alter the body text itself. Selecting
                    whether to keep, accept, or reject revisions is a deliberate
                    legal and editorial choice.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label
                    htmlFor="policy-keep"
                    aria-label="Keep Revisions: Preserves insertions and deletions markup in the document"
                    className={`flex flex-col justify-between rounded-xl border p-4 text-xs cursor-pointer transition-colors ${
                      policy === 'keep'
                        ? 'border-foreground bg-accent/40 font-medium'
                        : 'border-border hover:bg-muted/30'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <input
                          id="policy-keep"
                          type="radio"
                          name="revisionPolicy"
                          value="keep"
                          checked={policy === 'keep'}
                          onChange={() => setPolicy('keep')}
                          className="size-4"
                        />
                        <span className="font-semibold text-foreground">
                          Keep Revisions
                        </span>
                      </div>
                      <p className="text-muted-foreground pl-6">
                        Preserves insertions and deletions markup in the
                        document.
                      </p>
                    </div>
                  </label>

                  <label
                    htmlFor="policy-accept"
                    aria-label="Accept Revisions: Keeps inserted text and permanently removes deleted text"
                    className={`flex flex-col justify-between rounded-xl border p-4 text-xs cursor-pointer transition-colors ${
                      policy === 'accept'
                        ? 'border-foreground bg-accent/40 font-medium'
                        : 'border-border hover:bg-muted/30'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <input
                          id="policy-accept"
                          type="radio"
                          name="revisionPolicy"
                          value="accept"
                          checked={policy === 'accept'}
                          onChange={() => setPolicy('accept')}
                          className="size-4"
                        />
                        <span className="font-semibold text-foreground">
                          Accept Revisions
                        </span>
                      </div>
                      <p className="text-muted-foreground pl-6">
                        Keeps inserted text and permanently removes deleted
                        text.
                      </p>
                    </div>
                  </label>

                  <label
                    htmlFor="policy-reject"
                    aria-label="Reject Revisions: Discards inserted text and restores deleted text to normal"
                    className={`flex flex-col justify-between rounded-xl border p-4 text-xs cursor-pointer transition-colors ${
                      policy === 'reject'
                        ? 'border-foreground bg-accent/40 font-medium'
                        : 'border-border hover:bg-muted/30'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <input
                          id="policy-reject"
                          type="radio"
                          name="revisionPolicy"
                          value="reject"
                          checked={policy === 'reject'}
                          onChange={() => setPolicy('reject')}
                          className="size-4"
                        />
                        <span className="font-semibold text-foreground">
                          Reject Revisions
                        </span>
                      </div>
                      <p className="text-muted-foreground pl-6">
                        Discards inserted text and restores deleted text to
                        normal.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="pt-2 border-t border-border flex flex-wrap gap-4 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stripProps}
                      onChange={(e) => setStripProps(e.target.checked)}
                      className="size-4 rounded"
                    />
                    <span>
                      Strip core & app properties (author, company, time)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stripComments}
                      onChange={(e) => setStripComments(e.target.checked)}
                      className="size-4 rounded"
                    />
                    <span>Strip reviewer comments</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stripRsids}
                      onChange={(e) => setStripRsids(e.target.checked)}
                      className="size-4 rounded"
                    />
                    <span>Strip machine RSID identifiers</span>
                  </label>
                </div>
              </div>

              {/* Tracked Changes Card */}
              {tracked &&
              (tracked.insertionsCount > 0 || tracked.deletionsCount > 0) ? (
                <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History className="size-4 text-foreground" />
                      <h3 className="text-sm font-semibold text-foreground">
                        Tracked Changes & Unaccepted Revisions
                      </h3>
                    </div>
                    <div className="flex gap-2">
                      {tracked.deletionsCount > 0 ? (
                        <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
                          {tracked.deletionsCount} deletion
                          {tracked.deletionsCount === 1 ? '' : 's'}
                        </span>
                      ) : null}
                      {tracked.insertionsCount > 0 ? (
                        <span className="rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-xs font-medium text-foreground">
                          {tracked.insertionsCount} insertion
                          {tracked.insertionsCount === 1 ? '' : 's'}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {tracked.deletionsCount > 0 ? (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-xs space-y-2">
                      <p className="font-semibold text-destructive flex items-center gap-1.5">
                        <AlertTriangle className="size-4 shrink-0" />
                        Hidden Deleted Text Warning
                      </p>
                      <p className="text-muted-foreground">
                        Unaccepted deletions remain stored inside the document.
                        Word hides them from standard view, but opposing counsel
                        or anyone inspecting the file can recover the exact
                        removed wording below:
                      </p>
                    </div>
                  ) : null}

                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {tracked.items.map((item, idx) => (
                      <div
                        key={`${item.type}-${item.id || idx}`}
                        className={`rounded-xl border p-3 text-xs space-y-1.5 ${
                          item.type === 'deletion'
                            ? 'border-destructive/30 bg-destructive/5'
                            : 'border-border bg-muted/20'
                        }`}
                      >
                        <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
                          <span
                            className={`font-semibold uppercase ${
                              item.type === 'deletion'
                                ? 'text-destructive'
                                : 'text-foreground'
                            }`}
                          >
                            {item.type}
                          </span>
                          <span>
                            {item.author || 'Unknown author'}
                            {item.date
                              ? ` · ${new Date(item.date).toLocaleString()}`
                              : ''}
                          </span>
                        </div>
                        <p className="font-mono text-xs whitespace-pre-wrap break-words text-foreground">
                          {item.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Reviewer Comments Card */}
              {comments.length > 0 ? (
                <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="size-4 text-foreground" />
                      <h3 className="text-sm font-semibold text-foreground">
                        Reviewer Comments ({comments.length})
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {comments.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-xl border border-border bg-muted/20 p-3 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between font-medium text-foreground">
                          <span>
                            {c.author} {c.initials ? `(${c.initials})` : ''}
                          </span>
                          {c.date ? (
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(c.date).toLocaleString()}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-muted-foreground">{c.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Two Column Grid for Core & App Properties */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Author & Document Identity */}
                <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="size-4 text-foreground" />
                    <h3 className="text-sm font-semibold text-foreground">
                      Author & Document Identity
                    </h3>
                  </div>

                  {hasAuthorData ? (
                    <dl className="space-y-2 text-xs">
                      {core?.creator ? (
                        <div className="flex justify-between py-1 border-b border-border/50">
                          <dt className="text-muted-foreground">
                            Author (Creator)
                          </dt>
                          <dd className="font-medium text-foreground">
                            {core.creator}
                          </dd>
                        </div>
                      ) : null}
                      {core?.lastModifiedBy ? (
                        <div className="flex justify-between py-1 border-b border-border/50">
                          <dt className="text-muted-foreground">
                            Last modified by
                          </dt>
                          <dd className="font-medium text-foreground">
                            {core.lastModifiedBy}
                          </dd>
                        </div>
                      ) : null}
                      {core?.title ? (
                        <div className="flex justify-between py-1 border-b border-border/50">
                          <dt className="text-muted-foreground">Title</dt>
                          <dd className="font-medium text-foreground max-w-48 truncate">
                            {core.title}
                          </dd>
                        </div>
                      ) : null}
                      {core?.subject ? (
                        <div className="flex justify-between py-1 border-b border-border/50">
                          <dt className="text-muted-foreground">Subject</dt>
                          <dd className="font-medium text-foreground">
                            {core.subject}
                          </dd>
                        </div>
                      ) : null}
                      {core?.revision ? (
                        <div className="flex justify-between py-1 border-b border-border/50">
                          <dt className="text-muted-foreground">
                            Revision number
                          </dt>
                          <dd className="font-medium text-foreground">
                            {core.revision}
                          </dd>
                        </div>
                      ) : null}
                      {core?.created ? (
                        <div className="flex justify-between py-1 border-b border-border/50">
                          <dt className="text-muted-foreground">
                            Created date
                          </dt>
                          <dd className="font-medium text-foreground">
                            {new Date(core.created).toLocaleString()}
                          </dd>
                        </div>
                      ) : null}
                      {core?.modified ? (
                        <div className="flex justify-between py-1 border-b border-border/50">
                          <dt className="text-muted-foreground">
                            Modified date
                          </dt>
                          <dd className="font-medium text-foreground">
                            {new Date(core.modified).toLocaleString()}
                          </dd>
                        </div>
                      ) : null}
                      {core?.keywords ? (
                        <div className="flex justify-between py-1 border-b border-border/50">
                          <dt className="text-muted-foreground">Keywords</dt>
                          <dd className="font-medium text-foreground">
                            {core.keywords}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      No core author or title tags present in this document.
                    </p>
                  )}
                </div>

                {/* Organization & Editing Statistics */}
                <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Building className="size-4 text-foreground" />
                    <h3 className="text-sm font-semibold text-foreground">
                      Organization & Editing Statistics
                    </h3>
                  </div>

                  {hasAppData ? (
                    <dl className="space-y-2 text-xs">
                      {app?.company ? (
                        <div className="flex justify-between py-1 border-b border-border/50">
                          <dt className="text-muted-foreground">Company</dt>
                          <dd className="font-medium text-foreground">
                            {app.company}
                          </dd>
                        </div>
                      ) : null}
                      {app?.manager ? (
                        <div className="flex justify-between py-1 border-b border-border/50">
                          <dt className="text-muted-foreground">Manager</dt>
                          <dd className="font-medium text-foreground">
                            {app.manager}
                          </dd>
                        </div>
                      ) : null}
                      {app?.totalTimeMinutes !== null &&
                      app?.totalTimeMinutes !== undefined ? (
                        <div className="flex justify-between py-1 border-b border-border/50">
                          <dt className="text-muted-foreground flex items-center gap-1">
                            <Clock className="size-3" />
                            Total editing time
                          </dt>
                          <dd className="font-medium text-foreground">
                            {formatDuration(app.totalTimeMinutes)}
                          </dd>
                        </div>
                      ) : null}
                      {app?.template ? (
                        <div className="flex justify-between py-1 border-b border-border/50">
                          <dt className="text-muted-foreground">Template</dt>
                          <dd className="font-medium text-foreground">
                            {app.template}
                          </dd>
                        </div>
                      ) : null}
                      {app?.words !== null && app?.words !== undefined ? (
                        <div className="flex justify-between py-1 border-b border-border/50">
                          <dt className="text-muted-foreground">Word count</dt>
                          <dd className="font-medium text-foreground">
                            {app.words.toLocaleString()}
                          </dd>
                        </div>
                      ) : null}
                      {app?.pages !== null && app?.pages !== undefined ? (
                        <div className="flex justify-between py-1 border-b border-border/50">
                          <dt className="text-muted-foreground">Page count</dt>
                          <dd className="font-medium text-foreground">
                            {app.pages}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      No extended company or editing statistics found.
                    </p>
                  )}
                </div>
              </div>

              {/* Custom Properties & RSIDs */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Custom Properties */}
                <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    Custom Properties ({custom.length})
                  </h3>
                  {custom.length > 0 ? (
                    <dl className="space-y-2 text-xs">
                      {custom.map((p) => (
                        <div
                          key={p.name}
                          className="flex justify-between py-1 border-b border-border/50"
                        >
                          <dt className="font-mono text-muted-foreground">
                            {p.name}
                          </dt>
                          <dd className="font-medium text-foreground">
                            {p.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      No custom document properties found.
                    </p>
                  )}
                </div>

                {/* Machine RSIDs */}
                <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">
                      Machine Identifiers (RSIDs)
                    </h3>
                    <span className="rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-xs font-medium text-foreground">
                      {rsids?.count ?? 0} found
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    RSIDs (Revision Save Identifiers) are hexadecimal markers
                    injected by Microsoft Word during each editing session.
                    Correlating RSIDs across different files can link separate
                    documents back to the same computer or installation.
                  </p>
                  {rsids && rsids.count > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {rsids.values.slice(0, 12).map((val) => (
                        <span
                          key={val}
                          className="rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
                        >
                          {val}
                        </span>
                      ))}
                      {rsids.count > 12 ? (
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                          +{rsids.count - 12} more
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Explanatory Footer */}
              <div className="rounded-2xl border border-border bg-muted/20 p-5 text-xs leading-relaxed text-muted-foreground space-y-2">
                <p className="font-semibold text-foreground">
                  Privacy Guarantee & What is Cleaned:
                </p>
                <ul className="list-disc space-y-1 pl-4">
                  <li>
                    <strong>Stripped:</strong> Author names, organization,
                    manager, total editing duration, machine RSIDs, comments,
                    and custom metadata fields.
                  </li>
                  <li>
                    <strong>Tracked Changes Control:</strong> Choose whether to
                    preserve revisions, accept them (purging deleted text
                    forever), or reject them (reverting to original text).
                  </li>
                  <li>
                    <strong>Pure browser execution:</strong> Runs 100% locally
                    on your device. Documents never leave your computer.
                  </li>
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}
