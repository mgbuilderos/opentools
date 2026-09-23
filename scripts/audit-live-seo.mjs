#!/usr/bin/env node
/**
 * Sweep the LIVE site for the whole class of silent indexing faults.
 *
 * Written 2026-09-23 after a single inherited line in `app/layout.tsx` made 59
 * pages -- every PDF tool, every image tool, all fourteen workbenches -- serve
 * a canonical pointing at the home page for seven days. Nothing in the repo was
 * wrong to read; it was only wrong when served. Unit tests cannot see that, and
 * a sampled spot-check did not either.
 *
 * So this asks the live site, every URL in its own sitemap, and reports a count
 * rather than an opinion. Exit 0 means zero faults.
 *
 *   node scripts/audit-live-seo.mjs [--origin https://example.com] [--json]
 */
const args = process.argv.slice(2);
const argOf = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const ORIGIN = argOf('--origin', ['https:', '//', 'getopentools.com'].join(''));
const AS_JSON = args.includes('--json');
const CONCURRENCY = Number(argOf('--concurrency', '10'));

const get = async (url) => {
  const res = await fetch(url, { redirect: 'manual' });
  const body = res.status < 400 ? await res.text() : '';
  return { status: res.status, headers: res.headers, body };
};

const pick = (html, re) => (html.match(re) || [])[1] ?? null;

/** Every check is one function so a new failure mode is one entry, not a rewrite. */
const CHECKS = [
  {
    id: 'status',
    why: 'a sitemap URL that does not return 200 wastes the crawl budget it was submitted for',
    run: ({ status }) => (status === 200 ? null : `returns ${status}`),
  },
  {
    id: 'canonical-self',
    why: 'THE 2026-09-23 BUG: a canonical pointing elsewhere asks Google to index that page instead of this one',
    run: ({ html, url }) => {
      const c = pick(html, /<link rel="canonical" href="([^"]*)"/);
      if (!c) return 'no canonical';
      const want = url.replace(/\/$/, '');
      return c.replace(/\/$/, '') === want ? null : `canonical points at ${c}`;
    },
  },
  {
    id: 'noindex',
    why: 'a robots meta of noindex removes the page from search entirely, silently',
    run: ({ html }) => {
      const r = pick(html, /<meta name="robots" content="([^"]*)"/i);
      return r && /noindex|none/i.test(r) ? `robots meta says "${r}"` : null;
    },
  },
  {
    id: 'title',
    why: 'a missing or site-wide title means the page cannot rank for its own subject',
    run: ({ html }) => {
      const t = pick(html, /<title>([^<]*)<\/title>/);
      if (!t) return 'no title';
      if (t.length < 15) return `title too short: "${t}"`;
      return null;
    },
  },
  {
    id: 'description',
    why: 'a missing description hands Google a snippet of its own choosing',
    run: ({ html }) => {
      const d = pick(html, /<meta name="description" content="([^"]*)"/);
      if (!d) return 'no meta description';
      if (d.length < 50) return `description too short (${d.length} chars)`;
      return null;
    },
  },
  {
    id: 'h1',
    why: 'no h1, or several, and the page states no single subject',
    run: ({ html }) => {
      const n = (html.match(/<h1[\s>]/g) || []).length;
      return n === 1 ? null : `${n} h1 elements`;
    },
  },
  {
    id: 'thin',
    why: 'a page with almost no text is a "crawled, currently not indexed" candidate',
    run: ({ html }) => {
      const text = html
        .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const words = text.split(' ').filter(Boolean).length;
      return words < 150 ? `only ${words} words of visible text` : null;
    },
  },
  {
    id: 'soft-404',
    why: 'a not-found page served as 200 is counted by Google as a soft 404',
    run: ({ html, status }) =>
      status === 200 &&
      /could not be found|404: This page/i.test(
        html.replace(/<script[\s\S]*?<\/script>/g, ''),
      )
        ? 'says not-found in the body but returns 200'
        : null,
  },
];

async function mapLimit(items, limit, fn) {
  const out = Array.from({ length: items.length });
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const n = i++;
        out[n] = await fn(items[n]);
      }
    }),
  );
  return out;
}

const sitemap = await (await fetch(`${ORIGIN}/sitemap.xml`)).text();
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (urls.length === 0) {
  console.error(
    'No URLs in sitemap — refusing to report a clean sweep of nothing.',
  );
  process.exit(2);
}

const findings = [];
const titles = new Map();
const descriptions = new Map();

await mapLimit(urls, CONCURRENCY, async (url) => {
  let res;
  try {
    res = await get(url);
  } catch (error) {
    findings.push({ url, check: 'fetch', detail: String(error) });
    return;
  }
  const ctx = { url, html: res.body, status: res.status, headers: res.headers };
  for (const check of CHECKS) {
    const detail = check.run(ctx);
    if (detail) findings.push({ url, check: check.id, detail, why: check.why });
  }
  if (res.status === 200) {
    const t = pick(res.body, /<title>([^<]*)<\/title>/);
    const d = pick(res.body, /<meta name="description" content="([^"]*)"/);
    if (t) titles.set(t, [...(titles.get(t) || []), url]);
    if (d) descriptions.set(d, [...(descriptions.get(d) || []), url]);
  }
});

/* Duplicates are only visible across the whole population, never per page. */
for (const [value, list] of titles) {
  if (list.length > 1)
    findings.push({
      url: list[0],
      check: 'duplicate-title',
      detail: `${list.length} pages share the title "${value.slice(0, 60)}"`,
      why: 'pages sharing a title compete with each other for the same query',
    });
}
for (const [, list] of descriptions) {
  if (list.length > 1)
    findings.push({
      url: list[0],
      check: 'duplicate-description',
      detail: `${list.length} pages share one description`,
      why: 'a shared description is a duplicate-content signal',
    });
}

if (AS_JSON) {
  console.log(
    JSON.stringify({ origin: ORIGIN, checked: urls.length, findings }, null, 2),
  );
} else {
  const byCheck = new Map();
  for (const f of findings)
    byCheck.set(f.check, [...(byCheck.get(f.check) || []), f]);
  console.log(`\nSwept ${urls.length} live URLs at ${ORIGIN}`);
  console.log(
    `Checks run per URL: ${CHECKS.map((c) => c.id).join(', ')}, plus duplicate title/description across the whole set\n`,
  );
  if (findings.length === 0) {
    console.log('  0 faults found.\n');
  } else {
    for (const [check, list] of [...byCheck].sort(
      (a, b) => b[1].length - a[1].length,
    )) {
      console.log(`  ${String(list.length).padStart(5)}  ${check}`);
      console.log(`         ${list[0].why ?? ''}`);
      for (const f of list.slice(0, 5))
        console.log(`         - ${f.url.replace(ORIGIN, '')} : ${f.detail}`);
      if (list.length > 5)
        console.log(`         ... and ${list.length - 5} more`);
      console.log('');
    }
    console.log(
      `  TOTAL ${findings.length} faults across ${new Set(findings.map((f) => f.url)).size} URLs\n`,
    );
  }
}
process.exit(findings.length === 0 ? 0 : 1);
