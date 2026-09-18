/**
 * The verdict, kept identical to `scripts/measure-csp.mjs` in the main
 * repository. Two implementations that disagree would be worse than none,
 * because the site and the extension would be telling people different things
 * about the same page.
 *
 *   BLOCKED     connect-src 'none' — the browser refuses every fetch, XHR,
 *               WebSocket, EventSource and sendBeacon this page attempts.
 *   RESTRICTED  a connect-src exists but permits some origins.
 *   CAPABLE     no connect-src restriction, so the page may transmit.
 *   UNKNOWN     we could not read the policy. **Not a finding.**
 *
 * CAPABLE is not an accusation and the popup must never render it as one.
 * Server-side processing is a legitimate and dominant architecture, and most
 * products that use it say so plainly. What this measures is that a user
 * currently has no way to tell which kind of page they are on.
 */
export function verdictFromCsp(csp, reportOnly) {
  if (!csp) return { verdict: 'CAPABLE', connectSrc: null };

  const directive = csp
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.toLowerCase().startsWith('connect-src'));
  const value = directive ? directive.slice('connect-src'.length).trim() : null;

  let verdict;
  if (!value) verdict = 'CAPABLE';
  else if (/^'none'$/iu.test(value)) verdict = 'BLOCKED';
  else verdict = 'RESTRICTED';

  // A report-only policy is not enforced by the browser, so it cannot block
  // anything. Treating it as protection would be exactly the error this tool
  // exists to stop people making.
  if (reportOnly && verdict === 'BLOCKED') verdict = 'CAPABLE';
  return { verdict, connectSrc: value };
}
