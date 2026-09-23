#!/usr/bin/env node
/**
 * Verifies the LIVE site after a deploy, and refuses to be fooled by a stale
 * read.
 *
 *   node scripts/verify-live.mjs [--origin <url>] [--concurrency 10] [--json]
 *
 * Exit 0  every sitemap URL was served from THIS build and passed every
 *         high-severity check.
 * Exit 1  the live site is genuinely faulty.
 * Exit 2  cannot tell. Nothing was proved either way, and that is reported as
 *         its own outcome rather than folded into success.
 *
 * ## Why exit 2 exists at all
 *
 * The obvious way to write this script is: fetch the pages, run the checks,
 * exit 0 if nothing failed. That script lies. HTML is served with
 * `s-maxage=3600` (see `public/_headers`), so for up to an hour after a deploy
 * Cloudflare can answer from the PREVIOUS build. A checker that reads those
 * bytes sees the old site, finds it healthy — because the old site was
 * healthy, that is why it was deployed — and reports success for a build it
 * never looked at. The worse the new build, the more reassuring the result.
 *
 * "Wait an hour before verifying" is not a fix. It is a fact about the system
 * that a person has to remember, and this whole file exists because facts kept
 * in people's heads are the ones that get skipped.
 *
 * ## How staleness is detected definitively
 *
 * Every page this build produces carries its own build id, inline:
 *
 *     "deploymentVersion":"a07ec3b5afa51c28951d7511ad17df3ae6a4e12e"
 *
 * The id is the commit the build was made from, pinned by `generateBuildId` in
 * `next.config.ts` (a dirty tree gets a random id instead, which is still
 * unique to that build). `dist/server/BUILD_ID` holds the same value on disk.
 *
 * So every response carries the identity of the build that produced it, and
 * this script compares that against the build sitting in `dist/`. There is no
 * timing assumption, no tolerance window, and no sampling: a page served from
 * an older build is identified as such by its own bytes. Verified against this
 * build: 1,422 of 1,423 HTML files carry the stamp, the exception being
 * `404.html`, which is never a sitemap URL.
 *
 * A stale read exits 2, never 0 and never 1 — the content checks that ran
 * against those bytes describe the old build and are not evidence about this
 * one, so reporting them as failures would be as wrong as reporting success.
 *
 * ## The checks themselves
 *
 * Imported from `scripts/lib/site-checks.mjs`, which is also what
 * `npm run audit:360` reports from. One list, so the gate and the report
 * cannot come to different conclusions about the same site.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
  DEFAULT_ORIGIN,
  EmptySitemapError,
  formatFindings,
  RANK,
  sweepSite,
} from './lib/site-checks.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');

const args = process.argv.slice(2);
const argOf = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const ORIGIN = argOf('--origin', DEFAULT_ORIGIN);
const AS_JSON = args.includes('--json');
const CONCURRENCY = Number(argOf('--concurrency', '10'));

/** Exit 2: the honest "I could not establish this" outcome. */
function cannotTell(headline, detail) {
  console.error(`\n  verify-live: CANNOT TELL — ${headline}\n`);
  console.error(`${detail}\n`);
  console.error(
    '  Nothing was proved about the live site. This is not a pass.\n',
  );
  process.exit(2);
}

