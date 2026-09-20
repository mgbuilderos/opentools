/**
 * Building the table when the PDF drew its own grid.
 *
 * `tables.ts` clusters whitespace to guess column boundaries. This takes the
 * boundaries as given — from `rulings.ts` — and only has to decide which cell
 * each piece of text belongs to. That is a much smaller question, and it is
 * why a ruled table comes out right where a guessed one comes out skewed.
 *
 * The result is deliberately the **same `ExtractedTableResult`** the whitespace
 * path returns, so the page, the money parser and the exporters cannot tell
 * which route produced the table. Only the facts panel says which ran, because
 * the user deserves to know whether the columns were read or inferred.
 *
 * ## Assignment is by left edge, not by centre
 *
 * A merged cell — "Brought forward" spanning three columns — has a centre in
 * the wrong column, and centre assignment silently files it there. Its left
 * edge is in the right one. Right-aligned money sits well inside its column
 * either way, so the left edge is the better rule for both.
 */

import type { PdfTextItem } from './pdf-text';
import type { RuledGrid } from './rulings';
import {
  detectRoleFromHeader,
  looksLikeNumeric,
  type ColumnDefinition,
  type ExtractedTableResult,
  type ExtractedTableRow,
} from './tables';

export interface LatticePageInput {
  items: readonly PdfTextItem[];
  grid: RuledGrid | null;
}

/**
 * How far outside a boundary a glyph may start and still belong to the cell
 * inside it. Borders are drawn on the boundary, and text is usually inset from
 * it, but a tight cell can have a descender or an italic lean cross the line.
 */
const EDGE_TOLERANCE = 1.5;

/** A column whose text is this much more consistent on one edge is aligned to it. */
const ALIGNMENT_MARGIN = 1.2;

function bandIndex(
  value: number,
  edges: readonly number[],
  descending: boolean,
): number {
  for (let i = 0; i < edges.length - 1; i += 1) {
    const near = edges[i]!;
    const far = edges[i + 1]!;
    if (descending) {
      if (value <= near + EDGE_TOLERANCE && value > far - EDGE_TOLERANCE) {
        return i;
      }
    } else if (value >= near - EDGE_TOLERANCE && value < far + EDGE_TOLERANCE) {
      return i;
    }
  }
  return -1;
}

