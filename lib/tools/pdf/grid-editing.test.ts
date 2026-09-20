import { describe, expect, it } from 'vitest';

import {
  addColumnEdge,
  MIN_COLUMN_GAP,
  moveColumnEdge,
  removeColumnEdge,
} from './grid-editing';

const EDGES = [40, 110, 300, 370, 440, 520];

describe('moveColumnEdge', () => {
  it('moves a divider where it was dragged', () => {
    expect(moveColumnEdge(EDGES, 2, 280)).toEqual([
      40, 110, 280, 370, 440, 520,
    ]);
  });

  it('never lets a divider pass the one to its left', () => {
    // Otherwise the columns silently reorder and the table rearranges itself.
    const moved = moveColumnEdge(EDGES, 2, 50);
    expect(moved[2]).toBe(110 + MIN_COLUMN_GAP);
    expect([...moved]).toEqual([...moved].sort((a, b) => a - b));
  });

  it('never lets a divider pass the one to its right', () => {
    const moved = moveColumnEdge(EDGES, 2, 900);
    expect(moved[2]).toBe(370 - MIN_COLUMN_GAP);
  });

  it('lets the outermost dividers move freely outward', () => {
    expect(moveColumnEdge(EDGES, 0, -50)[0]).toBe(-50);
    expect(moveColumnEdge(EDGES, 5, 900)[5]).toBe(900);
  });

  it('leaves the input array untouched', () => {
    const original = [...EDGES];
    moveColumnEdge(EDGES, 2, 280);
    expect(EDGES).toEqual(original);
  });

  it('ignores an index that is not there', () => {
    expect(moveColumnEdge(EDGES, 9, 100)).toEqual(EDGES);
  });
});

describe('addColumnEdge', () => {
  it('splits the widest gap, which is where a run-together column is', () => {
    // The 110–300 gap is the widest by a distance.
    expect(addColumnEdge(EDGES)).toEqual([40, 110, 205, 300, 370, 440, 520]);
  });

  it('refuses when no gap is wide enough to split', () => {
    const tight = [10, 12, 14];
    expect(addColumnEdge(tight)).toEqual(tight);
  });

  it('refuses when there is nothing to split between', () => {
    expect(addColumnEdge([40])).toEqual([40]);
    expect(addColumnEdge([])).toEqual([]);
  });

  it('keeps the result sorted', () => {
    const next = addColumnEdge(EDGES);
    expect(next).toEqual([...next].sort((a, b) => a - b));
  });
});

describe('removeColumnEdge', () => {
  it('removes an inner divider, merging the two columns it separated', () => {
    expect(removeColumnEdge(EDGES, 2)).toEqual([40, 110, 370, 440, 520]);
  });

  it('refuses the left edge of the table', () => {
    // Removing it would not merge anything — it would drop everything
    // to the left of the table out of the extraction.
    expect(removeColumnEdge(EDGES, 0)).toEqual(EDGES);
  });

  it('refuses the right edge of the table', () => {
    expect(removeColumnEdge(EDGES, EDGES.length - 1)).toEqual(EDGES);
  });

  it('refuses an index that is not there, rather than throwing', () => {
    expect(removeColumnEdge(EDGES, 99)).toEqual(EDGES);
    expect(removeColumnEdge(EDGES, -3)).toEqual(EDGES);
  });
});
