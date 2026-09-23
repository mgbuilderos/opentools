import { describe, expect, it } from 'vitest';

import {
  metaInventory,
  servedDescription,
  servedTitle,
} from './meta-inventory';

/**
 * Every page's title and description must fit a search result, and be its own.
 *
 * Measured against production on 2026-09-23, across all 1,392 sitemap URLs:
 * 258 descriptions and 77 titles were outside what Google will print, and
 * three pages shared one description. None of it was visible in source. The
 * strings live in eighteen modules, the page files compose them, and
 * `app/layout.tsx` then appends ` · OpenTools` to every title -- so the only
 * place the finished value existed was the served HTML, which no unit test was
 * reading.
 *
 * `meta-inventory.ts` resolves the whole sitemap to the strings each page
 * really ships. This file is the rule those strings are held to. It is a
 * length test in form only: a truncated description is a description Google
 * rewrites, and a shared one is two pages competing for one query.
 */

/** A title under this reads as a stub; over it is cut off in results. */
const TITLE_MIN = 15;
const TITLE_MAX = 70;

/** Under this Google substitutes its own snippet; over it, it truncates. */
const DESCRIPTION_MIN = 50;
const DESCRIPTION_MAX = 165;

const { pages, unresolved } = metaInventory();

describe('title and description lengths', () => {
  /**
   * The sweep has to cover the real population. An inventory that resolved
   * three routes and passed would be worse than no test at all, so the floor
   * is asserted before anything is measured.
   */
  it('resolves every URL the sitemap offers', () => {
    expect(unresolved).toEqual([]);
    expect(pages.length).toBeGreaterThan(1300);
  });

  it('gives every page a title a result can show in full', () => {
    const wrong = pages
      .map((page) => ({ page, title: servedTitle(page) }))
      .filter(
        ({ title }) => title.length < TITLE_MIN || title.length > TITLE_MAX,
      )
      .map(
        ({ page, title }) =>
          `${page.route} (${title.length} chars, from ${page.source}): ${title}`,
      )
      .sort();
    expect(wrong).toEqual([]);
  });

  it('gives every page a description a result can show in full', () => {
    const wrong = pages
      .map((page) => ({ page, description: servedDescription(page) }))
      .filter(
        ({ description }) =>
          description.length < DESCRIPTION_MIN ||
          description.length > DESCRIPTION_MAX,
      )
      .map(
        ({ page, description }) =>
          `${page.route} (${description.length} chars, from ${page.source})`,
      )
      .sort();
    expect(wrong).toEqual([]);
  });

  /**
   * Two pages with one title are two pages asking Google to rank them for the
   * same query, and it answers by picking one. `/developer/sha-256-text`,
   * `-384-` and `-512-` shipped a single description between them.
   */
  it('gives no two pages the same title', () => {
    expect(
      sharedValues(pages.map((page) => [servedTitle(page), page.route])),
    ).toEqual([]);
  });

  it('gives no two pages the same description', () => {
    expect(
      sharedValues(pages.map((page) => [servedDescription(page), page.route])),
    ).toEqual([]);
  });
});

/** Every value used by more than one route, reported with those routes. */
function sharedValues(entries: readonly (readonly [string, string])[]) {
  const routesByValue = new Map<string, string[]>();
  for (const [value, route] of entries)
    routesByValue.set(value, [...(routesByValue.get(value) ?? []), route]);
  return [...routesByValue]
    .filter(([, routes]) => routes.length > 1)
    .map(([value, routes]) => `${routes.sort().join(', ')} share "${value}"`)
    .sort();
}
