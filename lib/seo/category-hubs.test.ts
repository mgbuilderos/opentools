import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  CATEGORY_HUBS,
  CATEGORY_HUB_ROUTES,
  CATEGORY_LINKS,
  categoryHub,
} from './category-hubs';
import { linkableToolRoutes, toolPagesForPrefix } from './related-tools';
import { buildSitemap } from './sitemap-entries';

/*
  What these tests are for.

  The hubs exist to make every tool two clicks from the homepage. That only
  holds while three things stay true: the hub has a file, the file is reached
  from the homepage, and the hub links every tool under its prefix. Each of the
  three has failed on this site before -- a tool listed in `publicTools` but
  absent from the menu, a page in the sitemap with no inbound link, and a link
  list that outlived the page it pointed at. So each is a test.
*/

const prefixOf = (route: string) => `/${route.split('/')[1]}`;

/** Categories with a depth-1 address that is not a hub this file renders. */
const NON_HUB_CATEGORIES = ['/latex', '/schema'];

/**
 * `/convert` has no hub yet: its 632 pages are 512 unit pairs being folded onto
 * twelve system hubs, and a hub listing them today would list pages that are
 * about to become redirects. Named here so adding it is a passing test rather
 * than a discovery.
 */
const UNCOVERED_PREFIXES = ['/convert', '/bench'];

describe('category hubs', () => {
  it('has a page file for every hub, and a hub for every page file', () => {
    for (const route of CATEGORY_HUB_ROUTES) {
      const file = `app${route}/page.tsx`;
      expect(existsSync(file), `${route} has no ${file}`).toBe(true);
      const source = readFileSync(file, 'utf8');
      expect(source, `${file} does not render the hub`).toContain(
        'CategoryHubPage',
      );
      expect(source, `${file} names another route`).toContain(`'${route}'`);
    }
  });

  it('covers every linkable tool route outside the named exceptions', () => {
    const covered = new Set(
      CATEGORY_HUB_ROUTES.flatMap((route) =>
        toolPagesForPrefix(route).map((tool) => tool.href),
      ),
    );
    const missed = linkableToolRoutes().filter(
      (route) =>
        !covered.has(route) &&
        ![...UNCOVERED_PREFIXES, ...NON_HUB_CATEGORIES].includes(
          prefixOf(route),
        ),
    );
    expect(missed, `not listed on any hub:\n${missed.join('\n')}`).toEqual([]);
  });

  it('lists at least three tools on every hub', () => {
    // A hub with one link is a redirect wearing a page's clothes, and it would
    // mean the prefix had been emptied without this list being updated.
    for (const hub of CATEGORY_HUBS) {
      expect(
        toolPagesForPrefix(hub.route).length,
        `${hub.route} lists too few tools`,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it('links every hub, and only real categories, from the homepage list', () => {
    expect([...CATEGORY_LINKS].map((link) => link.route).sort()).toEqual(
      [...CATEGORY_HUB_ROUTES, ...NON_HUB_CATEGORIES].sort(),
    );
    const homepage = readFileSync('components/home-workspace.tsx', 'utf8');
    expect(
      homepage,
      'the homepage no longer renders the category list',
    ).toContain('CATEGORY_LINKS');
  });

  it('puts every hub in the sitemap exactly once', () => {
    const urls = buildSitemap().map((entry) => entry.url);
    // The first entry is the home page, so it is the origin -- read from the
    // sitemap rather than written down, so this test cannot disagree with it.
    const origin = urls[0]!;
    for (const route of CATEGORY_HUB_ROUTES) {
      const matches = urls.filter((url) => url === `${origin}${route}`);
      expect(
        matches,
        `${route} is in the sitemap ${matches.length} times`,
      ).toHaveLength(1);
    }
  });

  it('does not claim an address that already runs a tool', () => {
    // A hub at `/latex` would be a second page for an address a real tool
    // already answers -- which is the duplicate-content fault
    // `excludedToolIdsForPrefix` exists to prevent one level down.
    const live = new Set(linkableToolRoutes());
    for (const route of CATEGORY_HUB_ROUTES) {
      expect(live.has(route), `${route} is already a tool page`).toBe(false);
    }
  });

  it('gives each hub a distinct title and a usable description', () => {
    const titles = CATEGORY_HUBS.map((hub) => hub.title);
    expect(new Set(titles).size).toBe(titles.length);
    for (const hub of CATEGORY_HUBS) {
      expect(categoryHub(hub.route)).toBe(hub);
      expect(hub.title.length, `${hub.route} title`).toBeGreaterThanOrEqual(15);
      expect(hub.title.length, `${hub.route} title`).toBeLessThanOrEqual(70);
      expect(
        hub.description.length,
        `${hub.route} description`,
      ).toBeGreaterThanOrEqual(50);
      expect(
        hub.description.length,
        `${hub.route} description`,
      ).toBeLessThanOrEqual(165);
    }
  });
});