function standardDeviation(values: readonly number[]): number {
  if (values.length < 2) return Number.POSITIVE_INFINITY;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Join the items that landed in one cell.
 *
 * A cell's text can be several glyph runs and, in a tall cell, several lines.
 * Lines are joined with a space rather than a newline: the row is one
 * spreadsheet row, and a newline inside a `.csv` field is a correctness
 * problem for anyone who opens it with a naive reader.
 */
function joinCell(items: readonly PdfTextItem[]): string {
  if (items.length === 0) return '';
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  let out = '';
  let previous: PdfTextItem | null = null;
  for (const item of sorted) {
    if (previous) {
      const sameLine = Math.abs(previous.y - item.y) <= item.fontSize * 0.55;
      const gap = item.x - (previous.x + previous.width);
      const needsSpace = !sameLine || gap > Math.max(0.5, item.fontSize * 0.22);
      if (needsSpace && out.length > 0 && !out.endsWith(' ')) out += ' ';
    }
    out += item.text;
    previous = item;
  }
  return out.replace(/\s+/gu, ' ').trim();
}

/** Cells of one page's grid, `cells[row][column]`. */
export function assignItemsToGrid(
  items: readonly PdfTextItem[],
  grid: RuledGrid,
): string[][] {
  const rowCount = grid.rowEdges.length - 1;
  const columnCount = grid.columnEdges.length - 1;
  const buckets: PdfTextItem[][][] = Array.from({ length: rowCount }, () =>
    Array.from({ length: columnCount }, (): PdfTextItem[] => []),
  );

  for (const item of items) {
    if (item.text.trim().length === 0) continue;
    const column = bandIndex(item.x, grid.columnEdges, false);
    if (column < 0) continue;
    // Baselines sit a little above the bottom rule of their row, so the
    // baseline itself is the right probe for which row band a line is in.
    const row = bandIndex(item.y, grid.rowEdges, true);
    if (row < 0) continue;
    buckets[row]![column]!.push(item);
  }

  return buckets.map((row) => row.map(joinCell));
}

/**
 * Decide each column's alignment from where its text actually lines up.
 *
 * `excludeRow` is not an optimisation — it is required for a correct answer.
 * A bank writes "Balance" flush left over figures that are flush right, so a
 * column measured with its header included looks inconsistent on both edges
 * and reads as left-aligned. Alignment is a property of the data.
 */
function alignmentsFor(
  items: readonly PdfTextItem[],
  grid: RuledGrid,
  excludeRow: number,
): ('left' | 'right')[] {
  const columnCount = grid.columnEdges.length - 1;
  const lefts: number[][] = Array.from({ length: columnCount }, () => []);
  const rights: number[][] = Array.from({ length: columnCount }, () => []);
  const numeric: number[] = Array.from({ length: columnCount }, () => 0);
  const counted: number[] = Array.from({ length: columnCount }, () => 0);

  for (const item of items) {
    if (item.text.trim().length === 0) continue;
    const column = bandIndex(item.x, grid.columnEdges, false);
    if (column < 0) continue;
    if (bandIndex(item.y, grid.rowEdges, true) === excludeRow) continue;
    lefts[column]!.push(item.x);
    rights[column]!.push(item.x + item.width);
    counted[column]! += 1;
    if (looksLikeNumeric(item.text)) numeric[column]! += 1;
  }

  return lefts.map((columnLefts, index) => {
    const leftSpread = standardDeviation(columnLefts);
    const rightSpread = standardDeviation(rights[index]!);
    if (rightSpread * ALIGNMENT_MARGIN < leftSpread) return 'right';
    if (leftSpread * ALIGNMENT_MARGIN < rightSpread) return 'left';
    // Neither edge is the more consistent one, which is the *usual* case for
    // money: every figure in the column has the same number of characters, so
    // it is flush on both sides. Measured on the ruled fixture, a balance
    // column had left 480 and right 515 on every row — two spreads of zero.
    // Content decides the tie, and a column of figures is right-aligned.
    const total = counted[index] ?? 0;
    return total > 0 && (numeric[index] ?? 0) * 2 >= total ? 'right' : 'left';
  });
}

/** Does this row of cells read as a header rather than as data? */
function looksLikeHeader(cells: readonly string[]): boolean {
  const filled = cells.filter((cell) => cell.trim().length > 0);
  if (filled.length < 2) return false;
  // A header names its columns; it does not contain the figures.
  const numeric = filled.filter((cell) => looksLikeNumeric(cell)).length;
  if (numeric > 0) return false;
  return filled.some((cell) => detectRoleFromHeader(cell) !== 'unknown');
}

/**
 * Build the table from per-page grids, or return `null` when the lattice route
 * does not apply and the whitespace engine should run instead.
 *
 * Returning `null` rather than a poor table is the important half. Lattice is
 * better *when there is a lattice*; forcing it onto a page with two stray rules
 * is worse than the whitespace guess, and the caller can only choose sensibly
 * if this one is honest about not applying.
 */
export function extractTableFromGrids(
  pages: readonly LatticePageInput[],
): ExtractedTableResult | null {
  const ruled = pages.filter((page) => page.grid !== null);
  if (ruled.length === 0) return null;

  // The first ruled page defines the columns. A statement keeps one column
  // layout throughout; a page whose column count disagrees is a different
  // table — a summary box, usually — and is left to the whitespace engine.
  const first = ruled[0]!;
  const reference = first.grid!;
  const columnCount = reference.columnEdges.length - 1;

  // Find the header band before measuring alignment, because the header is
  // exactly the row that would mislead the measurement.
  const referenceCells = assignItemsToGrid(first.items, reference);
  const referenceHeaderRow = referenceCells.findIndex((row) =>
    looksLikeHeader(row),
  );
  const alignments = alignmentsFor(first.items, reference, referenceHeaderRow);

  let headers: string[] = Array.from({ length: columnCount }, () => '');
  let headerRowIndex = -1;
  const rows: ExtractedTableRow[] = [];
  let sequence = 0;

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
    const page = pages[pageIndex]!;
    const pageNumber = pageIndex + 1;
    if (!page.grid) continue;
    if (page.grid.columnEdges.length - 1 !== columnCount) continue;

    const cells = assignItemsToGrid(page.items, page.grid);

    for (let index = 0; index < cells.length; index += 1) {
      const row = cells[index]!;
      if (row.every((cell) => cell.trim().length === 0)) continue;

      if (looksLikeHeader(row)) {
        // The first header becomes the column names; every later one is the
        // same header repeated at the top of a continuation page.
        if (headerRowIndex === -1) {
          headers = row.map((cell) => cell.trim());
          headerRowIndex = index;
        }
        continue;
      }

      sequence += 1;
      rows.push({
        id: `row-${sequence}`,
        cells: [...row],
        rawLines: 1,
        pageNumber,
        y: page.grid.rowEdges[index] ?? 0,
      });
    }
  }

  if (rows.length === 0) return null;

  const columns: ColumnDefinition[] = Array.from(
    { length: columnCount },
    (_, index) => {
      const header = headers[index] ?? '';
      const alignment = alignments[index] ?? 'left';
      return {
        id: `col-${index}`,
        index,
        header,
        left: reference.columnEdges[index] ?? 0,
        right: reference.columnEdges[index + 1] ?? 0,
        alignment,
        detectedRole: detectRoleFromHeader(header),
      };
    },
  );

  let totalCharacters = 0;
  for (const page of pages) {
    for (const item of page.items) totalCharacters += item.text.trim().length;
  }

  return {
    columns,
    headers: columns.map((column) => column.header),
    rows,
    pageCount: pages.length,
    totalCharacters,
    headerRowIndex,
  };
}
