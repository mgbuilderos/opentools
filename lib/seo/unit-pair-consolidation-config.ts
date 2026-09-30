/**
 * Unit-pair consolidation switch (owner decision 2026-09-28: fold the unit
 * half of `/convert` onto the converters, keep the pairs that search actually
 * rewards, and stop spending crawl budget on the rest).
 *
 * WHY. `lib/seo/conversion-pairs.ts` derives one page per from→to unit pair,
 * and the derivation is sound: the page arrives pre-set to the pair and its
 * worked examples are produced by the tool itself. What the derivation cannot
 * change is who answers the question. Google answers `kg to lbs` with its own
 * widget, so the page below it is never opened. Measured 2026-09-23: 512 unit
 * pages produced **15 page-opens**.
 *
 * The first Search Console export (7 days to 2026-09-25, exported 2026-09-28)
 * put numbers on the rest of it:
 *
 * | Measured over 7 days                                  |       |
 * | :---------------------------------------------------- | ----: |
 * | Unit pages with at least one impression               |    90 |
 * | Impressions they earned                               | 1,445 |
 * | Clicks they earned                                    |     0 |
 * | Unit pages with no impression at all                  |   422 |
 *
 * Zero clicks from 1,445 impressions is not a ranking problem to be fixed by
 * better copy. `kilograms-to-pounds` took 200 of those impressions at average
 * position 80.3: Google listed it, on page eight, having already answered the
 * question itself at the top.
 *
 * WHAT THIS COSTS IF IT IS WRONG. Nothing that cannot be undone. Setting this
 * to `false` restores the previous site exactly: every folded pair renders
 * again, returns to the sitemap and stops redirecting. Browsers hold a 301 for
 * a while; search engines recrawl.
 *
 * THE BUDGET THIS BUYS BACK. Page indexing on 2026-09-21 reported 957 of 1,292
 * submitted pages not indexed, and 914 of those were `Discovered – currently
 * not indexed`: Google had seen the URL and declined to fetch it. Crawl budget
 * is the binding constraint, and 501 pages that cannot earn a click are the
 * cheapest 501 to stop asking for.
 *
 * WHAT IS KEPT AND WHY IT IS NOT A HEDGE. `lib/seo/unit-pair-keep-list.ts`
 * keeps the pairs that the same export shows Google ranking on page one to
 * three. They share a property, and it is the property this whole decision
 * turns on: nothing in that list is answered by a widget. Pressure in
 * megapascals, sizes in gibibytes, speed in knots — Google returns pages for
 * those, so a page can win them.
 *
 * Runbook: docs/seo/unit-pair-consolidation.md. The keep list is derived from
 * a Search Console export by the rule recorded in its header, not typed.
 */
export const UNIT_PAIR_CONSOLIDATION_ENABLED = true;
