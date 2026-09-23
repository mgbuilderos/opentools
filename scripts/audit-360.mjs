#!/usr/bin/env node
/**
 * A 360 sweep of the LIVE site: every URL in the sitemap, every fault class we
 * know how to detect without a headless browser.
 *
 * Exists because on 2026-09-23 a single inherited line in `app/layout.tsx` made
 * 59 pages serve a canonical pointing at the home page for seven days. The repo
 * read correctly; only the served bytes were wrong. Unit tests cannot see that,
 * and a sampled spot-check did not either. So this asks production, sweeps the
 * whole population, and reports a count rather than an opinion.
 *
 *   node scripts/audit-360.mjs [--origin <url>] [--json] [--concurrency 10]
 *
 * Exit 0 only when every check passes. It refuses to pass an empty sitemap.
 */
const args = process.argv.slice(2);
const argOf = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const ORIGIN = argOf('--origin', ['https:', '//', 'getopentools.com'].join(''));
const AS_JSON = args.includes('--json');
const LIMIT = Number(argOf('--concurrency', '10'));

const pick = (h, re) => (h.match(re) || [])[1] ?? null;
const all = (h, re) => [...h.matchAll(re)].map((m) => m[1]);
const visible = (h) => h
  .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g, '')
  .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Per-URL checks. `severity` is what a failure costs: 'high' keeps a page out
 * of search or breaks it, 'medium' costs rank or clicks, 'low' is hygiene.
 */
