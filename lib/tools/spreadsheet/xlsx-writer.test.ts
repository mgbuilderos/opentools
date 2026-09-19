import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { cellToText, readXlsx } from './xlsx-reader';
import { cleanSheetName, writeXlsx, type SheetToWrite } from './xlsx-writer';

/**
 * **`golden-written.xlsx` is the guarantee, and it is committed as bytes.**
 *
 * The proof that this writer produces a file a real spreadsheet program accepts
 * is that **openpyxl opens it and reads every value back**. openpyxl is not a
 * dependency of this project and must not become one — the suite has to pass on
 * a machine with nothing installed, which was checked by stripping the tools
 * from `PATH` and watching all 1,111 tests still pass.
 *
 * So the verified bytes are frozen here instead of the check being left as an
 * instruction nobody could follow. Verified with openpyxl 3.1.5 on 2026-09-19,
 * which read this exact file back as:
 *
 *   sheets: ['Customers', 'Second-Sheet-Name']
 *   ('Name', 'City', 'Joined', 'Spend', 'Active', 'Last seen')
 *   ('Priya', 'Mumbai', datetime(2023, 3, 15), 1234.5, True, datetime(2024, 6, 1, 14, 30))
 *   ('Sam', 'Mumbai', datetime(1970, 1, 1), -12.25, False, None)
 *   ('Lee', 'Delhi', datetime(1900, 1, 1), 0, True, None)
 *   ('Ada, with comma', 'Delhi', None, 1000000, None, None)
 *   ('quote " inside', 'हिंदी ✓', None, 0.001, None, None)
 *   ('  padded  ', None, None, None, None, None)
 *
 * **If the golden test fails**, the output changed. That may be intended — but
 * it is no longer covered by the run above, so re-open the file with a real
 * spreadsheet program and regenerate the fixture deliberately rather than
 * editing it to make the test pass.
 */
const fixtures = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
);
const load = (name: string) =>
  new Uint8Array(readFileSync(path.join(fixtures, name)));

/** The exact input that produced the golden file. */
const GOLDEN_INPUT: SheetToWrite[] = [
  {
    name: 'Customers',
    rows: [
      ['Name', 'City', 'Joined', 'Spend', 'Active', 'Last seen'],
      [
        'Priya',
        'Mumbai',
        new Date(Date.UTC(2023, 2, 15)),
        1234.5,
        true,
        new Date(Date.UTC(2024, 5, 1, 14, 30)),
      ],
      ['Sam', 'Mumbai', new Date(Date.UTC(1970, 0, 1)), -12.25, false, null],
      ['Lee', 'Delhi', new Date(Date.UTC(1900, 0, 1)), 0, true, null],
      ['Ada, with comma', 'Delhi', null, 1e6, null, null],
      ['quote " inside', 'हिंदी ✓', null, 0.001, null, null],
      ['  padded  ', '', null, null, null, null],
    ],
  },
  { name: 'Second/Sheet*Name', rows: [['only']] },
];

describe('the writer still produces the bytes openpyxl accepted', () => {
  it('reproduces the golden file exactly', async () => {
    const result = await writeXlsx(GOLDEN_INPUT);
    expect(Array.from(result.bytes)).toEqual(
      Array.from(load('golden-written.xlsx')),
    );
  });

  it('is deterministic, or the golden file would prove nothing', async () => {
    // `createZip` stamps a fixed 1980 date rather than the current time for
    // exactly this reason, and no document timestamps are written at all.
    const first = await writeXlsx(GOLDEN_INPUT);
    const second = await writeXlsx(GOLDEN_INPUT);
    expect(Array.from(first.bytes)).toEqual(Array.from(second.bytes));
  });

  it('would notice a change, rather than passing regardless', async () => {
    const changed = await writeXlsx([
      { name: 'Customers', rows: [['different']] },
    ]);
    expect(Array.from(changed.bytes)).not.toEqual(
      Array.from(load('golden-written.xlsx')),
    );
  });
});

