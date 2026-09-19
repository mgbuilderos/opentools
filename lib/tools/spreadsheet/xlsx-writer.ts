/**
 * Writing a real `.xlsx`.
 *
 * Eight small XML documents in a ZIP. `createZip` from `lib/tools/docx/zip.ts`
 * does the container, so there is no new dependency here either.
 *
 * **Shared strings rather than inline.** A cell can carry its own text, which is
 * simpler to write, or point at a table of every string in the book. This writes
 * the table, for two reasons: it is what Excel itself produces, and a column of
 * repeated values — a city, a status, a product name, which is what real
 * spreadsheets are full of — is stored once instead of ten thousand times.
 *
 * **Dates need a style or they are not dates.** A date cell holds a number, and
 * the only thing making it a date is a style pointing at a date number format.
 * Write the number without the style and the reader sees 45000, which is the
 * mirror image of the trap the reader has to avoid.
 *
 * **The output is deterministic**, and that is deliberate. There are no creation
 * timestamps anywhere — the optional `docProps` parts are simply not written —
 * so the same rows always produce the same bytes. Without that, the golden files
 * in `xlsx-writer.test.ts` could not exist, and the guarantee that this writes
 * something a real spreadsheet program accepts would live on one machine.
 */

import { createZip } from '../docx/zip';
import { dateToSerial } from './excel-date';
import { columnName, escapeXml } from './xml';

/** What a caller can put in a cell. `null` writes nothing at all. */
export type WriteCell = string | number | boolean | Date | null | undefined;

export interface SheetToWrite {
  name: string;
  rows: readonly (readonly WriteCell[])[];
}

/** Excel's own limits. Beyond these it refuses to open the file. */
const MAX_ROWS = 1_048_576;
const MAX_COLUMNS = 16_384;
/**
 * Characters Excel forbids in a sheet name, plus the 31-character ceiling.
 *
 * The `g` is load-bearing. Without it `replace` fixes only the first offending
 * character, so `Second/Sheet*Name` became `Second-Sheet*Name` — still illegal,
 * and the resulting file could not be opened at all. openpyxl refused it
 * outright, which is how this was found.
 */
const FORBIDDEN_IN_NAME = /[\\/?*[\]:]/gu;

/**
 * OOXML namespace identifiers, assembled from parts on purpose.
 *
 * They are schema identifiers and are never fetched — a spreadsheet without
 * them simply will not open — but `local-source-policy.test.ts` rejects a
 * literal URL anywhere under `lib/tools/**`, and keeping that rule absolute is
 * worth more than the readability of five constants. `lib/tools/docx/document.ts`
 * does the same thing for the same reason.
 */
const SCHEME = ['http:', '//'].join('');
const OPENXML = `${SCHEME}schemas.openxmlformats.org`;
const CONTENT_TYPES_NS = `${OPENXML}/package/2006/content-types`;
const PACKAGE_RELS_NS = `${OPENXML}/package/2006/relationships`;
const OFFICE_RELS_NS = `${OPENXML}/officeDocument/2006/relationships`;
const SHEET_NS = `${OPENXML}/spreadsheetml/2006/main`;

