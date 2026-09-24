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
import { SITEMAP_LASTMOD } from './sitemap-lastmod.generated';

const baseUrl = ['https:', '//', 'getopentools.com'].join('');

/**
 * The `lastmod` for a route, or nothing when we cannot honestly name one.
 *
 * Google uses this to decide what to recrawl first, and on 2026-09-23 only 31
 * of 1,392 entries carried one. The dates come from
 * `scripts/build-sitemap-lastmod.mjs`, which reads the commit date of the
 * source that renders each page; read that file for why it is emphatically not
 * `Date.now()` and what it deliberately leaves out. `undefined` here omits the
 * element entirely, which is the right answer for a page whose date we do not
 * know -- a guessed lastmod is worse than none, because once Google catches
 * this domain being wrong it stops reading the field at all.
 */
function lastModifiedFor(route: string): string | undefined {
  return SITEMAP_LASTMOD[route];
}

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
    // The snippet page for the embed programme. `/embed` is listed; the
    // framable `/embed/<tool>` copies are not, and are disallowed in
    // app/robots.ts -- they are stripped versions of pages this site is
    // trying to rank, so indexing both would split the signal. ADR-019.
    '/embed',
    // The three hand-written comparison pages (Pillar 5 of
    // docs/ORGANIC_GROWTH_PLAYBOOK_CORRECTED.md). Listed here beside /proof
    // and /security rather than in LIVE_TOOL_ROUTES: they are content pages,
    // and putting them in that list would make every tool CTA and the smart
    // dropzone offer them as a place to send a file.
    ...COMPARE_ROUTES,
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: lastModifiedFor(route === '' ? '/' : route),
    changeFrequency: route === '' ? ('daily' as const) : ('weekly' as const),
    priority: route === '' ? 1.0 : 0.9,
  }));

  // getAllCategoryPillars() already covers only categories with a live tool.
  const pillarRoutes: MetadataRoute.Sitemap = getAllCategoryPillars().map(
    (pillar) => ({
      url: `${baseUrl}${pillar.href}`,
      lastModified: lastModifiedFor(pillar.href),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    }),
  );

  const guideRoutes: MetadataRoute.Sitemap = getPublishedGuideTools(
    consolidation,
  ).map((tool) => ({
    url: `${baseUrl}/guides/${tool.slug}`,
    lastModified: lastModifiedFor(`/guides/${tool.slug}`),
    changeFrequency: 'weekly' as const,
    priority: tool.releaseWave === 'P0' ? 0.85 : 0.75,
  }));

  const blogRoutes: MetadataRoute.Sitemap = getAllBlogPosts().map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    // The post's own editorial date, which beats any inference from the code:
    // `blog-data.ts` holds every post, so a git date on it would redate all of
    // them whenever one was edited.
    lastModified: post.publishedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  }));

  const templateRoutes: MetadataRoute.Sitemap = getAllTemplates().map(
    (template) => ({
      url: `${baseUrl}/templates/${template.slug}`,
      lastModified: lastModifiedFor(`/templates/${template.slug}`),
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