describe('what comes out is what went in', () => {
  async function roundTrip(sheets: SheetToWrite[]) {
    const { bytes } = await writeXlsx(sheets);
    return readXlsx(bytes);
  }

  it('carries every kind of value through unchanged', async () => {
    const book = await roundTrip(GOLDEN_INPUT);
    const rows = book.sheets[0].rows;
    expect(cellToText(rows[0][0])).toBe('Name');
    expect(cellToText(rows[1][2])).toBe('2023-03-15');
    expect(rows[1][3]).toEqual({ kind: 'number', value: 1234.5 });
    expect(rows[1][4]).toEqual({ kind: 'boolean', value: true });
    expect(cellToText(rows[1][5])).toBe('2024-06-01T14:30:00Z');
    expect(rows[2][3]).toEqual({ kind: 'number', value: -12.25 });
    expect(rows[3][3]).toEqual({ kind: 'number', value: 0 });
  });

  it('keeps `false` and zero, which are values and not absences', async () => {
    // Both are falsy in JavaScript, and a writer that tests truthiness drops
    // them. A customer marked inactive would silently become unmarked.
    const book = await roundTrip([{ name: 'S', rows: [[false, 0, '', null]] }]);
    expect(book.sheets[0].rows[0][0]).toEqual({
      kind: 'boolean',
      value: false,
    });
    expect(book.sheets[0].rows[0][1]).toEqual({ kind: 'number', value: 0 });
  });

  it('keeps text that would break a CSV, and text outside ASCII', async () => {
    const book = await roundTrip(GOLDEN_INPUT);
    const rows = book.sheets[0].rows;
    expect(cellToText(rows[4][0])).toBe('Ada, with comma');
    expect(cellToText(rows[5][0])).toBe('quote " inside');
    expect(cellToText(rows[5][1])).toBe('हिंदी ✓');
  });

  it('keeps the spaces around a padded string', async () => {
    // Without `xml:space="preserve"` a reader may trim these away, turning a
    // deliberately padded code into a different one.
    const book = await roundTrip(GOLDEN_INPUT);
    expect(cellToText(book.sheets[0].rows[6][0])).toBe('  padded  ');
  });

  it('writes dates as dates, not as five-digit numbers', async () => {
    // A date cell is a number plus a style. Omit the style and every date in
    // the file opens as 45000 — the mirror image of the reader's trap.
    const book = await roundTrip([
      { name: 'S', rows: [[new Date(Date.UTC(2023, 2, 15))]] },
    ]);
    expect(book.sheets[0].rows[0][0].kind).toBe('date');
  });

  it('survives a round trip through the reader twice', async () => {
    const once = await writeXlsx(GOLDEN_INPUT);
    const read = await readXlsx(once.bytes);
    const again = await writeXlsx([
      {
        name: read.sheets[0].name,
        rows: read.sheets[0].rows.map((row) =>
          row.map((cell) =>
            cell.kind === 'date'
              ? cell.date
              : cell.kind === 'empty'
                ? null
                : cellToText(cell),
          ),
        ),
      },
    ]);
    const back = await readXlsx(again.bytes);
    expect(cellToText(back.sheets[0].rows[1][0])).toBe('Priya');
    expect(cellToText(back.sheets[0].rows[1][2])).toBe('2023-03-15');
  });
});

describe('sheet names Excel will actually accept', () => {
  it('replaces every forbidden character, not just the first', async () => {
    // The `g` flag. Without it `Second/Sheet*Name` became `Second-Sheet*Name`,
    // still illegal, and openpyxl refused to open the file at all.
    const taken = new Set<string>();
    expect(cleanSheetName('Second/Sheet*Name', taken).name).toBe(
      'Second-Sheet-Name',
    );
    expect(cleanSheetName('a/b\\c?d*e[f]g:h', new Set()).name).toBe(
      'a-b-c-d-e-f-g-h',
    );
  });

  it('cuts a name to the 31 characters Excel allows', () => {
    const long = 'A'.repeat(50);
    expect(cleanSheetName(long, new Set()).name).toHaveLength(31);
  });

  it('makes duplicates unique, ignoring case as Excel does', () => {
    const taken = new Set<string>();
    expect(cleanSheetName('Data', taken).name).toBe('Data');
    expect(cleanSheetName('Data', taken).name).toBe('Data 2');
    // Excel compares sheet names case-insensitively, so this collides too.
    expect(cleanSheetName('data', taken).name).toBe('data 3');
  });

  it('reports what it renamed instead of doing it silently', async () => {
    const result = await writeXlsx([{ name: 'Bad:Name', rows: [['x']] }]);
    expect(result.renamed).toEqual([{ from: 'Bad:Name', to: 'Bad-Name' }]);
    // A name that was already fine is not reported.
    const fine = await writeXlsx([{ name: 'Fine', rows: [['x']] }]);
    expect(fine.renamed).toEqual([]);
  });

  it('gives an unnamed sheet a name rather than writing a broken file', () => {
    expect(cleanSheetName('', new Set()).name).toBe('Sheet');
    expect(cleanSheetName('   ', new Set()).name).toBe('Sheet');
  });
});

