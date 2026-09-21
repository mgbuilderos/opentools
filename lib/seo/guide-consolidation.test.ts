import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import type { MetadataRoute } from 'next';
import { describe, expect, it } from 'vitest';

import { getAllTemplates } from '../templates/templates-data';
import { getAllBlogPosts } from './blog-data';
import { CACHED_GUIDE_SLUGS } from './cached-guides';
import { GUIDE_CONSOLIDATION_ENABLED } from './guide-consolidation-config';
import {
  GUIDE_CONSOLIDATION,
  type GuideConsolidationState,
  consolidatedGuideRedirect,
  getFeaturedGuideTools,
  getGuideConsolidationRedirects,
  getPublishedGuideTools,
  guideOrToolHref,
  hasPublishedGuide,
  publishedGuideHref,
} from './guide-consolidation';
import { GUIDE_KEEP_LIST } from './guide-keep-list';
import {
  getAllCategoryPillars,
  getRelatedToolLinks,
} from './internal-linking-graph';
import {
  LIVE_TOOL_CATALOG,
  LIVE_TOOL_ROUTES,
  isLiveToolUrl,
} from './live-tools';
import { buildLlmsFullTxt, buildLlmsTxt } from './llms-text';
import { removedToolRedirect } from './removed-tool-redirects';
import { siteRedirect } from './site-redirects';
import { buildSitemap } from './sitemap-entries';
import { TOOL_CATALOG } from './tool-catalog-data';

const origin = ['https:', '//', 'getopentools.com'].join('');
const liveSlugs = new Set(LIVE_TOOL_CATALOG.map((tool) => tool.slug));

// Kept guides for the "on" state: a dedicated route, a routed developer tool,
// and the numerology guide a removed-tool redirect points at.
const KEPT = [
  'pdf-merge-pdf',
  'developer-and-data-jwt-decoder',
  'date-time-and-productivity-life-path-number-calculator',
];
const OFF: GuideConsolidationState = { enabled: false, keepSlugs: new Set() };
const ON: GuideConsolidationState = { enabled: true, keepSlugs: new Set(KEPT) };
// A removed-tool redirect lands on the numerology guide; consolidating that
// one as well must still produce a single hop, not a chain.
const ON_WITHOUT_NUMEROLOGY: GuideConsolidationState = {
  enabled: true,
  keepSlugs: new Set(KEPT.slice(0, 2)),
};

const guidePaths = (state: GuideConsolidationState) =>
  buildSitemap(state)
    .map(({ url }) => url.slice(origin.length))
    .filter((url) => /^\/guides\/(?!category\/)[a-z0-9-]+$/u.test(url));

/** Every /guides/<slug> a text links to. */
const guideLinksIn = (text: string) =>
  [...text.matchAll(/\/guides\/(?!category\/)([a-z0-9-]+)/gu)].map(
    (match) => match[1]!,
  );

const removedPaths = [
  '/audio/transcribe',
  '/image/upscaler',
  '/developer/sql-visualizer',
  '/guides/category/video',
  '/guides/category/astrology-and-numerology',
  '/guides/health-and-fitness-water-intake-calculator',
  '/guides/image-image-upscaler',
  '/guides/video-video-to-gif',
  '/guides/audio-audio-format-converter',
  '/guides/documents-and-office-markdown-to-docx',
  '/guides/astrology-and-numerology-kundali-chart-maker',
  '/guides/astrology-and-numerology-destiny-number-calculator',
  '/guides/astrology-and-numerology-life-path-number-calculator',
  '/guides/astrology-and-numerology-birth-number-calculator',
];

describe('committed keep list and switch', () => {
  it('ships switched off, because there is no Search Console data yet', () => {
    expect(GUIDE_CONSOLIDATION_ENABLED).toBe(false);
    expect(GUIDE_CONSOLIDATION.enabled).toBe(false);
  });

  it('lists only live guides, once each, with a reason and evidence', () => {
    const slugs = GUIDE_KEEP_LIST.map((entry) => entry.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const entry of GUIDE_KEEP_LIST) {
      expect(liveSlugs.has(entry.slug), entry.slug).toBe(true);
      expect(['traffic', 'distinct']).toContain(entry.reason);
      expect(entry.evidence.trim(), entry.slug).not.toBe('');
    }
  });

  // Enabling with an empty list would redirect every guide on the site.
  it('is never enabled without a keep list', () => {
    if (GUIDE_CONSOLIDATION_ENABLED) {
      expect(GUIDE_KEEP_LIST.length).toBeGreaterThan(0);
    }
  });

  /**
   * `next.config.ts` rewrites these 50 slugs to `/guides-cached/<slug>`, which
   * is a page, not a redirect. A cached slug that stops being kept would be
   * served by that rewrite instead of redirecting, so the two lists have to be
   * regenerated together (docs/seo/guide-consolidation.md, step 5).
   */
  it('keeps every cached guide when it is enabled', () => {
    if (!GUIDE_CONSOLIDATION_ENABLED) return;
    const dropped = CACHED_GUIDE_SLUGS.filter(
      (slug) => !GUIDE_CONSOLIDATION.keepSlugs.has(slug),
    );
    expect(
      dropped,
      `cached but not kept; regenerate lib/seo/cached-guides.ts: ${dropped.join(', ')}`,
    ).toEqual([]);
  });
});