/** The build id stamped into every page this build produced. */
function stampOf(html) {
  // The stamp sits inside an escaped JSON string in the inline RSC payload, so
  // the quotes are backslash-escaped. Accept either form.
  const match = /deploymentVersion\\?":\\?"([^"\\]+)/.exec(html);
  return match ? match[1] : null;
}

const buildIdFile = path.join(ROOT, 'dist/server/BUILD_ID');
if (!existsSync(buildIdFile)) {
  cannotTell(
    'there is no local build to compare the live site against',
    '  dist/server/BUILD_ID is missing, so this script cannot know which\n' +
      '  build it is supposed to be looking at. Run `npm run build` first.\n\n' +
      '  Without it the only available verdict would be "the live site looks\n' +
      '  fine", which is true of the previous build too and therefore says\n' +
      '  nothing about the deploy you just made.',
  );
}
const EXPECTED = readFileSync(buildIdFile, 'utf8').trim();
if (!EXPECTED) {
  cannotTell(
    'dist/server/BUILD_ID is empty',
    '  The build did not stamp an id, so no response can be attributed to it.',
  );
}

console.log(`  Expecting build ${EXPECTED} at ${ORIGIN}`);

/* Fast pre-check, so a stale or undeployed site is reported in one request
 * rather than after sweeping several hundred URLs. */
let homeHtml;
try {
  const response = await fetch(`${ORIGIN}/`, { redirect: 'manual' });
  homeHtml = await response.text();
  if (response.status !== 200) {
    cannotTell(
      `the home page returned ${response.status}`,
      '  The sweep needs a working site to read. Whatever is wrong here is\n' +
        '  wrong before any per-page check becomes meaningful.',
    );
  }
} catch (error) {
  cannotTell(
    `${ORIGIN} could not be reached`,
    `  ${String(error)}\n\n  No conclusion can be drawn about a site that did not answer.`,
  );
}

const homeStamp = stampOf(homeHtml);
if (homeStamp !== EXPECTED) {
  cannotTell(
    homeStamp
      ? 'the edge is serving an older build'
      : 'the home page carries no build stamp',
    (homeStamp
      ? `    expected  ${EXPECTED}\n    served    ${homeStamp}\n\n` +
        '  The bytes Cloudflare just handed back were produced by a different\n' +
        '  build. Every content check run against them would describe that\n' +
        '  build, not this one, so none of them are reported.\n\n' +
        '  Either the deploy has not happened yet, or it has and the edge is\n' +
        '  still inside the `s-maxage=3600` window from public/_headers and\n' +
        '  answering from its own copy. Purge the zone cache, or re-run this\n' +
        '  once the edge has refreshed — but do not read the earlier run as a\n' +
        '  pass, because it was never looking at this build.'
      : '  No `deploymentVersion` was found in the served HTML. Every page this\n' +
        '  build produces carries one, so either the response is not a page\n' +
        '  from this project or the stamping changed. Until the served bytes\n' +
        '  can be attributed to a build, no result here means anything.') + '',
  );
}

console.log(`  Home page is serving ${EXPECTED} — reading the full sitemap\n`);

/* The sweep. Each page's stamp is recorded as it is fetched, so staleness is
 * established from the same bytes the checks ran against rather than from a
 * separate request that might be answered by a different edge node. */
const stamps = new Map();
let result;
try {
  result = await sweepSite({
    origin: ORIGIN,
    concurrency: CONCURRENCY,
    onPage: ({ url, html, status }) => {
      if (status === 200) stamps.set(url, stampOf(html));
      return [];
    },
  });
} catch (error) {
  if (error instanceof EmptySitemapError) {
    cannotTell(
      'the sitemap could not be read, or lists nothing',
      `  ${error.message}\n\n` +
        '  A sweep of zero URLs finds zero faults. That is not a clean site.',
    );
  }
  throw error;
}

const stale = [...stamps].filter(([, stamp]) => stamp && stamp !== EXPECTED);
const unstamped = [...stamps].filter(([, stamp]) => !stamp);

if (stale.length > 0 || unstamped.length > 0) {
  const lines = [];
  if (stale.length > 0) {
    const seen = [...new Set(stale.map(([, stamp]) => stamp))];
    lines.push(
      `    ${stale.length} of ${stamps.size} pages were served from another build.`,
      `    expected  ${EXPECTED}`,
      `    served    ${seen.join(', ')}`,
      '',
      ...stale.slice(0, 5).map(([url]) => `      - ${url.replace(ORIGIN, '')}`),
      stale.length > 5 ? `      ... and ${stale.length - 5} more` : '',
    );
  }
  if (unstamped.length > 0) {
    lines.push(
      `    ${unstamped.length} pages carried no build stamp, so they could not`,
      '    be attributed to any build.',
      '',
      ...unstamped
        .slice(0, 5)
        .map(([url]) => `      - ${url.replace(ORIGIN, '')}`),
    );
  }
  lines.push(
    '',
    '  The edge is mid-refresh: some nodes have this build and some are still',
    `  inside the s-maxage window. The ${result.findings.length} findings from`,
    '  this sweep mix two builds together and are not reported, because a',
    '  fault attributed to the wrong build is worse than no report.',
  );
  cannotTell(
    'the live site is not uniformly serving this build',
    lines.join('\n'),
  );
}

console.log(
  `  All ${stamps.size} pages served build ${EXPECTED} — the read is fresh\n`,
);

const high = result.findings.filter((finding) => finding.severity === 'high');

if (AS_JSON) {
  console.log(
    JSON.stringify(
      {
        origin: result.origin,
        buildId: EXPECTED,
        checked: result.urls.length,
        fresh: true,
        high: high.length,
        findings: result.findings,
      },
      null,
      2,
    ),
  );
} else {
  console.log(formatFindings(result));
}

if (high.length > 0) {
  const by = new Map();
  for (const finding of high)
    by.set(finding.check, [...(by.get(finding.check) || []), finding]);
  console.error(
    `\n  verify-live: FAILED — ${high.length} high-severity faults on the ` +
      'live site.\n',
  );
  for (const [check, list] of [...by].sort(
    (a, b) => RANK[a[1][0].severity] - RANK[b[1][0].severity],
  )) {
    console.error(`    ${list.length} × ${check}: ${list[0].why}`);
  }
  console.error(
    '\n  These were read from build ' +
      `${EXPECTED}, confirmed page by page, so they are faults in what is\n` +
      '  live right now and not an artefact of a stale cache.\n',
  );
  process.exit(1);
}

console.log(
  `  verify-live: PASSED — ${result.urls.length} URLs, all on build ` +
    `${EXPECTED}, no high-severity faults.\n`,
);
