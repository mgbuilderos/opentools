import { describe, expect, it } from 'vitest';
import {
  FORBIDDEN_COMPETITORS,
  UNSOURCED_PRICE_CLAIM,
  findForbiddenCompetitors,
  findUnsourcedPriceClaims,
} from './competitor-names';

describe('forbidden competitor names', () => {
  it('finds a named company and says which one', () => {
    const found = findForbiddenCompetitors(
      'Smallpdf caps the free tier.',
      'a.tsx',
    );
    expect(found).toHaveLength(1);
    expect(found[0]).toContain('Smallpdf');
  });

  it('matches regardless of case', () => {
    expect(findForbiddenCompetitors('SMALLPDF', 'a.tsx')).toHaveLength(1);
    expect(findForbiddenCompetitors('smallpdf', 'a.tsx')).toHaveLength(1);
  });

  /*
   * The list is scanned against every .tsx under app/ and components/, so a
   * pattern that also matches ordinary English would make the guard
   * unusable and get it deleted rather than fixed. These are the words that
   * were nearly caught by an earlier draft of the list.
   */
  it('does not match ordinary words that contain a forbidden name', () => {
    const innocent = [
      'Description of the tool',
      'descriptive metadata',
      'Every revision is kept',
      'reverse the order',
      'Remove background noise',
      'removes the EXIF block',
      'Otterly unrelated word',
    ];
    for (const text of innocent) {
      expect(findForbiddenCompetitors(text, 'a.tsx'), text).toEqual([]);
    }
  });

  it('never quotes the surrounding copy back into CI output', () => {
    const message = findForbiddenCompetitors(
      'Smallpdf and a secret internal note',
      'a.tsx',
    )[0];
    expect(message).not.toContain('secret internal note');
  });

  it('has a stated reason for every entry', () => {
    for (const entry of FORBIDDEN_COMPETITORS) {
      expect(entry.reason.length, entry.pattern.source).toBeGreaterThan(3);
    }
  });

  it('holds no duplicate pattern', () => {
    const sources = FORBIDDEN_COMPETITORS.map((entry) => entry.pattern.source);
    expect(new Set(sources).size).toBe(sources.length);
  });
});

describe('unsourced price claims', () => {
  it('catches a price attributed to somebody else', () => {
    // The exact shape four live pages carried until 2026-09-25.
    const found = findUnsourcedPriceClaims(
      'Auphonic charges $11–89/mo and NUGEN VisLM charges $382; this measures locally.',
      'a.tsx',
    );
    expect(found).toHaveLength(2);
  });

  it('catches the softened wordings too', () => {
    for (const text of [
      'Bluebeam costs $330/year',
      'it is priced at £40',
      'the licence costs about €249',
      'that tool charges from ₹500',
    ]) {
      expect(findUnsourcedPriceClaims(text, 'a.tsx'), text).toHaveLength(1);
    }
  });

  /*
   * Our own support prices are ours to state: `/support` and the support view
   * both render them with no attribution verb. If this guard ever caught them
   * it would be switched off, and the rule it protects would go with it.
   */
  it('leaves our own prices alone', () => {
    for (const text of ['$5 / month', '$12/year', 'Support from $5 a month']) {
      expect(findUnsourcedPriceClaims(text, 'a.tsx'), text).toEqual([]);
    }
  });

  it('reports every occurrence in a file, not just the first', () => {
    const found = findUnsourcedPriceClaims(
      'A charges $1. B charges $2. C charges $3.',
      'a.tsx',
    );
    expect(found).toHaveLength(3);
  });
});

/**
 * The sweep this list feeds runs over every built page — 143 MB of markup —
 * and `served-copy-policy.test.ts` allows it 120 seconds. On 2026-09-26 it was
 * taking 126, so it had already crossed, and it had not degraded gracefully:
 * the suite passed until the day it did not.
 *
 * The cause was the `u` flag. Every pattern here is ASCII, so `u` bought
 * nothing but V8's Unicode case-folding path, which is 17x slower —
 * `/\bAdobe\b/iu` costs 2,106ms over the built site where `/\bAdobe\b/i` costs
 * 121ms. Across 64 names that is a 126-second sweep instead of a 2.3-second
 * one.
 *
 * These tests pin the two things that repair has to preserve: the flags stay
 * cheap, and the matching is unchanged.
 */
