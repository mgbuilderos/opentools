import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getAllCategoryPillars } from './internal-linking-graph';
import { LIVE_TOOL_CATALOG } from './live-tools';
import { CACHED_GUIDE_SLUGS } from './cached-guides';

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
  'guides/category/[category]': () => getAllCategoryPillars().length,
  'guides/[slug]': () => LIVE_TOOL_CATALOG.length,
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

  it('finds the app routes at all, so a silent zero cannot pass', () => {
    expect(pages.length).toBeGreaterThan(30);
  });

  it('costs fewer writes than a day of the free plan allows', () => {
    let cachedPages = 0;
    const cached: string[] = [];

    for (const { route, file } of pages) {
      if (!cachesItself(file)) continue;
      cached.push(route || '/');
      cachedPages += DYNAMIC_PAGE_COUNTS[route]?.() ?? 1;
    }

    // `/guides/[slug]` sets no module-level `revalidate` on purpose — that
    // would cache all 550. It opts in per request for an allowlist instead, so
    // its cost is the length of that list and has to be added by hand.
    cachedPages += CACHED_GUIDE_SLUGS.length;
    cached.push(`guides/[slug] (${CACHED_GUIDE_SLUGS.length} allowlisted)`);

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
    // A module-level `revalidate` here applies to every slug that is ever
    // requested, not just the prerendered ones — nothing in the runtime checks
    // `generateStaticParams`. That is the line that must never come back.
    expect(cachesItself(guides)).toBe(false);
    // Stated rather than assumed: on its own it already exceeds a day.
    expect(LIVE_TOOL_CATALOG.length * WRITES_PER_PAGE).toBeGreaterThan(1000);
  });

  it('caches a bounded allowlist of guides, per request', () => {
    const source = readFileSync(
      path.join(appDir, 'guides', '[slug]', 'page.tsx'),
      'utf8',
    );
    // The mechanism, not just the outcome: if this call is dropped the guides
    // silently stop caching and the 503s come back with no test failing.
    expect(source).toMatch(/isCachedGuide\(/u);
    expect(source).toMatch(/cacheLife\(/u);

    // Bounded, and every entry a real tool rather than a stale slug.
    expect(CACHED_GUIDE_SLUGS.length).toBeGreaterThan(0);
    expect(CACHED_GUIDE_SLUGS.length).toBeLessThan(LIVE_TOOL_CATALOG.length);
    const live = new Set(LIVE_TOOL_CATALOG.map((tool) => tool.slug));
    for (const slug of CACHED_GUIDE_SLUGS) {
      expect(live.has(slug), `${slug} is cached but not in the catalogue`).toBe(
        true,
      );
    }
  });

  it('leaves room to re-warm the cache after a deploy', () => {
    // Every deploy invalidates every key, so the number that matters is not
    // one warm but how many a day of writes affords. Ship several times a day
    // and a budget that only fits one warm is a budget that fails by lunchtime.
    const MIN_REWARMS_PER_DAY = 3;
    const DAILY_WRITE_ALLOWANCE = 1000;

    let cachedPages = CACHED_GUIDE_SLUGS.length;
    for (const { route, file } of pages) {
      if (!cachesItself(file)) continue;
      cachedPages += DYNAMIC_PAGE_COUNTS[route]?.() ?? 1;
    }

    const perWarm = cachedPages * WRITES_PER_PAGE;
    const rewarms = Math.floor(DAILY_WRITE_ALLOWANCE / perWarm);
    expect(
      rewarms,
      `A full warm costs ${perWarm} writes, so only ${rewarms} fit in ${DAILY_WRITE_ALLOWANCE} a day. See docs/CACHE_BUDGET.md.`,
    ).toBeGreaterThanOrEqual(MIN_REWARMS_PER_DAY);
  });

  /**
   * The honest limit of every assertion above, stated as a test so it cannot be
   * forgotten.
   *
   * Every build is issued a **fresh random UUID** as its build id — vinext calls
   * `safeUUID()` unless `generateBuildId` is configured, and this repo does not
   * configure it — and the KV key is `cache:app:<buildId>:<path>:html`. So a
   * deploy does not refresh the cache, it *orphans* it: the new build cannot see
   * a single key the old one wrote, and pays to write all of them again.
   * (Proven by the TECH lane on 2026-09-19 by listing the namespace: 2,550 live
   * keys under three different build-id prefixes, with `/pdf/merge` present and
   * unexpired six times over, while production still served MISS.
   * `progress/LANE_TECH_2026-09-19.md` entry 2.)
   *
   * The real spend is therefore:
   *
   *     writes per day = cached pages x 2 x DEPLOYS THAT DAY
   *
   * A test cannot see the deploy count, so it cannot guard the real number. What
   * it can do is refuse to let the page count grow to where even a quiet day
   * fails, and record what the page count actually buys.
   */
  it('states how many deploys a day this configuration survives', () => {
    const DAILY_WRITE_ALLOWANCE = 1000;
    /**
     * Below this the cache is worthless: it cannot survive even a quiet day.
     * Deliberately not set to the observed cadence — see the note below, no page
     * count reaches that.
     */
    const MIN_DEPLOYS_SURVIVED = 3;

    let cachedPages = CACHED_GUIDE_SLUGS.length;
    for (const { route, file } of pages) {
      if (!cachesItself(file)) continue;
      cachedPages += DYNAMIC_PAGE_COUNTS[route]?.() ?? 1;
    }
    const perDeploy = cachedPages * WRITES_PER_PAGE;
    const deploysSurvived = Math.floor(DAILY_WRITE_ALLOWANCE / perDeploy);

    expect(
      deploysSurvived,
      `${cachedPages} cached pages cost ${perDeploy} writes per deploy, so the ` +
        `cache survives only ${deploysSurvived} deploys a day. See docs/CACHE_BUDGET.md.`,
    ).toBeGreaterThanOrEqual(MIN_DEPLOYS_SURVIVED);

    /**
     * The finding that stops anyone "fixing" the quota by trimming this list.
     *
     * On 2026-09-18 there were 9-10 deploys. At 9, the allowance affords
     * `1000 / (2 x 9)` = **55 pages** — fewer than the 60 that were already
     * cached before a single guide was added. So on a real development day the
     * quota dies whatever this allowlist contains, and shrinking it buys
     * nothing. The lever is the build id (or the deploy cadence, or the plan),
     * never the page count.
     */
    const OBSERVED_DEPLOYS_PER_DAY = 9;
    const pagesThatWouldFit = Math.floor(
      DAILY_WRITE_ALLOWANCE / (WRITES_PER_PAGE * OBSERVED_DEPLOYS_PER_DAY),
    );
    const staticOnly = cachedPages - CACHED_GUIDE_SLUGS.length;
    expect(
      pagesThatWouldFit,
      'If this ever stops being true, the deploy multiplier has changed and ' +
        'docs/CACHE_BUDGET.md needs rewriting rather than this number nudging.',
    ).toBeLessThan(staticOnly);
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
