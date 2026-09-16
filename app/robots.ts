import type { MetadataRoute } from 'next';

const siteOrigin = ['https:', '//', 'getopentools.com'].join('');

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
