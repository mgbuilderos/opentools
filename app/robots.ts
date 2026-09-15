import type { MetadataRoute } from 'next';

const siteOrigin = ['https:', '//', 'getopentools.com'].join('');

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
