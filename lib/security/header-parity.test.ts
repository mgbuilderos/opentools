import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import nextConfig from '@/next.config';
import { parseHeaderRules } from '../../scripts/lib/headers-policy.mjs';
import { NON_EMBED_SOURCE } from './content-security-policy';

/**
 * The two header files must say the same thing, and until now that was a
 * sentence in a comment.
 *
 * `next.config.ts` declares headers through `headers()`, which the Node server
 * applies. That governs the Docker self-host path and `next start`. The
 * Cloudflare deploy never runs it: the Worker serves headers from
 * `public/_headers` and nothing else. Neither file is redundant and neither is
 * authoritative on its own, so a header added to one and not the other ships
 * to half the users and the other half never find out.
 *
 * Both files say so in their own comments — "they must be kept in step by
 * hand" — and being written down did not make it happen. `X-Frame-Options:
 * DENY` was declared in `next.config.ts`, absent from `public/_headers`, and
 * therefore reaching nobody on getopentools.com until it was noticed on
 * 2026-09-19. It was in the comment the whole time.
 *
 * `lib/security/content-security-policy.test.ts` already pins
 * `Content-Security-Policy`, which is how that one header stopped drifting.
 * This does the same for the rest of them.
 */
const projectRoot = path.resolve(import.meta.dirname, '../..');

/**
 * Headers that deliberately exist on one path and not the other. Every entry
 * needs a reason, and the test below fails if one appears that is not listed —
 * so "we meant to do that" has to be written down at the moment it becomes
 * true, not reconstructed later.
 */
const DELIBERATELY_UNMATCHED: Record<string, string> = {
  'X-Robots-Tag':
    'Its value depends on ALLOW_INDEXING at request time. public/_headers is ' +
    'static and cannot read an environment variable, so this cannot be ' +
    'expressed there — which is exactly why setting ALLOW_INDEXING=false does ' +
    'NOT de-index the Cloudflare deploy. To pull the site out of search, ' +
    'change public/robots.txt and add an X-Robots-Tag line to public/_headers ' +
    'by hand. Both files document this; neither can fix it.',
};

const catchAllRule = parseHeaderRules(
  readFileSync(path.join(projectRoot, 'public/_headers'), 'utf8'),
).find((rule) => rule.pattern === '/*');

/*
 * The catch-all used to be `/:path*`. Since 2026-09-24 it is
 * `NON_EMBED_SOURCE`, a negative lookahead that skips `/embed/<tool>` -- the
 * routes other sites may frame. `X-Frame-Options: DENY` has no value meaning
 * "any origin" to override it with, so excluding those routes by pattern is
 * the only way next.config.ts can stop sending it there. The embed rule's own
 * parity is checked in `embed-framing.test.ts`; this file still governs every
 * other page on the site.
 */
const declared = (await nextConfig.headers!()).find(
  (entry) => entry.source === NON_EMBED_SOURCE,
);

describe('next.config.ts and public/_headers ship the same security headers', () => {
  it('finds both sides, so an empty comparison cannot pass', () => {
    expect(catchAllRule, 'public/_headers has no /* rule').toBeDefined();
    expect(
      declared,
      `next.config.ts declares no ${NON_EMBED_SOURCE} headers`,
    ).toBeDefined();
    expect(declared!.headers.length).toBeGreaterThan(5);
    expect(catchAllRule!.lines.length).toBeGreaterThan(5);
  });

  it('serves every header the Node path declares, with the same value', () => {
    const served = new Map(
      catchAllRule!.lines
        .filter((line) => line.kind === 'set')
        .map((line) => [line.name, line.value]),
    );

    const mismatched = declared!.headers
      .filter(({ key }) => !(key in DELIBERATELY_UNMATCHED))
      .filter(({ key, value }) => served.get(key) !== value)
      .map(({ key, value }) =>
        served.has(key)
          ? `${key}: public/_headers says "${served.get(key)}", next.config.ts says "${value}"`
          : `${key} is declared in next.config.ts and absent from public/_headers, ` +
            'so it reaches self-hosters and nobody on getopentools.com',
      );

    expect(mismatched, mismatched.join('\n')).toEqual([]);
  });

  it('has a written reason for every header that is deliberately one-sided', () => {
    // Stops the exclusion list from becoming a place to put inconvenient
    // failures. A new env-dependent header has to be justified here.
    const declaredKeys = declared!.headers.map(({ key }) => key);
    for (const key of Object.keys(DELIBERATELY_UNMATCHED)) {
      expect(
        declaredKeys,
        `${key} is excused from the parity check but next.config.ts no ` +
          'longer declares it; drop it from DELIBERATELY_UNMATCHED',
      ).toContain(key);
      expect(DELIBERATELY_UNMATCHED[key].length).toBeGreaterThan(40);
    }
  });

  it('keeps X-Frame-Options specifically, because that is the one that went missing', () => {
    const served = new Map(
      catchAllRule!.lines
        .filter((line) => line.kind === 'set')
        .map((line) => [line.name, line.value]),
    );
    expect(served.get('X-Frame-Options')).toBe('DENY');
  });

  /**
   * `proxy.ts` is the third header source, and it was outside this guard.
   *
   * It sets headers on the responses it builds, which made it look like a
   * belt-and-braces copy of the other two. It is not, because of how this site
   * is served: `scripts/prerender-to-assets.mjs` writes every public URL to a
   * file in `dist/client/`, and a request that a file answers never reaches the
   * Worker. Every real page is such a file, so a header that lives only in
   * `proxy.ts` reaches almost nobody.
   *
   * Measured against production on 2026-09-26, before the fix:
   *
   *   curl -I https://getopentools.com/                          -> no HSTS
   *   curl -I https://getopentools.com/pdf/merge                 -> no HSTS
   *   curl -I https://getopentools.com/convert/kilograms-to-pounds -> no HSTS
   *
   * while `Strict-Transport-Security` had been declared in `proxy.ts` all
   * along. Same shape as `X-Frame-Options` on 2026-09-19 — declared somewhere,
   * absent from the file the visitor's response is actually built from.
   *
   * The same mechanism is why `proxy.ts`'s plaintext redirect does not protect
   * real pages either: over HTTP, `/guides/pdf-merge-pdf` (no static file)
   * 301s to HTTPS, while `/security` and `/` (static files) answered 200.
   * That half cannot be fixed here — it needs the edge's "Always Use HTTPS".
   */
  it('ships every security header proxy.ts sets, because static pages never reach it', () => {
    const proxySource = readFileSync(
      path.join(projectRoot, 'proxy.ts'),
      'utf8',
    );
    const block = /const responseHeaders = \{([\s\S]*?)\n\} as const;/u.exec(
      proxySource,
    );
    expect(
      block,
      'responseHeaders literal not found in proxy.ts',
    ).not.toBeNull();

    const names = [...block![1]!.matchAll(/^\s*'([A-Za-z-]+)':/gmu)].map(
      (match) => match[1]!,
    );
    expect(
      names.length,
      'parsed no header names from proxy.ts',
    ).toBeGreaterThan(3);

    const served = new Map(
      catchAllRule!.lines
        .filter((line) => line.kind === 'set')
        .map((line) => [line.name, line.value]),
    );
    const missing = names.filter((name) => !served.has(name));
    expect(
      missing,
      `${missing.join(', ')} set in proxy.ts but absent from public/_headers. ` +
        'Static pages are served from dist/client/ without running the Worker, ' +
        'so these reach almost nobody on getopentools.com.',
    ).toEqual([]);
  });
});