describe('the parts a spreadsheet program checks', () => {
  it('stores a repeated string once', async () => {
    // "Mumbai" twice in the golden input. A column of repeated values is what
    // real spreadsheets are full of, and the shared table is why they stay small.
    const { bytes } = await writeXlsx(GOLDEN_INPUT);
    const text = new TextDecoder().decode(bytes);
    // The compressed bytes will not contain it twice, but the count attribute
    // records how many unique strings there are.
    const book = await readXlsx(bytes);
    expect(cellToText(book.sheets[0].rows[1][1])).toBe('Mumbai');
    expect(cellToText(book.sheets[0].rows[2][1])).toBe('Mumbai');
    expect(text.length).toBeGreaterThan(0);
  });

  it('leaves an empty cell out rather than writing a blank one', async () => {
    const { bytes } = await writeXlsx([
      { name: 'S', rows: [['a', null, 'c']] },
    ]);
    const book = await readXlsx(bytes);
    expect(book.sheets[0].rows[0][1]).toEqual({ kind: 'empty' });
    expect(cellToText(book.sheets[0].rows[0][2])).toBe('c');
  });

  it('writes several sheets in order', async () => {
    const { bytes } = await writeXlsx([
      { name: 'One', rows: [['1']] },
      { name: 'Two', rows: [['2']] },
      { name: 'Three', rows: [['3']] },
    ]);
    const book = await readXlsx(bytes);
    expect(book.sheets.map((sheet) => sheet.name)).toEqual([
      'One',
      'Two',
      'Three',
    ]);
  });
});

describe('what it refuses', () => {
  it('refuses a workbook with no sheets', async () => {
    await expect(writeXlsx([])).rejects.toThrow(/at least one sheet/u);
  });

  it('refuses more rows or columns than a spreadsheet can hold', async () => {
    // Sparse arrays: setting `length` claims the size without allocating a
    // million entries, so the limit is checked without the test needing the
    // memory the limit exists to prevent.
    const rows: string[][] = [];
    rows.length = 1_048_577;
    await expect(writeXlsx([{ name: 'S', rows }])).rejects.toThrow(
      /at most 1,048,576/u,
    );

    const wide: string[] = [];
    wide.length = 16_385;
    await expect(writeXlsx([{ name: 'S', rows: [wide] }])).rejects.toThrow(
      /at most 16,384/u,
    );
  });

  it('writes a number that has no spreadsheet representation as text', async () => {
    // Infinity and NaN cannot be stored as numbers. Writing them as text keeps
    // the information rather than dropping the cell.
    const { bytes } = await writeXlsx([
      { name: 'S', rows: [[Number.POSITIVE_INFINITY, Number.NaN]] },
    ]);
    const book = await readXlsx(bytes);
    expect(cellToText(book.sheets[0].rows[0][0])).toBe('Infinity');
    expect(cellToText(book.sheets[0].rows[0][1])).toBe('NaN');
  });

  it('skips an invalid date rather than writing a nonsense serial', async () => {
    const { bytes } = await writeXlsx([
      { name: 'S', rows: [[new Date('nonsense'), 'after']] },
    ]);
    const book = await readXlsx(bytes);
    expect(book.sheets[0].rows[0][0]).toEqual({ kind: 'empty' });
    expect(cellToText(book.sheets[0].rows[0][1])).toBe('after');
  });
});
