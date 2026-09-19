/**
 * Reading a real `.xlsx` file.
 *
 * **Why this matters more than the other readers here.** A spreadsheet is the
 * most sensitive file most people own. It is payroll, it is a customer list, it
 * is a company's finances. The usual way to turn one into a CSV is to upload it
 * to a stranger's server, which for a customer list is a data-protection
 * incident with a friendly interface. This reader means the file never moves.
 *
 * **An `.xlsx` is a ZIP full of XML**, which is why this is a small file rather
 * than a large one: `lib/tools/archive/zip-reader.ts` already does the hard part,
 * with CRC verification, and shipped on 2026-09-18.
 *
 * The parts that matter, and the order they have to be read in:
 *
 * | Part | Holds |
 * |---|---|
 * | `xl/workbook.xml` | sheet names, and **which date system** the file uses |
 * | `xl/_rels/workbook.xml.rels` | which file each sheet actually lives in |
 * | `xl/sharedStrings.xml` | every string in the book, by index |
 * | `xl/styles.xml` | number formats, which is **the only way to know a date** |
 * | `xl/worksheets/*.xml` | the cells |
 *
 * **Three traps, each of which silently corrupts data rather than failing.**
 *
 * 1. **Text is not stored in the cell.** A cell holds an index into
 *    `sharedStrings.xml`. Read the index as a value and every text cell becomes
 *    a number.
 * 2. **A date is just a number.** Nothing in the cell says it is a date; the
 *    cell's *style* points at a number format, and the format decides. See
 *    `excel-date.ts`, which also carries Excel's 1900 leap-year bug.
 * 3. **Sheet order is not file order.** `sheet1.xml` is not necessarily the
 *    first sheet. The relationship file maps them, and assuming otherwise hands
 *    somebody the wrong sheet under the right name.
 */

import { extractEntry, readZip, type ZipArchive } from '../archive/zip-reader';
import { isDateFormat, serialToDate } from './excel-date';
import { eachElement, joinedText, parseCellReference } from './xml';

export type Cell =
  | { kind: 'empty' }
  | { kind: 'text'; text: string }
  | { kind: 'number'; value: number }
  | { kind: 'date'; date: Date; hasTime: boolean; phantomLeapDay: boolean }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'error'; code: string };

export const EMPTY: Cell = { kind: 'empty' };

export interface Sheet {
  name: string;
  /** Rows of cells, rectangular: short rows are padded so every row is the same width. */
  rows: Cell[][];
  columnCount: number;
}

export interface Workbook {
  sheets: Sheet[];
  /** `true` for files written by old Mac Excel, which counts days from 1904. */
  date1904: boolean;
  /** Things worth telling the reader. Never filler. */
  notes: string[];
}

const decoder = new TextDecoder();

async function readPart(
  bytes: Uint8Array,
  archive: ZipArchive,
  path: string,
): Promise<string | null> {
  const entry = archive.entries.find((item) => item.path === path);
  if (!entry || entry.isDirectory) return null;
  return decoder.decode(await extractEntry(bytes, entry));
}

/** Every shared string, in index order. */
function readSharedStrings(xml: string | null): string[] {
  if (!xml) return [];
  const strings: string[] = [];
  eachElement(xml, 'si', (element) => {
    // Every `<t>` inside, joined: a cell styled in two colours is stored as
    // runs, and taking the first would truncate it.
    strings.push(joinedText(element.inner));
  });
  return strings;
}

interface Styles {
  /** For each cell format, the number format id it points at. */
  cellFormats: number[];
  /** Custom format codes, by id. Built-in ids are not listed in the file. */
  customFormats: Map<number, string>;
}

function readStyles(xml: string | null): Styles {
  const cellFormats: number[] = [];
  const customFormats = new Map<number, string>();
  if (!xml) return { cellFormats, customFormats };

  eachElement(xml, 'numFmt', (element) => {
    const id = Number.parseInt(element.attrs.numFmtId ?? '', 10);
    if (Number.isFinite(id) && element.attrs.formatCode) {
      customFormats.set(id, element.attrs.formatCode);
    }
  });

  // Only `cellXfs` matters: `cellStyleXfs` holds named styles a cell refers to
  // indirectly, and reading both into one list shifts every index.
  const start = xml.indexOf('<cellXfs');
  if (start !== -1) {
    const end = xml.indexOf('</cellXfs>', start);
    const section = xml.slice(start, end === -1 ? undefined : end);
    eachElement(section, 'xf', (element) => {
      cellFormats.push(Number.parseInt(element.attrs.numFmtId ?? '0', 10) || 0);
    });
  }
  return { cellFormats, customFormats };
}

