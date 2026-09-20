import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { assignItemsToGrid, extractTableFromGrids } from './lattice';
import { readPdfGeometry } from './pdf-geometry';
import type { PdfTextItem } from './pdf-text';
import {
  buildGridFromRulings,
  segmentsToRulings,
  type RuledGrid,
} from './rulings';

async function ruledStatement(): Promise<
  { items: PdfTextItem[]; grid: RuledGrid | null }[]
> {
  const bytes = new Uint8Array(
    await readFile(
      fileURLToPath(
        new URL('./__fixtures__/statement-ruled.pdf', import.meta.url),
      ),
    ),
  );
  const pages = await readPdfGeometry(bytes);
  return pages.map((page) => ({
    items: page.items,
    grid: buildGridFromRulings(segmentsToRulings(page.segments)),
  }));
}

function item(text: string, x: number, y: number, width = 30): PdfTextItem {
  return { text, x, y, width, fontSize: 9, bold: false };
}

const GRID: RuledGrid = {
  columnEdges: [0, 100, 200, 300],
  rowEdges: [100, 80, 60, 40],
  left: 0,
  right: 300,
  top: 100,
  bottom: 40,
};

describe('assignItemsToGrid', () => {
  it('files each piece of text in the cell its left edge sits in', () => {
    const cells = assignItemsToGrid(
      [item('A', 10, 90), item('B', 110, 90), item('C', 210, 70)],
      GRID,
    );
    expect(cells).toEqual([
      ['A', 'B', ''],
      ['', '', 'C'],
      ['', '', ''],
    ]);
  });

  it('files a merged cell by its left edge, not its centre', () => {
    // "Brought forward" spans all three columns. Its centre is in column 1,
    // and centre assignment would quietly file it there.
    const cells = assignItemsToGrid(
      [item('Brought forward', 10, 90, 280)],
      GRID,
    );
    expect(cells[0]).toEqual(['Brought forward', '', '']);
  });

  it('keeps right-aligned money in its own column', () => {
    // Starts at 240, ends flush against the 300 boundary.
    const cells = assignItemsToGrid([item('1,234.56', 240, 90, 58)], GRID);
    expect(cells[0]).toEqual(['', '', '1,234.56']);
  });

  it('joins two lines inside one tall cell with a space, never a newline', () => {
    // A newline inside a cell becomes a broken field in the exported .csv.
    const cells = assignItemsToGrid(
      [item('DIRECT DEBIT', 110, 95), item('BRITISH GAS', 110, 85)],
      GRID,
    );
    expect(cells[0]![1]).toBe('DIRECT DEBIT BRITISH GAS');
  });

  it('ignores text outside the ruled area, which is what a footer is', () => {
    const cells = assignItemsToGrid([item('Page 1 of 2', 10, 20)], GRID);
    expect(cells.flat().every((cell) => cell === '')).toBe(true);
  });
});

describe('extractTableFromGrids', () => {
  it('declines when no page is ruled, so the whitespace engine runs', () => {
    expect(
      extractTableFromGrids([
        { items: [item('anything', 10, 90)], grid: null },
      ]),
    ).toBeNull();
  });

  it('declines when the ruled pages hold no data rows', () => {
    expect(extractTableFromGrids([{ items: [], grid: GRID }])).toBeNull();
  });

  it('reads the real ruled statement into the rows it actually contains', async () => {
    const table = extractTableFromGrids(await ruledStatement());
    expect(table).not.toBeNull();
    expect(table!.headers).toEqual([
      'Date',
      'Description',
      'Debit',
      'Credit',
      'Balance',
    ]);
    // Eight transactions over two pages, and the header counted once.
    expect(table!.rows).toHaveLength(8);
    expect(table!.rows[0]!.cells).toEqual([
      '01/04/2026',
      'Opening balance',
      '',
      '',
      '2,450.00',
    ]);
    expect(table!.rows[2]!.cells).toEqual([
      '05/04/2026',
      'NORTHERN RENT DD',
      '1,100.00',
      '',
      '4,550.00',
    ]);
    expect(table!.rows[7]!.cells).toEqual([
      '30/04/2026',
      'Closing balance',
      '',
      '',
      '4,356.84',
    ]);
  });

  it('drops the repeated header and the footer on the second page', async () => {
    const table = extractTableFromGrids(await ruledStatement());
    const everyCell = table!.rows.flatMap((row) => row.cells);
    expect(everyCell).not.toContain('Date');
    expect(everyCell.some((cell) => cell.includes('Sort code'))).toBe(false);
  });

  it('records which page each row came from', async () => {
    const table = extractTableFromGrids(await ruledStatement());
    expect(table!.rows.map((row) => row.pageNumber)).toEqual([
      1, 1, 1, 1, 2, 2, 2, 2,
    ]);
  });

  it('reads the money columns as right-aligned and names their roles', async () => {
    const table = extractTableFromGrids(await ruledStatement());
    expect(table!.columns.map((column) => column.detectedRole)).toEqual([
      'date',
      'description',
      'debit',
      'credit',
      'balance',
    ]);
    expect(table!.columns[4]!.alignment).toBe('right');
    expect(table!.columns[1]!.alignment).toBe('left');
  });
});
