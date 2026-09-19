import GuidePage, {
  generateMetadata as guideMetadata,
} from '@/app/guides/[slug]/page';
import { CACHED_GUIDE_SLUGS } from '@/lib/seo/cached-guides';

/**
 * The cached half of `/guides/:slug`.
 *
 * WHY THIS ROUTE EXISTS. `export const revalidate` is a module-level export, so
 * it governs a whole route -- there is no way to cache 50 of one route's 550
 * pages. Caching all 550 costs 1,100 KV writes against a ~1,000/day allowance
 * and does not fit at any setting, which `cache-budget.test.ts` asserts. So the
 * 50 worth caching are served by a second route that opts in, and the long tail
 * keeps rendering on demand for free.
 *
 * NOBODY EVER SEES THIS URL. `next.config.ts` rewrites `/guides/:slug` here for
 * these 50 slugs only. A rewrite is internal: the address bar, the links and
 * the sitemap all still say `/guides/:slug`. Rewrites were verified to reach
 * the deployed Worker (unlike `headers()`, which does not -- see next.config).
 *
 * AND IT IS SAFE TO REACH DIRECTLY. The metadata is re-exported unchanged from
 * the real page, so its canonical still points at `/guides/:slug`. Nothing links
 * here and the sitemap omits it, so it is undiscoverable; if it were reached,
 * the canonical hands the ranking back to the real URL. Do not add `noindex`
 * here -- the rewrite means that tag would be served ON `/guides/:slug`, which
 * would deindex the 50 best guides on the site.
 */
export const revalidate = 86400;

export async function generateStaticParams() {
  return CACHED_GUIDE_SLUGS.map((slug) => ({ slug }));
}

export const generateMetadata = guideMetadata;

export default GuidePage;
