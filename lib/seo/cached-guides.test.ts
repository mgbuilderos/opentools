import { describe, expect, it } from 'vitest';
import { CACHED_GUIDE_SLUGS, isCachedGuideSlug } from './cached-guides';
import { GUIDE_KEEP_LIST } from './guide-keep-list';
import { getPublishedGuideTools } from './guide-consolidation';
import { LIVE_TOOL_CATALOG } from './live-tools';

/**
 * `cached-guides.ts` is read by `next.config.ts`, which cannot import the tool
 * catalogue, so it is derived from `guide-keep-list.ts` -- the one other file
 * in `lib/seo/` with no imports of its own. These are the checks that keep the
 * derivation honest and affordable.
 *
 * Until 2026-09-21 this was a literal list of 50 slugs following the rule
 * `releaseWave === 'P0' || rank <= 5`. Guide consolidation ended that: a
 * rewrite answers 200, so caching a guide that now redirects would out-answer
 * its own 301.
 */
describe('the cached guide list stays honest', () => {
  it('is exactly the guides that keep a page', () => {
    expect([...CACHED_GUIDE_SLUGS]).toEqual(
      GUIDE_KEEP_LIST.map((entry) => entry.slug),
    );
  });

  it('caches nothing that redirects or 404s', () => {
    const published = new Set(
      getPublishedGuideTools().map((tool) => tool.slug),
    );
    const unpublished = CACHED_GUIDE_SLUGS.filter(
      (slug) => !published.has(slug),
    );

    expect(
      unpublished,
      `rewritten to a page that should not answer 200: ${unpublished.join(', ')}`,
    ).toEqual([]);
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
   * The budget is the whole reason this list is bounded. At two writes a page,
   * 50 cost 100 against an allowance of ~1,000 that the rest of the site
   * already draws on. Raising this means raising `FULL_REWARM` in
   * `scripts/predeploy.mjs` and re-reading `docs/CACHE_BUDGET.md` first.
   */
  it('stays small enough to afford', () => {
    expect(CACHED_GUIDE_SLUGS.length).toBeLessThanOrEqual(50);
  });

  it('answers membership for the long tail too', () => {
    expect(isCachedGuideSlug(CACHED_GUIDE_SLUGS[0]!)).toBe(true);
    expect(isCachedGuideSlug('a-guide-that-does-not-exist')).toBe(false);
  });
});
