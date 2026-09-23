#!/usr/bin/env node
/**
 * Push every sitemap URL to IndexNow.
 *
 * Why this exists: on 2026-09-18 a `site:getopentools.com` search returned no
 * pages from this site, and a search for one of its own exact page titles
 * ("Compress a PDF without uploading it") found nothing in Bing. The site was
 * effectively unindexed. Waiting for a crawler to find 631 URLs on a domain
 * with no inbound links is the slow path; IndexNow is the instant one, it is
 * free, and one submission reaches Bing, Yandex, Seznam and Naver at once.
 * Bing matters beyond Bing — it backs DuckDuckGo, Copilot and ChatGPT search.
 *
 *   node scripts/submit-indexnow.mjs            # submit what has changed
 *   node scripts/submit-indexnow.mjs --all      # submit every sitemap URL
 *   node scripts/submit-indexnow.mjs --dry-run  # show what would be sent
 *   node scripts/submit-indexnow.mjs /pdf/merge /pdf/compress   # just these
 *
 * Run it after a deploy. It is NOT part of `npm run deploy`: submitting is a
 * public assertion that these URLs changed, and that should be a decision
 * someone makes, not a side effect of shipping.
 *
 * IDEMPOTENCE. Resubmitting unchanged URLs is explicitly discouraged by the
 * protocol, and the goodwill it spends is the whole reason this works at all.
 * So the default run submits only URLs whose sitemap `lastmod` is newer than
 * the last successful submission, recorded in `.indexnow-state.json`. That is
 * only trustworthy because `lastmod` is now derived from real content change
 * (see `scripts/build-sitemap-lastmod.mjs`); when it was absent or stamped
 * with the build time there was nothing here worth comparing against.
 *
 * It reads `dist/client/sitemap.xml` -- the file the build just produced and
 * the deploy just published -- rather than fetching the live one, so what is
 * submitted is exactly what was shipped. The key file is still checked over
 * the network, because that one has to be verified against the live site.
 *
 * No dependency: Node's built-in fetch, and a regex over the sitemap because
 * pulling an XML parser in for one <loc> element is not worth a package.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ORIGIN = 'https://getopentools.com';
const HOST = new URL(ORIGIN).host;
const ENDPOINT = 'https://api.indexnow.org/indexnow';
/** IndexNow caps a single submission at 10,000 URLs; larger sets are chunked. */
const MAX_URLS = 10_000;
/** Courtesy gap between chunks. One request per batch is already generous. */
const CHUNK_PAUSE_MS = 2_000;

const root = path.dirname(import.meta.dirname);
const SITEMAP_FILE = path.join(root, 'dist/client/sitemap.xml');
const STATE_FILE = path.join(root, '.indexnow-state.json');
const LOG_FILE = path.join(root, 'dist/indexnow-submitted.txt');

/**
 * The key is whichever `<hex>.txt` sits in `public/`, so the file on disk is
 * the single source of truth. IndexNow verifies ownership by fetching
 * `${ORIGIN}/${key}.txt` and checking it contains exactly the key — if that
 * file stops being served, submissions start failing with 403.
 *
 * Exported because `scripts/verify-indexnow-key.mjs` fails the build when that
 * file goes missing, and it has to ask the same question this script asks. Two
 * copies of "which file is the key" would be one copy too many: the guard
 * would keep passing while the submitter it protects had already broken.
 */
export function keyFromPublicDir() {
  const candidates = readdirSync(path.join(root, 'public')).filter((name) =>
    /^[0-9a-f]{8,128}\.txt$/u.test(name),
  );
  if (candidates.length !== 1) {
    throw new Error(
      `expected exactly one IndexNow key file in public/, found ${candidates.length}`,
    );
  }
  return candidates[0].replace(/\.txt$/u, '');
}

/**
 * Every `<url>` in the built sitemap, as `{ url, lastmod }`.
 *
 * Parsed per `<url>` block rather than by pulling all `<loc>` and all
 * `<lastmod>` separately: an entry without a lastmod would otherwise shift
 * every following pairing by one and silently attach the wrong date to the
 * wrong URL, which is the sort of bug that would submit the wrong set forever
 * without ever erroring.
 */
function sitemapEntries() {
  if (!existsSync(SITEMAP_FILE)) {
    throw new Error(
      `${path.relative(root, SITEMAP_FILE)} is missing -- run \`npm run build\` first`,
    );
  }
  const xml = readFileSync(SITEMAP_FILE, 'utf8');
  const seen = new Set();
  const entries = [];
  for (const block of xml.matchAll(/<url>([\s\S]*?)<\/url>/gu)) {
    const url = (block[1].match(/<loc>([^<]+)<\/loc>/u) ?? [])[1]?.trim();
    // Only URLs on this host are accepted; anything else fails the whole batch.
    if (!url || !url.startsWith(ORIGIN) || seen.has(url)) continue;
    seen.add(url);
    const lastmod = (block[1].match(/<lastmod>([^<]+)<\/lastmod>/u) ?? [])[1];
    entries.push({ url, lastmod: lastmod?.trim() });
  }
  return entries;
}

function readState() {
  if (!existsSync(STATE_FILE)) return {};
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  } catch (error) {
    // A corrupt state file must not silently become "submit everything".
    throw new Error(
      `${path.relative(root, STATE_FILE)} is not valid JSON (${error.message}). ` +
        'Delete it to start over, or fix it.',
    );
  }
}

