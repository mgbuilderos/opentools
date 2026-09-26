import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getAllCategoryPillars,
  getAllHubLinkHrefs,
  getCategoryHubLinks,
  getSiteHubLinks,
} from './internal-linking-graph';
import { LIVE_TOOL_ROUTES } from './live-tools';

/**
 * The hub links that rescue this site's orphan pages.
 *
 * On 2026-09-23 a sweep of all 1,392 live URLs found 12 that no page on the
 * site linked to. A page reachable only from the sitemap gets minimal crawl
 * priority and no internal authority at all, which is most of why 552 URLs sit
 * in Search Console as "not indexed". All 12 were orphans for one reason: they
 * are in `LIVE_TOOL_ROUTES`, so they reach the sitemap, but not in
 * `tool-catalog-data.ts`, which is what every link-bearing surface is built
 * from. `CATEGORY_HUB_LINKS` and `SITE_HUB_LINKS` close that gap.
 *
 * WHERE THE ORPHAN COUNT ITSELF IS CHECKED. Not here, and deliberately. The
 * first version of this file rebuilt the site's link graph from the modules
 * the pages import and reported 771 orphans against the 12 that really exist:
 * it could not see the guide pages, the related-tool cards or the conversion
 * hubs, all of which link tools. A model of the graph is a second, wrong
 * implementation of the site. The count is asserted by
 * `scripts/verify-no-orphans.mjs`, which reads the rendered HTML in
 * `dist/client` and runs on every build beside `verify-static-coverage.mjs`.
 *
 * What is left here is what a unit test can honestly prove: the hub data is
 * well formed and points at live routes, and the components still render it.
 * Those are the two ways this fix can rot without the build noticing on the
 * branch where the rot was introduced.
 */

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..', '..');
const read = (relative: string) =>
  readFileSync(path.join(PROJECT_ROOT, relative), 'utf8');

/** The 12 URLs the 2026-09-23 live sweep found with no inbound link. */
const KNOWN_ORPHANS = [
  '/batch',
  '/creator/workbench',
  '/data/workbook-audit',
  '/date/workbench',
  '/developer/workbench',
  '/documents/workbench',
  '/image/solid-background-remover',
  '/life-admin/workbench',
  '/math/workbench',
  '/productivity/workbench',
  '/science/workbench',
  '/text/workbench',
];

describe('orphan rescue hub links', () => {
  it('covers every URL the live sweep found orphaned', () => {
    const covered = new Set(getAllHubLinkHrefs());
    const uncovered = KNOWN_ORPHANS.filter((route) => !covered.has(route));
    expect(uncovered).toEqual([]);
  });

  /**
   * A link to a 404 is worse than no link: it spends crawl budget and teaches
   * a reader that the cards are unreliable. The hub list is written by hand,
   * so it can name a page that does not exist.
   */
  it('points every hub link at a route that is really live', () => {
    const live = new Set<string>(LIVE_TOOL_ROUTES);
    const dead = getAllHubLinkHrefs().filter((href) => !live.has(href));
    expect(dead).toEqual([]);
  });

  it('carries a name and a description on every hub link', () => {
    const everyLink = [
      ...getSiteHubLinks(),
      ...getAllCategoryPillars().flatMap((pillar) =>
        getCategoryHubLinks(pillar.name),
      ),
    ];
    const thin = everyLink
      .filter((link) => link.name.length < 3 || link.description.length < 40)
      .map((link) => link.href);
    expect(thin).toEqual([]);
  });

  it('lists no hub twice, on any surface', () => {
    const all = getAllHubLinkHrefs();
    expect(all.length).toBe(new Set(all).size);
  });

  /**
   * `getCategoryHubLinks` drops anything the pillar already links as a catalog
   * tool, so it must not be the case that it drops everything -- that would
   * make the whole fix a no-op while every other assertion still passed.
   */
  it('still returns hubs for the categories that needed them', () => {
    expect(getCategoryHubLinks('Math and Units').length).toBeGreaterThan(0);
    expect(getCategoryHubLinks('Image').length).toBeGreaterThan(0);
    expect(getSiteHubLinks().length).toBeGreaterThan(0);
  });

  /**
   * The data above proves the hubs are addressable. These prove a component
   * still puts them on a page -- delete the JSX and everything above passes.
   */
  it('renders the category hub links on the pillar page', () => {
    const source = read('app/guides/category/[category]/page.tsx');
    expect(source).toContain('getCategoryHubLinks');
    expect(source).toContain('hubLinks.map');
  });

  it('renders the site hub links on the guide index', () => {
    const source = read('app/guides/page.tsx');
    expect(source).toContain('getSiteHubLinks().map');
  });

  /** The build guard is the real orphan check, so it must stay in the build. */
  it('keeps the orphan guard wired into npm run build', () => {
    expect(read('package.json')).toContain('scripts/verify-no-orphans.mjs');
  });
});
