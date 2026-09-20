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
        disallow: ['/api/'],
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
        disallow: ['/api/'],
      },
    ],
    sitemap: `${siteOrigin}/sitemap.xml`,
  };
}
