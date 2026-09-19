/**
 * When someone has used enough tools here to be told so, and asked.
 *
 * The counter behind this is written by `announceCompletion`, which also
 * dispatches the completion event the receipt listens for. That shared moment
 * is why this module exists as pure functions with no timer and no event
 * listener: the milestone used to be decided inside a `tool-executed` handler
 * and shown immediately, which put a full-screen modal over the page in the
 * same tick the receipt was trying to use. The receipt is the better ask — it
 * arrives at relief, with the job's own facts — so the milestone must never
 * compete with it for that moment.
 *
 * What replaces it: the decision is made once per page load, from storage, by
 * `milestonesReached`. A run that crosses 50 is therefore acknowledged the
 * next time the person opens the site, never over the top of the work they
 * were doing.
 */

/**
 * Counts worth remarking on. Three in a lifetime, deliberately: the ask is
 * capped by `mayOfferSupport` as well, and a fourth would be nagging.
 */
export const MILESTONES = [10, 50, 100] as const;

export const USAGE_COUNT_KEY = 'tool_usage_count';
export const CELEBRATED_KEY = 'celebrated_milestones';

/** A usage count from storage, or 0 for anything that is not a count. */
export function parseUsageCount(stored: string | null): number {
  const count = Number.parseInt(stored ?? '', 10);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

/**
 * Milestones already shown. Anything that is not an array of numbers is read
 * as "none shown", which re-offers rather than silently going quiet forever —
 * the failure that matters here is a person who is never thanked, not one who
 * is thanked twice.
 */
export function parseCelebrated(stored: string | null): number[] {
  if (!stored) return [];
  try {
    const value: unknown = JSON.parse(stored);
    if (!Array.isArray(value)) return [];
    return value.filter(
      (entry): entry is number => typeof entry === 'number' && entry > 0,
    );
  } catch {
    return [];
  }
}

/**
 * Every milestone this count has passed that has not been shown yet.
 *
 * Returned whole rather than one at a time because the count can jump — a
 * person who finds the site and runs sixty things in an afternoon has passed
 * 10 and 50 together. They should be told once, about 50, and never see the
 * 10 card afterwards, so the caller offers the last entry and marks them all.
 */
export function milestonesReached(
  count: number,
  celebrated: readonly number[],
): number[] {
  return MILESTONES.filter(
    (milestone) => count >= milestone && !celebrated.includes(milestone),
  );
}

/** The milestone to show now, or null. The highest one reached. */
export function milestoneToOffer(
  count: number,
  celebrated: readonly number[],
): number | null {
  const reached = milestonesReached(count, celebrated);
  return reached.length ? reached[reached.length - 1] : null;
}
