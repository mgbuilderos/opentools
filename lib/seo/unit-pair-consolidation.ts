import { CONVERSION_PAIRS, conversionPairById } from './conversion-pairs';
import type { ConversionPair } from './conversion-pairs';
import { UNIT_PAIR_CONSOLIDATION_ENABLED } from './unit-pair-consolidation-config';
import { UNIT_PAIR_KEEP_LIST } from './unit-pair-keep-list';

/**
 * Which `/convert/<unit-pair>` pages are published, and where the rest go.
 *
 * Shaped after `guide-consolidation.ts` on purpose: every function takes the
 * state as a parameter, defaulting to the committed switch and keep list, so a
 * test can exercise both states without mutating a module global. The reason
 * for the fold is in `unit-pair-consolidation-config.ts`; this file is only
 * the mechanism.
 */
export interface UnitPairConsolidationState {
  enabled: boolean;
  keepIds: ReadonlySet<string>;
}

export const UNIT_PAIR_CONSOLIDATION: UnitPairConsolidationState = {
  enabled: UNIT_PAIR_CONSOLIDATION_ENABLED,
  keepIds: new Set(UNIT_PAIR_KEEP_LIST.map((entry) => entry.id)),
};

/**
 * Where a folded pair sends its visitor: the converter that answers it, opened
 * on the right operation.
 *
 * `/math/<operationId>` and NOT `/math/workbench?tool=<operationId>`, though
 * both open the right converter. All seventeen conversion systems have a
 * dedicated page under `/math/[tool]` — checked against `LIVE_TOOL_ROUTES` in
 * this module's test, so this cannot rot into a 404 if one is ever removed.
 *
 * The query-string form would have wasted the redirect. Every live route on
 * this site is self-canonical (`indexability-sweep.test.ts`), so
 * `/math/workbench?tool=mass-converter` declares its canonical to be
 * `/math/workbench` — the query is not part of it. Pointing 501 redirects at
 * that form would pour all of them into one page regardless of what they were
 * about. `/math/mass-converter` is its own page with its own title and its own
 * canonical, so each group of folded pairs lands on the page that matches what
 * it was asking for.
 */
export function unitPairTarget(pair: ConversionPair): string {
  return `/math/${pair.operationId}`;
}

/** True when `/convert/<id>` renders a page of its own. */
export function hasPublishedUnitPair(
  id: string,
  state: UnitPairConsolidationState = UNIT_PAIR_CONSOLIDATION,
): boolean {
  if (!conversionPairById(id)) return false;
  return !state.enabled || state.keepIds.has(id);
}

/**
 * The unit pairs that get a page.
 *
 * This is the single source `lib/seo/live-tools.ts` and the route's
 * `generateStaticParams` both read, so the set of URLs promised to Google and
 * the set of pages the build produces cannot drift apart — the same discipline
 * `getPublishedGuideTools` enforces for guides, and for the same reason.
 */
export function publishedUnitPairs(
  state: UnitPairConsolidationState = UNIT_PAIR_CONSOLIDATION,
): readonly ConversionPair[] {
  if (!state.enabled) return CONVERSION_PAIRS;
  return CONVERSION_PAIRS.filter((pair) => state.keepIds.has(pair.id));
}

/**
 * The 301 target for a folded `/convert/<unit-pair>` path, or null.
 *
 * Null for a pair that still has a page, for a slug that was never a unit pair
 * (the file-format and image pairs live on the same route and are not folded),
 * and for anything outside `/convert/`. Returning null rather than a guess is
 * what keeps the format and image families — the half of `/convert` that Google
 * cannot answer in its own results — untouched by this change.
 */
export function consolidatedUnitPairRedirect(
  pathname: string,
  state: UnitPairConsolidationState = UNIT_PAIR_CONSOLIDATION,
): string | null {
  if (!state.enabled) return null;
  const path = pathname.length > 1 ? pathname.replace(/\/+$/u, '') : pathname;
  const slug = /^\/convert\/([^/]+)$/u.exec(path)?.[1];
  if (!slug) return null;
  const pair = conversionPairById(slug);
  if (!pair) return null;
  if (state.keepIds.has(slug)) return null;
  return unitPairTarget(pair);
}