function isDateStyle(styleIndex: number | null, styles: Styles): boolean {
  if (styleIndex === null) return false;
  const numFmtId = styles.cellFormats[styleIndex];
  if (numFmtId === undefined) return false;
  return isDateFormat(numFmtId, styles.customFormats.get(numFmtId));
}

/** One `<c>` element turned into a value. */
function readCell(
  element: { attrs: Record<string, string>; inner: string },
  shared: string[],
  styles: Styles,
  date1904: boolean,
  notes: Set<string>,
): Cell {
  const type = element.attrs.t ?? 'n';
  const styleIndex = element.attrs.s
    ? Number.parseInt(element.attrs.s, 10)
    : null;

  if (type === 'inlineStr') {
    return { kind: 'text', text: joinedText(element.inner) };
  }
  if (type === 's') {
    // The value is an index into the shared string table, not the text.
    const raw = element.inner.match(/<v[^>]*>([\s\S]*?)<\/v>/u);
    const index = raw ? Number.parseInt(raw[1], 10) : Number.NaN;
    const text = shared[index];
    if (text === undefined) {
      notes.add(
        'A cell pointed at a missing entry in the string table and was read as empty.',
      );
      return EMPTY;
    }
    return { kind: 'text', text };
  }

  const valueMatch = element.inner.match(/<v[^>]*>([\s\S]*?)<\/v>/u);
  const raw = valueMatch ? valueMatch[1] : '';
  // A formula's cached result may be missing *or* present but empty -- openpyxl
  // writes `<f>A2</f><v></v>`, which is a `<v>` that parses and holds nothing.
  // Treating that as text produced a cell containing an empty string, which
  // looks like data and sorts like data and is not data.
  if (raw.trim() === '') {
    if (element.inner.includes('<f')) {
      notes.add(
        'Some cells hold formulas with no saved result. Formulas are not calculated here, so those cells are empty.',
      );
    }
    return EMPTY;
  }

  if (type === 'b') return { kind: 'boolean', value: raw === '1' };
  if (type === 'e') return { kind: 'error', code: raw };
  if (type === 'str') return { kind: 'text', text: raw };

  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return { kind: 'text', text: raw };

  if (isDateStyle(styleIndex, styles)) {
    const converted = serialToDate(value, date1904);
    if (converted.phantomLeapDay) {
      notes.add(
        'One date is 29 February 1900, a day Excel believes in and the calendar does not. It is shown as 28 February.',
      );
    }
    return {
      kind: 'date',
      date: converted.date,
      hasTime: converted.hasTime,
      phantomLeapDay: converted.phantomLeapDay,
    };
  }
  return { kind: 'number', value };
}

function readSheet(
  name: string,
  xml: string,
  shared: string[],
  styles: Styles,
  date1904: boolean,
  notes: Set<string>,
): Sheet {
  // Cells carry their own address, so a sheet with gaps is read into the right
  // places rather than packed to the left. A row may also skip numbers.
  const byRow = new Map<number, Map<number, Cell>>();
  let widest = 0;
  let tallest = 0;

  eachElement(xml, 'row', (row) => {
    const declared = row.attrs.r ? Number.parseInt(row.attrs.r, 10) - 1 : null;
    let fallbackColumn = 0;
    eachElement(row.inner, 'c', (cell) => {
      const reference = cell.attrs.r ? parseCellReference(cell.attrs.r) : null;
      const rowIndex = reference?.row ?? declared ?? 0;
      const columnIndex = reference?.column ?? fallbackColumn;
      fallbackColumn = columnIndex + 1;

      const value = readCell(cell, shared, styles, date1904, notes);
      if (value.kind === 'empty') return;
      if (!byRow.has(rowIndex)) byRow.set(rowIndex, new Map());
      byRow.get(rowIndex)!.set(columnIndex, value);
      if (columnIndex + 1 > widest) widest = columnIndex + 1;
      if (rowIndex + 1 > tallest) tallest = rowIndex + 1;
    });
  });

  const rows: Cell[][] = [];
  for (let rowIndex = 0; rowIndex < tallest; rowIndex += 1) {
    const source = byRow.get(rowIndex);
    const row: Cell[] = [];
    for (let column = 0; column < widest; column += 1) {
      row.push(source?.get(column) ?? EMPTY);
    }
    rows.push(row);
  }
  return { name, rows, columnCount: widest };
}

