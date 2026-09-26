import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getAllTemplates } from '../templates/templates-data';
import { CONVERSION_PAIRS } from './conversion-pairs';
import { FORMAT_PAIRS } from './format-pairs';
import { IMAGE_PAIRS } from './image-pairs';
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
/**
 * How far above the measured cost `FULL_REWARM` may sit.
 *
 * 200 writes is 100 cached pages -- enough that routine route additions never
 * touch the constant, and small enough that an unbuilt tree is still priced
 * close to what it really costs. See the band tests below.
 */
const CEILING_HEADROOM = 200;

/** Route patterns that stand for many pages, and where the count comes from. */
const DYNAMIC_PAGE_COUNTS: Record<string, () => number> = {
  // Not cached, and this is the line that keeps it that way honestly: the
  // conversion pairs are the largest page family on the site, so opting them
  // in would cost more than double the whole free allowance on its own. Stated
  // here rather than left to be rediscovered by a deploy that serves no-store.
  'convert/[pair]': () =>
    CONVERSION_PAIRS.length + FORMAT_PAIRS.length + IMAGE_PAIRS.length,
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

  /**
   * `scripts/predeploy.mjs` prices a deploy it cannot measure against
   * `FULL_REWARM`. This used to assert that constant EXACTLY equalled the
   * measured cost, while the constant's own comment called it "Ceiling, not a
   * bill" -- and the exact assertion is the one that was wrong.
   *
   * Exactness made that line a shared mutex. Every branch adding a route had
   * to edit the same number, so any two collided there, and whoever merged
   * second resolved a conflict over a figure neither side had computed for the
   * union. It was repriced 420, 422, 424, 438, 440, 442, 444 in one day, and
   * each of those was a merge someone had to stop and fix.
   *
   * What actually has to hold is a band, so both failure modes stay caught:
   *
   *   never below the measured cost   an optimistic verdict says GO when a
   *                                   deploy cannot afford itself
   *   never far above it              an inflated one says WAIT on every
   *                                   deploy -- which happened when the
   *                                   constant priced 163 ISR pages that had
   *                                   already become static files, and was
   *                                   overridden by hand three times in a day
   *
   * Inside the band, adding a route changes nothing here.
   */
  const declaredCeiling = () => {
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
    return Number(match![1]);
  };

  it('prices the deploy on a ceiling that is never optimistic', () => {
    const { writes, cached } = rewarmCost();

    expect(
      declaredCeiling(),
      `FULL_REWARM in scripts/predeploy.mjs under-prices a deploy: re-warming ` +
        `everything opted in costs ${writes} KV writes. Raise it to at least ` +
        `${writes} -- round up, it is a ceiling, and a round number leaves ` +
        `room for the next few routes so this line stops causing merge ` +
        `conflicts. Opted in: ${cached.join(', ')}.`,
    ).toBeGreaterThanOrEqual(writes);
  });

  it('prices it on a ceiling that does not stall every deploy', () => {
    const { writes } = rewarmCost();
    const highest = Math.min(WRITE_BUDGET, writes + CEILING_HEADROOM);

    expect(
      declaredCeiling(),
      `FULL_REWARM in scripts/predeploy.mjs is more than ${CEILING_HEADROOM} ` +
        `writes above the measured cost of ${writes}, so an unbuilt tree is ` +
        `priced as unaffordable and the verdict reads WAIT whatever the real ` +
        `cost is. Lower it to at most ${highest}.`,
    ).toBeLessThanOrEqual(highest);
  });

  it('leaves room to add routes without touching the constant', () => {
    /*
     * The point of the band, asserted rather than assumed: if the headroom
     * ever collapses to nothing, this is a mutex again and the next two
     * branches that add a page will collide on it.
     */
    const { writes } = rewarmCost();
    const spare = declaredCeiling() - writes;

    expect(
      spare,
      `FULL_REWARM has ${spare} writes of headroom (${Math.floor(spare / WRITES_PER_PAGE)} ` +
        `more cached pages). Below one page there is no room to add a route ` +
        `without editing it, which is what made it a source of merge ` +
        `conflicts.`,
    ).toBeGreaterThanOrEqual(WRITES_PER_PAGE);
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