/**
 * The switch changes nothing until it is turned on. This block rebuilds what
 * the site did before the mechanism existed and compares it with what it does
 * now, rather than asserting a snapshot that would be written from the new
 * code and therefore agree with it by construction.
 */
describe('guide consolidation off is the previous behaviour', () => {
  /** `app/sitemap.ts` exactly as it read on main at d032150. */
  function previousSitemap(): MetadataRoute.Sitemap {
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
    ].map((route) => ({
      url: `${origin}${route}`,
      changeFrequency: route === '' ? ('daily' as const) : ('weekly' as const),
      priority: route === '' ? 1.0 : 0.9,
    }));
    const pillarRoutes: MetadataRoute.Sitemap = getAllCategoryPillars().map(
      (pillar) => ({
        url: `${origin}${pillar.href}`,
        changeFrequency: 'weekly' as const,
        priority: 0.9,
      }),
    );
    const guideRoutes: MetadataRoute.Sitemap = LIVE_TOOL_CATALOG.map(
      (tool) => ({
        url: `${origin}/guides/${tool.slug}`,
        changeFrequency: 'weekly' as const,
        priority: tool.releaseWave === 'P0' ? 0.85 : 0.75,
      }),
    );
    const blogRoutes: MetadataRoute.Sitemap = getAllBlogPosts().map((post) => ({
      url: `${origin}/blog/${post.slug}`,
      lastModified: post.publishedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    }));
    const templateRoutes: MetadataRoute.Sitemap = getAllTemplates().map(
      (template) => ({
        url: `${origin}/templates/${template.slug}`,
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

  it('produces the same sitemap, entry for entry and in the same order', () => {
    expect(buildSitemap(OFF)).toEqual(previousSitemap());
    // And the committed state is the off state, so the shipped file matches.
    expect(buildSitemap()).toEqual(previousSitemap());
  });

  it('publishes every live guide and redirects none', () => {
    expect(getPublishedGuideTools(OFF)).toEqual(LIVE_TOOL_CATALOG);
    expect(getGuideConsolidationRedirects(OFF).size).toBe(0);
    for (const tool of LIVE_TOOL_CATALOG) {
      expect(hasPublishedGuide(tool.slug, OFF)).toBe(true);
      expect(consolidatedGuideRedirect(`/guides/${tool.slug}`, OFF)).toBeNull();
      expect(guideOrToolHref(tool, OFF)).toBe(`/guides/${tool.slug}`);
      expect(publishedGuideHref(tool.slug, OFF)).toBe(`/guides/${tool.slug}`);
    }
  });

  it('renders the same links the pages rendered before', () => {
    // Related links (guide pages), category hubs and the guide index all went
    // straight to /guides/<slug>; every one of them still does.
    for (const tool of LIVE_TOOL_CATALOG) {
      for (const link of getRelatedToolLinks(tool.slug, 4, OFF)) {
        expect(link.guideHref).toBe(`/guides/${link.tool.slug}`);
      }
    }
    expect(getRelatedToolLinks('pdf-merge-pdf', 4)).toEqual(
      getRelatedToolLinks('pdf-merge-pdf', 4, OFF),
    );
    // The guide index featured the same 18 tools by the same rule.
    expect(getFeaturedGuideTools(OFF)).toEqual(
      LIVE_TOOL_CATALOG.filter(
        (t) => t.releaseWave === 'P0' || t.rank <= 5,
      ).slice(0, 18),
    );
    expect(getPublishedGuideTools(OFF).length).toBe(LIVE_TOOL_CATALOG.length);
  });

  it('leaves the removed-tool redirects exactly as they were', () => {
    for (const removed of [...removedPaths, '/guides/pdf-merge-pdf', '/']) {
      const before = removedToolRedirect(removed);
      expect(siteRedirect(removed, '', OFF), removed).toEqual(
        before ? { location: before, status: 308 } : null,
      );
    }
    // The one redirect that depends on the query string keeps depending on it.
    expect(
      siteRedirect(
        '/creator/workbench',
        '?tool=exact-kb-image-compressor',
        OFF,
      ),
    ).toEqual({ location: '/image/exact-size', status: 308 });
    expect(siteRedirect('/creator/workbench', '', OFF)).toBeNull();
  });

  it('keeps every guide link in llms.txt and llms-full.txt', () => {
    const full = buildLlmsFullTxt(OFF);
    for (const tool of LIVE_TOOL_CATALOG) {
      expect(full).toContain(
        `${origin}${tool.destinationUrl} | ${origin}/guides/${tool.slug} | `,
      );
    }
    expect(full).not.toContain('| none |');
    expect(full).toBe(buildLlmsFullTxt());
    const txt = buildLlmsTxt(OFF);
    expect(txt).toBe(buildLlmsTxt());
    expect(guideLinksIn(txt).length).toBeGreaterThan(0);
    for (const slug of guideLinksIn(txt)) {
      expect(txt).toContain(` Guide: ${origin}/guides/${slug}`);
    }
  });
});

describe('guide consolidation on', () => {
  const redirects = getGuideConsolidationRedirects(ON);

  it('keeps only the chosen guides in the sitemap', () => {
    expect(new Set(guidePaths(ON))).toEqual(
      new Set(KEPT.map((slug) => `/guides/${slug}`)),
    );
    // Hubs, tool routes, blog and templates are untouched.
    const offOther = buildSitemap(OFF).length - guidePaths(OFF).length;
    const onOther = buildSitemap(ON).length - guidePaths(ON).length;
    expect(onOther).toBe(offOther);
  });

  it('redirects every other live guide, and only those', () => {
    expect(redirects.size).toBe(LIVE_TOOL_CATALOG.length - KEPT.length);
    for (const slug of KEPT) {
      expect(redirects.has(`/guides/${slug}`), slug).toBe(false);
      expect(consolidatedGuideRedirect(`/guides/${slug}`, ON)).toBeNull();
      expect(siteRedirect(`/guides/${slug}`, '', ON)).toBeNull();
      expect(hasPublishedGuide(slug, ON)).toBe(true);
    }
    for (const tool of TOOL_CATALOG) {
      if (liveSlugs.has(tool.slug)) continue;
      // Guides of tools that are not live stay 404 (DECISION_LOG §7).
      expect(redirects.has(`/guides/${tool.slug}`), tool.slug).toBe(false);
      expect(consolidatedGuideRedirect(`/guides/${tool.slug}`, ON)).toBeNull();
      expect(hasPublishedGuide(tool.slug, ON)).toBe(false);
    }
  });

  it('sends each redirect with a 301 to a live tool URL, with no chain', () => {
    for (const [from, to] of redirects) {
      const slug = from.slice('/guides/'.length);
      expect(to).toBe(
        LIVE_TOOL_CATALOG.find((tool) => tool.slug === slug)!.destinationUrl,
      );
      expect(isLiveToolUrl(to), `${from} -> ${to}`).toBe(true);
      expect(siteRedirect(from, '', ON)).toEqual({ location: to, status: 301 });
      // The target must not redirect again, with or without its query string.
      const target = new URL(to, origin);
      expect(
        siteRedirect(target.pathname, target.search, ON),
        `${to} redirects again`,
      ).toBeNull();
    }
  });

  it('keeps the query string of workbench tool URLs', () => {
    expect(
      consolidatedGuideRedirect(
        '/guides/math-and-units-percentage-calculator',
        ON,
      ),
    ).toBe('/math/percentage-calculator');

    const tool = LIVE_TOOL_CATALOG.find(
      (entry) =>
        entry.destinationUrl.startsWith('/developer/advanced?tool=') &&
        !KEPT.includes(entry.slug),
    )!;
    // A trailing slash on the request must not change the answer.
    const target = consolidatedGuideRedirect(`/guides/${tool.slug}/`, ON)!;
    expect(target).toBe(tool.destinationUrl);
    // proxy.ts resolves the target against the request URL exactly like this.
    const location = new URL(
      target,
      `${origin}/guides/${tool.slug}/?utm_source=old`,
    );
    expect(location.pathname).toBe('/developer/advanced');
    expect(location.searchParams.get('tool')).toBe(
      new URLSearchParams(tool.destinationUrl.split('?')[1]).get('tool'),
    );
    // The old page's own query string is not carried onto the tool.
    expect(location.searchParams.has('utm_source')).toBe(false);

    // Every query-string destination in the catalogue survives the round trip.
    for (const [from, to] of redirects) {
      if (!to.includes('?')) continue;
      expect(
        isLiveToolUrl(
          new URL(to, origin).pathname + new URL(to, origin).search,
        ),
        from,
      ).toBe(true);
    }
  });

  it('never redirects category hubs, the index or unknown slugs', () => {
    for (const notAGuide of [
      '/guides',
      '/guides/',
      '/guides/category',
      '/guides/category/pdf',
      '/guides/not-a-real-guide',
      '/pdf/merge',
      '/',
    ]) {
      expect(consolidatedGuideRedirect(notAGuide, ON), notAGuide).toBeNull();
    }
  });

  it('resolves removed-tool redirects straight to the final page', () => {
    for (const state of [ON, ON_WITHOUT_NUMEROLOGY]) {
      for (const removed of removedPaths) {
        const redirect = siteRedirect(removed, '', state);
        expect(redirect?.status, removed).toBe(308);
        const target = new URL(redirect!.location, origin);
        expect(
          siteRedirect(target.pathname, target.search, state),
          removed,
        ).toBeNull();
      }
    }
    expect(
      siteRedirect(
        '/guides/astrology-and-numerology-life-path-number-calculator',
        '',
        ON_WITHOUT_NUMEROLOGY,
      ),
    ).toEqual({
      location: LIVE_TOOL_CATALOG.find(
        (tool) =>
          tool.slug ===
          'date-time-and-productivity-life-path-number-calculator',
      )!.destinationUrl,
      status: 308,
    });
  });

  it('links no redirected guide from related links, hubs, index or llms files', () => {
    const isRedirected = (slug: string) => redirects.has(`/guides/${slug}`);

    for (const tool of LIVE_TOOL_CATALOG) {
      for (const link of getRelatedToolLinks(tool.slug, 4, ON)) {
        expect(guideLinksIn(link.guideHref).filter(isRedirected)).toEqual([]);
        expect(
          link.guideHref === link.tool.destinationUrl ||
            KEPT.includes(link.tool.slug),
          link.guideHref,
        ).toBe(true);
      }
      // Category hubs link a guide only through publishedGuideHref.
      const href = publishedGuideHref(tool.slug, ON);
      expect(href === null, tool.slug).toBe(isRedirected(tool.slug));
      expect(
        guideLinksIn(guideOrToolHref(tool, ON)).filter(isRedirected),
      ).toEqual([]);
    }

    expect(
      getFeaturedGuideTools(ON)
        .map((tool) => tool.slug)
        .sort(),
    ).toEqual([...KEPT].sort());
    expect(guideLinksIn(buildLlmsTxt(ON)).filter(isRedirected)).toEqual([]);
    const full = buildLlmsFullTxt(ON);
    expect(guideLinksIn(full).sort()).toEqual([...KEPT].sort());
    expect(
      full.split('\n').filter((line) => line.includes('| none |')),
    ).toHaveLength(redirects.size);
  });
});

/**
 * `scripts/verify-static-coverage.mjs` (on every build) and
 * `scripts/predeploy.mjs` both fail when a sitemap URL has no file in
 * `dist/client/`. The guide route builds exactly `getPublishedGuideTools()`,
 * so this holds the sitemap to the same set in both states -- a guide that
 * redirects must be in neither.
 */
describe('every guide URL in the sitemap is a page the build produces', () => {
  for (const [name, state] of [
    ['off', OFF],
    ['on', ON],
  ] as const) {
    it(`matches generateStaticParams with the switch ${name}`, () => {
      const built = new Set(
        getPublishedGuideTools(state).map((tool) => `/guides/${tool.slug}`),
      );
      expect(new Set(guidePaths(state))).toEqual(built);
      for (const url of guidePaths(state)) {
        expect(
          siteRedirect(url, '', state),
          `${url} is listed and redirects`,
        ).toBeNull();
      }
    });
  }
});

// Pages must build guide links through lib/seo/guide-consolidation.ts, or a
// consolidated guide would stay linked after the switch is flipped.
describe('guide links in page source', () => {
  const appRoot = path.resolve(import.meta.dirname, '../..');
  const sourceFiles = (directory: string): string[] =>
    readdirSync(directory).flatMap((entry) => {
      const absolute = path.join(directory, entry);
      if (statSync(absolute).isDirectory()) return sourceFiles(absolute);
      return /\.tsx?$/u.test(entry) && !entry.endsWith('.test.ts')
        ? [absolute]
        : [];
    });

  it('never hard-codes /guides/<tool slug>', () => {
    const offenders = ['app', 'components']
      .flatMap((dir) => sourceFiles(path.join(appRoot, dir)))
      .filter((file) =>
        /\/guides\/\$\{\s*[\w.]*(?:tool|t)\.slug\s*\}/u.test(
          readFileSync(file, 'utf8'),
        ),
      )
      .map((file) => path.relative(appRoot, file));
    expect(offenders).toEqual([]);
  });
});
