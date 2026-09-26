/**
 * The verdict, in the one form a browser extension and a Node script can both
 * load directly.
 *
 * ## One implementation, not three
 *
 * This logic was written three times -- here, in `scripts/measure-csp.mjs`, and
 * again for the site -- each copy carrying a comment asking the next maintainer
 * to keep it identical to the others by hand. `e2e/egress-watch.ts` records
 * what that costs: *"two copies of a leak detector is how one of them quietly
 * stops detecting"*, and this is the same hazard pointed at other people's
 * sites, where being wrong is unrecoverable.
 *
 * There are now two, because a `.ts` module cannot be loaded by an unpacked
 * extension and a `.js` one cannot be imported by the site's build:
 *
 *   - `lib/egress/verdict.ts`  the site
 *   - this file                the extension, and `scripts/measure-csp.mjs`,
 *                              which imports it rather than repeating it
 *
 * `lib/egress/verdict-parity.test.ts` runs both over one shared table of cases
 * and fails the build if they ever disagree. The instruction to keep them in
 * step is a test now, not a comment.
 *
 * ## The bug this had, and the site's copy inherited
 *
 * Every earlier copy read `connect-src` alone. `connect-src` is a *fallback*
 * directive: when it is absent the browser falls back to `default-src`, so
 * `default-src 'none'` with no `connect-src` refuses every connection the page
 * can attempt. All three copies reported that CAPABLE -- telling a site doing
 * the strongest possible thing that it was doing the weakest, which is the one
 * direction of error this tool cannot afford to make about someone else.
 *
 * ## The four states
 *
 *   BLOCKED     Connections are refused by the browser: `'none'`, reached
 *               directly or through `default-src`.
 *   RESTRICTED  A source list exists and permits some destinations.
 *   CAPABLE     No restriction applies, so the page may transmit.
 *   UNKNOWN     The policy could not be read. **Not a finding.**
 *
 * CAPABLE is not an accusation and the popup must never render it as one.
 * Server-side processing is a legitimate and dominant architecture, and most
 * products that use it say so plainly. What this measures is that a user has
 * had no way to tell which kind of page they are on.
 */

/** Split a policy into `directive -> raw value`, first occurrence winning. */
export function parsePolicy(policy) {
  const directives = new Map();
  for (const part of String(policy).split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const gap = trimmed.search(/\s/u);
    const name = (gap === -1 ? trimmed : trimmed.slice(0, gap)).toLowerCase();
    const value = gap === -1 ? '' : trimmed.slice(gap + 1).trim();
    if (!directives.has(name)) directives.set(name, value);
  }
  return directives;
}

/**
 * The source list governing connections, honouring the fallback chain.
 *
 * `connect-src` falls back to `default-src`; nothing falls back to
 * `connect-src`. The chain is exactly two long.
 */
export function resolveConnectSource(policy) {
  const directives = parsePolicy(policy);
  const connect = directives.get('connect-src');
  if (connect !== undefined) return { value: connect, viaDefaultSrc: false };
  const fallback = directives.get('default-src');
  if (fallback !== undefined) return { value: fallback, viaDefaultSrc: true };
  return { value: null, viaDefaultSrc: false };
}

function isNone(value) {
  const tokens = value.split(/\s+/u).filter(Boolean);
  return tokens.length === 1 && /^'none'$/iu.test(tokens[0]);
}

export function verdictFromCsp(csp, reportOnly) {
  if (!csp) return { verdict: 'CAPABLE', connectSrc: null, viaDefaultSrc: false };

  const { value, viaDefaultSrc } = resolveConnectSource(csp);
  if (value === null)
    return { verdict: 'CAPABLE', connectSrc: null, viaDefaultSrc: false };

  // An empty source list permits nothing; the browser treats it as 'none'.
  let verdict;
  if (value === '' || isNone(value)) verdict = 'BLOCKED';
  else verdict = 'RESTRICTED';

  // A report-only policy is not enforced by the browser, so it restricts
  // nothing -- not even to a named list. Treating one as protection would be
  // exactly the error this tool exists to stop people making, run in reverse.
  //
  // An earlier version downgraded only BLOCKED, which credited an unenforced
  // policy with restricting while refusing to credit it with blocking. Either
  // the browser enforces a policy or it does not. `connectSrc` is still
  // returned so the popup can show the directive and say it is not enforced.
  if (reportOnly) verdict = 'CAPABLE';

  return {
    verdict,
    connectSrc: value === '' ? "'none'" : value,
    viaDefaultSrc,
  };
}
