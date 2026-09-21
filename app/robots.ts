import type { MetadataRoute } from 'next';

const siteOrigin = ['https:', '//', 'getopentools.com'].join('');

/**
 * Static for the Node/Docker self-host path. On Cloudflare the file is written
 * by the capture step in `scripts/prerender-to-assets.mjs`; see `sitemap.ts`.
 */
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        // `/guides-cached/*` is the rewrite target behind CACHED_GUIDE_SLUGS,
        // not a place for a reader. Every one of its 50 pages is byte-identical
        // to the `/guides/*` page it serves, answers 200 to anyone who asks,
        // and appears in no sitemap -- so a crawler that finds one has found
        // duplicate content and has to guess which URL is canonical. Blocking
        // the prefix is the fix; the pages themselves must keep working,
        // because the rewrite is what serves `/guides/*`.
        disallow: ['/api/', '/guides-cached/'],
      },
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'ClaudeBot',
          'PerplexityBot',
          'Google-Extended',
          'Applebot',
          'Applebot-Extended',
          'bingbot',
          'cohere-ai',
        ],
        allow: ['/'],
        disallow: ['/api/', '/guides-cached/'],
      },
    ],
    sitemap: `${siteOrigin}/sitemap.xml`,
  };
}
