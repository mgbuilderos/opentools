/**
 * The live-site fault checks, and the sweep that runs them over every URL in
 * the sitemap.
 *
 * Extracted from `scripts/audit-360.mjs` so that `scripts/verify-live.mjs` can
 * gate a deploy on the same definitions a person reads in the audit report.
 * Two lists of checks would mean the automated gate and the human report
 * disagreeing about what "correct" means, and the gate is the one nobody
 * reads until it is too late.
 *
 * `audit-360.mjs` remains the CLI: same output, same exit codes.
 *
 * Why any of this exists: on 2026-09-23 a single inherited line in
 * `app/layout.tsx` made 59 pages serve a canonical pointing at the home page,
 * for seven days. The repo read correctly. Only the served bytes were wrong,
 * so no unit test could see it, and a sampled spot-check did not either. These
 * checks ask production and sweep the whole population.
 */

export const DEFAULT_ORIGIN = ['https:', '//', 'getopentools.com'].join('');

export const pick = (h, re) => (h.match(re) || [])[1] ?? null;
export const all = (h, re) => [...h.matchAll(re)].map((m) => m[1]);
export const visible = (h) =>
  h
    .replace(
      /<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g,
      '',
    )
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Ordering for reports: worst first. */
export const RANK = { high: 0, medium: 1, low: 2 };

/**
 * What one fetched page looks like to a check.
 *
 * @typedef {object} PageContext
 * @property {string} url
 * @property {string} html
 * @property {number} status
 * @property {Headers} headers
 */

/**
 * @typedef {object} SiteCheck
 * @property {string} id
 * @property {'high' | 'medium' | 'low'} severity
 * @property {string} why What a failure costs, in one line, for the report.
 * @property {(page: PageContext) => string | null} run Detail, or null to pass.
 */

/**
 * Per-URL checks. `severity` is what a failure costs: 'high' keeps a page out
 * of search or breaks it, 'medium' costs rank or clicks, 'low' is hygiene.
 *
 * `verify-live.mjs` blocks a deploy on 'high' alone, so moving a check between
 * severities changes what counts as a shippable site.
 *
 * @type {SiteCheck[]}
 */
