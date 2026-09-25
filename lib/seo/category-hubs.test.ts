import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  CATEGORY_HUBS,
  CATEGORY_HUB_ROUTES,
  CATEGORY_LINKS,
  categoryHub,
} from './category-hubs';
import { categoryHubTools, omittedFromHub } from './category-hub-tools';
import { LIVE_TOOL_ROUTES } from './live-tools';
import { linkableToolRoutes } from './related-tools';
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

/** Categories with a depth-1 address that is not a hub this file renders. */
const NON_HUB_CATEGORIES = ['/latex', '/schema'];

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

  it('lists every live tool page under its prefix, bar the workbench landings', () => {
    /*
      The strong form, and the one that matters. An earlier version of this
      test compared against the related-tools graph, which is built from the
      workbench operation lists and the `publicTools` manifest -- so it agreed
      with a hub that was missing `/image/background-remover`,
      `/image/heic-to-png` and `/pdf/compress-offline`, because the graph did
      not know those three either. A test that reads the same incomplete source
      as the code it checks proves nothing.

      `LIVE_TOOL_ROUTES` is the registry the sitemap and the build's orphan
      guard both read. Comparing against it is what makes "every tool in this
      category" a checked claim rather than a hopeful one.
    */
    for (const hub of CATEGORY_HUBS) {
      const listed = categoryHubTools(hub.route).map((tool) => tool.href);
      const expected = LIVE_TOOL_ROUTES.filter(
        (route) =>
          route.startsWith(`${hub.route}/`) &&
          !omittedFromHub(hub.route).includes(route),
      );
      expect(
        [...listed].sort(),
        `${hub.route} does not list its own tools`,
      ).toEqual([...expected].sort());
      expect(new Set(listed).size, `${hub.route} lists a tool twice`).toBe(
        listed.length,
      );
    }
  });

  it('gives every listed tool a name and a description', () => {
    // A card with a blank title is worse than no card. `pageMetaFor` covers
    // the pages the graph does not, and this is what says so out loud.
    for (const hub of CATEGORY_HUBS) {
      for (const tool of categoryHubTools(hub.route)) {
        expect(tool.name.trim(), `${tool.href} has no name`).not.toBe('');
        expect(
          tool.description.trim().length,
          `${tool.href} has no description`,
        ).toBeGreaterThan(10);
      }
    }
  });

  it('omits only the pages it means to, and names every one of them', () => {
    // The old one-URL-for-everything addresses, plus the one page an owner
    // decision keeps out of every menu. If this list grows, a real tool has
    // gone missing from a category and a visitor can no longer browse to it.
    const omitted = CATEGORY_HUB_ROUTES.flatMap((route) =>
      omittedFromHub(route),
    );
    expect([...omitted].sort()).toEqual(
      [
        '/creator/workbench',
        '/data/workbench',
        '/date/workbench',
        '/developer/advanced',
        '/developer/workbench',
        '/documents/workbench',
        '/file/workbench',
        '/finance/workbench',
        '/life-admin/workbench',
        '/math/workbench',
        '/pdf/compress-offline',
        '/productivity/workbench',
        '/qr/workbench',
        '/science/workbench',
        '/subtitles/workbench',
        '/text/workbench',
        '/text/writing',
        '/web/workbench',
      ].sort(),
    );
  });

  it('lists at least three tools on every hub', () => {
    // A hub with one link is a redirect wearing a page's clothes, and it would
    // mean the prefix had been emptied without this list being updated.
    for (const hub of CATEGORY_HUBS) {
      expect(
        categoryHubTools(hub.route).length,
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
