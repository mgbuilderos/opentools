import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { cellToText, readXlsx } from './xlsx-reader';

/**
 * The fixture is written by **openpyxl**, not by this code, and every
 * expectation below is what openpyxl reads back out of it. A test that builds
 * its own spreadsheet with the same assumptions as the reader will agree with a
 * reader that is wrong.
 *
 * Regenerate with the script in `docs/SPREADSHEET.md`. openpyxl's own reading:
 *
 *   ('Region', 'Units', 'Price', 'Signed', 'Notes', 'Active')
 *   ('North', 120, 19.99, datetime(2023, 3, 15), 'first quarter', True)
 *   ('South', 8, 4.5, datetime(1970, 1, 1), None, False)
 *   ('East', 0, -12.25, datetime(2024, 6, 1, 14, 30), 'has a, comma', True)
 *   ('West', 1000000, 0.001, datetime(1900, 1, 1), 'quote " inside', None)
 *   (None, ...)                                  <- row 6 is empty
 *   ('=A2', 42, 'unicode: हिंदी ✓', None, None, None)
 */
const fixtures = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
);
const load = (name: string) =>
  new Uint8Array(readFileSync(path.join(fixtures, name)));

const open = () => readXlsx(load('sales.xlsx'));

describe('reading a spreadsheet openpyxl wrote', () => {
  it('finds the sheets, in the order the workbook lists them', async () => {
    const book = await open();
    expect(book.sheets.map((sheet) => sheet.name)).toEqual([
      'Sales',
      'Empty Sheet',
      'Gaps',
    ]);
    expect(book.date1904).toBe(false);
  });

  it('reads inline strings, which is what openpyxl writes', async () => {
    // Note which path this covers. openpyxl stores every string *inside* the
    // cell (`t="inlineStr"`), and never writes a shared string table. Real
    // Excel does the opposite, so the shared-string path is covered by
    // `shared-strings.xlsx` below rather than here. Testing only this fixture
    // would leave the more important path untested.
    const [sales] = (await open()).sheets;
    expect(cellToText(sales.rows[0][0])).toBe('Region');
    expect(cellToText(sales.rows[1][0])).toBe('North');
    expect(cellToText(sales.rows[4][0])).toBe('West');
  });

  it('keeps numbers as numbers, negatives and tiny ones included', async () => {
    const [sales] = (await open()).sheets;
    expect(sales.rows[1][1]).toEqual({ kind: 'number', value: 120 });
    expect(sales.rows[1][2]).toEqual({ kind: 'number', value: 19.99 });
    expect(sales.rows[3][2]).toEqual({ kind: 'number', value: -12.25 });
    expect(sales.rows[4][1]).toEqual({ kind: 'number', value: 1_000_000 });
    expect(sales.rows[4][2]).toEqual({ kind: 'number', value: 0.001 });
    // Zero is a value, not an absence.
    expect(sales.rows[3][1]).toEqual({ kind: 'number', value: 0 });
  });

  it('recognises dates, which are only numbers with a format attached', async () => {
    // Nothing in a date cell says it is a date. The cell points at a style, the
    // style points at a number format, and the format decides. Miss that and
    // every date in the sheet is a five-digit number.
    const [sales] = (await open()).sheets;
    expect(cellToText(sales.rows[1][3])).toBe('2023-03-15');
    expect(cellToText(sales.rows[2][3])).toBe('1970-01-01');
    expect(cellToText(sales.rows[4][3])).toBe('1900-01-01');
  });

  it('keeps the time of day when a cell carries one', async () => {
    const [sales] = (await open()).sheets;
    const cell = sales.rows[3][3];
    expect(cell.kind).toBe('date');
    expect(cellToText(cell)).toBe('2024-06-01T14:30:00Z');
    // And does not invent a midnight for a date that had no time.
    expect(cellToText(sales.rows[1][3])).not.toContain('T');
  });

  it('reads booleans as booleans, false included', async () => {
    const [sales] = (await open()).sheets;
    expect(sales.rows[1][5]).toEqual({ kind: 'boolean', value: true });
    // `false` must survive: treated as falsy it disappears into an empty cell.
    expect(sales.rows[2][5]).toEqual({ kind: 'boolean', value: false });
    expect(cellToText(sales.rows[2][5])).toBe('FALSE');
  });

  it('keeps text that would break a CSV, and text outside ASCII', async () => {
    const [sales] = (await open()).sheets;
    expect(cellToText(sales.rows[3][4])).toBe('has a, comma');
    expect(cellToText(sales.rows[4][4])).toBe('quote " inside');
    expect(cellToText(sales.rows[6][2])).toBe('unicode: हिंदी ✓');
  });

  it('keeps an empty row in place rather than closing the gap', async () => {
    // Row 6 of the fixture is empty and row 7 has content. Dropping the empty
    // row shifts every row after it, which silently misaligns the whole sheet.
    const [sales] = (await open()).sheets;
    expect(sales.rows).toHaveLength(7);
    expect(sales.rows[5].every((cell) => cell.kind === 'empty')).toBe(true);
    expect(cellToText(sales.rows[6][1])).toBe('42');
  });

  it('puts sparse cells at their real addresses', async () => {
    // The "Gaps" sheet has A1, D2 and B5 only. Packing them to the left would
    // put "sparse" in column A and silently move somebody's data sideways.
    const gaps = (await open()).sheets[2];
    expect(cellToText(gaps.rows[0][0])).toBe('a');
    expect(cellToText(gaps.rows[1][3])).toBe('sparse');
    expect(cellToText(gaps.rows[4][1])).toBe('5');
    expect(cellToText(gaps.rows[1][0])).toBe('');
    expect(gaps.columnCount).toBe(4);
    expect(gaps.rows).toHaveLength(5);
  });

  it('makes every row the same width, so a table cannot be ragged', async () => {
    for (const sheet of (await open()).sheets) {
      for (const row of sheet.rows) {
        expect(row).toHaveLength(sheet.columnCount);
      }
    }
  });

  it('says a formula was not calculated instead of showing nothing', async () => {
    const book = await open();
    const formulaCell = book.sheets[0].rows[6][0];
    // openpyxl writes the formula with no cached result, so there is nothing to
    // show. The note is what stops that looking like data loss.
    expect(formulaCell.kind).toBe('empty');
    expect(book.notes.some((note) => note.includes('formulas'))).toBe(true);
  });
});

