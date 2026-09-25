import { TOOL_PAGE_DEPTH_ROUTES } from './tool-page-depth';

/**
 * Which live tool routes the sitemap actually asks a crawler to take.
 *
 * WHY THIS FILE EXISTS. Search Console, measured 2026-09-23 and recorded in
 * `docs/SEARCH_CONSOLE_BASELINE_2026-09-23.md`:
 *
 *   Sitemap URLs served live                        1,413
 *   Indexed                                           134
 *   Not indexed                                       552
 *     of which "Discovered - currently not indexed"   534
 *   Clicks, three months                                0
 *
 * "Discovered - currently not indexed" is not a queue. It is Google having
 * found the address, pattern-matched it, and declined to spend the crawl. 534
 * of those on a domain created 2026-09-15 with one inbound link is what crawl
 * rationing looks like, and every declined URL spends a little of the
 * credibility the next one needs.
 *
 * So this file asks for fewer. `LIVE_TOOL_ROUTES` holds 1,356 routes; the
 * focused set is the ones there is a reason to bet on, and it is roughly a
 * tenth of that. The other routes are unchanged in every other respect: they
 * still answer 200, they are still in `LIVE_TOOL_ROUTES`, they are still
 * prerendered (`scripts/prerender-to-assets.mjs` reads
 * `dist/server/prerendered-routes`, never the sitemap), and they are still
 * internally linked, which `orphan-coverage.test.ts` enforces against
 * `LIVE_TOOL_ROUTES` rather than against this list. Leaving a URL out of a
 * sitemap does not deindex it and does not hide it; it stops *asking*.
 *
 * WHAT THIS IS NOT. It is not a claim that the other 1,258 pages are bad, and
 * it is not the start of a deletion. `docs/DECISION_LOG.md` §7 covers removing
 * a page, and this is not that: nothing here changes a status code.
 *
 * HOW TO UNDO IT. `buildSitemap(consolidation, 'full')` returns exactly the
 * list this site served before, and `sitemap-focus.test.ts` asserts that
 * equivalence so the escape hatch cannot rot. Flipping `SITEMAP_FOCUS` back to
 * `'full'` is a one-line revert.
 *
 * HOW TO GROW IT AGAIN. In tranches, against the indexed count, not by
 * restoring everything the first time the number moves. The re-check is booked
 * for 2026-10-21 in the baseline document above. 134 is the number to beat; a
 * tranche is worth adding when the previous one has been indexed, and the
 * honest reading of a tranche that was not is that the constraint is authority
 * rather than sitemap size.
 */
export type SitemapFocusState = 'focused' | 'full';

/** The state the site ships with. `'full'` restores the previous behaviour. */
export const SITEMAP_FOCUS: SitemapFocusState = 'focused';

/**
 * Tool routes kept for a reason other than depth content.
 *
 * Three groups, each with a different reason, kept separate so a later reader
 * can remove one without guessing at the others.
 */
const KEPT_WITHOUT_DEPTH: readonly string[] = [
  /*
    1. The browsable hubs.

    A workbench is the address for a whole family of operations and the page
    the sidebar links to, so dropping one would leave its family reachable only
    through a hub link -- which is the one shape of page where asking the
    crawler is clearly worth it. `/batch` is the folder runner -- it was
    `/bench` until PR #19 renamed it, and `removed-tool-redirects.ts` 301s the
    old path -- and `/latex`
    and `/schema` are the two category addresses that really do run a tool,
    which is why they sit in `LIVE_TOOL_ROUTES` rather than in
    `CATEGORY_HUB_ROUTES` (see the note in `sitemap-entries.ts`).
  */
  '/batch',
  '/latex',
  '/schema',
  '/creator/workbench',
  '/data/workbench',
  '/date/workbench',
  '/developer/workbench',
  '/documents/workbench',
  '/file/workbench',
  '/finance/workbench',
  '/life-admin/workbench',
  '/math/workbench',
  '/productivity/workbench',
  '/qr/workbench',
  '/science/workbench',
  '/subtitles/workbench',
  '/text/workbench',
  '/web/workbench',

  /*
    2. Measured demand, which outranks every other reason on this page.

    The 2026-09-23 baseline recorded 18 queries in three months. Strip the
    brand and exactly two clusters remain, and neither is in the depth
    registry:

      LaTeX          "latex table generator", "generate table in latex"   5
      ER diagram/SQL "create er diagram from sql", "er diagram to sql",
                     "er diagram from sql"                                3

    Three impressions is not traction. It is, however, the only evidence this
    domain has ever produced about what it can rank for, and it was earned
    while the commercial core was excluding itself with a broken canonical.
    Dropping the pages behind the only queries that ever matched would be
    discarding the measurement to tidy the list.
  */
  '/latex/table-generator',
  '/latex/table-reader',
  '/latex/bibtex',
  '/latex/word-count',
  '/latex/symbols',
  '/latex/equations',
  '/documents/latex-table-generator',
  '/schema/erd',
  '/schema/erd-to-sql',
  '/schema/dialect-converter',
  '/schema/orm-models',
  '/schema/data-dictionary',
  '/schema/schema-diff',
];

/**
 * The routes to list, in the order they were given.
 *
 * Order is preserved rather than sorted so the sitemap keeps the shape
 * `LIVE_TOOL_ROUTES` gives it, and so a diff of the served file stays
 * readable.
 */
export function focusedToolRoutes(
  routes: readonly string[],
  focus: SitemapFocusState = SITEMAP_FOCUS,
): readonly string[] {
  if (focus === 'full') return routes;
  const keep = new Set<string>([
    ...TOOL_PAGE_DEPTH_ROUTES,
    ...KEPT_WITHOUT_DEPTH,
  ]);
  return routes.filter((route) => keep.has(route));
}

/** The kept-without-depth list, for the test that checks each one is live. */
export const SITEMAP_FOCUS_KEPT_WITHOUT_DEPTH = KEPT_WITHOUT_DEPTH;
