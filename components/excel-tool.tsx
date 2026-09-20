'use client';

import {
  ArrowDownToLine,
  FileSpreadsheet,
  Info,
  LockKeyhole,
  Table2,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import { detectDelimiter, parseCsv, toCsv } from '@/lib/tools/spreadsheet/csv';
import {
  cellToText,
  readXlsx,
  type Workbook,
} from '@/lib/tools/spreadsheet/xlsx-reader';
import { writeXlsx } from '@/lib/tools/spreadsheet/xlsx-writer';
import { toolMeta } from '@/lib/tools/tool-meta';

const MAX_BYTES = 50 * 1024 * 1024;
/** How much of a sheet to draw. Everything is converted; only the preview is cut. */
const PREVIEW_ROWS = 50;
const PREVIEW_COLUMNS = 20;

type Mode = 'open' | 'make';

interface Loaded {
  name: string;
  book: Workbook;
  sheetIndex: number;
}

interface FromCsv {
  name: string;
  rows: string[][];
  delimiter: string;
}

interface Saved {
  name: string;
  url: string;
  size: number;
  headline: string;
  detail: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function delimiterName(delimiter: string) {
  if (delimiter === '\t') return 'tabs';
  if (delimiter === ';') return 'semicolons';
  if (delimiter === '|') return 'pipes';
  return 'commas';
}

export function ExcelTool() {
  const savedRef = useRef<Saved | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<Mode>('open');
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [fromCsv, setFromCsv] = useState<FromCsv | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const manifest = toolMeta('excel-converter');

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

  const save = () => {
    if (!saved) return;
    const link = document.createElement('a');
    link.href = saved.url;
    link.download = saved.name;
    link.click();
  };

  const keep = (name: string, blob: Blob, headline: string, detail: string) => {
    const next: Saved = {
      name,
      url: URL.createObjectURL(blob),
      size: blob.size,
      headline,
      detail,
    };
    savedRef.current = next;
    setSaved(next);
  };

  const tooBig = (file: File) => {
    if (file.size <= MAX_BYTES) return false;
    setError(
      `That file is ${formatBytes(file.size)}. This page works on files up to ${formatBytes(MAX_BYTES)}, because the whole thing is read in this tab.`,
    );
    return true;
  };

  const onOpenSpreadsheet = async (file: File | undefined) => {
    if (!file) return;
    clearSaved();
    setError('');
    setLoaded(null);
    if (tooBig(file)) return;
    setBusy('Opening the spreadsheet…');
    try {
      const book = await readXlsx(new Uint8Array(await file.arrayBuffer()));
      setLoaded({ name: file.name, book, sheetIndex: 0 });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'That file could not be opened.',
      );
    } finally {
      setBusy('');
    }
  };

  const onChooseCsv = async (file: File | undefined) => {
    if (!file) return;
    clearSaved();
    setError('');
    setFromCsv(null);
    if (tooBig(file)) return;
    setBusy('Reading the file…');
    try {
      const text = await file.text();
      const delimiter = detectDelimiter(text);
      const rows = parseCsv(text, delimiter);
      if (!rows.length) throw new Error('That file has nothing in it.');
      setFromCsv({ name: file.name, rows, delimiter });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'That file could not be read.',
      );
    } finally {
      setBusy('');
    }
  };

  const sheetToCsv = () => {
    if (!loaded) return;
    clearSaved();
    setError('');
    const started = performance.now();
    try {
      const sheet = loaded.book.sheets[loaded.sheetIndex];
      const rows = sheet.rows.map((row) => row.map((cell) => cellToText(cell)));
      // A byte-order mark, so Excel reads it back as UTF-8 rather than as the
      // local codepage. Without it "café" reopens as "cafÃ©".
      const text = toCsv(rows);
      const base = loaded.name.replace(/\.[^.]+$/u, '');
      const suffix =
        loaded.book.sheets.length > 1
          ? `-${sheet.name.replace(/[^\w.-]+/gu, '-')}`
          : '';
      // oxlint-disable-next-line react/react-compiler
      const durationMs = performance.now() - started;
      keep(
        `${base}${suffix}.csv`,
        new Blob([text], { type: 'text/csv;charset=utf-8' }),
        `${sheet.rows.length.toLocaleString('en-US')} rows as CSV`,
        `From the sheet "${sheet.name}". Dates are written as plain ISO dates, not as the numbers a spreadsheet stores underneath. Written in ${durationMs.toFixed(0)} ms.`,
      );
      announceCompletion({
        operation: 'Excel converter',
        durationMs,
        summary: `Converted ${sheet.name} to CSV.`,
        metrics: [
          { label: 'Rows', value: sheet.rows.length.toLocaleString('en-US') },
          { label: 'Uploaded', value: 'No' },
        ],
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'That could not be converted.',
      );
    }
  };

  const csvToXlsx = async () => {
    if (!fromCsv) return;
    clearSaved();
    setError('');
    setBusy('Building the spreadsheet…');
    const started = performance.now();
    try {
      const base = fromCsv.name.replace(/\.[^.]+$/u, '');
      const result = await writeXlsx([
        { name: base || 'Sheet', rows: fromCsv.rows },
      ]);
      // oxlint-disable-next-line react/react-compiler
      const durationMs = performance.now() - started;
      const renamed = result.renamed[0];
      keep(
        `${base}.xlsx`,
        new Blob([result.bytes as BlobPart], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        `${fromCsv.rows.length.toLocaleString('en-US')} rows as a spreadsheet`,
        renamed
          ? `The sheet is named "${renamed.to}" — a spreadsheet cannot have \\ / ? * [ ] : in a sheet name, so "${renamed.from}" would not open. Written in ${durationMs.toFixed(0)} ms.`
          : `Every value is written as text, so nothing is reinterpreted on the way in — a code like 007 stays 007. Written in ${durationMs.toFixed(0)} ms.`,
      );
      announceCompletion({
        operation: 'Excel converter',
        durationMs,
        summary: `Made a spreadsheet from ${fromCsv.name}.`,
        metrics: [
          { label: 'Rows', value: fromCsv.rows.length.toLocaleString('en-US') },
          { label: 'Uploaded', value: 'No' },
        ],
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'That could not be converted.',
      );
    } finally {
      setBusy('');
    }
  };

  const sheet = loaded?.book.sheets[loaded.sheetIndex] ?? null;
  const previewRows = sheet ? sheet.rows.slice(0, PREVIEW_ROWS) : [];
  const csvPreview = fromCsv ? fromCsv.rows.slice(0, PREVIEW_ROWS) : [];

  return (
    <AppShell currentToolId="excel-converter">
      <section
        id="tool"
        tabIndex={-1}
        className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-12"
      >
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col justify-between gap-5 border-b pb-8 sm:flex-row sm:items-start">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span>Data</span>
                <span aria-hidden="true">/</span>
                <span>Excel</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Open and make Excel files
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                Turn an <code>.xlsx</code> into a CSV, or a CSV into a real
                spreadsheet. A spreadsheet is usually the most private file
                anyone owns — payroll, a customer list, a year of accounts — and
                this one is read in the tab you are looking at.
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
                {
                  id: 'open',
                  label: 'Open a spreadsheet',
                  icon: FileSpreadsheet,
                },
                { id: 'make', label: 'Make a spreadsheet', icon: Table2 },
              ] as const
            ).map((entry) => {
              const Icon = entry.icon;
              const selected = mode === entry.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={`focus-ring flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${
                    selected
                      ? 'bg-background shadow-sm'
                      : 'text-muted-foreground'
                  }`}
                  onClick={() => {
                    setMode(entry.id);
                    setError('');
                    clearSaved();
                  }}
                >
                  <Icon aria-hidden="true" className="size-4" />
                  {entry.label}
                </button>
              );
            })}
          </div>

          {mode === 'open' ? (
            <div className="mt-6 rounded-2xl border bg-card p-5">
              <label htmlFor="xlsx-file" className="text-sm font-semibold">
                Choose a spreadsheet
              </label>
              <input
                id="xlsx-file"
                type="file"
                accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="focus-ring mt-3 block w-full rounded-lg border bg-background p-2.5 text-sm"
                onChange={(event) => {
                  void onOpenSpreadsheet(event.target.files?.[0]);
                }}
              />
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                <code>.xlsx</code> only. The old <code>.xls</code> from Excel
                2003 is a different format entirely and is refused by name
                rather than failing oddly.
              </p>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border bg-card p-5">
              <label htmlFor="csv-file" className="text-sm font-semibold">
                Choose a CSV file
              </label>
              <input
                id="csv-file"
                type="file"
                accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
                className="focus-ring mt-3 block w-full rounded-lg border bg-background p-2.5 text-sm"
                onChange={(event) => {
                  void onChooseCsv(event.target.files?.[0]);
                }}
              />
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Commas, semicolons, tabs or pipes — whichever the file uses is
                worked out from the file itself.
              </p>
            </div>
          )}

          {busy ? (
            <output className="mt-4 block text-sm text-muted-foreground">
              {busy}
            </output>
          ) : null}

          {mode === 'open' && loaded && sheet ? (
            <>
              {loaded.book.notes.length ? (
                <div className="mt-6 rounded-2xl border bg-card p-5">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <Info aria-hidden="true" className="size-4" />
                    Worth knowing about this file
                  </h2>
                  <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
                    {loaded.book.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {loaded.book.sheets.length > 1 ? (
                <div className="mt-6">
                  <label
                    htmlFor="sheet"
                    className="text-xs text-muted-foreground"
                  >
                    Sheet
                  </label>
                  <select
                    id="sheet"
                    value={loaded.sheetIndex}
                    onChange={(event) => {
                      clearSaved();
                      setLoaded({
                        ...loaded,
                        sheetIndex: Number(event.target.value),
                      });
                    }}
                    className="focus-ring mt-1.5 block w-full max-w-sm rounded-lg border bg-background p-2 text-sm"
                  >
                    {loaded.book.sheets.map((entry, index) => (
                      <option key={entry.name} value={index}>
                        {entry.name} —{' '}
                        {entry.rows.length.toLocaleString('en-US')} rows
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="mt-6 overflow-x-auto rounded-2xl border bg-card">
                <table className="w-full text-left text-xs">
                  <caption className="px-4 pt-4 text-left text-sm font-semibold">
                    {sheet.name} — {sheet.rows.length.toLocaleString('en-US')}{' '}
                    rows, {sheet.columnCount} columns
                    {sheet.rows.length > PREVIEW_ROWS
                      ? `, showing the first ${PREVIEW_ROWS}`
                      : ''}
                  </caption>
                  <tbody>
                    {previewRows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-t">
                        {row
                          .slice(0, PREVIEW_COLUMNS)
                          .map((cell, columnIndex) => (
                            <td
                              key={columnIndex}
                              className="max-w-[16rem] truncate px-3 py-1.5"
                            >
                              {cellToText(cell)}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6">
                <Button type="button" onClick={sheetToCsv}>
                  <ArrowDownToLine aria-hidden="true" className="size-4" />
                  Convert this sheet to CSV
                </Button>
              </div>
            </>
          ) : null}

          {mode === 'make' && fromCsv ? (
            <>
              <div className="mt-6 overflow-x-auto rounded-2xl border bg-card">
                <table className="w-full text-left text-xs">
                  <caption className="px-4 pt-4 text-left text-sm font-semibold">
                    {fromCsv.rows.length.toLocaleString('en-US')} rows,
                    separated by {delimiterName(fromCsv.delimiter)}
                    {fromCsv.rows.length > PREVIEW_ROWS
                      ? `, showing the first ${PREVIEW_ROWS}`
                      : ''}
                  </caption>
                  <tbody>
                    {csvPreview.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-t">
                        {row
                          .slice(0, PREVIEW_COLUMNS)
                          .map((cell, columnIndex) => (
                            <td
                              key={columnIndex}
                              className="max-w-[16rem] truncate px-3 py-1.5"
                            >
                              {cell}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => {
                    void csvToXlsx();
                  }}
                >
                  <ArrowDownToLine aria-hidden="true" className="size-4" />
                  Make an Excel file
                </Button>
                <p className="text-xs text-muted-foreground">
                  Values are written as text, so a code like 007 or a long
                  account number keeps its leading zeros instead of becoming a
                  number.
                </p>
              </div>
            </>
          ) : null}

          <section aria-live="polite" className="mt-6">
            {saved ? (
              <div className="rounded-2xl border bg-card p-5">
                <h2 className="text-base font-semibold">{saved.headline}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {saved.detail} {formatBytes(saved.size)}.
                </p>
                <Button
                  data-receipt-download
                  className="mt-4 h-11"
                  onClick={save}
                >
                  <ArrowDownToLine aria-hidden="true" />
                  Save {saved.name}
                </Button>
              </div>
            ) : null}
          </section>

          <p className="mt-10 text-xs leading-5 text-muted-foreground">
            {manifest.shortDescription} Formulas are not calculated — a cell
            that holds one shows the result the spreadsheet last saved, and the
            page says so when there is none to show.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