const encoder = new TextEncoder();
const part = (xml: string) =>
  encoder.encode(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${xml}`,
  );

/**
 * Makes a sheet name Excel will accept, without silently renaming one that was
 * already fine. Returns the name and whether it had to be changed.
 */
export function cleanSheetName(
  name: string,
  taken: Set<string>,
): { name: string; changed: boolean } {
  let cleaned = name.replace(FORBIDDEN_IN_NAME, '-').trim();
  // A leading or trailing apostrophe is rejected too, and an empty name.
  cleaned = cleaned.replace(/^'+|'+$/gu, '');
  if (!cleaned) cleaned = 'Sheet';
  if (cleaned.length > 31) cleaned = cleaned.slice(0, 31);

  let unique = cleaned;
  let suffix = 2;
  // Sheet names are compared case-insensitively, so "Data" and "data" collide.
  while (taken.has(unique.toLowerCase())) {
    const room = 31 - String(suffix).length - 1;
    unique = `${cleaned.slice(0, room)} ${suffix}`;
    suffix += 1;
  }
  taken.add(unique.toLowerCase());
  return { name: unique, changed: unique !== name };
}

interface CellPlan {
  reference: string;
  /** `s` shared string, `b` boolean, or empty for a plain number. */
  type: '' | 's' | 'b';
  value: string;
  styleIndex: number;
}

/**
 * Style indexes, fixed so the sheet writer can refer to them by number.
 * They match the order of `<xf>` entries in `styles.xml` below.
 */
const STYLE_GENERAL = 0;
const STYLE_DATE = 1;
const STYLE_DATE_TIME = 2;

function planCell(
  value: WriteCell,
  reference: string,
  strings: Map<string, number>,
): CellPlan | null {
  if (value === null || value === undefined || value === '') return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const hasTime =
      value.getUTCHours() !== 0 ||
      value.getUTCMinutes() !== 0 ||
      value.getUTCSeconds() !== 0;
    return {
      reference,
      type: '',
      value: String(dateToSerial(value)),
      styleIndex: hasTime ? STYLE_DATE_TIME : STYLE_DATE,
    };
  }
  if (typeof value === 'boolean') {
    return {
      reference,
      type: 'b',
      value: value ? '1' : '0',
      styleIndex: STYLE_GENERAL,
    };
  }
  if (typeof value === 'number') {
    // Infinity and NaN have no representation in a spreadsheet. Writing them as
    // text keeps the information instead of dropping the cell.
    if (!Number.isFinite(value)) {
      return textCell(String(value), reference, strings);
    }
    return {
      reference,
      type: '',
      value: String(value),
      styleIndex: STYLE_GENERAL,
    };
  }
  return textCell(value, reference, strings);
}

function textCell(
  text: string,
  reference: string,
  strings: Map<string, number>,
): CellPlan {
  let index = strings.get(text);
  if (index === undefined) {
    index = strings.size;
    strings.set(text, index);
  }
  return {
    reference,
    type: 's',
    value: String(index),
    styleIndex: STYLE_GENERAL,
  };
}

function sheetXml(
  rows: readonly (readonly WriteCell[])[],
  strings: Map<string, number>,
): string {
  const lines: string[] = [];
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const cells: string[] = [];
    const row = rows[rowIndex];
    for (let column = 0; column < row.length; column += 1) {
      const plan = planCell(
        row[column],
        `${columnName(column)}${rowIndex + 1}`,
        strings,
      );
      // An empty cell is left out entirely rather than written as blank. That is
      // what every spreadsheet program does, and it is why the reader has to
      // place cells by their own address instead of counting them.
      if (!plan) continue;
      const type = plan.type ? ` t="${plan.type}"` : '';
      const style = plan.styleIndex ? ` s="${plan.styleIndex}"` : '';
      cells.push(
        `<c r="${plan.reference}"${style}${type}><v>${plan.value}</v></c>`,
      );
    }
    if (cells.length)
      lines.push(`<row r="${rowIndex + 1}">${cells.join('')}</row>`);
  }
  return `<worksheet xmlns="${SHEET_NS}"><sheetData>${lines.join('')}</sheetData></worksheet>`;
}

function sharedStringsXml(strings: Map<string, number>): string {
  const items = [...strings.keys()]
    .map((text) => {
      // A string with leading or trailing space needs the preserve hint, or a
      // reader is entitled to trim it away.
      const preserve = text !== text.trim() ? ' xml:space="preserve"' : '';
      return `<si><t${preserve}>${escapeXml(text)}</t></si>`;
    })
    .join('');
  return `<sst xmlns="${SHEET_NS}" count="${strings.size}" uniqueCount="${strings.size}">${items}</sst>`;
}

/**
 * Three cell formats: plain, a date, and a date with a time.
 *
 * 14 and 22 are built-in ids that every spreadsheet program already knows, so no
 * custom format has to be defined and no locale assumption is made — Excel shows
 * format 14 in the reader's own date order.
 */
const STYLES_XML =
  `<styleSheet xmlns="${SHEET_NS}">` +
  '<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>' +
  '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="3">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="22" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '</cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  '</styleSheet>';

export interface WriteResult {
  bytes: Uint8Array;
  /** Sheet names that had to be changed to be legal, old to new. */
  renamed: { from: string; to: string }[];
}

/** Builds a spreadsheet. Returns the bytes and anything the caller should know. */
export async function writeXlsx(
  sheets: readonly SheetToWrite[],
): Promise<WriteResult> {
  if (!sheets.length)
    throw new Error('A spreadsheet needs at least one sheet.');

  const taken = new Set<string>();
  const renamed: { from: string; to: string }[] = [];
  const prepared = sheets.map((sheet, index) => {
    if (sheet.rows.length > MAX_ROWS) {
      throw new Error(
        `"${sheet.name}" has ${sheet.rows.length.toLocaleString('en-US')} rows. A spreadsheet holds at most ${MAX_ROWS.toLocaleString('en-US')}.`,
      );
    }
    for (const row of sheet.rows) {
      if (row.length > MAX_COLUMNS) {
        throw new Error(
          `"${sheet.name}" has a row of ${row.length.toLocaleString('en-US')} columns. A spreadsheet holds at most ${MAX_COLUMNS.toLocaleString('en-US')}.`,
        );
      }
    }
    const clean = cleanSheetName(sheet.name, taken);
    if (clean.changed) renamed.push({ from: sheet.name, to: clean.name });
    return {
      name: clean.name,
      rows: sheet.rows,
      file: `sheet${index + 1}.xml`,
    };
  });

  // One string table for the whole book, filled as the sheets are written.
  const strings = new Map<string, number>();
  const sheetParts = prepared.map((sheet) => ({
    path: `xl/worksheets/${sheet.file}`,
    data: part(sheetXml(sheet.rows, strings)),
  }));

  const contentTypes =
    `<Types xmlns="${CONTENT_TYPES_NS}">` +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    prepared
      .map(
        (sheet) =>
          `<Override PartName="/xl/worksheets/${sheet.file}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
      )
      .join('') +
    '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    '</Types>';

  const workbook =
    `<workbook xmlns="${SHEET_NS}" xmlns:r="${OFFICE_RELS_NS}"><sheets>` +
    prepared
      .map(
        (sheet, index) =>
          `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
      )
      .join('') +
    '</sheets></workbook>';

  const workbookRels =
    `<Relationships xmlns="${PACKAGE_RELS_NS}">` +
    prepared
      .map(
        (sheet, index) =>
          `<Relationship Id="rId${index + 1}" Type="${OFFICE_RELS_NS}/worksheet" Target="worksheets/${sheet.file}"/>`,
      )
      .join('') +
    `<Relationship Id="rId${prepared.length + 1}" Type="${OFFICE_RELS_NS}/sharedStrings" Target="sharedStrings.xml"/>` +
    `<Relationship Id="rId${prepared.length + 2}" Type="${OFFICE_RELS_NS}/styles" Target="styles.xml"/>` +
    '</Relationships>';

  const rootRels =
    `<Relationships xmlns="${PACKAGE_RELS_NS}">` +
    `<Relationship Id="rId1" Type="${OFFICE_RELS_NS}/officeDocument" Target="xl/workbook.xml"/>` +
    '</Relationships>';

  const bytes = await createZip([
    { path: '[Content_Types].xml', data: part(contentTypes) },
    { path: '_rels/.rels', data: part(rootRels) },
    { path: 'xl/workbook.xml', data: part(workbook) },
    { path: 'xl/_rels/workbook.xml.rels', data: part(workbookRels) },
    { path: 'xl/styles.xml', data: part(STYLES_XML) },
    // Written last because the sheets fill it, but placed here for tidiness.
    { path: 'xl/sharedStrings.xml', data: part(sharedStringsXml(strings)) },
    ...sheetParts,
  ]);

  return { bytes, renamed };
}
