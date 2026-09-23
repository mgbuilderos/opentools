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
 *   node scripts/submit-indexnow.mjs            # submit every sitemap URL
 *   node scripts/submit-indexnow.mjs --dry-run  # show what would be sent
 *   node scripts/submit-indexnow.mjs /pdf/merge /pdf/compress   # just these
 *
 * Run it after any deploy that adds or meaningfully changes pages. Submitting
 * unchanged URLs repeatedly is discouraged by the protocol and wastes the
 * goodwill that makes this work, so prefer the explicit-path form for a small
 * change.
 *
 * No dependency: Node's built-in fetch, and a regex over the sitemap because
 * pulling an XML parser in for one <loc> element is not worth a package.
 */

import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ORIGIN = 'https://getopentools.com';
const HOST = new URL(ORIGIN).host;
const ENDPOINT = 'https://api.indexnow.org/indexnow';
/** IndexNow caps a single submission at 10,000 URLs. */
const MAX_URLS = 10_000;

const root = path.dirname(import.meta.dirname);

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

async function sitemapUrls() {
  const response = await fetch(`${ORIGIN}/sitemap.xml`);
  if (!response.ok) throw new Error(`sitemap returned ${response.status}`);
  const xml = await response.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gu)].map((match) =>
    match[1].trim(),
  );
  // Only URLs on this host are accepted; anything else fails the whole batch.
  return [...new Set(urls)].filter((url) => url.startsWith(ORIGIN));
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
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

  const urlList = explicit.length
    ? explicit.map((p) => `${ORIGIN}${p}`)
    : await sitemapUrls();

  if (urlList.length === 0) throw new Error('no URLs to submit');
  if (urlList.length > MAX_URLS) {
    throw new Error(`${urlList.length} URLs exceeds the ${MAX_URLS} cap`);
  }

  console.log(`  ${urlList.length} URLs, first: ${urlList[0]}`);
  if (dryRun) {
    console.log('  --dry-run: nothing submitted');
    return;
  }

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key, keyLocation: keyUrl, urlList }),
  });

  const text = await response.text();
  // 200 accepted, 202 accepted pending key validation. Both are success.
  if (response.status === 200 || response.status === 202) {
    console.log(`✓ submitted ${urlList.length} URLs — HTTP ${response.status}`);
    return;
  }
  console.error(`✘ HTTP ${response.status}: ${text.slice(0, 300)}`);
  process.exit(1);
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
