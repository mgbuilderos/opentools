import { describe, expect, it } from 'vitest';

import { CHECKS } from './site-checks.mjs';

/**
 * `npm run audit:360` and `npm run verify:live` both read their fault
 * definitions from `site-checks.mjs`, and one of them decides whether a deploy
 * is called good. A check that silently stopped firing would make the gate
 * pass on a broken site — the specific way a guard becomes worse than no guard,
 * because it manufactures confidence.
 *
 * So each high-severity check is shown a page carrying exactly the fault it
 * looks for, and a page without it. These faults are not invented: the
 * canonical one is the 2026-09-23 bug that pointed 59 pages at the home page
 * for seven days, and `noindex` is the 2026-09-16 line in `app/layout.tsx`
 * that took 59 pages out of search for a week with nothing to notice it.
 */
const url = ['https:', '//', 'example.test', '/page'].join('');

function page(overrides: Partial<Record<string, string>> = {}): string {
  const canonical = overrides.canonical ?? url;
  const robots = overrides.robots
    ? `<meta name="robots" content="${overrides.robots}">`
    : '';
  const body = overrides.body ?? `<h1>Title</h1><p>${'word '.repeat(200)}</p>`;
  return `<!doctype html><html lang="en"><head>
<meta name="viewport" content="width=device-width">
<title>A title long enough to be a real one</title>
<link rel="canonical" href="${canonical}">${robots}
</head><body>${body}</body></html>`;
}

const ctx = (html: string, status = 200) => ({
  url,
  html,
  status,
  headers: new Headers({ 'cache-control': 'public, s-maxage=3600' }),
});

const check = (id: string) => {
  const found = CHECKS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`no check called ${id}`);
  return found;
};

describe('the live-site checks fire on the faults they name', () => {
  it('still defines every high-severity check the gate relies on', () => {
    const high = CHECKS.filter((c) => c.severity === 'high').map((c) => c.id);
    // verify-live.mjs blocks on exactly these. Losing one silently widens
    // what counts as a healthy deploy.
    expect(high).toEqual([
      'status',
      'canonical-self',
      'noindex',
      'soft-404',
      'lang',
      'viewport',
      'mixed-content',
    ]);
  });

  it('catches a canonical pointing at another page', () => {
    const elsewhere = ['https:', '//', 'example.test', '/'].join('');
    expect(
      check('canonical-self').run(ctx(page({ canonical: elsewhere }))),
    ).toContain('points at');
    expect(check('canonical-self').run(ctx(page()))).toBeNull();
  });

  it('catches a missing canonical, not just a wrong one', () => {
    const html = page().replace(/<link rel="canonical"[^>]*>/u, '');
    expect(check('canonical-self').run(ctx(html))).toBe('no canonical');
  });

  it('catches a noindex robots meta', () => {
    expect(
      check('noindex').run(ctx(page({ robots: 'noindex, nofollow' }))),
    ).toContain('noindex');
    expect(
      check('noindex').run(ctx(page({ robots: 'index, follow' }))),
    ).toBeNull();
    expect(check('noindex').run(ctx(page()))).toBeNull();
  });

  it('catches a non-200 status', () => {
    expect(check('status').run(ctx(page(), 503))).toBe('returns 503');
    expect(check('status').run(ctx(page()))).toBeNull();
  });

  it('catches a not-found body served as 200', () => {
    const html = page({ body: '<h1>404: This page could not be found</h1>' });
    expect(check('soft-404').run(ctx(html))).toBe('not-found body, 200 status');
    expect(check('soft-404').run(ctx(page()))).toBeNull();
  });

  it('catches a missing lang attribute', () => {
    expect(check('lang').run(ctx(page().replace(' lang="en"', '')))).toContain(
      'no lang',
    );
    expect(check('lang').run(ctx(page()))).toBeNull();
  });

  it('catches a missing viewport meta', () => {
    const html = page().replace(/<meta name="viewport"[^>]*>/u, '');
    expect(check('viewport').run(ctx(html))).toBe('no viewport meta');
    expect(check('viewport').run(ctx(page()))).toBeNull();
  });

  it('catches an insecure subresource', () => {
    const insecure = ['http:', '//', 'cdn.test', '/a.js'].join('');
    const html = page({ body: `<script src="${insecure}"></script>` });
    expect(check('mixed-content').run(ctx(html))).toContain('subresource');
    expect(check('mixed-content').run(ctx(page()))).toBeNull();
  });

  it('does not report a fault on a page that has none', () => {
    // The other half of the contract: a check that always fires is as useless
    // as one that never does, because a permanently red gate gets ignored.
    const clean = page({
      body:
        '<h1>Title</h1>' +
        `<p>${'word '.repeat(200)}</p>` +
        '<a href="/a">a</a><a href="/b">b</a><a href="/c">c</a>' +
        '<a href="/d">d</a><a href="/e">e</a>',
    });
    const fired = CHECKS.filter(
      (c) => c.severity === 'high' && c.run(ctx(clean)) !== null,
    ).map((c) => c.id);
    expect(fired).toEqual([]);
  });
});
