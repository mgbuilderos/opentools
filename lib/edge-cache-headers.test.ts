import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  auditCachePolicy,
  directive,
  parseHeaderRules,
} from '../scripts/lib/headers-policy.mjs';

/**
 * `public/_headers` is the only header source the Cloudflare deploy ships, so
 * it is the only place the site's cache policy can be written — and for a site
 * where every one of the ~670 URLs is a static file produced at build time,
 * that policy is what decides whether a page view costs a Worker invocation.
 *
 * Measured live on 2026-09-23, before this test existed:
 *
 *   * every HTML page answered `public, max-age=0, must-revalidate` — the
 *     asset layer's default, because no rule here set anything — and every
 *     request came back `cf-cache-status: REVALIDATED`. The edge held the page
 *     and was forbidden to serve it without asking the Worker first. Zone
 *     cache hit rate: 42.55%.
 *   * `/_next/static/chunks/index-CoyL43pJ.js`, a content-hashed name that can
 *     never be reused, answered `max-age=86400, must-revalidate` and
 *     `cf-cache-status: MISS`.
 *
 * The invariants below are what stop that returning. They are checked against
 * the file's bytes rather than a copy of the intent, because the file is
 * static, ships verbatim, and is never exercised by any other test.
 */
const projectRoot = path.resolve(import.meta.dirname, '..');

type HeaderRule = ReturnType<typeof parseHeaderRules>[number];

/**
 * The parser and the policy live in `scripts/lib/headers-policy.mjs` because
 * the build guard `scripts/verify-built-headers.mjs` has to ask the same
 * questions of `dist/client/_headers`, and a second copy of either is how one
 * of the two ends up passing on a file the other would reject.
 */
const sourceText = readFileSync(
  path.join(projectRoot, 'public/_headers'),
  'utf8',
);
const rules: HeaderRule[] = parseHeaderRules(sourceText);

function ruleFor(pattern: string): HeaderRule {
  const rule = rules.find((candidate) => candidate.pattern === pattern);
  expect(rule, `public/_headers has no ${pattern} rule`).toBeDefined();
  return rule!;
}

/** Index of this rule's first `Cache-Control` line of the given kind, or -1. */
function cacheControlAt(rule: HeaderRule, kind: 'set' | 'unset'): number {
  return rule.lines.findIndex(
    (line) => line.kind === kind && line.name === 'Cache-Control',
  );
}

function cacheControl(pattern: string): string {
  const values = ruleFor(pattern)
    .lines.filter(
      (line) => line.kind === 'set' && line.name === 'Cache-Control',
    )
    .map((line) => line.value);
  expect(
    values,
    `${pattern} must set exactly one Cache-Control; it sets ${values.length}`,
  ).toHaveLength(1);
  return values[0];
}

