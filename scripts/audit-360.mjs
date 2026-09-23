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
 *
 * The checks themselves live in `scripts/lib/site-checks.mjs`, because
 * `scripts/verify-live.mjs` gates a deploy on the same definitions. This file
 * is the report a person reads; that one is the gate nobody reads until it
 * fails. They must agree on what "correct" means, so there is one list.
 */
import {
  DEFAULT_ORIGIN,
  EmptySitemapError,
  formatFindings,
  sweepSite,
} from './lib/site-checks.mjs';

const args = process.argv.slice(2);
const argOf = (f, d) => {
  const i = args.indexOf(f);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const ORIGIN = argOf('--origin', DEFAULT_ORIGIN);
const AS_JSON = args.includes('--json');
const LIMIT = Number(argOf('--concurrency', '10'));

let result;
try {
  result = await sweepSite({ origin: ORIGIN, concurrency: LIMIT });
} catch (error) {
  if (error instanceof EmptySitemapError) {
    console.error(`${error.message}.`);
    process.exit(2);
  }
  throw error;
}

if (AS_JSON) {
  console.log(
    JSON.stringify(
      {
        origin: result.origin,
        checked: result.urls.length,
        findings: result.findings,
      },
      null,
      2,
    ),
  );
} else {
  console.log(formatFindings(result));
}

process.exit(result.findings.length ? 1 : 0);
