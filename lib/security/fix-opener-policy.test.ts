import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import nextConfig from '@/next.config';
import { parseHeaderRules } from '../../scripts/lib/headers-policy.mjs';
import {
  FIX_SOURCE,
  NON_EMBED_SOURCE,
  contentSecurityPolicy,
  isFixRoute,
} from './content-security-policy';

/**
 * The one place on this site a cross-origin window may hold a handle, and the
 * guard that keeps it to one place and one header.
 *
 * `Cross-Origin-Opener-Policy: same-origin` everywhere is a real protection: it
 * puts each document in its own browsing context group, which is what stops a
 * hostile opener probing this site through window references. Fix My Upload
 * cannot exist under it — measured on the built site, not argued from the spec:
 * inside a popup opened by a second origin, `window.opener` is `null`, and the
 * opening page's own handle already reports `closed`. Both directions are cut
 * by the browser before any script runs, so there is no client-side workaround,
 * and the other way a file could cross — an iframe — is closed by
 * `frame-ancestors 'none'`.
 *
 * So `/fix/<path>` sends `unsafe-none`. Owner decision, 2026-09-28. ADR-020
 * records why and what it costs.
 *
 * WHAT THIS FILE IS FOR. A relaxation that is correct today becomes a hole the
 * moment it widens by accident — one more route added to the pattern, or one
 * more header quietly added to the same override block because it was
 * convenient. Both would ship green without this. So every test below is a
 * containment test: the relaxation applies to these paths and no others, to
 * this header and no other, and both header files still agree.
 *
 * This is the same shape as `embed-framing.test.ts`, which guards ADR-019's
 * `frame-ancestors` exception, and for the same reason.
 */
const projectRoot = path.resolve(import.meta.dirname, '../..');
const headersFile = readFileSync(
  path.join(projectRoot, 'public/_headers'),
  'utf8',
);
const rules = parseHeaderRules(headersFile);
const entries = await nextConfig.headers!();

const fixRule = rules.find((rule) => rule.pattern === '/fix/*');
const fixEntry = entries.find((entry) => entry.source === FIX_SOURCE);
const catchAllRule = rules.find((rule) => rule.pattern === '/*');
const catchAllEntry = entries.find(
  (entry) => entry.source === NON_EMBED_SOURCE,
);

const COOP = 'Cross-Origin-Opener-Policy';

function valueOf(
  headers: readonly { key: string; value: string }[] | undefined,
  key: string,
) {
  return headers?.find(
    (header) => header.key.toLowerCase() === key.toLowerCase(),
  )?.value;
}

/**
 * `parseHeaderRules` returns `{ pattern, lines: [{ kind, name, value }] }` —
 * read from the parser rather than assumed, after a first version of this file
 * guessed a `headers` record and failed on `undefined`.
 */
type Rule = {
  pattern: string;
  lines: { kind: 'set' | 'unset'; name: string; value: string }[];
};

const setNames = (rule: Rule) =>
  rule.lines.filter((line) => line.kind === 'set').map((line) => line.name);
const unsetNames = (rule: Rule) =>
  rule.lines.filter((line) => line.kind === 'unset').map((line) => line.name);
const setValue = (rule: Rule, name: string) =>
  rule.lines.find(
    (line) =>
      line.kind === 'set' && line.name.toLowerCase() === name.toLowerCase(),
  )?.value;