/**
 * Opens a spreadsheet. Returns every sheet, in the order the workbook lists
 * them rather than the order the files happen to sit in the archive.
 */
export async function readXlsx(bytes: Uint8Array): Promise<Workbook> {
  if (bytes.length > 3 && bytes[0] === 0xd0 && bytes[1] === 0xcf) {
    throw new Error(
      'This is an old .xls file, from Excel 2003 or earlier. It is a completely different format — open it in a spreadsheet program and save it as .xlsx first.',
    );
  }

  const archive = readZip(bytes);
  const workbookXml = await readPart(bytes, archive, 'xl/workbook.xml');
  if (!workbookXml) {
    throw new Error(
      'This ZIP file does not contain a spreadsheet. An .xlsx holds xl/workbook.xml, and this one does not.',
    );
  }

  const notes = new Set<string>();

  // One attribute decides how every date in the file is read.
  let date1904 = false;
  eachElement(workbookXml, 'workbookPr', (element) => {
    const flag = element.attrs.date1904 ?? element.attrs['x15ac:date1904'];
    if (flag === '1' || flag === 'true') date1904 = true;
  });
  if (date1904) {
    notes.add(
      'This file counts dates from 1904, the way old Mac Excel did. Read as an ordinary file every date would be out by four years.',
    );
  }

  // rId -> the part the sheet lives in. Sheet order is workbook order, not
  // file order, and the two disagree more often than you would expect.
  const targets = new Map<string, string>();
  const relsXml = await readPart(bytes, archive, 'xl/_rels/workbook.xml.rels');
  if (relsXml) {
    eachElement(relsXml, 'Relationship', (element) => {
      if (element.attrs.Id && element.attrs.Target) {
        targets.set(
          element.attrs.Id,
          element.attrs.Target.replace(/^\/?xl\//u, ''),
        );
      }
    });
  }

  const shared = readSharedStrings(
    await readPart(bytes, archive, 'xl/sharedStrings.xml'),
  );
  const styles = readStyles(await readPart(bytes, archive, 'xl/styles.xml'));

  const listed: { name: string; target: string | null }[] = [];
  const sheetsSection = workbookXml.slice(
    Math.max(0, workbookXml.indexOf('<sheets')),
    workbookXml.includes('</sheets>')
      ? workbookXml.indexOf('</sheets>')
      : undefined,
  );
  eachElement(sheetsSection, 'sheet', (element) => {
    const relationship = element.attrs['r:id'] ?? element.attrs.id ?? '';
    listed.push({
      name: element.attrs.name ?? `Sheet ${listed.length + 1}`,
      target: targets.get(relationship) ?? null,
    });
  });

  const sheets: Sheet[] = [];
  for (let index = 0; index < listed.length; index += 1) {
    const { name, target } = listed[index];
    // Fall back on position only when the relationship is missing, and say so.
    const path = `xl/${target ?? `worksheets/sheet${index + 1}.xml`}`;
    const xml = await readPart(bytes, archive, path);
    if (!xml) {
      notes.add(
        `The sheet "${name}" is listed in this file but its contents are missing.`,
      );
      continue;
    }
    if (!target) {
      notes.add(
        `The sheet "${name}" did not say which part it lives in, so it was matched by position.`,
      );
    }
    sheets.push(readSheet(name, xml, shared, styles, date1904, notes));
  }

  if (!sheets.length) {
    throw new Error('This spreadsheet has no readable sheets in it.');
  }
  return { sheets, date1904, notes: [...notes] };
}

/** How a cell should read in a CSV or on screen. Dates as ISO, not as a serial. */
export function cellToText(cell: Cell): string {
  switch (cell.kind) {
    case 'empty':
      return '';
    case 'text':
      return cell.text;
    case 'number':
      return String(cell.value);
    case 'boolean':
      return cell.value ? 'TRUE' : 'FALSE';
    case 'error':
      return cell.code;
    case 'date':
      // ISO 8601, and only as much of it as the cell actually carried: a date
      // with no time should not gain a midnight it never had.
      return cell.hasTime
        ? cell.date.toISOString().replace('.000Z', 'Z')
        : cell.date.toISOString().slice(0, 10);
  }
}