const CHECKS = [
  { id: 'status', severity: 'high', why: 'a sitemap URL that is not 200 wastes the crawl budget it asked for',
    run: ({ status }) => (status === 200 ? null : `returns ${status}`) },

  { id: 'canonical-self', severity: 'high', why: 'the 2026-09-23 bug: a canonical elsewhere asks Google to index that page instead of this one',
    run: ({ html, url }) => { const c = pick(html, /<link rel="canonical" href="([^"]*)"/);
      if (!c) return 'no canonical';
      return c.replace(/\/$/, '') === url.replace(/\/$/, '') ? null : `points at ${c}`; } },

  { id: 'noindex', severity: 'high', why: 'removes the page from search entirely, and silently',
    run: ({ html }) => { const r = pick(html, /<meta name="robots" content="([^"]*)"/i);
      return r && /noindex|none/i.test(r) ? `robots meta "${r}"` : null; } },

  { id: 'soft-404', severity: 'high', why: 'a not-found page served as 200 is counted by Google as a soft 404',
    run: ({ html, status }) => (status === 200 &&
      /could not be found|404: This page/i.test(html.replace(/<script[\s\S]*?<\/script>/g, '')) ? 'not-found body, 200 status' : null) },

  { id: 'lang', severity: 'high', why: 'without a lang attribute screen readers guess the language and pronounce it wrong',
    run: ({ html }) => (/<html[^>]+lang=/i.test(html) ? null : 'html element has no lang') },

  { id: 'viewport', severity: 'high', why: 'without a viewport meta the page renders desktop-width on phones and fails mobile ranking',
    run: ({ html }) => (/<meta name="viewport"/i.test(html) ? null : 'no viewport meta') },

  { id: 'title', severity: 'medium', why: 'a missing or generic title means the page cannot rank for its own subject',
    run: ({ html }) => { const t = pick(html, /<title>([^<]*)<\/title>/);
      if (!t) return 'no title';
      if (t.length < 15) return `only ${t.length} chars: "${t}"`;
      if (t.length > 70) return `${t.length} chars — Google truncates past ~60`;
      return null; } },

  { id: 'description', severity: 'medium', why: 'a missing or stubby description hands Google a snippet of its own choosing',
    run: ({ html }) => { const d = pick(html, /<meta name="description" content="([^"]*)"/);
      if (!d) return 'none';
      if (d.length < 50) return `${d.length} chars`;
      if (d.length > 165) return `${d.length} chars — truncated in results`;
      return null; } },

  { id: 'h1', severity: 'medium', why: 'no h1, or several, and the page states no single subject',
    run: ({ html }) => { const n = (html.match(/<h1[\s>]/g) || []).length;
      return n === 1 ? null : `${n} h1 elements`; } },

  { id: 'heading-order', severity: 'low', why: 'a skipped heading level breaks screen-reader navigation',
    run: ({ html }) => { const levels = all(html, /<h([1-6])[\s>]/g).map(Number);
      for (let i = 1; i < levels.length; i += 1)
        if (levels[i] - levels[i - 1] > 1) return `h${levels[i - 1]} followed by h${levels[i]}`;
      return null; } },

  { id: 'thin', severity: 'medium', why: 'a page with little text is a "crawled, currently not indexed" candidate',
    run: ({ html }) => { const w = visible(html).split(' ').filter(Boolean).length;
      return w < 150 ? `${w} words of visible text` : null; } },

  { id: 'img-alt', severity: 'medium', why: 'an image with no alt is invisible to screen readers and to image search',
    run: ({ html }) => { const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
      const bad = imgs.filter((t) => !/\balt\s*=/.test(t));
      return bad.length ? `${bad.length} of ${imgs.length} img tags have no alt` : null; } },

  { id: 'og', severity: 'low', why: 'without Open Graph tags a shared link renders as a bare URL',
    run: ({ html }) => { const missing = ['og:title', 'og:description', 'og:image']
        .filter((p) => !new RegExp(`property="${p}"`).test(html));
      return missing.length ? `missing ${missing.join(', ')}` : null; } },

  { id: 'jsonld', severity: 'medium', why: 'malformed structured data is ignored wholesale, losing every rich result on the page',
    run: ({ html }) => { const blocks = all(html, /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g);
      if (blocks.length === 0) return 'no JSON-LD';
      for (const [i, b] of blocks.entries()) {
        try { JSON.parse(b); } catch (e) { return `block ${i + 1} is not valid JSON: ${e.message}`; }
      }
      return null; } },

  { id: 'internal-links', severity: 'medium', why: 'a page nothing links onward from is a dead end for crawler and reader alike',
    run: ({ html }) => { const n = new Set(all(html, /href="(\/[^"#?]*)"/g)).size;
      return n < 5 ? `only ${n} internal links` : null; } },

  { id: 'mixed-content', severity: 'high', why: 'an http subresource on an https page is blocked by the browser',
    run: ({ html }) => { const bad = all(html, /(?:src|href)="(http:\/\/[^"]+)"/g);
      return bad.length ? `${bad.length} http:// subresource(s), e.g. ${bad[0]}` : null; } },

  { id: 'cache-header', severity: 'medium', why: 'without s-maxage the CDN revalidates against origin on every request',
    run: ({ headers }) => { const c = headers.get('cache-control') || '';
      return /s-maxage/.test(c) ? null : `cache-control lacks s-maxage: "${c}"`; } },
];

async function mapLimit(items, limit, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) await fn(items[i++]);
  }));
}

