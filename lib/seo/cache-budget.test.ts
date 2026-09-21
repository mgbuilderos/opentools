import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getAllTemplates } from '../templates/templates-data';
import { CONVERSION_PAIRS } from './conversion-pairs';
import { CACHED_GUIDE_SLUGS } from './cached-guides';
import { getAllBlogPosts } from './blog-data';
import { getAllCategoryPillars } from './internal-linking-graph';
import { LIVE_TOOL_CATALOG, routedToolIdsForPrefix } from './live-tools';

/**
 * The page cache is paid for in Cloudflare KV writes, and on the free plan
 * there are about 1,000 of them a day. Each cached page costs two — an `:html`
 * and an `:rsc` key — and every deploy invalidates the lot.
 *
 * A blanket `revalidate` in `app/layout.tsx` used to opt all 649 pages in,
 * which cost ~1,298 writes, failed every one of them, and made production
 * serve `no-store` on every page. This test exists so that cannot come back
 * quietly. Full reasoning in `docs/CACHE_BUDGET.md`.
 */

const appDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'app',
);

const WRITES_PER_PAGE = 2;
/** Free-plan allowance is ~1,000/day; stop well short so a deploy still fits. */
const WRITE_BUDGET = 900;

/**
 * Route patterns that stand for many pages, and where the count comes from.
 *
 * `<prefix>/[tool]` is deliberately absent: those counts come from
 * `routedToolIdsForPrefix`, the same list the routes and the sitemap read, so
 * a new one is priced right without anyone remembering this file exists.
 */
const DYNAMIC_PAGE_COUNTS: Record<string, () => number> = {
  // Not cached, and this is the line that keeps it that way honestly: the
  // conversion pairs are the largest page family on the site, so opting them
  // in would cost more than double the whole free allowance on its own. Stated
  // here rather than left to be rediscovered by a deploy that serves no-store.
  'convert/[pair]': () => CONVERSION_PAIRS.length,
  'guides/category/[category]': () => getAllCategoryPillars().length,
  'guides/[slug]': () => LIVE_TOOL_CATALOG.length,
  'blog/[slug]': () => getAllBlogPosts().length,
  'templates/[slug]': () => getAllTemplates().length,
  'guides-cached/[slug]': () => CACHED_GUIDE_SLUGS.length,
};

const ROUTED_TOOL_ROUTE = /^([^/]+)\/\[tool\]$/u;

/**
 * How many pages a route stands for.
 *
 * A dynamic segment is never worth one page, and what it is worth has to come
 * from the list its own `generateStaticParams` reads — never a number typed
 * here. This used to end in `?? 1`, which priced the fourteen `[tool]` routes
 * at fourteen pages when they build about 600: a budget that read as 306
 * writes was really worth roughly 1,500, well past the day's allowance it
 * claimed to be enforcing. A dynamic route with no such list now throws rather
 * than counting as one page.
 */
function pagesForRoute(route: string): number {
  const routedTools = ROUTED_TOOL_ROUTE.exec(route);
  const operations = routedTools
    ? routedToolIdsForPrefix(`/${routedTools[1]}`)
    : undefined;
  if (operations) return operations.length;

  const counted = DYNAMIC_PAGE_COUNTS[route];
  if (counted) return counted();

  if (route.includes('[')) {
    throw new Error(
      `${route} is a dynamic route with no page count, so it would be priced ` +
        'as a single page. Count it from the list its `generateStaticParams` ' +
        'reads. See docs/CACHE_BUDGET.md.',
    );
  }
  return 1;
}

function pageFiles(
  dir: string,
  prefix = '',
): { route: string; file: string }[] {
  const out: { route: string; file: string }[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...pageFiles(full, prefix ? `${prefix}/${name}` : name));
    } else if (name === 'page.tsx') {
      out.push({ route: prefix, file: full });
    }
  }
  return out;
}

function cachesItself(file: string): boolean {
  const source = readFileSync(file, 'utf8');
  const match = /export const revalidate\s*=\s*(\d+)/u.exec(source);
  return match ? Number(match[1]) > 0 : false;
}

describe('the page cache stays inside the free Cloudflare allowance', () => {
  const pages = pageFiles(appDir);

  it('finds the app routes at all, so a silent zero cannot pass', () => {
    expect(pages.length).toBeGreaterThan(30);
  });

  it('costs fewer writes than a day of the free plan allows', () => {
    let cachedPages = 0;
    const cached: string[] = [];

    for (const { route, file } of pages) {
      if (!cachesItself(file)) continue;
      cached.push(route || '/');
      cachedPages += pagesForRoute(route);
    }

    const writes = cachedPages * WRITES_PER_PAGE;
    expect(
      writes,
      `Caching ${cachedPages} pages costs ${writes} KV writes a day, over the ${WRITE_BUDGET} budget. Opted in: ${cached.join(', ')}. See docs/CACHE_BUDGET.md.`,
    ).toBeLessThanOrEqual(WRITE_BUDGET);
  });

  it('never sets a blanket revalidate in the root layout', () => {
    // This is the exact line that spent the whole quota and cached nothing.
    const layout = readFileSync(path.join(appDir, 'layout.tsx'), 'utf8');
    expect(/export const revalidate/u.test(layout)).toBe(false);
  });

  it('leaves the guide long tail out, because it cannot fit at any setting', () => {
    const guides = path.join(appDir, 'guides', '[slug]', 'page.tsx');
    expect(cachesItself(guides)).toBe(false);
    // Stated rather than assumed: on its own it already exceeds a day.
    expect(LIVE_TOOL_CATALOG.length * WRITES_PER_PAGE).toBeGreaterThan(1000);
  });

  it('leaves the per-tool routes out, because they are ~600 pages not 14', () => {
    const perTool = pages
      .filter(({ route }) => ROUTED_TOOL_ROUTE.test(route))
      .map(({ route, file }) => ({
        route,
        cached: cachesItself(file),
        count: pagesForRoute(route),
      }));

    // A filter that matches nothing must not read as a pass.
    expect(perTool.length).toBeGreaterThan(10);
    expect(
      perTool.filter(({ cached }) => cached).map(({ route }) => route),
      'a [tool] route caches itself; it is served from dist/client/ instead. See docs/CACHE_BUDGET.md.',
    ).toEqual([]);
    // Stated rather than assumed: they are more than a day's allowance on
    // their own, so there is no setting at which they fit.
    const writes =
      perTool.reduce((sum, { count }) => sum + count, 0) * WRITES_PER_PAGE;
    expect(writes).toBeGreaterThan(1000);
  });

  it('does cache the pages people actually land on', () => {
    const mustBeCached = [
      '',
      'pdf/merge',
      'image/optimize',
      'audio/mp3-toolkit',
      'subtitles/workbench',
      'guides',
    ];
    for (const route of mustBeCached) {
      const entry = pages.find((page) => page.route === route);
      expect(entry, `${route || '/'} is missing from app/`).toBeDefined();
      expect(cachesItself(entry!.file), `${route || '/'} is not cached`).toBe(
        true,
      );
    }
  });
});