export const CHECKS = [
  {
    id: 'status',
    severity: 'high',
    why: 'a sitemap URL that is not 200 wastes the crawl budget it asked for',
    run: ({ status }) => (status === 200 ? null : `returns ${status}`),
  },

  {
    id: 'canonical-self',
    severity: 'high',
    why: 'the 2026-09-23 bug: a canonical elsewhere asks Google to index that page instead of this one, and two of them ask it to trust neither',
    run: ({ html, url }) => {
      /* Every canonical tag on the page, not just the first, and without
       * assuming Next.js keeps emitting `rel` before `href`.
       *
       * Both of those were holes, and both of them turn this check off rather
       * than fail it. `pick` stops at the first match, so a page that declares
       * its own canonical AND inherits a second one serves two tags, the
       * correct one first, and reads as clean -- while Google, handed two
       * contradicting declarations, honours neither. That is the 2026-09-23
       * fault one step along: the cause there was an inherited canonical in
       * `app/layout.tsx`, and inheritance next to a per-page declaration
       * produces a duplicate, not a wrong single value. An attribute
       * reordering, meanwhile, made the old pattern match nothing at all.
       *
       * Verified against production on 2026-09-26 before the change: 1,464 of
       * 1,464 live URLs serve exactly one canonical, all self-pointing. So this
       * guards a regression rather than reporting a present fault.
       */
      const tags = html.match(/<link\b[^>]*rel="canonical"[^>]*>/g) ?? [];
      if (tags.length === 0) return 'no canonical';
      const hrefOf = (tag) => pick(tag, /href="([^"]*)"/);
      if (tags.length > 1) {
        const hrefs = tags.map((tag) => hrefOf(tag) ?? '(no href)');
        return `${tags.length} canonical tags: ${hrefs.join(', ')}`;
      }
      const href = hrefOf(tags[0]);
      if (href === null) return 'canonical tag has no href';
      return href.replace(/\/$/, '') === url.replace(/\/$/, '')
        ? null
        : `points at ${href}`;
    },
  },

  {
    id: 'noindex',
    severity: 'high',
    why: 'removes the page from search entirely, and silently',
    run: ({ html }) => {
      const r = pick(html, /<meta name="robots" content="([^"]*)"/i);
      return r && /noindex|none/i.test(r) ? `robots meta "${r}"` : null;
    },
  },

  {
    id: 'soft-404',
    severity: 'high',
    why: 'a not-found page served as 200 is counted by Google as a soft 404',
    run: ({ html, status }) =>
      status === 200 &&
      /could not be found|404: This page/i.test(
        html.replace(/<script[\s\S]*?<\/script>/g, ''),
      )
        ? 'not-found body, 200 status'
        : null,
  },

  {
    id: 'lang',
    severity: 'high',
    why: 'without a lang attribute screen readers guess the language and pronounce it wrong',
    run: ({ html }) =>
      /<html[^>]+lang=/i.test(html) ? null : 'html element has no lang',
  },

  {
    id: 'viewport',
    severity: 'high',
    why: 'without a viewport meta the page renders desktop-width on phones and fails mobile ranking',
    run: ({ html }) =>
      /<meta name="viewport"/i.test(html) ? null : 'no viewport meta',
  },

  {
    id: 'title',
    severity: 'medium',
    why: 'a missing or generic title means the page cannot rank for its own subject',
    run: ({ html }) => {
      const t = pick(html, /<title>([^<]*)<\/title>/);
      if (!t) return 'no title';
      if (t.length < 15) return `only ${t.length} chars: "${t}"`;
      if (t.length > 70) return `${t.length} chars — Google truncates past ~60`;
      return null;
    },
  },

  {
    id: 'description',
    severity: 'medium',
    why: 'a missing or stubby description hands Google a snippet of its own choosing',
    run: ({ html }) => {
      const d = pick(html, /<meta name="description" content="([^"]*)"/);
      if (!d) return 'none';
      if (d.length < 50) return `${d.length} chars`;
      if (d.length > 165) return `${d.length} chars — truncated in results`;
      return null;
    },
  },

  {
    id: 'h1',
    severity: 'medium',
    why: 'no h1, or several, and the page states no single subject',
    run: ({ html }) => {
      const n = (html.match(/<h1[\s>]/g) || []).length;
      return n === 1 ? null : `${n} h1 elements`;
    },
  },

  {
    id: 'heading-order',
    severity: 'low',
    why: 'a skipped heading level breaks screen-reader navigation',
    run: ({ html }) => {
      const levels = all(html, /<h([1-6])[\s>]/g).map(Number);
      for (let i = 1; i < levels.length; i += 1)
        if (levels[i] - levels[i - 1] > 1)
          return `h${levels[i - 1]} followed by h${levels[i]}`;
      return null;
    },
  },

  {
    id: 'thin',
    severity: 'medium',
    why: 'a page with little text is a "crawled, currently not indexed" candidate',
    run: ({ html }) => {
      const w = visible(html).split(' ').filter(Boolean).length;
      return w < 150 ? `${w} words of visible text` : null;
    },
  },

  {
    id: 'img-alt',
    severity: 'medium',
    why: 'an image with no alt is invisible to screen readers and to image search',
    run: ({ html }) => {
      const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
      const bad = imgs.filter((t) => !/\balt\s*=/.test(t));
      return bad.length
        ? `${bad.length} of ${imgs.length} img tags have no alt`
        : null;
    },
  },

  {
    id: 'og',
    severity: 'low',
    why: 'without Open Graph tags a shared link renders as a bare URL',
    run: ({ html }) => {
      const missing = ['og:title', 'og:description', 'og:image'].filter(
        (p) => !new RegExp(`property="${p}"`).test(html),
      );
      return missing.length ? `missing ${missing.join(', ')}` : null;
    },
  },

  {
    id: 'jsonld',
    severity: 'medium',
    why: 'malformed structured data is ignored wholesale, losing every rich result on the page',
    run: ({ html }) => {
      const blocks = all(
        html,
        /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
      );
      if (blocks.length === 0) return 'no JSON-LD';
      for (const [i, b] of blocks.entries()) {
        try {
          JSON.parse(b);
        } catch (e) {
          return `block ${i + 1} is not valid JSON: ${e.message}`;
        }
      }
      return null;
    },
  },

  {
    id: 'internal-links',
    severity: 'medium',
    why: 'a page nothing links onward from is a dead end for crawler and reader alike',
    run: ({ html }) => {
      const n = new Set(all(html, /href="(\/[^"#?]*)"/g)).size;
      return n < 5 ? `only ${n} internal links` : null;
    },
  },

  {
    id: 'mixed-content',
    severity: 'high',
    why: 'an http subresource on an https page is blocked by the browser',
    run: ({ html }) => {
      const bad = all(html, /(?:src|href)="(http:\/\/[^"]+)"/g);
      return bad.length
        ? `${bad.length} http:// subresource(s), e.g. ${bad[0]}`
        : null;
    },
  },

  {
    id: 'cache-header',
    severity: 'medium',
    why: 'without s-maxage the CDN revalidates against origin on every request',
    run: ({ headers }) => {
      const c = headers.get('cache-control') || '';
      return /s-maxage/.test(c) ? null : `cache-control lacks s-maxage: "${c}"`;
    },
  },
];

