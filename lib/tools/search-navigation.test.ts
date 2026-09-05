import { describe, expect, it } from 'vitest';

import { moveSearchSelection } from './search-navigation';

describe('search result keyboard navigation', () => {
  it('selects the first item when moving down from no selection', () => {
    expect(moveSearchSelection(-1, 4, 'next')).toBe(0);
  });

  it('wraps in both directions', () => {
    expect(moveSearchSelection(3, 4, 'next')).toBe(0);
    expect(moveSearchSelection(0, 4, 'previous')).toBe(3);
  });

  it('returns no selection for an empty result set', () => {
    expect(moveSearchSelection(2, 0, 'next')).toBe(-1);
  });
});