/**
 * The URLs worth submitting: changed since the last successful run.
 *
 * A URL with no `lastmod` is always included, because "we cannot tell" must
 * not quietly mean "skip it" -- that failure would be invisible.
 *
 * Compared as instants, never as strings. The sitemap writes local-offset
 * timestamps (`2026-09-23T16:35:30+05:30`), the state file writes UTC
 * (`...Z`), and blog posts carry a bare `2026-09-16`. Lexicographic order over
 * those three shapes is meaningless -- it silently reported 1,361 URLs as
 * "changed" against a watermark set in the year 2030 -- and the damage is the
 * kind this script exists to avoid: resubmitting the whole site every run.
 */
function changedSince(entries, since) {
  if (!since) return entries;
  const watermark = new Date(since).getTime();
  if (Number.isNaN(watermark)) {
    throw new Error(
      `lastSubmittedAt in the state file is not a date: ${since}`,
    );
  }
  return entries.filter((entry) => {
    if (!entry.lastmod) return true;
    const changed = new Date(entry.lastmod).getTime();
    return Number.isNaN(changed) || changed > watermark;
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const submitAll = args.includes('--all');
  const explicit = args.filter((arg) => arg.startsWith('/'));

  const key = keyFromPublicDir();

  // Ownership check first: a submission with an unreachable key file is
  // rejected wholesale, and the error gives no hint why.
  const keyUrl = `${ORIGIN}/${key}.txt`;
  const keyResponse = await fetch(keyUrl);
  const keyBody = keyResponse.ok ? (await keyResponse.text()).trim() : '';
  if (keyBody !== key) {
    console.error(
      `✘ key file not serving correctly at ${keyUrl}\n` +
        `  status ${keyResponse.status}, body ${JSON.stringify(keyBody.slice(0, 40))}\n` +
        `  Deploy first — IndexNow fetches this to prove you own the domain.`,
    );
    process.exit(1);
  }
  console.log(`✓ key verified at ${keyUrl}`);

  const state = readState();
  let urlList;
  let reason;

  if (explicit.length > 0) {
    urlList = explicit.map((route) => `${ORIGIN}${route}`);
    reason = 'named on the command line';
  } else {
    const entries = sitemapEntries();
    const since = submitAll ? undefined : state.lastSubmittedAt;
    const selected = changedSince(entries, since);
    urlList = selected.map((entry) => entry.url);
    reason = since
      ? `changed since the last run at ${since}`
      : `every URL in the sitemap (${submitAll ? '--all' : 'no previous run recorded'})`;
    console.log(`  ${entries.length} URLs in dist/client/sitemap.xml`);
  }

  console.log(`  ${urlList.length} to submit — ${reason}`);

  if (urlList.length === 0) {
    // Not an error: it is the protocol working. Nothing changed, so nothing is
    // claimed to have changed.
    console.log('✓ nothing has changed since the last submission');
    return;
  }

  // Log exactly what is going out, in full, before anything is sent. A short
  // set goes to the terminal; a long one would scroll away, so it goes to a
  // file that can be read afterwards.
  if (urlList.length <= 40) {
    for (const url of urlList) console.log(`    ${url}`);
  } else {
    for (const url of urlList.slice(0, 10)) console.log(`    ${url}`);
    console.log(`    ... and ${urlList.length - 10} more`);
    try {
      writeFileSync(LOG_FILE, `${urlList.join('\n')}\n`);
      console.log(`    full list: ${path.relative(root, LOG_FILE)}`);
    } catch {
      // dist/ may not exist when submitting explicit paths. The terminal
      // already has the count and the sample; losing the file is not a reason
      // to abandon the submission.
    }
  }

  if (dryRun) {
    console.log('  --dry-run: nothing submitted, state not advanced');
    return;
  }

  // The protocol caps one submission at 10,000 URLs. Chunking with a pause
  // keeps a future catalogue several times this size working unchanged,
  // rather than failing on the deploy that crosses the line.
  const chunks = [];
  for (let i = 0; i < urlList.length; i += MAX_URLS) {
    chunks.push(urlList.slice(i, i + MAX_URLS));
  }

  const startedAt = new Date().toISOString();
  for (const [index, chunk] of chunks.entries()) {
    if (index > 0) await sleep(CHUNK_PAUSE_MS);
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: HOST,
        key,
        keyLocation: keyUrl,
        urlList: chunk,
      }),
    });
    const text = await response.text();
    // 200 accepted, 202 accepted pending key validation. Both are success.
    if (response.status !== 200 && response.status !== 202) {
      // Fail loudly and do NOT advance the state: a partial run must resubmit
      // the same set next time rather than skip what never arrived.
      console.error(
        `✘ chunk ${index + 1}/${chunks.length} rejected — HTTP ${response.status}: ` +
          text.slice(0, 300),
      );
      process.exit(1);
    }
    console.log(
      `✓ chunk ${index + 1}/${chunks.length}: ${chunk.length} URLs — HTTP ${response.status}`,
    );
  }

  // Only a full success advances the watermark. Explicit-path runs do not
  // touch it at all: they submitted a hand-picked subset, and recording that
  // as "everything up to now is done" would drop whatever else had changed.
  if (explicit.length === 0) {
    writeFileSync(
      STATE_FILE,
      `${JSON.stringify(
        {
          host: HOST,
          lastSubmittedAt: startedAt,
          lastSubmittedCount: urlList.length,
        },
        null,
        2,
      )}\n`,
    );
    console.log(
      `  watermark advanced to ${startedAt} in ${path.relative(root, STATE_FILE)}`,
    );
  }

  console.log(`✓ submitted ${urlList.length} URLs`);
}

/**
 * Only submit when run as a command. `verify-indexnow-key.mjs` imports this
 * file for `keyFromPublicDir`, and an import that also pushed 600 URLs to
 * IndexNow would turn a build guard into a live side effect.
 */
const runAsCommand =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (runAsCommand) {
  main().catch((error) => {
    console.error(`✘ ${error.message}`);
    process.exit(1);
  });
}
