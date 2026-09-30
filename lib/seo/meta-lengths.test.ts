import { describe, expect, it } from 'vitest';

import {
  metaInventory,
  servedDescription,
  servedTitle,
} from './meta-inventory';
import { TITLE_MAX } from './title-budget';

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
    // 1,531 sitemap URLs before the 2026-09-28 unit-pair fold, 1,030 after it.
    // See the note on the same floor in indexability-sweep.test.ts.
    expect(pages.length).toBeGreaterThan(1020);
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

  /**
   * `app/layout.tsx` appends the site name to every title, so a page that also
   * ends its own title with it ships the name twice. `/do` went live serving
   * "Say what your file must be \u2014 OpenTools \u00b7 OpenTools", and nothing in this
   * file caught it: the duplicate-title test compares whole titles *between*
   * pages, and the length test was satisfied because both copies still fit.
   * `lib/seo/hub-tool-meta.ts` records the same mistake being made once before.
   *
   * The rule is deliberately narrow. Seven pages name the site inside a
   * sentence -- "Privacy -- what OpenTools does and does not collect",
   * "Embed OpenTools -- free, no key, no upload" -- and they read correctly and
   * must keep passing; an "exactly once" rule would have failed all seven. What
   * cannot be right is a trailing brand *tag*: a separator, the name, and then
   * the suffix the layout is about to add anyway. Measured before it was
   * written: 1,532 titles, 2 matches, 7 grammatical uses untouched.
   */
  const TRAILING_BRAND = /[\u2014\u2013|:\u00b7-]\s*OpenTools\s*$/;

  /**
   * `/proof` has the identical defect and is not this lane's to fix:
   * `app/proof/page.tsx` is claimed by an active session (product telemetry,
   * 2026-09-28), and editing a claimed file is a section 2 violation. Raised
   * under section 7 instead, and listed here so the guard can land now rather
   * than wait on someone else's branch -- the page this test is for is the
   * *next* one, not this one. Delete the entry when that lane fixes its title;
   * the guard then covers it with no further change.
   */
  const KNOWN_UNFIXED_ELSEWHERE = new Set(['/proof']);

  it('names the site once, not twice, in every served title', () => {
    const doubled = pages
      .filter((page) => !KNOWN_UNFIXED_ELSEWHERE.has(page.route))
      .filter((page) => TRAILING_BRAND.test(page.title))
      .map((page) => `${page.route} -> ${servedTitle(page)}`);
    expect(doubled).toEqual([]);
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
