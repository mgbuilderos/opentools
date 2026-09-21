import { GUIDE_KEEP_LIST } from './guide-keep-list';

/**
 * The guide slugs served from the cached route.
 *
 * WHY THIS IS DERIVED FROM THE KEEP LIST, AND ONLY FROM IT. `next.config.ts`
 * builds one rewrite per entry, and config is evaluated before anything else
 * in the build -- importing `live-tools` there would drag the whole tool
 * catalogue and every workbench module into config evaluation, which is why
 * this was a literal list of 50 strings until 2026-09-21. `guide-keep-list.ts`
 * has no imports at all: it is a typed array of data. So it can be read here
 * without pulling anything behind it, and the two lists can no longer drift.
 *
 * WHY IT SHRANK FROM 50 TO THE KEPT GUIDES. Guide consolidation
 * (lib/seo/guide-consolidation-config.ts) redirects every guide that is not
 * kept. A rewrite is not a redirect: `/guides/<slug>` rewritten to
 * `/guides-cached/<slug>` renders that page and answers 200, so a cached slug
 * that stopped being kept would quietly out-answer its own 301 and stay
 * indexed. Deriving the list from the keep list makes that combination
 * impossible to express; `guide-consolidation.test.ts` also asserts it.
 *
 * COST. Each cached page costs two KV writes and the free plan allows about
 * 1,000 a day (docs/CACHE_BUDGET.md). 50 cost 100; the kept guides cost fewer.
 * `cache-budget.test.ts` re-checks the whole site's total, and `FULL_REWARM`
 * in `scripts/predeploy.mjs` is the same number stated once more for the
 * deploy check -- change this list and re-read both.
 */
export const CACHED_GUIDE_SLUGS: readonly string[] = GUIDE_KEEP_LIST.map(
  (entry) => entry.slug,
);

export function isCachedGuideSlug(slug: string): boolean {
  return CACHED_GUIDE_SLUGS.includes(slug);
}
