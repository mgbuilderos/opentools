import { describe, expect, it } from 'vitest';

import {
  applyMatrix,
  buildGridFromRulings,
  IDENTITY_MATRIX,
  multiplyMatrix,
  pathDataToSegments,
  rectangleToSegment,
  scaleThickness,
  segmentsToRulings,
  type Matrix,
  type RuleSegment,
} from './rulings';

/** `moveTo(x1,y1) lineTo(x2,y2)` in pdf.js's `DrawOPS` encoding. */
function line(x1: number, y1: number, x2: number, y2: number): number[] {
  return [0, x1, y1, 1, x2, y2];
}

function horizontal(y: number, from: number, to: number): RuleSegment {
  return { x1: from, y1: y, x2: to, y2: y, thickness: 0.75 };
}

function vertical(x: number, from: number, to: number): RuleSegment {
  return { x1: x, y1: from, x2: x, y2: to, thickness: 0.75 };
}

/** The four sides plus `inner` vertical cuts and `rows` horizontal cuts. */
function ruledTable(inner: number[], rows: number[]): RuleSegment[] {
  const left = 30;
  const right = 370;
  const top = 200;
  const bottom = 140;
  return [
    horizontal(top, left, right),
    horizontal(bottom, left, right),
    ...rows.map((y) => horizontal(y, left, right)),
    vertical(left, bottom, top),
    vertical(right, bottom, top),
    ...inner.map((x) => vertical(x, bottom, top)),
  ];
}

describe('matrix helpers', () => {
  it('composes matrices the way pdf.js composes them', () => {
    // Scale by 2, then translate by (10, 5). pdf.js applies m2 first.
    const scale: Matrix = [2, 0, 0, 2, 0, 0];
    const translate: Matrix = [1, 0, 0, 1, 10, 5];
    const combined = multiplyMatrix(translate, scale);
    const point = applyMatrix(3, 4, combined);
    expect(point).toEqual({ x: 16, y: 13 });
  });

  it('carries a point through a translation matrix', () => {
    expect(applyMatrix(5, 7, [1, 0, 0, 1, 30, 100])).toEqual({ x: 35, y: 107 });
  });

  it('scales a stroke width by the matrix it is drawn under', () => {
    expect(scaleThickness(1, [3, 0, 0, 3, 0, 0])).toBe(3);
    expect(scaleThickness(2, IDENTITY_MATRIX)).toBe(2);
  });
});

describe('pathDataToSegments', () => {
  it('reads a stroked line into one segment in page coordinates', () => {
    const segments = pathDataToSegments(line(30, 200, 370, 200), IDENTITY_MATRIX, 0.75);
    expect(segments).toEqual([
      { x1: 30, y1: 200, x2: 370, y2: 200, thickness: 0.75 },
    ]);
  });

  it('applies the current transformation matrix to every point', () => {
    const segments = pathDataToSegments(
      line(0, 0, 100, 0),
      [1, 0, 0, 1, 30, 100],
      1,
    );
    expect(segments[0]).toMatchObject({ x1: 30, y1: 100, x2: 130, y2: 100 });
  });

  it('closes a path back to where it started', () => {
    // moveTo(0,0) lineTo(10,0) lineTo(10,10) closePath
    const data = [0, 0, 0, 1, 10, 0, 1, 10, 10, 4];
    const segments = pathDataToSegments(data, IDENTITY_MATRIX, 1);
    expect(segments).toHaveLength(3);
    expect(segments[2]).toMatchObject({ x1: 10, y1: 10, x2: 0, y2: 0 });
  });

  it('flattens a curve instead of dropping the rest of the path', () => {
    // moveTo, curveTo, then a straight line that must still be read.
    const data = [0, 0, 0, 2, 0, 10, 10, 10, 10, 0, 1, 50, 0];
    const segments = pathDataToSegments(data, IDENTITY_MATRIX, 1);
    const last = segments[segments.length - 1];
    expect(last).toMatchObject({ x1: 10, y1: 0, x2: 50, y2: 0 });
  });

  it('stops at an opcode it does not know rather than misreading the rest', () => {
    // A valid line, then opcode 9 — arity unknown, so nothing after it is safe.
    const data = [...line(0, 0, 10, 0), 9, 1, 2, 3];
    expect(pathDataToSegments(data, IDENTITY_MATRIX, 1)).toHaveLength(1);
  });
});

describe('rectangleToSegment', () => {
  it('reads a thin filled rectangle as the horizontal border it is', () => {
    // The form a word processor emits, and the form a stroke-only reader misses.
    const segment = rectangleToSegment(30, 100, 340, 0.8, IDENTITY_MATRIX);
    expect(segment).toMatchObject({ x1: 30, x2: 370 });
    expect(segment?.y1).toBeCloseTo(100.4, 5);
    expect(segment?.y1).toBe(segment?.y2);
  });

  it('reads a thin tall rectangle as a vertical border', () => {
    const segment = rectangleToSegment(50, 100, 0.7, 60, IDENTITY_MATRIX);
    expect(segment?.x1).toBeCloseTo(50.35, 5);
    expect(segment).toMatchObject({ y1: 100, y2: 160 });
  });

  it('refuses a shaded block, which is a fill and not a border', () => {
    expect(rectangleToSegment(30, 100, 340, 20, IDENTITY_MATRIX)).toBeNull();
  });

  it('refuses a rectangle too short to be a border', () => {
    expect(rectangleToSegment(30, 100, 3, 0.8, IDENTITY_MATRIX)).toBeNull();
  });
});

