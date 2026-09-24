import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import nextConfig from '@/next.config';
import { parseHeaderRules } from '../../scripts/lib/headers-policy.mjs';
import {
  contentSecurityPolicy,
  EMBED_SOURCE,
  isEmbedRoute,
  NON_EMBED_SOURCE,
} from './content-security-policy';

/**
 * `frame-ancestors 'none'` on every route was an invariant of this site until
 * 2026-09-24, when the owner approved a single exception so other websites can
 * embed a tool (business rule 33 as amended, and
 * `decisions/ADR-019-embed-frame-ancestors.md`).
 *
 * An exception to a security invariant is only as good as the thing that stops
 * it widening. This file is that thing. It fails if the relaxation reaches any
 * route other than `/embed/<tool>`, if an embed page quietly gains network
 * access, or if the two header files stop agreeing about either.
 */
const projectRoot = path.resolve(import.meta.dirname, '../..');
const rules = parseHeaderRules(
  readFileSync(path.join(projectRoot, 'public/_headers'), 'utf8'),
);
const declared = await nextConfig.headers!();

const setLines = (pattern: string) =>
  new Map(
    (rules.find((rule) => rule.pattern === pattern)?.lines ?? [])
      .filter((line) => line.kind === 'set')
      .map((line) => [line.name, line.value]),
  );

const unsetNames = (pattern: string) =>
  new Set(
    (rules.find((rule) => rule.pattern === pattern)?.lines ?? [])
      .filter((line) => line.kind !== 'set')
      .map((line) => line.name),
  );