describe('what it refuses, and how clearly', () => {
  it('names the old .xls format rather than calling it corrupt', async () => {
    // An .xls is an OLE compound document: a completely different format that
    // happens to hold spreadsheets. Its signature is unmistakable.
    const ole = new Uint8Array([
      0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0,
    ]);
    await expect(readXlsx(ole)).rejects.toThrow(/old \.xls file/u);
  });

  it('says a ZIP is not a spreadsheet when it holds no workbook', async () => {
    const plain = new Uint8Array(
      readFileSync(
        path.join(
          fixtures,
          '..',
          '..',
          'archive',
          '__fixtures__',
          'simple.zip',
        ),
      ),
    );
    await expect(readXlsx(plain)).rejects.toThrow(
      /does not contain a spreadsheet/u,
    );
  });

  it('refuses something that is not an archive at all', async () => {
    await expect(
      readXlsx(new TextEncoder().encode('just some text')),
    ).rejects.toThrow();
  });
});
describe('a file shaped the way Excel really writes them', () => {
  /**
   * Built by hand from the OOXML spec and confirmed readable by openpyxl.
   *
   * Every real-world spreadsheet checked on this machine stores text in a
   * **shared string table** and refers to it by index, and none of them used the
   * inline strings openpyxl writes. So the fixture above exercises the rarer
   * path, and this one exercises the path that actually matters.
   *
   * openpyxl reads it as:
   *   ('Customer', 'Total')
   *   ('Bold and plain', datetime(2023, 3, 15))
   *   ('café & co <tag>', datetime(1970, 1, 1))
   *   ('=CONCAT(A1,"!")', 1234.5)
   */
  const openShared = () => readXlsx(load('shared-strings.xlsx'));

  it('follows string indexes into the shared table', async () => {
    // The single most common way to get this format wrong: read the index as
    // the value and every text cell becomes a small integer.
    const first = (await openShared()).sheets[0];
    expect(cellToText(first.rows[0][0])).toBe('Customer');
    expect(cellToText(first.rows[0][1])).toBe('Total');
  });

  it('joins a string split across styled runs', async () => {
    // "Bold and plain" is stored as two <t> elements because half of it is
    // bold. Taking the first would silently truncate the cell to "Bold".
    const first = (await openShared()).sheets[0];
    expect(cellToText(first.rows[1][0])).toBe('Bold and plain');
  });

  it('decodes XML entities rather than showing them raw', async () => {
    const first = (await openShared()).sheets[0];
    expect(cellToText(first.rows[2][0])).toBe('café & co <tag>');
  });

  it('takes sheet order from the workbook, not from the file names', async () => {
    // "First" is listed first and lives in sheet2.xml. Assuming sheet1.xml is
    // the first sheet hands back the wrong sheet under the right name — which
    // is worse than an error, because it looks like it worked.
    const book = await openShared();
    expect(book.sheets.map((sheet) => sheet.name)).toEqual(['First', 'Second']);
    expect(book.sheets[0].rows).toHaveLength(4);
    expect(book.sheets[1].rows).toHaveLength(1);
  });

  it('recognises both a built-in and a custom date format', async () => {
    const first = (await openShared()).sheets[0];
    expect(cellToText(first.rows[1][1])).toBe('2023-03-15');
    expect(cellToText(first.rows[2][1])).toBe('1970-01-01');
  });

  it('does not turn an accounting figure into a date', async () => {
    // Format 44 is accounting. Reading it as a date would turn 1234.5 into a
    // day in 1903 — the most destructive thing this reader could do quietly,
    // and it would look plausible on screen.
    const first = (await openShared()).sheets[0];
    expect(first.rows[3][1]).toEqual({ kind: 'number', value: 1234.5 });
  });

  it('keeps the cached result of a formula that produced text', async () => {
    const first = (await openShared()).sheets[0];
    expect(cellToText(first.rows[3][0])).toBe('Customer!');
  });
});
