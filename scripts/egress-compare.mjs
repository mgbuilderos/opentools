#!/usr/bin/env node
/**
 * Comparative egress observation across in-browser file tools.
 *
 * WHY THIS EXISTS. `docs/NLNET_APPLICATION_DRAFT.md` already tells funders the
 * protocol "can run at any origin with EGRESS_BASE_URL= — including a
 * competitor's". That was written as a capability and never executed, so the
 * claim has been shipping without a measurement behind it. This runs it.
 *
 * WHAT IT DOES, AND DELIBERATELY DOES NOT DO.
 *
 * It loads a public page in a real browser, exactly as a visitor would, and
 * records two things a visitor's own devtools would show them:
 *
 *   1. the Content-Security-Policy the site serves, and specifically whether
 *      `connect-src` permits the network calls an upload would require;
 *   2. every distinct third-party host the page contacts on load.
 *
 * It does NOT upload a file, create an account, drive another site's tools,
 * inject scripts, or attempt exfiltration anywhere but our own origin. Passive
 * observation of a page you loaded yourself is what a browser does by design;
 * anything beyond it would be testing someone else's system without consent,
 * and the result would be worth less, not more, because nobody could reproduce
 * it without doing the same.
 *
 * WHY THAT LIMITED MEASUREMENT IS STILL THE WHOLE ARGUMENT. A site whose
 * `connect-src` is `'none'` *cannot* send your file anywhere — the browser
 * refuses before any code of theirs runs. A site without that directive may be
 * trustworthy and well-run, but the guarantee is a promise rather than a
 * property, and the difference is the entire point.
 *
 *   node scripts/egress-compare.mjs                     # default target list
 *   node scripts/egress-compare.mjs https://a https://b # explicit origins
 */
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'lib/seo/egress-comparison.json');

/** Public homepages of widely used in-browser file tools, plus our own. */
const DEFAULT_TARGETS = [
  'https://getopentools.com',
  'https://www.ilovepdf.com',
  'https://smallpdf.com',
  'https://tinypng.com',
  'https://www.pdf24.org',
  'https://stirlingpdf.io',
];

/** Read one directive out of a CSP header. */
function directive(csp, name) {
  if (!csp) return null;
  const found = csp
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.toLowerCase().startsWith(`${name} `));
  return found ? found.slice(name.length + 1).trim() : null;
}

async function observe(browser, origin) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const hosts = new Set();
  const self = new URL(origin).host.replace(/^www\./u, '');

  page.on('request', (request) => {
    try {
      const url = new URL(request.url());
      if (url.protocol === 'data:' || url.protocol === 'blob:') return;
      const host = url.host.replace(/^www\./u, '');
      if (host !== self && !host.endsWith(`.${self}`)) hosts.add(url.host);
    } catch {
      // A malformed request URL tells us nothing; skip it.
    }
  });

  let csp = null;
  let status = null;
  let error = null;
  try {
    const response = await page.goto(origin, {
      waitUntil: 'networkidle',
      timeout: 45_000,
    });
    status = response?.status() ?? null;
    const headers = response?.headers() ?? {};
    csp =
      headers['content-security-policy'] ??
      headers['content-security-policy-report-only'] ??
      null;
  } catch (caught) {
    error = caught instanceof Error ? caught.message.slice(0, 120) : 'failed';
  }
  await context.close();

  const connectSrc = directive(csp, 'connect-src');
  const defaultSrc = directive(csp, 'default-src');
  // `connect-src` governs fetch, XHR, WebSocket, EventSource and sendBeacon —
  // every route a page has to send bytes off the device. When it is absent it
  // falls back to `default-src`, and when that is absent too nothing is
  // restricted at all.
  const effective = connectSrc ?? defaultSrc;
  const networkBlocked = effective === "'none'";

  return {
    origin,
    status,
    error,
    servesCsp: Boolean(csp),
    connectSrc,
    defaultSrcFallback: connectSrc ? null : defaultSrc,
    networkBlockedByPolicy: networkBlocked,
    thirdPartyHosts: [...hosts].sort((a, b) => a.localeCompare(b)),
    thirdPartyHostCount: hosts.size,
  };
}

const targets = process.argv.slice(2).length
  ? process.argv.slice(2)
  : DEFAULT_TARGETS;

const browser = await chromium.launch();
const results = [];
for (const origin of targets) {
  process.stdout.write(`observing ${origin} … `);
  const result = await observe(browser, origin);
  results.push(result);
  console.log(
    result.error
      ? `failed (${result.error})`
      : `${result.thirdPartyHostCount} third-party hosts, ` +
          `connect-src ${result.connectSrc ?? '(not set)'}`,
  );
}
await browser.close();

const report = {
  observedAt: new Date().toISOString(),
  method:
    'Loaded each public homepage once in Chromium and recorded the served ' +
    'Content-Security-Policy and every distinct third-party host contacted. ' +
    'No file was uploaded, no account was created and no tool on another ' +
    'site was operated.',
  reproduce: 'node scripts/egress-compare.mjs',
  results,
};
writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
try {
  execFileSync('npx', ['oxfmt', OUT], { cwd: ROOT, stdio: 'ignore' });
} catch {
  console.warn(`Run \`npx oxfmt ${path.relative(ROOT, OUT)}\` before committing.`);
}

const blocked = results.filter((r) => r.networkBlockedByPolicy).length;
console.log(
  `\n${blocked} of ${results.length} sites serve a policy that forbids the ` +
    `network calls an upload needs.`,
);
