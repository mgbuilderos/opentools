import { LIVE_TOOL_CATALOG } from './live-tools';

/**
 * The guide pages that are allowed to enter the KV page cache.
 *
 * **Why a list exists at all.** The page cache is paid for in Cloudflare KV
 * writes — about 1,000 a day on the free plan, two per cached page, and every
 * deploy invalidates the lot. `export const revalidate` on `/guides/[slug]`
 * applies to *every* slug anyone asks for, so all 550 guides would cache
 * themselves: 1,100 writes, over the allowance, and the quota dies taking the
 * pages people actually land on with it. That is not hypothetical — the
 * sitemap now holds 629 URLs and a single crawl sweep would request them all.
 *
 * So the route sets no module-level `revalidate` and opts in per request
 * instead, for slugs on this list only. Everything else renders on demand and
 * costs no writes, exactly as it does today. Full arithmetic in
 * `docs/CACHE_BUDGET.md`; `lib/seo/cache-budget.test.ts` fails the build if the
 * total goes over budget.
 *
 * **Why these guides.** There is no per-page traffic data yet — the analytics
 * we have is zone-level daily totals, and the guides are barely indexed — so
 * picking "the most visited" would be invention. The list instead uses the
 * catalogue's own ranking, which is the same signal the site already trusts to
 * decide what a category leads with.
 *
 * `rank` is **per category**, so taking the first N in catalogue order drops
 * whole categories rather than the weakest tools — the previous slice kept
 * every subtitle tool and lost the BMI, age and date-difference calculators,
 * which are the higher-volume queries by a wide margin. Sorting by rank first
 * takes the strongest few from every category instead.
 */
const CACHE_ELIGIBLE = LIVE_TOOL_CATALOG.filter(
  (tool) => tool.releaseWave === 'P0' || tool.rank <= 5,
);

/**
 * How many guides may cache. Sized so a full re-warm still fits several times a
 * day: 60 pages are already opted in, so 50 guides makes 110 pages and 220
 * writes per warm — four warms inside the free allowance. Raising this costs
 * two writes per page per deploy; `docs/CACHE_BUDGET.md` has the sum.
 *
 * (60, not 61: 43 `page.tsx` files set `revalidate`, but one of them is the
 * `/guides/category/:category` pattern that is already counted as its 18
 * pillars. Measured, not assumed — `lib/seo/cache-budget.test.ts` recomputes
 * it from the route tree on every run.)
 */
export const CACHED_GUIDE_LIMIT = 50;

export const CACHED_GUIDE_SLUGS: readonly string[] = CACHE_ELIGIBLE.slice()
  // Rank first so every category is represented; slug only to make ties
  // deterministic, so two builds never disagree about what is cached.
  .sort((a, b) => a.rank - b.rank || a.slug.localeCompare(b.slug))
  .slice(0, CACHED_GUIDE_LIMIT)
  .map((tool) => tool.slug);

const CACHED_GUIDE_SLUG_SET = new Set(CACHED_GUIDE_SLUGS);

/** True when this guide may write itself into the page cache. */
export function isCachedGuide(slug: string): boolean {
  return CACHED_GUIDE_SLUG_SET.has(slug);
}