/**
 * Faults that exist only across the whole population, never on one page.
 *
 * Each entry pulls one value out of a page. Two URLs that yield the same value
 * are a fault; a URL that yields nothing is skipped, because a missing tag is
 * a per-page fault that `CHECKS` already reports and one fault should be
 * reported once.
 *
 * `duplicate-og-title` is here because `duplicate-title` passing proved
 * nothing about it. On 2026-09-23 this sweep found 1,413 distinct `<title>`
 * values -- a clean bill -- while 1,335 of the same URLs served ONE `og:title`
 * between them, inherited from `app/layout.tsx` by every page that declares no
 * `openGraph` of its own. The `og` check in `CHECKS` passed all 1,335 too,
 * because the tag was present; it was simply the wrong page's tag. It is
 * `high` for the same reason `duplicate-title` is: this site's distribution
 * plan is people posting links, so a card that names the site instead of the
 * tool is the whole plan failing quietly.
 */
export const POPULATION_CHECKS = [
  {
    id: 'duplicate-title',
    severity: 'high',
    why: 'pages sharing a title compete with each other for one query',
    read: (html) => pick(html, /<title>([^<]*)<\/title>/),
    detail: (value, count) => `${count} pages share "${value.slice(0, 55)}"`,
  },
  {
    id: 'duplicate-description',
    severity: 'medium',
    why: 'a shared description is a duplicate-content signal',
    read: (html) => pick(html, /<meta name="description" content="([^"]*)"/),
    detail: (_value, count) => `${count} pages share one description`,
  },
  {
    id: 'duplicate-og-title',
    severity: 'high',
    why: 'the whole distribution plan is people posting links, and a card that names the site instead of the tool says nothing about what was shared',
    read: (html) => pick(html, /<meta property="og:title" content="([^"]*)"/),
    detail: (value, count) => `${count} pages share "${value.slice(0, 55)}"`,
  },
];

/**
 * Every population fault, from one value -> urls map per check.
 *
 * Split out from `sweepSite` so it can be shown a population and asked what it
 * finds. The three checks it runs had no test between them until the `og:title`
 * fault, which is precisely the shape of guard that decays unnoticed: nothing
 * fails when it stops firing.
 *
 * The maps hold extracted strings rather than pages, so sweeping 1,413 URLs
 * does not mean holding 1,413 documents in memory at once.
 *
 * @param {Map<string, string[]>[]} seen One map per `POPULATION_CHECKS` entry.
 */
export function populationFindings(seen) {
  return POPULATION_CHECKS.flatMap((check, index) =>
    [...(seen[index] ?? new Map())]
      .filter(([, urls]) => urls.length > 1)
      .map(([value, urls]) => ({
        url: urls[0],
        check: check.id,
        detail: check.detail(value, urls.length),
        severity: check.severity,
        why: check.why,
      })),
  );
}

export async function mapLimit(items, limit, fn) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) await fn(items[i++]);
    }),
  );
}

/** Thrown when the sitemap cannot be read, or reads as empty. */
export class EmptySitemapError extends Error {}