describe('public/_headers lets Cloudflare answer without waking the Worker', () => {
  it('finds the rules at all, so an empty parse cannot pass', () => {
    expect(rules.length).toBeGreaterThan(5);
    expect(rules.map((rule) => rule.pattern)).toContain('/*');
  });

  describe('the catch-all, which is what every HTML page gets', () => {
    it('still tells the browser to revalidate, so a deploy is picked up', () => {
      const value = cacheControl('/*');
      expect(directive(value, 'public')).toBe('');
      // Unchanged from what visitors already receive. The edge policy below is
      // carried by `s-maxage`, which browsers ignore, so nothing about a
      // visitor's freshness changes.
      expect(directive(value, 'max-age')).toBe('0');
      expect(directive(value, 'must-revalidate')).toBe('');
    });

    it('gives the shared cache a lifetime of its own', () => {
      const value = cacheControl('/*');
      const shared = directive(value, 's-maxage');
      expect(
        shared,
        'without s-maxage the edge inherits max-age=0 and revalidates every ' +
          'request against the Worker — the 42.55% hit rate measured ' +
          '2026-09-23',
      ).toBeDefined();
      expect(Number(shared)).toBeGreaterThanOrEqual(600);
    });

    it('lets the edge refresh in the background rather than block a visitor', () => {
      const value = cacheControl('/*');
      const stale = directive(value, 'stale-while-revalidate');
      expect(stale, 'no stale-while-revalidate window').toBeDefined();
      expect(Number(stale)).toBeGreaterThanOrEqual(
        Number(directive(value, 's-maxage')),
      );
    });

    it('bounds how long a deploy can stay invisible at the edge', () => {
      // The other half of the trade. Raising this is a decision about
      // propagation, not a tuning knob; see the comment in public/_headers.
      expect(
        Number(directive(cacheControl('/*'), 's-maxage')),
      ).toBeLessThanOrEqual(3600);
    });
  });

  describe('content-hashed build output', () => {
    it('is immutable for a year, with nothing left to revalidate', () => {
      expect(cacheControl('/_next/static/*')).toBe(
        'public, max-age=31536000, immutable',
      );
    });

    it('never carries a revalidation directive as well', () => {
      // `max-age=86400, must-revalidate` is what these hashed names were
      // actually served until 2026-09-23. A name that cannot be reused has
      // nothing to re-check.
      for (const pattern of ['/_next/static/*', '/ocr/*']) {
        const value = cacheControl(pattern);
        expect(directive(value, 'immutable'), pattern).toBe('');
        expect(directive(value, 'must-revalidate'), pattern).toBeUndefined();
        expect(directive(value, 'max-age'), pattern).not.toBe('0');
      }
    });
  });

  it('never lets a narrower rule merge with the catch-all policy', () => {
    // Matching rules are combined rather than replaced, so a narrower rule
    // that sets Cache-Control without unsetting it first ships both values at
    // once — including the catch-all's `max-age=0, must-revalidate`, which
    // would silently undo `immutable`.
    const merging = rules
      .filter((rule) => rule.pattern !== '/*')
      .filter((rule) => cacheControlAt(rule, 'set') > -1)
      .filter((rule) => cacheControlAt(rule, 'unset') === -1)
      .map((rule) => rule.pattern);

    expect(
      merging,
      `these set Cache-Control without "! Cache-Control" first: ${merging.join(', ')}`,
    ).toEqual([]);
  });

  it('unsets before it sets, so the removal cannot drop its own value', () => {
    for (const rule of rules) {
      if (cacheControlAt(rule, 'set') === -1) continue;
      if (rule.pattern === '/*') continue;
      expect(
        cacheControlAt(rule, 'unset'),
        `${rule.pattern} removes Cache-Control after setting it, which leaves the rule with nothing`,
      ).toBeLessThan(cacheControlAt(rule, 'set'));
    }
  });

  it('passes the shared policy audit the build guard runs', () => {
    // Same function, same file. If this disagrees with the granular checks
    // above, one of the two is wrong and both are meant to be fixed together.
    expect(auditCachePolicy(rules)).toEqual([]);
  });
});

/**
 * Everything above reads `public/_headers`. That is the file the policy is
 * written in and the wrong file to conclude anything about the live site from:
 * Cloudflare reads `_headers` from the uploaded asset directory, so what
 * actually governs a visitor is `dist/client/_headers`. A build that stopped
 * copying `public/` would leave every test above green while the live site
 * reverted to `max-age=0, must-revalidate` on every page.
 */
describe('the copy the deploy actually uploads', () => {
  const builtPath = path.join(projectRoot, 'dist/client/_headers');

  it('is byte-identical to public/_headers and states the same policy', () => {
    if (!existsSync(builtPath)) {
      // There is no build to inspect yet, which is the normal state when the
      // unit suite runs on its own. This is not a silent pass: the invariant
      // is enforced by scripts/verify-built-headers.mjs on every build, and
      // scripts/build-guards.test.ts fails if that step ever leaves
      // `npm run build`. So an absent dist/ here cannot mean it went
      // unchecked — only that the build is where it gets checked.
      expect(existsSync(path.join(projectRoot, 'dist'))).toBe(false);
      return;
    }
    const builtText = readFileSync(builtPath, 'utf8');
    expect(
      builtText,
      'dist/client/_headers differs from public/_headers — the live site is ' +
        'not serving the reviewed file',
    ).toBe(sourceText);
    expect(auditCachePolicy(parseHeaderRules(builtText))).toEqual([]);
  });
});
