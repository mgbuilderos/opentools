import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getAllTemplates } from '../templates/templates-data';
import { CONVERSION_PAIRS } from './conversion-pairs';
import { FORMAT_PAIRS } from './format-pairs';
import { CACHED_GUIDE_SLUGS } from './cached-guides';
import { getAllBlogPosts } from './blog-data';
import { getAllCategoryPillars } from './internal-linking-graph';
import { LIVE_TOOL_CATALOG } from './live-tools';

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

/** Route patterns that stand for many pages, and where the count comes from. */
const DYNAMIC_PAGE_COUNTS: Record<string, () => number> = {
  // Not cached, and this is the line that keeps it that way honestly: the
  // conversion pairs are the largest page family on the site, so opting them
  // in would cost more than double the whole free allowance on its own. Stated
  // here rather than left to be rediscovered by a deploy that serves no-store.
  'convert/[pair]': () => CONVERSION_PAIRS.length + FORMAT_PAIRS.length,
  'guides/category/[category]': () => getAllCategoryPillars().length,
  'guides/[slug]': () => LIVE_TOOL_CATALOG.length,
  'blog/[slug]': () => getAllBlogPosts().length,
  'templates/[slug]': () => getAllTemplates().length,
  'guides-cached/[slug]': () => CACHED_GUIDE_SLUGS.length,
};

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

  /** What one deploy costs: every opted-in page, re-warmed. */
  function rewarmCost() {
    let cachedPages = 0;
    const cached: string[] = [];
    for (const { route, file } of pages) {
      if (!cachesItself(file)) continue;
      cached.push(route || '/');
      cachedPages += DYNAMIC_PAGE_COUNTS[route]?.() ?? 1;
    }
    return { cachedPages, cached, writes: cachedPages * WRITES_PER_PAGE };
  }

  it('finds the app routes at all, so a silent zero cannot pass', () => {
    expect(pages.length).toBeGreaterThan(30);
  });

  it('costs fewer writes than a day of the free plan allows', () => {
    const { writes, cachedPages, cached } = rewarmCost();
    expect(
      writes,
      `Caching ${cachedPages} pages costs ${writes} KV writes a day, over the ${WRITE_BUDGET} budget. Opted in: ${cached.join(', ')}. See docs/CACHE_BUDGET.md.`,
    ).toBeLessThanOrEqual(WRITE_BUDGET);
  });

  it('agrees with the FULL_REWARM constant the deploy verdict is priced on', () => {
    // `scripts/predeploy.mjs` prices a deploy against FULL_REWARM, and its own
    // comment says to KEEP IN SYNC with this test by hand. It did not stay in
    // sync: it read 326 from 2026-09-19 while the real cost had moved, and the
    // header records that it "was already stale". An optimistic constant makes
    // every deploy verdict optimistic, which is the one direction that costs
    // something.
    //
    // So the constant is read out of the script and compared, rather than
    // remembered. Changing what is cached now fails here with the number to
    // put in its place.
    const source = readFileSync(
      path.join(appDir, '..', 'scripts', 'predeploy.mjs'),
      'utf8',
    );
    const match = /^const FULL_REWARM = (\d+);$/mu.exec(source);
    expect(
      match,
      'scripts/predeploy.mjs no longer declares `const FULL_REWARM = <n>;`, ' +
        'so this test cannot check the number the deploy verdict is priced on',
    ).not.toBeNull();

    const { writes, cached } = rewarmCost();
    expect(
      Number(match![1]),
      `FULL_REWARM in scripts/predeploy.mjs is ${match![1]}, but re-warming ` +
        `everything currently opted in costs ${writes} KV writes. Set it to ` +
        `${writes}. Opted in: ${cached.join(', ')}.`,
    ).toBe(writes);
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
