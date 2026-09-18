#!/usr/bin/env node
/**
 * Measure whether a page is *capable* of transmitting what you give it.
 *
 * A script rather than a written comparison, for one reason: a table of claims
 * about named companies goes stale and cannot be checked, while a script can be
 * re-run by anyone — including by the companies themselves — and will disagree
 * with us out loud if we ever get it wrong. It names no one but us.
 *
 *   node scripts/measure-csp.mjs https://any.site   # measure whatever you like
 *   node scripts/measure-csp.mjs --json             # machine-readable
 *
 * With no arguments it measures only this site. It ships no list of other
 * people's products — see the note on DEFAULT_TARGETS.
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

/**
 * Only our own site is named here, and that is a rule rather than an oversight.
 *
 * Hardcoding competitors would bake a claim about a named company into the
 * repository, where it goes stale the moment they change a header — and a
 * stale claim about someone else is the one unrecoverable mistake this tool
 * could make. It also makes the output read as an attack from a rival rather
 * than as a measurement, which is weaker: a reader who runs the check on a
 * site they chose reaches the conclusion themselves, and that is worth far
 * more than being told.
 *
 * Pass whatever URLs you want to measure. `lib/seo/live-tools.test.ts` fails
 * the build if a competitor name reappears in this file.
 */
const DEFAULT_TARGETS = ['https://getopentools.com/pdf/compress'];

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
