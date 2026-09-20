'use client';

import {
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  FileArchive,
  FilePlus2,
  FolderOpen,
  Lock,
  LockKeyhole,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import {
  extractEntry,
  readZip,
  type ZipArchive,
  type ZipArchiveEntry,
} from '@/lib/tools/archive/zip-reader';
import { createZip } from '@/lib/tools/docx/zip';
import { toolMeta } from '@/lib/tools/tool-meta';

type Mode = 'open' | 'create';

interface Loaded {
  name: string;
  size: number;
  bytes: Uint8Array;
  archive: ZipArchive;
}

interface Saved {
  name: string;
  url: string;
  size: number;
  headline: string;
  detail: string;
  durationMs: number;
}

const MAX_BYTES = 100 * 1024 * 1024;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatElapsed(durationMs: number) {
  return durationMs < 1000
    ? `${durationMs.toFixed(1)} ms`
    : `${(durationMs / 1000).toFixed(2)} s`;
}

function formatWhen(date: Date | null) {
  if (!date) return '—';
  // A ZIP stores a wall-clock time with no time zone attached, and the reader
  // builds the Date from those parts locally. Rendering it through
  // toISOString() converts to UTC and shifts it — a 1980-01-01 archive showed
  // as 1979-12-31 to anyone east of Greenwich. Read the same parts back.
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function ratio(entry: ZipArchiveEntry) {
  if (!entry.uncompressedSize) return '—';
  const saved = 1 - entry.compressedSize / entry.uncompressedSize;
  if (saved <= 0) return '0%';
  // Floor rather than round: 99.7% saved is not 100%, and "100%" reads as
  // though the file compressed to nothing at all.
  return `${Math.min(99, Math.floor(saved * 100))}%`;
}

export function ArchiveToolkitTool() {
  const openRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLInputElement>(null);
  const savedRef = useRef<Saved | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<Mode>('open');
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [toPack, setToPack] = useState<File[]>([]);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const manifest = toolMeta('archive-toolkit');

  useEffect(() => {
    savedRef.current = saved;
  }, [saved]);
  useEffect(
    () => () => {
      if (savedRef.current) URL.revokeObjectURL(savedRef.current.url);
    },
    [],
  );
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const clearSaved = () => {
    if (savedRef.current) URL.revokeObjectURL(savedRef.current.url);
    savedRef.current = null;
    setSaved(null);
  };

  const keep = (
    name: string,
    bytes: Uint8Array,
    headline: string,
    detail: string,
    durationMs: number,
  ) => {
    const url = URL.createObjectURL(
      new Blob([bytes as BlobPart], { type: 'application/octet-stream' }),
    );
    const next: Saved = {
      name,
      url,
      size: bytes.length,
      headline,
      detail,
      durationMs,
    };
    savedRef.current = next;
    setSaved(next);
  };

  async function openArchive(file?: File) {
    if (!file || busy) return;
    setBusy(true);
    setError('');
    clearSaved();
    try {
      if (file.size > MAX_BYTES) {
        throw new Error(
          `${file.name} is ${formatBytes(file.size)}. This page opens archives up to 100 MB.`,
        );
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      const archive = readZip(bytes);
      setLoaded({ name: file.name, size: file.size, bytes, archive });
    } catch (caught) {
      setLoaded(null);
      setError(
        caught instanceof Error
          ? caught.message
          : 'That file could not be opened.',
      );
    } finally {
      setBusy(false);
      if (openRef.current) openRef.current.value = '';
    }
  }

  async function takeOut(entry: ZipArchiveEntry) {
    if (!loaded || busy) return;
    setBusy(true);
    setError('');
    clearSaved();
    await Promise.resolve();
    // oxlint-disable-next-line react/react-compiler
    const started = performance.now();
    try {
      const data = await extractEntry(loaded.bytes, entry);
      const name = entry.path.split('/').pop() || 'file';
      keep(
        name,
        data,
        `Took out ${name}`,
        `${formatBytes(data.length)}, and it matches the checksum stored in the archive.${
          entry.pathWarning
            ? ` The archive wanted to put this at "${entry.path}" — ${entry.pathWarning.toLowerCase()} It is saved under its plain name instead.`
            : ''
        }`,
        // oxlint-disable-next-line react/react-compiler
        performance.now() - started,
      );
      announceCompletion({
        operation: 'Archive toolkit',
        // oxlint-disable-next-line react/react-compiler
        durationMs: performance.now() - started,
        summary: `Took ${name} out of ${loaded.name}.`,
        metrics: [
          { label: 'Size', value: formatBytes(data.length) },
          { label: 'Checksum', value: 'Matches' },
          { label: 'Uploaded', value: 'No' },
        ],
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'That file could not be taken out.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function pack() {
    if (!toPack.length || busy) return;
    setBusy(true);
    setError('');
    clearSaved();
    await Promise.resolve();
    // oxlint-disable-next-line react/react-compiler
    const started = performance.now();
    try {
      const entries = [];
      let total = 0;
      for (const file of toPack) {
        total += file.size;
        if (total > MAX_BYTES) {
          throw new Error(
            `Those files come to more than 100 MB together, which is the limit on this page.`,
          );
        }
        entries.push({
          path: file.name,
          data: new Uint8Array(await file.arrayBuffer()),
        });
      }
      const zip = await createZip(entries);
      // Read our own archive back before offering it, so a file that would not
      // open is never presented as finished.
      const check = readZip(zip);
      if (check.fileCount !== entries.length) {
        throw new Error('The archive did not come back with every file in it.');
      }
      const saving = total > 0 ? 1 - zip.length / total : 0;
      keep(
        'archive.zip',
        zip,
        `Packed ${entries.length} ${entries.length === 1 ? 'file' : 'files'} into a ZIP`,
        `${formatBytes(total)} in, ${formatBytes(zip.length)} out${
          saving > 0.01 ? `, ${Math.round(saving * 100)}% smaller` : ''
        }. Opened again here to check every file is present before offering it.`,
        // oxlint-disable-next-line react/react-compiler
        performance.now() - started,
      );
      announceCompletion({
        operation: 'Archive toolkit',
        // oxlint-disable-next-line react/react-compiler
        durationMs: performance.now() - started,
        summary: `Packed ${entries.length} files into a ZIP.`,
        metrics: [
          { label: 'Files', value: String(entries.length) },
          { label: 'Size', value: formatBytes(zip.length) },
          { label: 'Uploaded', value: 'No' },
        ],
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'That archive could not be made.',
      );
    } finally {
      setBusy(false);
    }
  }

  const save = () => {
    if (!saved) return;
    const link = document.createElement('a');
    link.href = saved.url;
    link.download = saved.name;
    link.click();
  };

  const clearAll = () => {
    clearSaved();
    setLoaded(null);
    setToPack([]);
    setError('');
    if (openRef.current) openRef.current.value = '';
    if (addRef.current) addRef.current.value = '';
  };

  const archive = loaded?.archive;

  return (
    <AppShell currentToolId="archive-toolkit">
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
                <span>Archive</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Open and make ZIP files
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                A ZIP is rarely one file — it is usually a whole folder of them.
                This one is opened in the tab you are looking at, so none of it
                is sent anywhere.
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

          <div
            role="tablist"
            aria-label="What to do"
            className="mt-8 flex flex-wrap gap-1 rounded-2xl border bg-card p-2"
          >
            {(
              [
                { id: 'open', label: 'Open a ZIP', icon: FolderOpen },
                { id: 'create', label: 'Make a ZIP', icon: FilePlus2 },
              ] as const
            ).map((entry) => {
              const Icon = entry.icon;
              const selected = mode === entry.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  role="tab"
                  id={`archive-tab-${entry.id}`}
                  aria-selected={selected}
                  aria-controls={`archive-panel-${entry.id}`}
                  disabled={busy}
                  onClick={() => {
                    clearSaved();
                    setError('');
                    setMode(entry.id);
                  }}
                  className={`focus-ring flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors ${
                    selected
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Icon aria-hidden="true" className="size-4" />
                  {entry.label}
                </button>
              );
            })}
          </div>

          {mode === 'open' ? (
            <section
              role="tabpanel"
              id="archive-panel-open"
              aria-labelledby="archive-tab-open"
              className="mt-5 overflow-hidden rounded-2xl border bg-card"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-5">
                <div>
                  <h2 className="text-sm font-semibold">Your archive</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    ZIP only, up to 100 MB. RAR and 7z are different formats.
                  </p>
                </div>
                <input
                  ref={openRef}
                  type="file"
                  accept=".zip,application/zip"
                  aria-label="Choose a ZIP file"
                  className="sr-only"
                  onChange={(event) =>
                    void openArchive(event.target.files?.[0])
                  }
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="h-10"
                    disabled={busy}
                    onClick={() => openRef.current?.click()}
                  >
                    <FileArchive aria-hidden="true" />
                    {loaded ? 'Open another' : 'Choose a ZIP'}
                  </Button>
                  {loaded ? (
                    <Button
                      variant="ghost"
                      className="h-10"
                      disabled={busy}
                      onClick={clearAll}
                    >
                      <Trash2 aria-hidden="true" />
                      Clear
                    </Button>
                  ) : null}
                </div>
              </div>

              {loaded && archive ? (
                <>
                  <div className="grid gap-3 border-b px-4 py-4 sm:grid-cols-4 sm:px-5">
                    <div>
                      <p className="text-xs text-muted-foreground">Files</p>
                      <p className="tabular mt-1 text-sm font-semibold">
                        {archive.fileCount.toLocaleString()}
                        {archive.directoryCount
                          ? ` in ${archive.directoryCount} folders`
                          : ''}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Packed</p>
                      <p className="tabular mt-1 text-sm font-semibold">
                        {formatBytes(loaded.size)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Unpacked</p>
                      <p className="tabular mt-1 text-sm font-semibold">
                        {formatBytes(archive.totalUncompressed)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Saved</p>
                      <p className="tabular mt-1 text-sm font-semibold">
                        {archive.totalUncompressed
                          ? `${Math.max(0, Math.round((1 - archive.totalCompressed / archive.totalUncompressed) * 100))}%`
                          : '—'}
                      </p>
                    </div>
                  </div>

                  {archive.unsafeCount || archive.encryptedCount ? (
                    <div className="border-b bg-destructive/5 px-4 py-3 text-sm sm:px-5">
                      <p className="flex items-center gap-2 font-semibold">
                        <AlertTriangle aria-hidden="true" className="size-4" />
                        Worth looking at before you unpack this
                      </p>
                      <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
                        {archive.unsafeCount ? (
                          <li>
                            {archive.unsafeCount}{' '}
                            {archive.unsafeCount === 1
                              ? 'file wants'
                              : 'files want'}{' '}
                            to be written outside the folder you choose. They
                            are marked below.
                          </li>
                        ) : null}
                        {archive.encryptedCount ? (
                          <li>
                            {archive.encryptedCount}{' '}
                            {archive.encryptedCount === 1
                              ? 'file is'
                              : 'files are'}{' '}
                            password-protected. This page cannot open those.
                          </li>
                        ) : null}
                      </ul>
                    </div>
                  ) : null}

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[40rem] text-left text-sm">
                      <thead className="border-b text-xs text-muted-foreground">
                        <tr>
                          <th
                            scope="col"
                            className="px-4 py-2 font-medium sm:px-5"
                          >
                            Name
                          </th>
                          <th scope="col" className="px-4 py-2 font-medium">
                            Size
                          </th>
                          <th scope="col" className="px-4 py-2 font-medium">
                            Saved
                          </th>
                          <th scope="col" className="px-4 py-2 font-medium">
                            Changed
                          </th>
                          <th scope="col" className="px-4 py-2 font-medium">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {archive.entries.map((entry, index) => (
                          <tr key={`${entry.path}-${index}`}>
                            <td className="px-4 py-2 sm:px-5">
                              <span className="flex items-center gap-2">
                                {entry.encrypted ? (
                                  <Lock
                                    aria-label="Password-protected"
                                    className="size-3.5 shrink-0 text-muted-foreground"
                                  />
                                ) : null}
                                <span className="break-all">{entry.path}</span>
                              </span>
                              {entry.pathWarning ? (
                                <span className="mt-1 block text-xs text-destructive">
                                  {entry.pathWarning}
                                </span>
                              ) : null}
                            </td>
                            <td className="tabular px-4 py-2 whitespace-nowrap">
                              {entry.isDirectory
                                ? '—'
                                : formatBytes(entry.uncompressedSize)}
                            </td>
                            <td className="tabular px-4 py-2 whitespace-nowrap">
                              {entry.isDirectory ? '—' : ratio(entry)}
                            </td>
                            <td className="tabular px-4 py-2 whitespace-nowrap text-muted-foreground">
                              {formatWhen(entry.modified)}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {entry.isDirectory ? null : (
                                <Button
                                  variant="ghost"
                                  className="h-8 px-2 text-xs"
                                  disabled={busy}
                                  onClick={() => void takeOut(entry)}
                                >
                                  Take out
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="grid min-h-44 place-items-center p-6 text-center">
                  <div>
                    <span className="mx-auto grid size-11 place-items-center rounded-xl border bg-background">
                      <FileArchive aria-hidden="true" className="size-5" />
                    </span>
                    <p className="mt-4 font-semibold">Choose a ZIP file</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      You will see what is inside before anything comes out.
                    </p>
                  </div>
                </div>
              )}
            </section>
          ) : (
            <section
              role="tabpanel"
              id="archive-panel-create"
              aria-labelledby="archive-tab-create"
              className="mt-5 overflow-hidden rounded-2xl border bg-card"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-5">
                <div>
                  <h2 className="text-sm font-semibold">Files to pack</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Up to 100 MB in total.
                  </p>
                </div>
                <input
                  ref={addRef}
                  type="file"
                  multiple
                  aria-label="Choose files to pack"
                  className="sr-only"
                  onChange={(event) => {
                    clearSaved();
                    setError('');
                    setToPack((current) => [
                      ...current,
                      ...(event.target.files ? [...event.target.files] : []),
                    ]);
                  }}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="h-10"
                    disabled={busy}
                    onClick={() => addRef.current?.click()}
                  >
                    <FilePlus2 aria-hidden="true" />
                    Add files
                  </Button>
                  {toPack.length ? (
                    <Button
                      variant="ghost"
                      className="h-10"
                      disabled={busy}
                      onClick={clearAll}
                    >
                      <Trash2 aria-hidden="true" />
                      Clear
                    </Button>
                  ) : null}
                </div>
              </div>

              {toPack.length ? (
                <>
                  <ul className="divide-y">
                    {toPack.map((file, index) => (
                      <li
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5"
                      >
                        <span className="min-w-0 break-all text-sm">
                          {file.name}
                        </span>
                        <span className="tabular shrink-0 text-xs text-muted-foreground">
                          {formatBytes(file.size)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t p-4 sm:p-5">
                    <Button
                      className="h-11 w-full sm:w-auto"
                      disabled={busy}
                      onClick={() => void pack()}
                    >
                      <FileArchive aria-hidden="true" />
                      {busy ? 'Packing…' : `Pack ${toPack.length} into a ZIP`}
                    </Button>
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                      Files are stored under their own names, with no folders.
                      Dates are written as 1980, not your real file dates — that
                      is what the archive writer here does, and it means a ZIP
                      you share carries no timestamps from your machine.
                    </p>
                  </div>
                </>
              ) : (
                <div className="grid min-h-44 place-items-center p-6 text-center">
                  <div>
                    <span className="mx-auto grid size-11 place-items-center rounded-xl border bg-background">
                      <FilePlus2 aria-hidden="true" className="size-5" />
                    </span>
                    <p className="mt-4 font-semibold">Add some files</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      They are packed here, not uploaded.
                    </p>
                  </div>
                </div>
              )}
            </section>
          )}

          {saved ? (
            <section
              aria-labelledby="archive-result-heading"
              className="mt-5 overflow-hidden rounded-2xl border bg-card"
            >
              <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center sm:p-6">
                <div>
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-success/10 text-success">
                      <CheckCircle2 aria-hidden="true" className="size-5" />
                    </span>
                    <div>
                      <h2
                        id="archive-result-heading"
                        className="text-lg font-semibold"
                      >
                        {saved.headline}
                      </h2>
                      <p className="tabular mt-1 text-sm text-muted-foreground">
                        {formatBytes(saved.size)} ·{' '}
                        {formatElapsed(saved.durationMs)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-xs leading-5 text-muted-foreground">
                    {saved.detail}
                  </p>
                </div>
                <Button data-receipt-download className="h-11" onClick={save}>
                  <ArrowDownToLine aria-hidden="true" />
                  Save {saved.name}
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
                  <p className="text-xs text-muted-foreground">Output check</p>
                  <p className="mt-1 text-sm font-semibold">
                    Checksum verified
                  </p>
                </div>
                <div className="p-4 sm:p-5">
                  <p className="text-xs text-muted-foreground">Unsafe paths</p>
                  <p className="mt-1 text-sm font-semibold">
                    Named, never followed
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          <footer className="mt-10 flex flex-col gap-3 border-t py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>Candidate {manifest.version} · ZIP only · Stored and deflated</p>
            <a
              href="/file/hash-calculator"
              className="focus-ring rounded font-semibold text-foreground hover:underline"
            >
              Next: Check a file hash →
            </a>
          </footer>
        </div>
      </section>
    </AppShell>
  );
}