const sitemapText = await (await fetch(`${ORIGIN}/sitemap.xml`)).text();
const urls = [...sitemapText.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (urls.length === 0) { console.error('Empty sitemap — refusing to report a clean sweep of nothing.'); process.exit(2); }

const findings = [];
const titles = new Map(); const descs = new Map(); const linkTargets = new Set();
const add = (url, check, detail, severity, why) => findings.push({ url, check, detail, severity, why });

await mapLimit(urls, LIMIT, async (url) => {
  let status; let html = ''; let headers;
  try {
    const res = await fetch(url, { redirect: 'manual' });
    status = res.status; headers = res.headers;
    if (status < 400) html = await res.text();
  } catch (error) { add(url, 'fetch', String(error), 'high', 'the page could not be fetched at all'); return; }
  const ctx = { url, html, status, headers };
  for (const c of CHECKS) {
    let detail = null;
    try { detail = c.run(ctx); } catch (e) { detail = `check threw: ${e.message}`; }
    if (detail) add(url, c.id, detail, c.severity, c.why);
  }
  if (status === 200) {
    const t = pick(html, /<title>([^<]*)<\/title>/); const d = pick(html, /<meta name="description" content="([^"]*)"/);
    if (t) titles.set(t, [...(titles.get(t) || []), url]);
    if (d) descs.set(d, [...(descs.get(d) || []), url]);
    for (const href of all(html, /href="(\/[^"#?]*)"/g)) linkTargets.add(href.replace(/\/$/, '') || '/');
  }
});

/* Population-level faults: invisible from any single page. */
for (const [v, list] of titles) if (list.length > 1)
  add(list[0], 'duplicate-title', `${list.length} pages share "${v.slice(0, 55)}"`, 'high',
    'pages sharing a title compete with each other for one query');
for (const [, list] of descs) if (list.length > 1)
  add(list[0], 'duplicate-description', `${list.length} pages share one description`, 'medium',
    'a shared description is a duplicate-content signal');

const orphans = urls.filter((u) => {
  const p = u.replace(ORIGIN, '').replace(/\/$/, '') || '/';
  return p !== '/' && !linkTargets.has(p);
});
for (const u of orphans)
  add(u, 'orphan', 'in the sitemap but no page on the site links to it', 'medium',
    'a page reachable only from the sitemap gets little crawl priority and no internal authority');

/* Site-level singletons. */
for (const [path, expect] of [['/robots.txt', /Sitemap:/i], ['/sitemap.xml', /<loc>/]]) {
  const res = await fetch(`${ORIGIN}${path}`);
  const body = await res.text();
  if (res.status !== 200) add(`${ORIGIN}${path}`, 'site-file', `returns ${res.status}`, 'high', 'crawlers need this file');
  else if (!expect.test(body)) add(`${ORIGIN}${path}`, 'site-file', 'content looks wrong', 'high', 'crawlers need this file');
}
const notFound = await fetch(`${ORIGIN}/this-page-does-not-exist-audit-probe`);
if (notFound.status !== 404)
  add(`${ORIGIN}/…probe`, 'not-found-status', `unknown URL returns ${notFound.status}, not 404`, 'high',
    'unknown URLs must 404 or Google indexes infinite soft 404s');

const RANK = { high: 0, medium: 1, low: 2 };
if (AS_JSON) console.log(JSON.stringify({ origin: ORIGIN, checked: urls.length, findings }, null, 2));
else {
  const by = new Map();
  for (const f of findings) by.set(f.check, [...(by.get(f.check) || []), f]);
  console.log(`\n360 sweep — ${urls.length} live URLs at ${ORIGIN}`);
  console.log(`${CHECKS.length} per-URL checks, plus duplicate title/description, orphans, robots.txt, sitemap.xml and 404 handling\n`);
  if (!findings.length) console.log('  0 faults.\n');
  else {
    for (const [check, list] of [...by].sort((a, b) =>
      RANK[a[1][0].severity] - RANK[b[1][0].severity] || b[1].length - a[1].length)) {
      console.log(`  [${list[0].severity.toUpperCase()}] ${list.length} × ${check}`);
      console.log(`        ${list[0].why}`);
      for (const f of list.slice(0, 4)) console.log(`        - ${f.url.replace(ORIGIN, '') || '/'} : ${f.detail}`);
      if (list.length > 4) console.log(`        ... and ${list.length - 4} more`);
      console.log('');
    }
    const n = (s) => findings.filter((f) => f.severity === s).length;
    console.log(`  TOTAL ${findings.length} — high ${n('high')}, medium ${n('medium')}, low ${n('low')}, across ${new Set(findings.map((f) => f.url)).size} URLs\n`);
  }
}
process.exit(findings.length ? 1 : 0);