describe('the list stays cheap enough to run over every page', () => {
  it('uses no pattern with both i and u, which is the slow path', () => {
    const slow = FORBIDDEN_COMPETITORS.filter(
      ({ pattern }) =>
        pattern.flags.includes('i') && pattern.flags.includes('u'),
    ).map(({ pattern }) => pattern.source);

    expect(
      slow,
      `these patterns take ~17x longer than the same pattern without u, and ` +
        `every name here is ASCII so u changes nothing they match: ${slow.join(', ')}`,
    ).toEqual([]);
  });

  /*
   * The price pattern was missed when `u` was dropped from the name list, and
   * nothing here noticed: the two checks either side of this one read
   * `FORBIDDEN_COMPETITORS` and the price claim is not in it. It kept `giu` and
   * cost 1,993ms of the sweep by itself, against 419ms for the same pattern as
   * `gi` -- 4.8x, for byte-identical matches over the built site.
   *
   * So it is checked by name. A third pattern added to this module needs a
   * third check; there is no way to enumerate them, which is the honest cost of
   * keeping the fast ones fast.
   */
  it('uses no i+u on the price pattern either, which is the same slow path', () => {
    expect(
      UNSOURCED_PRICE_CLAIM.flags.includes('i') &&
        UNSOURCED_PRICE_CLAIM.flags.includes('u'),
      `the price pattern costs 4.8x with u and matches exactly the same text ` +
        `without it; flags are currently "${UNSOURCED_PRICE_CLAIM.flags}"`,
    ).toBe(false);
  });

  /*
   * Why the price pattern is allowed to be non-ASCII when no name is.
   *
   * The check below this one forbids a non-ASCII *name*, because a name that
   * needs folding needs `u`. The price pattern is non-ASCII on purpose --
   * `[$€£₹]` -- and drops `u` anyway, because those symbols are single UTF-16
   * code units with no case to fold. That argument is only worth as much as a
   * test of it, so each symbol is exercised against the shipped pattern.
   */
  it('still catches every currency symbol without the u flag', () => {
    for (const text of [
      'it charges $9 a month',
      'it charges €9 a month',
      'it charges £9 a month',
      'it charges ₹9 a month',
    ]) {
      expect(findUnsourcedPriceClaims(text, 'a.tsx'), text).toHaveLength(1);
    }
  });

  it('holds only ASCII patterns, which is what makes dropping u safe', () => {
    const nonAscii = FORBIDDEN_COMPETITORS.filter(({ pattern }) =>
      // eslint-disable-next-line no-control-regex
      /[^\x00-\x7F]/u.test(pattern.source),
    ).map(({ pattern }) => pattern.source);

    expect(
      nonAscii,
      `a non-ASCII pattern needs the u flag to fold correctly, so it cannot ` +
        `simply drop it: ${nonAscii.join(', ')}`,
    ).toEqual([]);
  });
});

describe('every name still matches its own spelling', () => {
  /*
   * The regression this guards is subtle: dropping a flag, or folding the list
   * into one alternation for speed, can quietly stop a name matching while
   * every existing test still passes — because the existing tests assert on a
   * handful of names, and this list holds sixty-four.
   *
   * So each entry is checked against text built from its own pattern.
   */
  const literal = (source: string) =>
    source
      .replace(/\\b/gu, '')
      .replace(/\\s\?/gu, ' ')
      .replace(/-\?/gu, '-')
      .replace(/\\\./gu, '.');

  for (const { pattern } of FORBIDDEN_COMPETITORS) {
    const name = literal(pattern.source);
    it(`catches ${name}`, () => {
      expect(
        findForbiddenCompetitors(`We are faster than ${name}.`, 'a.tsx'),
      ).toHaveLength(1);
    });
  }

  it('catches a name whatever case it is written in', () => {
    for (const spelling of ['adobe', 'ADOBE', 'AdObE'])
      expect(
        findForbiddenCompetitors(`compared with ${spelling}`, 'a.tsx'),
        spelling,
      ).toHaveLength(1);
  });

  /*
   * The one deliberately case-sensitive entry. Folding it into a
   * case-insensitive union for speed would make it match "veed" inside
   * ordinary English, which is why the fast path groups patterns by flags
   * rather than merging them all.
   */
  it('keeps VEED case-sensitive', () => {
    expect(findForbiddenCompetitors('VEED', 'a.tsx')).toHaveLength(1);
    expect(findForbiddenCompetitors('he veered left', 'a.tsx')).toEqual([]);
  });

  it('still lets ordinary English and format names through', () => {
    for (const text of [
      'Convert a Word document to PDF, or an Excel workbook to CSV.',
      'Remove the background, then revise the review.',
      'DICOM, SQLite and PowerPoint are file formats, not companies.',
    ])
      expect(findForbiddenCompetitors(text, 'a.tsx'), text).toEqual([]);
  });
});