describe('segmentsToRulings', () => {
  it('separates horizontal from vertical', () => {
    const rulings = segmentsToRulings([
      horizontal(200, 30, 370),
      vertical(30, 140, 200),
    ]);
    expect(rulings.horizontal).toHaveLength(1);
    expect(rulings.vertical).toHaveLength(1);
    expect(rulings.horizontal[0]).toMatchObject({ position: 200, from: 30, to: 370 });
  });

  it('joins a rule that was drawn once per cell back into one border', () => {
    // Three cells each drawing their own share of the same top edge.
    const rulings = segmentsToRulings([
      horizontal(200, 30, 150),
      horizontal(200, 150, 270),
      horizontal(200, 270, 370),
    ]);
    expect(rulings.horizontal).toHaveLength(1);
    expect(rulings.horizontal[0]).toMatchObject({ from: 30, to: 370 });
  });

  it('merges the duplicate edge two adjacent cells both draw', () => {
    const rulings = segmentsToRulings([
      horizontal(200, 30, 370),
      horizontal(200.4, 30, 370),
    ]);
    expect(rulings.horizontal).toHaveLength(1);
  });

  it('keeps a rule drawn a hair off true horizontal', () => {
    const rulings = segmentsToRulings([
      { x1: 30, y1: 200, x2: 370, y2: 200.3, thickness: 0.75 },
    ]);
    expect(rulings.horizontal).toHaveLength(1);
  });

  it('drops a diagonal, which is never a table border', () => {
    const rulings = segmentsToRulings([
      { x1: 30, y1: 140, x2: 370, y2: 200, thickness: 0.75 },
    ]);
    expect(rulings.horizontal).toHaveLength(0);
    expect(rulings.vertical).toHaveLength(0);
  });

  it('drops a mark too short to be a border', () => {
    expect(segmentsToRulings([horizontal(200, 30, 34)]).horizontal).toHaveLength(0);
  });

  it('drops a fat band, which is a shaded header and not a rule', () => {
    const fat = { x1: 30, y1: 200, x2: 370, y2: 200, thickness: 9 };
    expect(segmentsToRulings([fat]).horizontal).toHaveLength(0);
  });
});

describe('buildGridFromRulings', () => {
  it('recovers the grid of a fully ruled three-column table', () => {
    const grid = buildGridFromRulings(
      segmentsToRulings(ruledTable([150, 270], [180, 160])),
    );
    expect(grid).not.toBeNull();
    expect(grid?.columnEdges).toEqual([30, 150, 270, 370]);
    // Descending, because reading order runs down the page.
    expect(grid?.rowEdges).toEqual([200, 180, 160, 140]);
  });

  it('reads the same grid when the borders are thin filled rectangles', () => {
    const segments = [
      rectangleToSegment(30, 200, 340, 0.8, IDENTITY_MATRIX),
      rectangleToSegment(30, 180, 340, 0.8, IDENTITY_MATRIX),
      rectangleToSegment(30, 140, 340, 0.8, IDENTITY_MATRIX),
      rectangleToSegment(30, 140, 0.8, 61, IDENTITY_MATRIX),
      rectangleToSegment(200, 140, 0.8, 61, IDENTITY_MATRIX),
      rectangleToSegment(370, 140, 0.8, 61, IDENTITY_MATRIX),
    ].filter((segment): segment is RuleSegment => segment !== null);
    expect(segments).toHaveLength(6);
    const grid = buildGridFromRulings(segmentsToRulings(segments));
    expect(grid?.columnEdges).toHaveLength(3);
    expect(grid?.rowEdges).toHaveLength(3);
  });

  it('refuses a page with no rules at all', () => {
    expect(buildGridFromRulings({ horizontal: [], vertical: [] })).toBeNull();
  });

  it('refuses an underlined heading beside a sidebar rule', () => {
    // Two horizontals and two verticals, and not a table anywhere: the
    // verticals do not span the band the horizontals sit in.
    const rulings = segmentsToRulings([
      horizontal(700, 40, 300),
      horizontal(690, 40, 300),
      vertical(20, 100, 400),
      vertical(24, 100, 400),
    ]);
    expect(buildGridFromRulings(rulings)).toBeNull();
  });

  it('refuses a single boxed paragraph, which has no internal cuts', () => {
    const rulings = segmentsToRulings(ruledTable([], []));
    expect(buildGridFromRulings(rulings)).toBeNull();
  });

  it('refuses when only the rows are ruled, so whitespace still decides columns', () => {
    const rulings = segmentsToRulings([
      horizontal(200, 30, 370),
      horizontal(180, 30, 370),
      horizontal(160, 30, 370),
      horizontal(140, 30, 370),
    ]);
    expect(buildGridFromRulings(rulings)).toBeNull();
  });
});
