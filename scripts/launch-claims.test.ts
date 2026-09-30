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

/**
 * A number that is claiming a tool count, matched by what it modifies.
 *
 * ## Why this is not `\b(\d{3,4})\b` on a line mentioning "tools"
 *
 * It was, and on 2026-09-30 that broke the unit gate for every lane. Commit
 * `6546bb5` corrected the copy from `568` to `86`, and `86` is two digits, so
 * the matcher stopped matching anything at all. The guard below caught that it
 * had gone blind, which is the one thing it was there for — but the copy had
 * been unprotected in the meantime.
 *
 * ## Why simply widening the digits to `\d{2,4}` does not work
 *
 * Seven of the twelve claim lines also read "across 19 categories". Matching
 * any number on a line that mentions tools would report `19` as a wrong tool
 * count and fail on correct copy. The number has to be tied to the noun it
 * modifies — which is exactly what `claims the category count` two functions
 * down has always done, and this is now consistent with it.
 *
 * ## The shape
 *
 * A count, optional thousands separators, an optional `+`, then up to two
 * intervening words before the noun. Two because the copy needs two:
 * "86 MIT-licensed browser tools" and "86 self-hosted browser tools". Verified
 * against the real document: 12 claims, every one of them the same value, and
 * no line carrying an unexplained number (see the sweep below). Also verified
 * not to match `19 categories` or `500 KB per tool`, and to still match
 * `568 tools` so a stale figure cannot come back unnoticed.
 *
 * Plural nouns only. `tools?` would match "per tool" and turn any nearby file
 * size into a tool count.
 */
const TOOL_COUNT_CLAIM =
  /\b(\d{1,3}(?:,\d{3})*)\+?(?:\s+[\w’-]+){0,2}\s+(?:tools|tool pages|utilities)\b/giu;

/** Any standalone 2–4 digit number, for the unexplained-number sweep. */
const STANDALONE_COUNT = /\b(\d{2,4})\b/gu;

/** A line that is talking about a quantity of tools at all. */
const COUNT_NOUN = /\b(?:tools|tool pages|utilities)\b/iu;

function toolCountClaimsIn(
  markdown: string,
): { line: string; value: number }[] {
  return markdown.split('\n').flatMap((line) =>
    [...line.matchAll(TOOL_COUNT_CLAIM)].map((match) => ({
      line: line.trim(),
      value: Number(match[1].replaceAll(',', '')),
    })),
  );
}

describe('the launch copy states the real numbers', () => {
  /*
   * ## Which registry is "the tool count", and why this one
   *
   * Four registries in this repo answer "how many tools", and they disagree.
   * Measured on `1efd87a`: `publicTools.length` is **86**; `LIVE_TOOL_CATALOG`
   * holds **568** rows, over **561** distinct destination URLs and **523**
   * distinct destination paths once query strings are dropped (rows share
   * pages — `/file/workbench` is the destination for 27 of them); and
   * `LIVE_TOOL_ROUTES.length` is **862**.
   *
   * `LIVE_TOOL_CATALOG.length` is the published one, and the deciding fact is
   * that the site already prints it and **computes** it, so it cannot drift:
   * `app/about/page.tsx` renders "{LIVE_TOOL_CATALOG.length} everyday tools",
   * `app/privacy/page.tsx` renders "All {LIVE_TOOL_CATALOG.length} tools on
   * this site", and the 19 hubs in `app/guides/category/[category]/page.tsx`
   * render `getLiveToolsByCategory(...).length` and sum to exactly it — the
   * largest, Math and Units, claiming 68 on its own. `publicTools.length`
   * appears on no visitor-facing surface at all. This document's own note
   * beside the Show HN title has said "the count is LIVE_TOOL_CATALOG.length"
   * from the start.
   *
   * ## The day this file and the site disagreed
   *
   * `6546bb5` rewrote thirteen lines of this copy down to `publicTools.length`
   * on the stated grounds that "568 matches nothing countable in the repo".
   * **That premise is false** — 568 is exactly `LIVE_TOOL_CATALOG.length`. It
   * also added `packaging/packaging.test.ts` holding the CasaOS, Umbrel and
   * Unraid manifests to `publicTools.length`, so the same claim was checked
   * against two registries, and only the broken matcher above kept that
   * contradiction from failing. A post claiming the smaller figure would have
   * been contradicted by the first page a reader opened after clicking it,
   * which is worse than the overstatement the rewrite was meant to prevent.
   *
   * Owner decision 2026-09-30: the published count is
   * `LIVE_TOOL_CATALOG.length`. The copy, the three app-store manifests, this
   * test and `packaging/packaging.test.ts` now all resolve to that one
   * registry, so they agree by construction rather than by anyone remembering.
   */
  it('claims the tool count the catalogue actually has', () => {
    const real = LIVE_TOOL_CATALOG.length;
    const claims = toolCountClaimsIn(launchKit);

    // Guards the guard: if the matcher stops matching, the test silently checks
    // nothing and the copy is unprotected again. This is the assertion that
    // caught the 568 -> 86 edit going unchecked.
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

  /*
   * The net under the matcher above.
   *
   * Matching by shape can always be out-phrased: "86 tiny little browser tools"
   * has three words before the noun and would slip past a two-word window, and
   * eleven other matches would keep the floor assertion happy while that one
   * line went unchecked. That is precisely how this file failed.
   *
   * So every standalone number sitting on a line that talks about a quantity of
   * tools has to be accounted for — it is the tool count or the category count
   * or the test fails and says so. A number that is neither (a file size, a
   * price) is a real reason to widen this, deliberately, rather than something
   * to leave silently unguarded.
   */
  it('leaves no unexplained number on a line about tool counts', () => {
    const known = new Set([
      LIVE_TOOL_CATALOG.length,
      getLiveCategories().length,
    ]);
    const unexplained = launchKit
      .split('\n')
      .filter((line) => COUNT_NOUN.test(line))
      .flatMap((line) =>
        [...line.matchAll(STANDALONE_COUNT)]
          .map((match) => Number(match[1]))
          .filter((value) => !known.has(value))
          .map((value) => `${value} in: ${line.trim()}`),
      );

    expect(
      unexplained,
      `docs/LAUNCH_KIT.md has a number on a line about tools that is neither ` +
        `the tool count (${LIVE_TOOL_CATALOG.length}) nor the category count ` +
        `(${getLiveCategories().length}). If it is a stale count, fix the copy. ` +
        `If it is something else entirely, widen this check and say why.`,
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
