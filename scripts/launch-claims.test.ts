import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { getLiveCategories, LIVE_TOOL_CATALOG } from '../lib/seo/live-tools';

/**
 * The numbers in the launch copy have to be the numbers on the site.
 *
 * `docs/LAUNCH_KIT.md` holds text written to be posted verbatim to Reddit,
 * Hacker News and AlternativeTo. Nine of its drafts open with a tool count —
 * it is in the title of four of them. A title is the one line everybody reads
 * and the one line that cannot be quietly edited after the fact.
 *
 * Being wrong there is worse than being wrong in the repository, and worse in
 * a specific way: the whole pitch is that this site's claims are checkable.
 * A reader who counts the tools, finds a different number, and says so in a
 * comment has disproved the only thing the post was asking them to believe.
 *
 * The count moves whenever a tool ships, which in this repository is most
 * days. Nothing connected the copy to the catalogue, so the drafts were
 * accurate exactly as long as nobody merged anything.
 *
 * This is the same shape as `scripts/package-extension.test.ts` holding the
 * store listing to `manifest.json`, and it exists for the same reason: prose
 * that states a measurement is a claim with an expiry date, and the only way
 * to keep one honest is to check it against the thing it measures.
 */
const root = path.join(import.meta.dirname, '..');
const launchKit = readFileSync(path.join(root, 'docs/LAUNCH_KIT.md'), 'utf8');

/** Every standalone 3–4 digit number in the copy, with its line for context. */
function countsClaimedIn(markdown: string): { line: string; value: number }[] {
  return markdown.split('\n').flatMap((line) =>
    [...line.matchAll(/\b(\d{3,4})\b/gu)].map((match) => ({
      line: line.trim(),
      value: Number(match[1]),
    })),
  );
}

describe('the launch copy states the real numbers', () => {
  it('claims the tool count the catalogue actually has', () => {
    const real = LIVE_TOOL_CATALOG.length;

    /*
     * Matched by shape rather than by a hardcoded 568: any 3–4 digit number
     * sitting next to the words "tools" or "utilities" is claiming the tool
     * count, whoever wrote it and however they phrased it.
     */
    const claims = countsClaimedIn(launchKit).filter(({ line }) =>
      /\b(tools|utilities)\b/iu.test(line),
    );

    // Guards the guard: if the regex stops matching, the test silently checks
    // nothing and the copy is unprotected again.
    expect(
      claims.length,
      'no tool count found in docs/LAUNCH_KIT.md — either the copy changed ' +
        'shape or this test stopped matching it, and both need a look',
    ).toBeGreaterThan(5);

    const wrong = claims.filter(({ value }) => value !== real);
    expect(
      wrong.map(({ line }) => line),
      `docs/LAUNCH_KIT.md claims a tool count that is not ${real}. This copy ` +
        `gets posted verbatim, and four of the drafts put the number in the ` +
        `title. Update the drafts, not this test.`,
    ).toEqual([]);
  });

  it('claims the category count the site actually has', () => {
    const real = getLiveCategories().length;
    const claimed = [
      ...launchKit.matchAll(/\b(\d{1,3})\s+categories\b/giu),
    ].map((match) => Number(match[1]));

    expect(
      claimed.length,
      'no category count found in docs/LAUNCH_KIT.md',
    ).toBeGreaterThan(3);
    expect(
      claimed.filter((value) => value !== real),
      `docs/LAUNCH_KIT.md claims a category count that is not ${real}.`,
    ).toEqual([]);
  });

  /*
   * The capacity paragraph was wrong for a week and gated the highest-ceiling
   * channel on a limit that no longer existed. Re-measured 2026-09-26: every
   * page answers `cf-cache-status: HIT`. This does not re-check the live site
   * — a unit test has no business making a network request — it checks that
   * the correction is still in the document, so removing it is a deliberate
   * act rather than a silent revert.
   */
  it('still carries the correction to the capacity ceiling', () => {
    expect(
      launchKit,
      'the 2026-09-26 cache correction has gone from docs/LAUNCH_KIT.md. ' +
        'Without it the kit again tells the owner that Show HN is blocked by ' +
        'a Worker ceiling that edge caching removed.',
    ).toMatch(/cf-cache-status/u);
    expect(launchKit).toMatch(/no longer blocked/iu);
  });
});
