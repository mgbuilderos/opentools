#!/usr/bin/env node
/**
 * Is the page cache actually working in production right now?
 *
 * Run this before deciding anything about caching. It answers one question the
 * dashboards do not: are pages being stored, or is every request rendering from
 * scratch and serving `no-store`?
 *
 * The signal is two requests to the same URL. A cached page goes MISS then HIT.
 * A page that stays MISS is never stored, which on this setup means either it
 * is deliberately uncached or the KV write allowance for the UTC day is gone.
 *
 * Why the headers have to look like a browser: Cloudflare varies what it does
 * by request shape, and a bare curl can report a state no real visitor sees.
 *
 * Usage:  node scripts/check-cache-health.mjs [origin]
 */

const ORIGIN = process.argv[2] ?? 'https://getopentools.com';

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
};

/** Representative rather than exhaustive: one of each kind that matters. */
const PROBES = [
  { path: '/', expect: 'cached', label: 'homepage' },
  { path: '/pdf/merge', expect: 'cached', label: 'tool page' },
  { path: '/guides', expect: 'cached', label: 'guide hub' },
  {
    path: '/guides/health-and-fitness-bmi-calculator',
    expect: 'cached',
    label: 'guide on the allowlist',
  },
  {
    path: '/guides/pdf-reorder-pdf-pages',
    expect: 'uncached',
    label: 'guide off the allowlist',
  },
];

async function probe(path) {
  const states = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(`${ORIGIN}${path}`, {
      headers: BROWSER_HEADERS,
      redirect: 'manual',
    });
    // Drain the body so the connection is not left hanging.
    await response.arrayBuffer();
    states.push({
      vinext: response.headers.get('x-vinext-cache') ?? '-',
      cf: response.headers.get('cf-cache-status') ?? '-',
      cacheControl: response.headers.get('cache-control') ?? '-',
      status: response.status,
    });
    if (attempt === 0) await new Promise((r) => setTimeout(r, 1500));
  }
  return states;
}

const results = [];
for (const entry of PROBES) {
  const [first, second] = await probe(entry.path);
  const stored = second.vinext === 'HIT';
  const ok = entry.expect === 'cached' ? stored : !stored;
  results.push({ ...entry, first, second, stored, ok });
  console.log(
    `${ok ? 'ok  ' : 'FAIL'}  ${entry.path}\n` +
      `        ${entry.label}, expected ${entry.expect}\n` +
      `        ${first.vinext} -> ${second.vinext}   cf=${second.cf}   ${second.cacheControl}`,
  );
}

const shouldCache = results.filter((r) => r.expect === 'cached');
const noneStored = shouldCache.every((r) => !r.stored);

console.log('');
if (noneStored) {
  console.log(
    'VERDICT: nothing is being stored, including pages that cached yesterday.\n' +
      'That is the shape of an exhausted KV write allowance, not a bad page.\n' +
      'Confirm it with:\n' +
      '  npx wrangler kv key put --namespace-id c9cf54ced0214def91278f73f69316bd "quota-probe" "probe" --remote\n' +
      'A `code: 10048` means the day is spent; it resets at UTC midnight.\n' +
      'Cost is 2 x cached-pages x deploys-per-day. See docs/CACHE_BUDGET.md.',
  );
} else if (results.every((r) => r.ok)) {
  console.log('VERDICT: cache is healthy and the guide allowlist is behaving.');
} else {
  console.log(
    'VERDICT: mixed. Some pages cache and some do not — read the rows above\n' +
      'before touching configuration; a partial result is usually a quota that\n' +
      'ran out midway through warming, not a broken page.',
  );
}

process.exitCode = results.every((r) => r.ok) ? 0 : 1;
