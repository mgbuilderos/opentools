import { describe, expect, it } from 'vitest';

import { parsePageSelection } from './page-selection';

describe('PDF page selection', () => {
  it('expands ranges, preserves order, and removes duplicates', () => {
    expect(parsePageSelection('3, 1-2, 2, 5', 5)).toEqual([3, 1, 2, 5]);
  });

  it('rejects malformed, reversed, and out-of-bounds values', () => {
    expect(() => parsePageSelection('1-x', 5)).toThrow('not a valid page');
    expect(() => parsePageSelection('5-3', 5)).toThrow('runs backwards');
    expect(() => parsePageSelection('6', 5)).toThrow('between 1 and 5');
  });
});