describe('the Fix My Upload opener exception', () => {
  it('finds both sides, so an empty comparison cannot pass', () => {
    expect(fixRule, 'no /fix/* rule in public/_headers').toBeDefined();
    expect(fixEntry, 'no FIX_SOURCE entry in next.config.ts').toBeDefined();
    expect(catchAllRule).toBeDefined();
    expect(catchAllEntry).toBeDefined();
  });

  it('sends unsafe-none on both paths, with the same value', () => {
    expect(valueOf(fixEntry!.headers, COOP)).toBe('unsafe-none');
    expect(setValue(fixRule as Rule, COOP)).toBe('unsafe-none');
  });

  /*
   * THE CONTAINMENT TEST. The override block exists to change one header. If a
   * second one is ever added to it — a looser CORP, a relaxed CSP, anything —
   * it would ship silently, because no other test looks at this rule.
   */
  it('changes NOTHING but the opener policy', () => {
    expect(fixEntry!.headers.map((header) => header.key)).toEqual([COOP]);

    expect(setNames(fixRule as Rule)).toEqual([COOP]);
  });

  it('leaves every other route on same-origin', () => {
    expect(valueOf(catchAllEntry!.headers, COOP)).toBe('same-origin');
    expect(setValue(catchAllRule as Rule, COOP)).toBe('same-origin');

    // And no OTHER entry anywhere relaxes it. A second relaxation added later
    // for a different route would not be caught by anything above.
    const relaxed = entries
      .filter((entry) => valueOf(entry.headers, COOP) === 'unsafe-none')
      .map((entry) => entry.source);
    expect(relaxed).toEqual([FIX_SOURCE]);

    const relaxedRules = (rules as Rule[])
      .filter((rule) => setValue(rule, COOP) === 'unsafe-none')
      .map((rule) => rule.pattern);
    expect(relaxedRules).toEqual(['/fix/*']);
  });

  /*
   * `/fix` is the page a site owner reads. It holds no requirement, opens no
   * window and is a search result; it has no business leaving isolation. Both
   * patterns require at least one segment after `/fix`, exactly as the embed
   * split does.
   */
  it('does not relax the integration page itself', () => {
    expect(isFixRoute('/fix')).toBe(false);
    expect(isFixRoute('/fix/')).toBe(false);
    expect(isFixRoute('/fixture')).toBe(false);
    expect(isFixRoute('/fix/image')).toBe(true);
    expect(isFixRoute('/fix/photo-size')).toBe(true);

    expect(FIX_SOURCE).toBe('/fix/:path+');
    expect(fixRule!.pattern).toBe('/fix/*');
  });

  /*
   * The relaxation is about window handles and nothing else. If the CSP for
   * these routes ever changed too, a page that can be reached by a cross-origin
   * opener could also be framed, or could open a connection — and the two
   * together are a materially different risk from either alone.
   */
  it('keeps the same sealed CSP on these routes', () => {
    const csp = contentSecurityPolicy({ development: false });
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("connect-src 'none'");
    expect(csp).toContain("form-action 'none'");
    // The override declares no CSP of its own, so these routes inherit the one
    // above — which the assertion on `headers` length already pinned.
    expect(
      valueOf(fixEntry!.headers, 'Content-Security-Policy'),
    ).toBeUndefined();
  });

  it('still sends X-Frame-Options on these routes', () => {
    // The embed exception had to drop it, because `DENY` has no "any origin"
    // value. This one must not: `/fix/*` is opened in a window, never framed.
    expect(valueOf(catchAllEntry!.headers, 'X-Frame-Options')).toBe('DENY');
    expect(valueOf(fixEntry!.headers, 'X-Frame-Options')).toBeUndefined();
    expect(setValue(fixRule as Rule, 'X-Frame-Options')).toBeUndefined();
    // `!` unsets in this format; the override must not unset anything but COOP.
    expect(unsetNames(fixRule as Rule)).toEqual([COOP]);
  });

  it('is written down where somebody would look for it', () => {
    const adr = readFileSync(
      path.join(
        projectRoot,
        'decisions/ADR-020-fix-cross-origin-opener-policy.md',
      ),
      'utf8',
    );
    expect(adr).toContain('unsafe-none');
    expect(adr).toContain('/fix/');
    // The measurement, not just the conclusion.
    expect(adr).toContain('window.opener');
    expect(headersFile).toContain('ADR-020');
  });
});
