import type { MetadataRoute } from 'next';
import { getAllTemplates } from '../templates/templates-data';
import { getAllBlogPosts } from './blog-data';
import { COMPARE_ROUTES } from './compare-pages';
import {
  GUIDE_CONSOLIDATION,
  type GuideConsolidationState,
  getPublishedGuideTools,
} from './guide-consolidation';
import { getAllCategoryPillars } from './internal-linking-graph';
import { LIVE_TOOL_ROUTES } from './live-tools';

const baseUrl = ['https:', '//', 'getopentools.com'].join('');

/**
 * The body of `app/sitemap.ts`, as a function of the consolidation state so a
 * test can build both versions and compare them.
 *
 * Only pages for tools that work are listed. Tools that are not built yet,
 * placeholder pages and the roadmap stay out until they ship. No lastModified
 * is set where the content has no real edit date. Guides consolidated into
 * their tool page (lib/seo/guide-consolidation.ts) redirect, so they are left
 * out as well -- and, because `generateStaticParams` reads the same
 * `getPublishedGuideTools`, nothing here is promised without a file behind it.
 */
export function buildSitemap(
  consolidation: GuideConsolidationState = GUIDE_CONSOLIDATION,
): MetadataRoute.Sitemap {
  const coreRoutes: MetadataRoute.Sitemap = [
    '',
    ...LIVE_TOOL_ROUTES,
    '/proof',
    '/privacy',
    '/security',
    '/about',
    '/support',
    '/guides',
    '/blog',
    '/templates',
    // The three hand-written comparison pages (Pillar 5 of
    // docs/ORGANIC_GROWTH_PLAYBOOK_CORRECTED.md). Listed here beside /proof
    // and /security rather than in LIVE_TOOL_ROUTES: they are content pages,
    // and putting them in that list would make every tool CTA and the smart
    // dropzone offer them as a place to send a file.
    ...COMPARE_ROUTES,
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    changeFrequency: route === '' ? ('daily' as const) : ('weekly' as const),
    priority: route === '' ? 1.0 : 0.9,
  }));

  // getAllCategoryPillars() already covers only categories with a live tool.
  const pillarRoutes: MetadataRoute.Sitemap = getAllCategoryPillars().map(
    (pillar) => ({
      url: `${baseUrl}${pillar.href}`,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    }),
  );

  const guideRoutes: MetadataRoute.Sitemap = getPublishedGuideTools(
    consolidation,
  ).map((tool) => ({
    url: `${baseUrl}/guides/${tool.slug}`,
    changeFrequency: 'weekly' as const,
    priority: tool.releaseWave === 'P0' ? 0.85 : 0.75,
  }));

  const blogRoutes: MetadataRoute.Sitemap = getAllBlogPosts().map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.publishedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  }));

  const templateRoutes: MetadataRoute.Sitemap = getAllTemplates().map(
    (template) => ({
      url: `${baseUrl}/templates/${template.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    }),
  );

  return [
    ...coreRoutes,
    ...pillarRoutes,
    ...guideRoutes,
    ...blogRoutes,
    ...templateRoutes,
  ];
}