export async function sitemapUrls(origin) {
  const response = await fetch(`${origin}/sitemap.xml`);
  if (!response.ok) {
    throw new EmptySitemapError(
      `${origin}/sitemap.xml returned ${response.status}`,
    );
  }
  const text = await response.text();
  const urls = [...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (urls.length === 0) {
    throw new EmptySitemapError(
      `${origin}/sitemap.xml lists no URLs — refusing to report a clean ` +
        'sweep of nothing',
    );
  }
  return urls;
}

/**
 * Fetches every sitemap URL and runs every check, then the faults that are
 * invisible from any single page: duplicate titles and descriptions, orphans,
 * and the site-level singletons.
 *
 * `onPage` is called with each fetched page so a caller can add its own
 * per-URL comparison without a second crawl — `verify-live.mjs` uses it to
 * compare live bytes against `dist/client/`.
 *
 * @returns {Promise<{origin: string, urls: string[], findings: object[]}>}
 */
export async function sweepSite({
  origin = DEFAULT_ORIGIN,
  concurrency = 10,
  onPage = null,
} = {}) {
  const urls = await sitemapUrls(origin);

  const findings = [];
  /* One value -> urls map per population check, in `POPULATION_CHECKS` order. */
  const seen = POPULATION_CHECKS.map(() => new Map());
  const linkTargets = new Set();
  const add = (url, check, detail, severity, why) =>
    findings.push({ url, check, detail, severity, why });

  await mapLimit(urls, concurrency, async (url) => {
    let status;
    let html = '';
    let headers;
    try {
      const res = await fetch(url, { redirect: 'manual' });
      status = res.status;
      headers = res.headers;
      if (status < 400) html = await res.text();
    } catch (error) {
      add(
        url,
        'fetch',
        String(error),
        'high',
        'the page could not be fetched at all',
      );
      return;
    }
    const ctx = { url, html, status, headers };
    for (const c of CHECKS) {
      let detail = null;
      try {
        detail = c.run(ctx);
      } catch (e) {
        detail = `check threw: ${e.message}`;
      }
      if (detail) add(url, c.id, detail, c.severity, c.why);
    }
    if (onPage) {
      for (const extra of (await onPage(ctx)) ?? []) {
        add(url, extra.check, extra.detail, extra.severity, extra.why);
      }
    }
    if (status === 200) {
      POPULATION_CHECKS.forEach((check, index) => {
        const value = check.read(html);
        if (value)
          seen[index].set(value, [...(seen[index].get(value) || []), url]);
      });
      for (const href of all(html, /href="(\/[^"#?]*)"/g))
        linkTargets.add(href.replace(/\/$/, '') || '/');
    }
  });

  /* Population-level faults: invisible from any single page. */
  for (const finding of populationFindings(seen)) findings.push(finding);

  const orphans = urls.filter((u) => {
    const p = u.replace(origin, '').replace(/\/$/, '') || '/';
    return p !== '/' && !linkTargets.has(p);
  });
  for (const u of orphans)
    add(
      u,
      'orphan',
      'in the sitemap but no page on the site links to it',
      'medium',
      'a page reachable only from the sitemap gets little crawl priority and no internal authority',
    );

  /* Site-level singletons. */
  for (const [urlPath, expected] of [
    ['/robots.txt', /Sitemap:/i],
    ['/sitemap.xml', /<loc>/],
  ]) {
    const res = await fetch(`${origin}${urlPath}`);
    const body = await res.text();
    if (res.status !== 200)
      add(
        `${origin}${urlPath}`,
        'site-file',
        `returns ${res.status}`,
        'high',
        'crawlers need this file',
      );
    else if (!expected.test(body))
      add(
        `${origin}${urlPath}`,
        'site-file',
        'content looks wrong',
        'high',
        'crawlers need this file',
      );
  }
  const notFound = await fetch(
    `${origin}/this-page-does-not-exist-audit-probe`,
  );
  if (notFound.status !== 404)
    add(
      `${origin}/…probe`,
      'not-found-status',
      `unknown URL returns ${notFound.status}, not 404`,
      'high',
      'unknown URLs must 404 or Google indexes infinite soft 404s',
    );

  return { origin, urls, findings };
}

/** The human-readable report, grouped by check and ordered worst first. */
export function formatFindings({ origin, urls, findings }) {
  const lines = [];
  const by = new Map();
  for (const f of findings) by.set(f.check, [...(by.get(f.check) || []), f]);
  lines.push(`\n360 sweep — ${urls.length} live URLs at ${origin}`);
  lines.push(
    `${CHECKS.length} per-URL checks, plus ${POPULATION_CHECKS.map((check) => check.id).join(', ')}, orphans, robots.txt, sitemap.xml and 404 handling\n`,
  );
  if (!findings.length) {
    lines.push('  0 faults.\n');
    return lines.join('\n');
  }
  for (const [check, list] of [...by].sort(
    (a, b) =>
      RANK[a[1][0].severity] - RANK[b[1][0].severity] ||
      b[1].length - a[1].length,
  )) {
    lines.push(
      `  [${list[0].severity.toUpperCase()}] ${list.length} × ${check}`,
    );
    lines.push(`        ${list[0].why}`);
    for (const f of list.slice(0, 4))
      lines.push(`        - ${f.url.replace(origin, '') || '/'} : ${f.detail}`);
    if (list.length > 4) lines.push(`        ... and ${list.length - 4} more`);
    lines.push('');
  }
  const n = (s) => findings.filter((f) => f.severity === s).length;
  lines.push(
    `  TOTAL ${findings.length} — high ${n('high')}, medium ${n('medium')}, low ${n('low')}, across ${new Set(findings.map((f) => f.url)).size} URLs\n`,
  );
  return lines.join('\n');
}
