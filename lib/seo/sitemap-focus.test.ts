import { describe, expect, it } from 'vitest';
import { LIVE_TOOL_ROUTES } from './live-tools';
import { buildSitemap } from './sitemap-entries';
import {
  SITEMAP_FOCUS,
  SITEMAP_FOCUS_KEPT_WITHOUT_DEPTH,
  focusedToolRoutes,
} from './sitemap-focus';
import { TOOL_PAGE_DEPTH_ROUTES } from './tool-page-depth';

const ORIGIN = ['https:', '//', 'getopentools.com'].join('');

function paths(focus: 'focused' | 'full'): string[] {
  return buildSitemap(undefined, focus).map((entry) =>
    String(entry.url).slice(ORIGIN.length),
  );
}

describe('sitemap focus', () => {
  it("restores the previous sitemap exactly when focus is 'full'", () => {
    /*
      The escape hatch is the whole safety argument for this change, so it is
      asserted rather than assumed. `'full'` must return every live tool route,
      in order, which is what the file served before 2026-09-25.
    */
    const full = paths('full');
    for (const route of LIVE_TOOL_ROUTES) expect(full).toContain(route);
    expect(focusedToolRoutes(LIVE_TOOL_ROUTES, 'full')).toEqual(
      LIVE_TOOL_ROUTES,
    );
  });

  it('lists every route that carries depth content', () => {
    // The 800-word bodies in `tool-page-depth.ts` are the reason those pages
    // are worth a crawl at all. A focused sitemap that dropped one would be
    // withholding the strongest page on the site.
    const focused = paths('focused');
    for (const route of TOOL_PAGE_DEPTH_ROUTES) expect(focused).toContain(route);
  });

  it('lists every hub and every route with measured search demand', () => {
    const focused = paths('focused');
    for (const route of SITEMAP_FOCUS_KEPT_WITHOUT_DEPTH) {
      expect(focused).toContain(route);
    }
  });

  it('keeps every kept-without-depth route inside LIVE_TOOL_ROUTES', () => {
    /*
      A hand-written list rots when the route behind it is renamed: the entry
      stops matching, the page silently leaves the sitemap, and nothing says
      so. This is the test that says so.
    */
    const live = new Set<string>(LIVE_TOOL_ROUTES);
    const missing = SITEMAP_FOCUS_KEPT_WITHOUT_DEPTH.filter(
      (route) => !live.has(route),
    );
    expect(
      missing,
      `these sitemap-focus routes are no longer live: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('keeps the content pages, which focus never touches', () => {
    // Focus filters tool routes only. The comparison pages, hubs, guides,
    // blog and templates are listed for reasons this change does not revisit.
    const focused = paths('focused');
    for (const route of [
      '',
      '/proof',
      '/privacy',
      '/security',
      '/about',
      '/support',
      '/guides',
      '/blog',
      '/templates',
      '/embed',
      '/compare/pdf-tools-that-dont-upload',
    ]) {
      expect(focused).toContain(route);
    }
  });

  it('asks for a small enough set to be worth asking for', () => {
    /*
      The point of the change, stated as a number so it cannot drift back.

      The bound is deliberately loose -- this is a guard against the focused
      list quietly regrowing to the full one, not a budget to optimise
      against. `docs/SEARCH_CONSOLE_BASELINE_2026-09-23.md` records 134 indexed
      out of 1,413 asked for; the argument in `sitemap-focus.ts` is that asking
      for an order of magnitude fewer is how a domain this young gets any of
      them crawled. If a later tranche takes this past the bound deliberately,
      raise it in the same commit as the tranche and say which one.
    */
    const focused = paths('focused');
    expect(focused.length).toBeLessThan(400);
    expect(focused.length).toBeGreaterThan(120);
    expect(focused.length).toBeLessThan(paths('full').length / 3);
  });

  it('ships focused', () => {
    // Reading this test is how a future session finds out which state is live
    // without inferring it from a deploy.
    expect(SITEMAP_FOCUS).toBe('focused');
  });
});
