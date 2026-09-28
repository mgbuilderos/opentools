/**
 * The unit pairs that keep a page of their own when consolidation is on.
 *
 * DERIVED FROM MEASUREMENT, NOT TASTE. Source: the Google Search Console
 * performance export for getopentools.com, search type Web, the seven days to
 * 2026-09-25, exported 2026-09-28. The rule, applied to the export's Pages
 * sheet and to nothing else:
 *
 *     keep a unit pair when it earned >= 5 impressions AND its average
 *     position is < 30
 *
 * Each half of that rule is doing a different job. **Position** is the signal
 * that Google treats the page as a real answer rather than as filler under its
 * own widget — `kilograms-to-pounds` took 200 impressions at position 80.3 and
 * is not here, while `megapascals-to-atmospheres` took 6 at position 8.5 and
 * is. **Impressions** is only a noise floor: at one or two impressions an
 * average position is one lucky listing, not a ranking.
 *
 * WHAT THE SURVIVORS HAVE IN COMMON, and it is the whole thesis of
 * `unit-pair-consolidation-config.ts`: not one of them is a conversion Google
 * answers in its own results. Pressure in megapascals and kilopascals, binary
 * data sizes, energy in watt-hours, speed in knots, volume in teaspoons —
 * these return a page of links, so a page can win them. `cm to inches` and
 * `c to f` return a calculator, so nothing below it is ever clicked.
 *
 * SEVEN DAYS IS A THIN WINDOW and this list is expected to move. It is data,
 * not architecture: regenerate it from a longer export and the fold follows.
 * A pair that starts ranking later is restored by adding it here, which costs
 * one line and one build.
 *
 * `unit-pair-consolidation.test.ts` holds every id here to a real pair in
 * `CONVERSION_PAIRS`, so a unit renamed out from under this list fails the
 * suite rather than silently folding a page the owner asked to keep.
 */
export interface KeptUnitPair {
  /** The pair id, matching `ConversionPair.id`. */
  id: string;
  /** Impressions in the source export. Recorded so the rule can be re-checked. */
  impressions: number;
  /** Average position in the source export. */
  position: number;
}

export const UNIT_PAIR_KEEP_LIST: readonly KeptUnitPair[] = [
  { id: 'megapascals-to-atmospheres', impressions: 6, position: 8.5 },
  { id: 'kilopascals-to-atmospheres', impressions: 11, position: 9.2 },
  { id: 'atmospheres-to-megapascals', impressions: 5, position: 12.6 },
  { id: 'bytes-to-gib', impressions: 7, position: 14.3 },
  { id: 'kb-to-mb', impressions: 5, position: 15.8 },
  { id: 'calories-to-watt-hours', impressions: 14, position: 19.7 },
  { id: 'joules-to-kilojoules', impressions: 62, position: 24.6 },
  { id: 'mib-to-gb', impressions: 7, position: 24.7 },
  { id: 'tsp-to-millilitres', impressions: 43, position: 26.0 },
  { id: 'km-h-to-knots', impressions: 38, position: 26.8 },
  { id: 'kilowatt-hours-to-kilojoules', impressions: 6, position: 28.5 },
];

/** The rule above, kept next to the data so the test can re-apply it. */
export const UNIT_PAIR_KEEP_RULE = {
  minImpressions: 5,
  maxPosition: 30,
} as const;
