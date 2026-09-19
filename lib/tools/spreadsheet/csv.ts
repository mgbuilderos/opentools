/**
 * CSV, which is simpler than a spreadsheet and still full of traps.
 *
 * There is no CSV standard that everyone follows, only RFC 4180 and a great deal
 * of practice. What follows handles the cases that actually occur in files
 * people have:
 *
 * - **A field can contain a comma**, if it is quoted. That is the whole reason
 *   quoting exists, and a splitter written with `line.split(',')` breaks on the
 *   first address in the file.
 * - **A field can contain a newline**, if it is quoted. So CSV **cannot be
 *   parsed line by line** — a naive reader silently splits one record into two,
 *   and the damage looks like data rather than an error.
 * - **A quote inside a quoted field is written twice.** `"He said ""hi"""`.
 * - **Line endings vary.** Windows writes CRLF; a lone CR still turns up in
 *   files from old Mac software.
 * - **A byte-order mark may sit at the front**, because Excel puts one there.
 *   Left in place it becomes part of the first column's name, so the header
 *   reads `﻿Name` and every lookup on `Name` misses.
 */

/** Excel needs this to read a UTF-8 CSV correctly. See `toCsv`. */
const BOM = '﻿';

/**
 * Splits CSV text into rows of fields.
 *
 * Character by character rather than line by line, because a quoted field may
 * contain the line breaks. Nothing is coerced: every field comes back as the
 * text that was in the file, and deciding what a field *means* is the caller's
 * job.
 */
export function parseCsv(text: string, delimiter = ','): string[][] {
  const source = text.startsWith(BOM) ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let index = 0;

  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  while (index < source.length) {
    const character = source[index];

    if (quoted) {
      if (character === '"') {
        // A doubled quote is one literal quote; a single one ends the field.
        if (source[index + 1] === '"') {
          field += '"';
          index += 2;
          continue;
        }
        quoted = false;
        index += 1;
        continue;
      }
      field += character;
      index += 1;
      continue;
    }

    if (character === '"' && field === '') {
      quoted = true;
      index += 1;
      continue;
    }
    if (character === delimiter) {
      endField();
      index += 1;
      continue;
    }
    if (character === '\r') {
      // CRLF and a lone CR both end the row.
      endRow();
      index += source[index + 1] === '\n' ? 2 : 1;
      continue;
    }
    if (character === '\n') {
      endRow();
      index += 1;
      continue;
    }
    field += character;
    index += 1;
  }

  // A file ending in a newline has no trailing empty record; one ending
  // mid-field does have a final row.
  if (field !== '' || row.length > 0) endRow();
  return rows;
}

/** Whether a field has to be quoted to survive a round trip. */
function needsQuoting(field: string, delimiter: string): boolean {
  return (
    field.includes(delimiter) ||
    field.includes('"') ||
    field.includes('\n') ||
    field.includes('\r') ||
    // Leading or trailing space is stripped by some readers unless quoted.
    field !== field.trim()
  );
}

export interface CsvOptions {
  delimiter?: string;
  /**
   * Whether to write a byte-order mark.
   *
   * **Excel needs it.** Without one, Excel reads a UTF-8 CSV as the local
   * codepage, so `café` opens as `cafÃ©` and Hindi or Chinese text becomes
   * unreadable. Every other program copes either way, which is why this
   * defaults to on: the cost is three invisible bytes and the benefit is that
   * the file opens correctly in the program most people will use.
   */
  byteOrderMark?: boolean;
  /** CRLF is what Excel writes and what RFC 4180 specifies. */
  lineEnding?: '\n' | '\r\n';
}

export function toCsv(
  rows: readonly (readonly string[])[],
  options: CsvOptions = {},
): string {
  const delimiter = options.delimiter ?? ',';
  const ending = options.lineEnding ?? '\r\n';
  const body = rows
    .map((row) =>
      row
        .map((field) =>
          needsQuoting(field, delimiter)
            ? `"${field.replace(/"/gu, '""')}"`
            : field,
        )
        .join(delimiter),
    )
    .join(ending);
  return (options.byteOrderMark ?? true) ? BOM + body : body;
}

/**
 * Guesses the delimiter, because a "CSV" exported in much of Europe is
 * semicolon-separated — the comma is the decimal point there, so Excel uses
 * something else.
 *
 * Decided by which candidate gives the most *consistent* column count across
 * the first several lines, not by which is most common: a file full of prose
 * containing commas would otherwise win on frequency alone.
 */
export function detectDelimiter(text: string): string {
  const sample = text.slice(0, 64 * 1024);
  let best = ',';
  let bestScore = -1;

  for (const candidate of [',', ';', '\t', '|']) {
    const rows = parseCsv(sample, candidate).slice(0, 20);
    if (rows.length < 2) continue;
    const widths = rows.map((row) => row.length);
    const first = widths[0];
    if (first < 2) continue;
    const consistent =
      widths.filter((width) => width === first).length / widths.length;
    // Consistency first, then more columns as the tie-break.
    const score = consistent * 100 + Math.min(first, 50);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}
