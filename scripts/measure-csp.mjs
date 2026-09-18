#!/usr/bin/env node
/**
 * Measure whether a page is *capable* of transmitting what you give it.
 *
 * This is the engine behind the comparison. It exists as a script rather than a
 * hand-written table for one reason: a table of claims about named companies
 * goes stale and cannot be checked, while a script can be re-run by a sceptic —
 * including by the companies themselves — and will disagree with us out loud if
 * we ever get it wrong.
 *
 *   node scripts/measure-csp.mjs                 # the default comparison set
 *   node scripts/measure-csp.mjs https://x.com   # any URL
 *   node scripts/measure-csp.mjs --json          # machine-readable
 *
 * What it reports, and the distinction that matters:
 *
 *   BLOCKED      `connect-src 'none'` — the browser refuses every fetch, XHR,
 *                WebSocket, EventSource and sendBeacon this page attempts.
 *   RESTRICTED   a `connect-src` exists but permits some origins.
 *   CAPABLE      no `connect-src` restriction, so the page may transmit.
 *   UNKNOWN      we could not reach it. **Not a finding.**
 *
 * CAPABLE is not an accusation. Server-side processing is a legitimate and
 * dominant architecture, and most of these products describe it plainly in
 * their own documentation. The gap this measures is that a user has no way to
 * tell which kind of tool they are using, and no vocabulary to ask.
 *
 * UNKNOWN exists because getting this wrong about a real company is the one
 * unrecoverable mistake here. Some sites refuse automated requests; that says
 * nothing about their CSP. Never let an unreachable host be rendered as a
 * failure.
 */

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';

/** Tool pages, not marketing home pages — the CSP can differ between them. */
const DEFAULT_TARGETS = [
  'https://getopentools.com/pdf/compress',
  'https://smallpdf.com/compress-pdf',
  'https://www.ilovepdf.com/compress_pdf',
  'https://www.pdf24.org/en/',
  'https://tinypng.com/',
  'https://www.sejda.com/compress-pdf',
  'https://www.pdf2go.com/compress-pdf',
  'https://stirlingpdf.io/',
];

async function measure(url) {
  const started = Date.now();
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
    });
    const csp =
      response.headers.get('content-security-policy') ??
      response.headers.get('content-security-policy-report-only') ??
      '';
    const reportOnly =
      !response.headers.get('content-security-policy') &&
      Boolean(response.headers.get('content-security-policy-report-only'));

    const directive = csp
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.toLowerCase().startsWith('connect-src'));
    const value = directive
      ? directive.slice('connect-src'.length).trim()
      : null;

    let verdict;
    if (!csp) verdict = 'CAPABLE';
    else if (!value) verdict = 'CAPABLE';
    else if (/^'none'$/iu.test(value)) verdict = 'BLOCKED';
    else verdict = 'RESTRICTED';

    // A report-only policy is not enforced by the browser, so it cannot block
    // anything. Treating it as protection would be exactly the kind of error
    // this script exists to avoid making about someone else.
    if (reportOnly && verdict === 'BLOCKED') verdict = 'CAPABLE';

    return {
      url,
      status: response.status,
      verdict,
      connectSrc: value,
      reportOnly,
      hasCsp: Boolean(csp),
      ms: Date.now() - started,
    };
  } catch (error) {
    return {
      url,
      status: null,
      verdict: 'UNKNOWN',
      reason: String(error?.message ?? error).slice(0, 80),
      ms: Date.now() - started,
    };
  }
}

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const targets = args.filter((a) => a.startsWith('http'));
const results = [];
for (const url of targets.length ? targets : DEFAULT_TARGETS) {
  results.push(await measure(url));
}

if (asJson) {
  console.log(
    JSON.stringify({ measuredAt: new Date().toISOString(), results }, null, 2),
  );
} else {
  const host = (u) => {
    try {
      return new URL(u).host;
    } catch {
      return u;
    }
  };
  console.log(`Measured ${new Date().toISOString().slice(0, 10)}\n`);
  console.log(
    `${'SITE'.padEnd(26)}${'VERDICT'.padEnd(12)}${'connect-src'.padEnd(20)}NOTE`,
  );
  for (const r of results) {
    const note =
      r.verdict === 'UNKNOWN'
        ? `unreachable from here — not a finding (${r.reason})`
        : r.reportOnly
          ? 'report-only policy; not enforced'
          : '';
    console.log(
      host(r.url).padEnd(26) +
        r.verdict.padEnd(12) +
        String(r.connectSrc ?? '—')
          .slice(0, 18)
          .padEnd(20) +
        note,
    );
  }
  console.log(
    '\nCAPABLE is not an accusation: server-side processing is a legitimate\n' +
      'architecture. It means the page is able to transmit what you give it,\n' +
      'and that you are relying on a promise rather than on enforcement.',
  );
}
