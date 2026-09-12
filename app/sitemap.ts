import type { MetadataRoute } from 'next';
import { getAllCategoryPillars } from '@/lib/seo/internal-linking-graph';
import { TOOL_CATALOG } from '@/lib/seo/tool-catalog-data';

const baseUrl = ['https:', '//', 'opentools.org'].join('');

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const coreRoutes: MetadataRoute.Sitemap = [
    '',
    '/pdf/merge',
    '/pdf/extract-pages',
    '/pdf/images-to-pdf',
    '/pdf/page-tools',
    '/image/editor',
    '/image/background-remover',
    '/image/optimize',
    '/creator/workbench',
    '/documents/workbench',
    '/data/workbench',
    '/data/csv-to-json',
    '/data/json',
    '/file/workbench',
    '/file/hash-calculator',
    '/text/workbench',
    '/text/writing',
    '/text/case-converter',
    '/developer/workbench',
    '/developer/advanced',
    '/developer/base64-decoder',
    '/developer/base64-encoder',
    '/developer/unix-timestamp',
    '/developer/uuid-generator',
    '/web/workbench',
    '/qr/workbench',
    '/math/workbench',
    '/math/percentage-calculator',
    '/finance/workbench',
    '/date/workbench',
    '/date/age-calculator',
    '/date/date-difference',
    '/productivity/workbench',
    '/science/workbench',
    '/life-admin/workbench',
    '/support',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: route === '' ? ('daily' as const) : ('weekly' as const),
    priority: route === '' ? 1.0 : 0.9,
  }));

  const pillarRoutes: MetadataRoute.Sitemap = getAllCategoryPillars().map(
    (pillar) => ({
      url: `${baseUrl}${pillar.href}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    }),
  );

  const guideRoutes: MetadataRoute.Sitemap = TOOL_CATALOG.map((tool) => ({
    url: `${baseUrl}/guides/${tool.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: tool.releaseWave === 'P0' ? 0.85 : 0.75,
  }));

  return [...coreRoutes, ...pillarRoutes, ...guideRoutes];
}
