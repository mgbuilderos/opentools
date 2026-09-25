import { describe, expect, it } from 'vitest';

// Plain JS -- the form an unpacked extension and a Node script can both load.
// Imported here so the test exercises the file the extension actually ships,
// not a transcription of it.
import { verdictFromCsp as extensionVerdict } from '../../extension/verdict.js';

import { verdictFromCsp as siteVerdict } from './verdict';

/**
 * The site and the extension must never disagree about the same page.
 *
 * `extension/verdict.js` used to carry a comment asking whoever changed it to
 * change `scripts/measure-csp.mjs` too, by hand. That instruction survived two
 * refactors and a shipped bug: all three copies read `connect-src` without its
 * `default-src` fallback, so a page blocking every connection was reported as
 * able to transmit.
 *
 * Two implementations still exist, because an unpacked extension cannot load a
 * `.ts` module and the site's build cannot import the extension's `.js` one.
 * What has changed is that the instruction is now this file. A disagreement
 * fails the build rather than reaching a reader as two different answers about
 * somebody's site.
 */
const CASES: readonly (readonly [string, string | null, boolean])[] = [
  // [ policy, expected verdict is asserted by agreement, report-only ]
  ["connect-src 'none'", null, false],
  ["default-src 'self'; connect-src 'none'", null, false],
  ["default-src 'none'", null, false],
  ["default-src 'none'; script-src 'self'", null, false],
  ["default-src 'self'", null, false],
  ["default-src 'none'; connect-src https://a.example", null, false],
  ["connect-src 'self' https://api.example", null, false],
  ["connect-src 'none' https://a.example", null, false],
  ['connect-src', null, false],
  ["default-src 'self'; connect-src", null, false],
  ["script-src 'self'", null, false],
  ['', null, false],
  ["connect-src 'none'", null, true],
  ["default-src 'none'", null, true],
  ['connect-src https://a.example', null, true],
  ["CONNECT-SRC 'NONE'", null, false],
  ["  ;; connect-src   'none' ;; ", null, false],
  [
    "default-src 'self'; CONNECT-SRC 'none'; connect-src https://x",
    null,
    false,
  ],
];

describe('the site and the extension agree', () => {
  for (const [policy, , reportOnly] of CASES) {
    it(`agrees on ${JSON.stringify(policy)}${reportOnly ? ' (report-only)' : ''}`, () => {
      const site = siteVerdict(policy, reportOnly);
      const extension = extensionVerdict(policy, reportOnly) as {
        verdict: string;
        connectSrc: string | null;
        viaDefaultSrc: boolean;
      };

      expect(extension.verdict).toBe(site.verdict);
      expect(extension.connectSrc).toBe(site.connectSrc);
      expect(extension.viaDefaultSrc).toBe(site.viaDefaultSrc);
    });
  }

  /*
   * A table that agreed on everything because both sides returned the same
   * constant would pass while proving nothing. This pins that the cases above
   * actually exercise all three interesting states.
   */
  it('covers every state, so agreement is not vacuous', () => {
    const states = new Set(
      CASES.map(
        ([policy, , reportOnly]) => siteVerdict(policy, reportOnly).verdict,
      ),
    );
    expect([...states].sort()).toEqual(['BLOCKED', 'CAPABLE', 'RESTRICTED']);
  });
});
