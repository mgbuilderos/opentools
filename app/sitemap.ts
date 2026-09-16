import type { MetadataRoute } from 'next';
import { getAllBlogPosts } from '@/lib/seo/blog-data';
import { getAllCategoryPillars } from '@/lib/seo/internal-linking-graph';
import { LIVE_TOOL_CATALOG, LIVE_TOOL_ROUTES } from '@/lib/seo/live-tools';
import { getAllTemplates } from '@/lib/templates/templates-data';

const baseUrl = ['https:', '//', 'getopentools.com'].join('');

// Only pages for tools that work are listed. Tools that are not built yet,
// placeholder pages and the roadmap stay out until they ship. No lastModified
// is set where the content has no real edit date.
export default function sitemap(): MetadataRoute.Sitemap {
  const coreRoutes: MetadataRoute.Sitemap = [
    '',
    ...LIVE_TOOL_ROUTES,
    '/support',
    '/guides',
    '/blog',
    '/templates',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    changeFrequency: route === '' ? ('daily' as const) : ('weekly' as const),
    priority: route === '' ? 1.0 : 0.9,
  }));

  const liveCategories = new Set(
    LIVE_TOOL_CATALOG.map((tool) => tool.category),
  );
  const pillarRoutes: MetadataRoute.Sitemap = getAllCategoryPillars()
    .filter((pillar) => liveCategories.has(pillar.name))
    .map((pillar) => ({
      url: `${baseUrl}${pillar.href}`,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    }));

  const guideRoutes: MetadataRoute.Sitemap = LIVE_TOOL_CATALOG.map((tool) => ({
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
