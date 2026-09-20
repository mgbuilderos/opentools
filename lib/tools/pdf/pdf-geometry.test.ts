import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { closedRectangle, readPdfGeometry } from './pdf-geometry';
import { buildGridFromRulings, segmentsToRulings } from './rulings';

const FIXTURE = fileURLToPath(
  new URL('./__fixtures__/statement-ruled.pdf', import.meta.url),
);

/**
 * The expected geometry is not what this code produced — it is what **PyMuPDF**
 * reported for the same file, converted from its top-left origin into PDF user
 * space (`y_pdf = 300 - y_mupdf`). Checking our reader against a different
 * implementation is the only way these numbers mean anything.
 *
 *     horizontal rules at y = [50, 74, 98, 122, 146, 170]   (PyMuPDF)
 *     vertical rules at x   = [40, 110, 300, 370, 440, 520] (PyMuPDF)
 */
const EXPECTED_COLUMN_EDGES = [40, 110, 300, 370, 440, 520];
const EXPECTED_ROW_EDGES = [250, 226, 202, 178, 154, 130];

async function fixture(): Promise<Uint8Array> {
  return new Uint8Array(await readFile(FIXTURE));
}

describe('closedRectangle', () => {
  it('reads the 13-number form pdf.js actually emits for a filled border', () => {
    // moveTo(0,0) lineTo(0,0.8) lineTo(340,0.8) lineTo(340,0) closePath
    const data = [0, 0, 0, 1, 0, 0.8, 1, 340, 0.8, 1, 340, 0, 4];
    expect(closedRectangle(data)).toEqual({
      x: 0,
      y: 0,
      width: 340,
      height: 0.8,
    });
  });

  it('reads the form that returns to the start instead of closing', () => {
    const data = [0, 0, 0, 1, 0, 5, 1, 20, 5, 1, 20, 0, 1, 0, 0];
    expect(closedRectangle(data)).toEqual({ x: 0, y: 0, width: 20, height: 5 });
  });

  it('refuses a triangle', () => {
    const data = [0, 0, 0, 1, 10, 0, 1, 5, 10, 4];
    expect(closedRectangle(data)).toBeNull();
  });

  it('refuses a path containing a curve', () => {
    const data = [0, 0, 0, 2, 0, 5, 5, 5, 10, 0, 4];
    expect(closedRectangle(data)).toBeNull();
  });

  it('refuses a degenerate rectangle with no height', () => {
    const data = [0, 0, 0, 1, 0, 0, 1, 20, 0, 1, 20, 0, 4];
    expect(closedRectangle(data)).toBeNull();
  });
});

describe('readPdfGeometry against a real ruled statement', () => {
  it('reads both pages, their text and their drawn rules', async () => {
    const pages = await readPdfGeometry(await fixture());
    expect(pages).toHaveLength(2);
    for (const page of pages) {
      expect(page.viewBox).toEqual([0, 0, 560, 300]);
      expect(page.items.length).toBeGreaterThan(10);
      expect(page.segments.length).toBeGreaterThan(0);
    }
  });

  it('recovers the exact grid PyMuPDF reports for the same file', async () => {
    const pages = await readPdfGeometry(await fixture());
    const grid = buildGridFromRulings(segmentsToRulings(pages[0]!.segments));

    expect(grid).not.toBeNull();
    expect(grid!.columnEdges).toHaveLength(EXPECTED_COLUMN_EDGES.length);
    grid!.columnEdges.forEach((edge, index) => {
      expect(edge).toBeCloseTo(EXPECTED_COLUMN_EDGES[index]!, 0);
    });
    expect(grid!.rowEdges).toHaveLength(EXPECTED_ROW_EDGES.length);
    grid!.rowEdges.forEach((edge, index) => {
      expect(edge).toBeCloseTo(EXPECTED_ROW_EDGES[index]!, 0);
    });
  });

  it('reads verticals drawn as filled rectangles, not only strokes', async () => {
    // The fixture deliberately draws its horizontals as strokes and its
    // verticals as thin filled rectangles, so this covers both routes into
    // the reader at once.
    const pages = await readPdfGeometry(await fixture());
    const rulings = segmentsToRulings(pages[0]!.segments);
    expect(rulings.vertical).toHaveLength(6);
    expect(rulings.horizontal).toHaveLength(6);
  });

  it('reads a heavy filled border as one rule, not as its two edges', async () => {
    // This is the case `closedRectangle` exists for, and the reason it is not
    // dead code. A 3pt filled border decomposed as a path yields rules at
    // BOTH its edges — 171.5 arrives as 170 and 173 — and a 3pt-tall phantom
    // row between them. As a rectangle it is one rule at the centre.
    //
    // Ground truth from PyMuPDF for this fixture, converted to PDF space:
    //   horizontal rule centres y = [171.5, 141.5, 111.5, 81.5]
    //   vertical rule centres   x = [31.5, 161.5, 281.5, 371.5]
    const bytes = new Uint8Array(
      await readFile(
        fileURLToPath(
          new URL('./__fixtures__/table-thick-borders.pdf', import.meta.url),
        ),
      ),
    );
    const pages = await readPdfGeometry(bytes);
    const rulings = segmentsToRulings(pages[0]!.segments);

    expect(rulings.horizontal.map((rule) => rule.position)).toEqual([
      81.5, 111.5, 141.5, 171.5,
    ]);
    expect(rulings.vertical.map((rule) => rule.position)).toEqual([
      31.5, 161.5, 281.5, 371.5,
    ]);

    const grid = buildGridFromRulings(rulings);
    expect(grid?.columnEdges).toEqual([31.5, 161.5, 281.5, 371.5]);
    expect(grid?.rowEdges).toEqual([171.5, 141.5, 111.5, 81.5]);
  });

  it('reports the progress callback once per page', async () => {
    const seen: number[] = [];
    await readPdfGeometry(await fixture(), (page) => seen.push(page));
    expect(seen).toEqual([1, 2]);
  });
});
