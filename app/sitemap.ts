import type { MetadataRoute } from 'next';
import { buildSitemap } from '@/lib/seo/sitemap-entries';

/**
 * Googlebot fetches this more than any other path, so it must never be rebuilt
 * per request. This directive settles that for the Node/Docker self-host path.
 * It does NOT make vinext emit a file -- vinext's prerender skips `sitemap.ts`
 * entirely -- so on Cloudflare the file comes from the capture step in
 * `scripts/prerender-to-assets.mjs`, which saves what this returns.
 */
export const dynamic = 'force-static';

/**
 * The entry list lives in `lib/seo/sitemap-entries.ts` so tests can build it
 * for both guide-consolidation states. Nothing else moved: with the switch off
 * this returns exactly the same URLs, in the same order, as before.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemap();
}