describe('framing is relaxed on the embed routes and nowhere else', () => {
  it('sends frame-ancestors none on every rule in public/_headers except /embed/*', () => {
    const offenders = rules
      .flatMap((rule) =>
        rule.lines
          .filter(
            (line) =>
              line.kind === 'set' && line.name === 'Content-Security-Policy',
          )
          .map((line) => ({ pattern: rule.pattern, value: line.value })),
      )
      .filter(({ pattern, value }) =>
        pattern === '/embed/*'
          ? !value.includes('frame-ancestors *')
          : !value.includes("frame-ancestors 'none'"),
      );

    expect(
      offenders,
      `these _headers rules have the wrong frame-ancestors:\n${offenders
        .map(({ pattern }) => pattern)
        .join('\n')}`,
    ).toEqual([]);
  });

  it('relaxes framing and nothing else: an embed still has no network access', () => {
    const embed = contentSecurityPolicy({ embeddable: true });
    const normal = contentSecurityPolicy();

    expect(embed).toContain("connect-src 'none'");
    expect(embed).toContain("object-src 'none'");
    expect(embed).toContain("form-action 'none'");
    expect(embed).toContain("webrtc 'block'");
    expect(embed).not.toContain('wasm-unsafe-eval');

    // The two policies must differ in exactly one directive. Anything else
    // that drifts in here is a second relaxation nobody approved.
    const differences = embed
      .split('; ')
      .filter((directive, index) => directive !== normal.split('; ')[index]);
    expect(differences).toEqual(['frame-ancestors *']);
  });

  it('never allows a third-party origin to supply code or receive data', () => {
    // `frame-ancestors *` is the only wildcard the embed policy may contain.
    // A `*` anywhere else would be a hole; so would any scheme.
    const embed = contentSecurityPolicy({ embeddable: true });
    const withoutFrameAncestors = embed
      .split('; ')
      .filter((directive) => !directive.startsWith('frame-ancestors'))
      .join('; ');
    expect(withoutFrameAncestors).not.toMatch(/https?:|\*/u);
  });

  it('drops X-Frame-Options on the embed rule, and only there', () => {
    // DENY would block the frame in any browser that honours the legacy
    // header, whatever frame-ancestors says -- so the unset is load-bearing,
    // not tidiness. A `_headers` rule adds to the earlier one rather than
    // replacing it, so without this line the catch-all's DENY still ships.
    expect(unsetNames('/embed/*')).toContain('X-Frame-Options');
    expect(setLines('/embed/*').has('X-Frame-Options')).toBe(false);
    expect(setLines('/*').get('X-Frame-Options')).toBe('DENY');
  });

  it('lets a COEP: require-corp parent load the frame', () => {
    expect(unsetNames('/embed/*')).toContain('Cross-Origin-Resource-Policy');
    expect(setLines('/embed/*').get('Cross-Origin-Resource-Policy')).toBe(
      'cross-origin',
    );
    expect(setLines('/*').get('Cross-Origin-Resource-Policy')).toBe(
      'same-origin',
    );
  });

  it('keeps the embed copies out of the index and their link followed', () => {
    // Both halves matter. Indexing a stripped copy of a page we are trying to
    // rank splits the signal; nofollowing it would throw away the only thing
    // the programme earns.
    expect(setLines('/embed/*').get('X-Robots-Tag')).toBe('noindex, follow');
  });

  it('excludes the embed prefix from the catch-all in next.config.ts', () => {
    // next.config.ts cannot unset a header, so the only way it can stop
    // sending X-Frame-Options on these routes is not to match them.
    const catchAll = declared.find(
      (entry) => entry.source === NON_EMBED_SOURCE,
    );
    const embed = declared.find((entry) => entry.source === EMBED_SOURCE);

    expect(catchAll, 'no catch-all rule at NON_EMBED_SOURCE').toBeDefined();
    expect(embed, 'no rule at EMBED_SOURCE').toBeDefined();
    expect(
      declared.some((entry) => entry.source === '/:path*'),
      'a plain /:path* rule would match the embed routes again and re-apply DENY',
    ).toBe(false);
    expect(
      catchAll!.headers.map(({ key }) => key),
      'the catch-all is what must carry X-Frame-Options',
    ).toContain('X-Frame-Options');
    expect(embed!.headers.map(({ key }) => key)).not.toContain(
      'X-Frame-Options',
    );
  });

  it('agrees with public/_headers on what an embed response actually carries', () => {
    /*
     * The comparison has to be against the EFFECTIVE headers, not against the
     * `/embed/*` rule read on its own. A `_headers` rule adds to every earlier
     * rule that also matches, so an embed response carries the catch-all's
     * COOP, COEP, Referrer-Policy, X-Content-Type-Options and
     * Permissions-Policy as well -- and `next.config.ts` has to restate all of
     * them, because its rules do replace rather than combine.
     *
     * Reading the embed rule alone is what the first version of this test did,
     * and it demanded five headers be duplicated in `_headers` that were
     * already being served. Duplicating them would have been the genuinely
     * wrong fix: two `Referrer-Policy` lines ship as two lines, which is the
     * same trap `! Cache-Control` exists for.
     */
    const effective = new Map(setLines('/*'));
    for (const name of unsetNames('/embed/*')) effective.delete(name);
    for (const [name, value] of setLines('/embed/*')) {
      effective.set(name, value);
    }

    const mismatched = declared
      .find((entry) => entry.source === EMBED_SOURCE)!
      .headers.filter(({ key, value }) => effective.get(key) !== value)
      .map(
        ({ key, value }) =>
          `${key}: an embed response carries "${effective.get(key) ?? '(absent)'}", ` +
          `next.config.ts declares "${value}"`,
      );
    expect(mismatched, mismatched.join('\n')).toEqual([]);

    // The unset is the whole point, so assert the outcome and not just the
    // line: after combining, an embed response has no X-Frame-Options at all.
    expect(effective.has('X-Frame-Options')).toBe(false);
    expect(effective.get('Cache-Control')).toBe(
      setLines('/*').get('Cache-Control'),
    );
  });

  it('treats /embed itself as an ordinary page, not a framable one', () => {
    // The snippet page is the page meant to rank, and nobody needs to frame
    // it. Letting it inherit the relaxation would widen the exception for no
    // reason at all.
    expect(isEmbedRoute('/embed/table-converter')).toBe(true);
    expect(isEmbedRoute('/embed')).toBe(false);
    expect(isEmbedRoute('/embed/')).toBe(false);
    expect(isEmbedRoute('/embedded-systems')).toBe(false);
    expect(isEmbedRoute('/')).toBe(false);
    expect(isEmbedRoute('/pdf/merge')).toBe(false);
    // `:path+` and not `:path*`, which would also match `/embed`.
    expect(EMBED_SOURCE.endsWith('+')).toBe(true);
  });
});
