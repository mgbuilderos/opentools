import type { MetadataRoute } from 'next';

const siteOrigin = ['https:', '//', 'opentools.org'].join('');

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/guides/*'],
      disallow: ['/api/'],
    },
    sitemap: `${siteOrigin}/sitemap.xml`,
  };
}
