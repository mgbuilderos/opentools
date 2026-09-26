import { describe, expect, it } from 'vitest';

import {
  NOT_AN_ACCUSATION,
  parsePolicy,
  resolveConnectSource,
  verdictFor,
  verdictFromCsp,
} from './verdict';

describe('verdictFromCsp', () => {
  it("calls connect-src 'none' blocked", () => {
    const result = verdictFromCsp("default-src 'self'; connect-src 'none'");
    expect(result.verdict).toBe('BLOCKED');
    expect(result.connectSrc).toBe("'none'");
    expect(result.viaDefaultSrc).toBe(false);
  });

  it('calls a source list restricted, not blocked', () => {
    expect(
      verdictFromCsp("connect-src 'self' https://api.example").verdict,
    ).toBe('RESTRICTED');
  });

  it('calls a policy with no connection rule capable', () => {
    expect(verdictFromCsp("script-src 'self'").verdict).toBe('CAPABLE');
  });

  it('calls no policy at all capable', () => {
    expect(verdictFromCsp(null).verdict).toBe('CAPABLE');
    expect(verdictFromCsp('').verdict).toBe('CAPABLE');
  });

  /*
   * A report-only policy is not enforced by the browser, so it cannot block
   * anything. Reading one as protection would be the same error this tool
   * exists to stop people making, run in reverse.
   */
  it('refuses to credit a report-only policy with blocking', () => {
    const result = verdictFromCsp("connect-src 'none'", true);
    expect(result.verdict).toBe('CAPABLE');
    expect(result.reportOnlyOnly).toBe(true);
    expect(result.summary).toMatch(/report-only/iu);
  });
});

/*
 * The bug that moving this logic into one place exposed.
 *
 * `connect-src` falls back to `default-src` when absent, so `default-src
 * 'none'` blocks every connection the page can attempt. All three earlier
 * copies read `connect-src` alone and reported this CAPABLE -- telling a site
 * doing the strongest possible thing that it was doing the weakest, which is
 * the one direction of error this tool cannot afford.
 */
describe('the fallback that three copies missed', () => {
  it("treats default-src 'none' with no connect-src as blocked", () => {
    const result = verdictFromCsp("default-src 'none'; script-src 'self'");
    expect(result.verdict).toBe('BLOCKED');
    expect(result.viaDefaultSrc).toBe(true);
    expect(result.summary).toMatch(/default-src fallback/iu);
  });

  it("treats default-src 'self' with no connect-src as restricted", () => {
    const result = verdictFromCsp("default-src 'self'");
    expect(result.verdict).toBe('RESTRICTED');
    expect(result.viaDefaultSrc).toBe(true);
  });

  it('prefers an explicit connect-src over default-src', () => {
    const result = verdictFromCsp(
      "default-src 'none'; connect-src https://a.example",
    );
    expect(result.verdict).toBe('RESTRICTED');
    expect(result.viaDefaultSrc).toBe(false);
  });

  it('treats an empty connect-src as an empty source list', () => {
    expect(verdictFromCsp("default-src 'self'; connect-src").verdict).toBe(
      'BLOCKED',
    );
  });
});

describe('several policies', () => {
  /*
   * Two enforced policies intersect: a request must satisfy both, so the
   * strictest decides. Taking the last header, or the first, would report a
   * page as open when the browser is in fact refusing everything.
   */
  it('intersects enforced policies, strictest winning', () => {
    const result = verdictFor([
      { policy: 'connect-src https://a.example', reportOnly: false },
      { policy: "connect-src 'none'", reportOnly: false },
    ]);
    expect(result.verdict).toBe('BLOCKED');
  });

  it('excludes report-only policies from the intersection', () => {
    const result = verdictFor([
      { policy: 'connect-src https://a.example', reportOnly: false },
      { policy: "connect-src 'none'", reportOnly: true },
    ]);
    expect(result.verdict).toBe('RESTRICTED');
  });
});

describe('parsing', () => {
  it('lowercases directive names and keeps the first occurrence', () => {
    const directives = parsePolicy("CONNECT-SRC 'none'; connect-src https://x");
    expect(directives.get('connect-src')).toBe("'none'");
  });

  it('tolerates stray semicolons and whitespace', () => {
    expect(resolveConnectSource(";;  connect-src   'none' ; ;").value).toBe(
      "'none'",
    );
  });

  it("does not mistake a list containing 'none' for a blocking one", () => {
    // Invalid CSP, but a real thing people write. It is not `'none'`.
    expect(verdictFromCsp("connect-src 'none' https://a.example").verdict).toBe(
      'RESTRICTED',
    );
  });
});

describe('the honesty line', () => {
  it('separates capability from intent and from correctness', () => {
    expect(NOT_AN_ACCUSATION).toMatch(/not the same as does send/iu);
    expect(NOT_AN_ACCUSATION).toMatch(/legitimate/iu);
    expect(NOT_AN_ACCUSATION).toMatch(/bug/iu);
  });
});
