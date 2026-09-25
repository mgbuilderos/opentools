import { describe, expect, it } from 'vitest';

import {
  CHECKS,
  POPULATION_CHECKS,
  populationFindings,
} from './site-checks.mjs';

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

  /**
   * The 2026-09-23 fault one step along. Its cause was an inherited canonical in
   * `app/layout.tsx`; a page that also declares its own therefore serves TWO
   * tags, the correct one first, and Google honours neither. Reading only the
   * first tag -- which is what `pick` does -- calls that page clean.
   */
  it('catches a second canonical hiding behind a correct one', () => {
    const home = ['https:', '//', 'example.test', '/'].join('');
    const html = page().replace(
      `<link rel="canonical" href="${url}">`,
      `<link rel="canonical" href="${url}"><link rel="canonical" href="${home}">`,
    );
    const detail = check('canonical-self').run(ctx(html));
    expect(detail).toContain('2 canonical tags');
    expect(detail).toContain(home);
  });

  /**
   * Attribute order is Next.js's to choose. The old pattern required `rel`
   * before `href` and so would have matched nothing at all on a reordering --
   * reporting 'no canonical' for 1,464 correct pages, which is the same guard
   * failing in the opposite direction.
   */
  it('reads a canonical whose attributes are in the other order', () => {
    const html = page().replace(
      `<link rel="canonical" href="${url}">`,
      `<link href="${url}" rel="canonical"/>`,
    );
    expect(check('canonical-self').run(ctx(html))).toBeNull();
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

/**
 * The population checks had no test between them, and one of them was wrong
 * about the site for seven days.
 *
 * On 2026-09-23 this sweep reported 1,413 distinct `<title>` values and passed
 * the site, while 1,335 of those same URLs served ONE `og:title` between them
 * -- `OpenTools — Fast, Private Browser Utilities` -- inherited from
 * `app/layout.tsx` by every page that declares no `openGraph` of its own. The
 * per-page `og` check above passed all 1,335 as well, because the tag was
 * there; it was simply the wrong page's tag.
 *
 * Population faults are the ones no single page reveals, which is also why
 * they decay unnoticed: a `read` that stops matching reports a site of 1,413
 * identical cards as a site of none, and nothing goes red. So each check is
 * shown a population carrying exactly its fault, and one carrying none.
 */
describe('the population checks fire on faults no single page shows', () => {
  const at = (id: string) => {
    const index = POPULATION_CHECKS.findIndex((check) => check.id === id);
    if (index < 0) throw new Error(`no population check called ${id}`);
    return index;
  };

  /** Maps in `POPULATION_CHECKS` order, built the way `sweepSite` builds them. */
  const sweep = (pages: { url: string; html: string }[]) => {
    const seen = POPULATION_CHECKS.map(() => new Map<string, string[]>());
    for (const { url, html } of pages) {
      POPULATION_CHECKS.forEach((check, index) => {
        const value = check.read(html);
        if (value)
          seen[index]!.set(value, [...(seen[index]!.get(value) ?? []), url]);
      });
    }
    return populationFindings(seen);
  };

  it('still defines the three checks, at the severities the gate blocks on', () => {
    // verify-live.mjs blocks on every high-severity finding. Dropping one of
    // these to `medium` widens what counts as a healthy deploy in silence.
    expect(
      POPULATION_CHECKS.map((check) => [check.id, check.severity]),
    ).toEqual([
      ['duplicate-title', 'high'],
      ['duplicate-description', 'medium'],
      ['duplicate-og-title', 'high'],
    ]);
  });

  it('reads the value each check counts over', () => {
    const html =
      '<head><title>A title</title>' +
      '<meta name="description" content="A description"/>' +
      '<meta property="og:title" content="A card headline"/></head>';
    expect(POPULATION_CHECKS[at('duplicate-title')]!.read(html)).toBe(
      'A title',
    );
    expect(POPULATION_CHECKS[at('duplicate-description')]!.read(html)).toBe(
      'A description',
    );
    expect(POPULATION_CHECKS[at('duplicate-og-title')]!.read(html)).toBe(
      'A card headline',
    );
    for (const check of POPULATION_CHECKS) {
      expect(check.read('<head></head>')).toBeNull();
    }
  });

  /**
   * The 2026-09-23 fault in miniature: distinct titles, one shared card. A
   * check that only read `<title>` calls this population clean.
   */
  it('catches a shared og:title on pages whose own titles are distinct', () => {
    const tool = (name: string) =>
      `<title>${name} · OpenTools</title>` +
      `<meta name="description" content="Do ${name} in your browser."/>` +
      '<meta property="og:title" content="OpenTools — Fast, Private Browser Utilities"/>';

    const findings = sweep([
      { url: '/pdf/merge', html: tool('Merge PDF') },
      { url: '/pdf/split', html: tool('Split PDF') },
      { url: '/image/crop', html: tool('Crop Image') },
    ]);

    expect(findings.map((finding) => finding.check)).toEqual([
      'duplicate-og-title',
    ]);
    expect(findings[0]!.severity).toBe('high');
    expect(findings[0]!.url).toBe('/pdf/merge');
    expect(findings[0]!.detail).toBe(
      '3 pages share "OpenTools — Fast, Private Browser Utilities"',
    );
  });

  it('catches a shared title and a shared description too', () => {
    const findings = sweep([
      {
        url: '/a',
        html:
          '<title>One title</title>' +
          '<meta name="description" content="One description"/>' +
          '<meta property="og:title" content="Card A"/>',
      },
      {
        url: '/b',
        html:
          '<title>One title</title>' +
          '<meta name="description" content="One description"/>' +
          '<meta property="og:title" content="Card B"/>',
      },
    ]);
    expect(findings.map((finding) => finding.check).sort()).toEqual([
      'duplicate-description',
      'duplicate-title',
    ]);
  });

  /**
   * The other half of the contract. A check that always fires is as useless as
   * one that never does, because a permanently red gate gets ignored -- and a
   * page missing a tag entirely must be left to the per-page `og` check rather
   * than counted here as a duplicate absence.
   */
  it('reports nothing on a population where every page is its own', () => {
    expect(
      sweep([
        {
          url: '/a',
          html:
            '<title>Title A</title>' +
            '<meta name="description" content="Description A"/>' +
            '<meta property="og:title" content="Card A"/>',
        },
        {
          url: '/b',
          html:
            '<title>Title B</title>' +
            '<meta name="description" content="Description B"/>' +
            '<meta property="og:title" content="Card B"/>',
        },
        { url: '/c', html: '<head></head>' },
        { url: '/d', html: '<head></head>' },
      ]),
    ).toEqual([]);
  });
});
