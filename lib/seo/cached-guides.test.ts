import { describe, expect, it } from 'vitest';
import { CACHED_GUIDE_SLUGS, isCachedGuideSlug } from './cached-guides';
import { LIVE_TOOL_CATALOG } from './live-tools';

/**
 * `cached-guides.ts` is a literal list because `next.config.ts` has to read it
 * without importing the tool catalogue. A literal list drifts silently, so
 * these are the checks that make it fail loudly instead.
 */
const SELECTION_RULE = (tool: (typeof LIVE_TOOL_CATALOG)[number]) =>
  tool.releaseWave === 'P0' || tool.rank <= 5;

describe('the cached guide list stays honest', () => {
  it('still matches the rule it was generated from', () => {
    const expected = LIVE_TOOL_CATALOG.filter(SELECTION_RULE)
      .slice(0, CACHED_GUIDE_SLUGS.length)
      .map((tool) => tool.slug);

    expect([...CACHED_GUIDE_SLUGS]).toEqual(expected);
  });

  it('names only guides that actually exist', () => {
    const live = new Set(LIVE_TOOL_CATALOG.map((tool) => tool.slug));
    const missing = CACHED_GUIDE_SLUGS.filter((slug) => !live.has(slug));

    expect(missing, `not in LIVE_TOOL_CATALOG: ${missing.join(', ')}`).toEqual(
      [],
    );
  });

  it('contains no duplicates, which would buy one page twice', () => {
    expect(new Set(CACHED_GUIDE_SLUGS).size).toBe(CACHED_GUIDE_SLUGS.length);
  });

  /**
   * The budget is the whole reason this list exists. At two writes a page, 50
   * costs 100 against an allowance of ~1,000 that 103 other pages already draw
   * on. Raising this means raising `FULL_REWARM` in `scripts/predeploy.mjs` and
   * re-reading `docs/CACHE_BUDGET.md` first.
   */
  it('stays small enough to afford', () => {
    expect(CACHED_GUIDE_SLUGS.length).toBeLessThanOrEqual(50);
  });

  it('answers membership for the long tail too', () => {
    expect(isCachedGuideSlug(CACHED_GUIDE_SLUGS[0])).toBe(true);
    expect(isCachedGuideSlug('a-guide-that-does-not-exist')).toBe(false);
  });
});
