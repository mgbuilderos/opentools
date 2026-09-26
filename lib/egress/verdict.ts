/**
 * Can a page transmit what you give it? One implementation, for everyone.
 *
 * ## Why this file exists
 *
 * The same verdict was written three times: `extension/verdict.js`,
 * `scripts/measure-csp.mjs`, and inline in the extension popup. Each carried a
 * comment asking the next maintainer to keep it identical to the others by
 * hand. `e2e/egress-watch.ts` records what that costs -- *"two copies of a leak
 * detector is how one of them quietly stops detecting"* -- and this is the same
 * hazard pointed at other people's sites, where being wrong is unrecoverable.
 *
 * So the logic lives here, the site imports it, and
 * `lib/egress/verdict-parity.test.ts` runs the extension's copy against this
 * one over a shared table. Disagreement fails the build instead of shipping.
 *
 * ## The bug that moving it here exposed
 *
 * All three copies read `connect-src` and nothing else. `connect-src` is a
 * *fallback* directive: when it is absent the browser falls back to
 * `default-src`. So `default-src 'none'` with no `connect-src` blocks every
 * connection the page can attempt -- and all three copies reported it CAPABLE,
 * which is the accusatory direction. A site doing the strongest possible thing
 * was being told it was the weakest.
 *
 * `resolveConnectSource` implements the fallback. The regression is pinned in
 * `verdict.test.ts` under "the fallback that three copies missed".
 *
 * ## The four states
 *
 *   BLOCKED     Connections are refused by the browser: `'none'`, reached
 *               directly or through `default-src`.
 *   RESTRICTED  A source list exists and permits some destinations.
 *   CAPABLE     No restriction applies, so the page may transmit.
 *   UNKNOWN     No policy could be read. **Not a finding**, and never rendered
 *               as one -- some servers refuse automated requests, which says
 *               nothing whatever about their headers.
 *
 * **CAPABLE is not an accusation.** Processing files on a server is a normal,
 * legitimate and dominant architecture, and most products that do it say so
 * plainly. What this measures is that a visitor has had no way to tell which
 * kind of page they are on, and no vocabulary in which to ask.
 */

export type Verdict = 'BLOCKED' | 'RESTRICTED' | 'CAPABLE' | 'UNKNOWN';

export interface PolicyInput {
  /** A `Content-Security-Policy` value. Several may be supplied. */
  readonly policy: string;
  /** True for a `-Report-Only` policy, which the browser does not enforce. */
  readonly reportOnly: boolean;
}

export interface VerdictResult {
  readonly verdict: Verdict;
  /** The effective source list, after `default-src` fallback. */
  readonly connectSrc: string | null;
  /** True when the source list came from `default-src` rather than `connect-src`. */
  readonly viaDefaultSrc: boolean;
  /** True when a policy was present but only in report-only form. */
  readonly reportOnlyOnly: boolean;
  /** Short, factual sentence. Never an accusation. */
  readonly summary: string;
}

/** Split a policy into `directive -> raw value`, lowercased directive names. */
export function parsePolicy(policy: string): Map<string, string> {
  const directives = new Map<string, string>();
  for (const part of policy.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const gap = trimmed.search(/\s/u);
    const name = (gap === -1 ? trimmed : trimmed.slice(0, gap)).toLowerCase();
    const value = gap === -1 ? '' : trimmed.slice(gap + 1).trim();
    // First occurrence wins: a repeated directive in one policy is ignored by
    // the browser, so taking the last would disagree with what actually runs.
    if (!directives.has(name)) directives.set(name, value);
  }
  return directives;
}

/**
 * The source list that governs connections, honouring the fallback chain.
 *
 * `connect-src` falls back to `default-src` when absent. Nothing falls back to
 * `connect-src`, so the chain is exactly two long.
 */
export function resolveConnectSource(policy: string): {
  value: string | null;
  viaDefaultSrc: boolean;
} {
  const directives = parsePolicy(policy);
  const connect = directives.get('connect-src');
  if (connect !== undefined) return { value: connect, viaDefaultSrc: false };
  const fallback = directives.get('default-src');
  if (fallback !== undefined) return { value: fallback, viaDefaultSrc: true };
  return { value: null, viaDefaultSrc: false };
}

/** `'none'` is the only source list that permits nothing. */
function isNone(value: string): boolean {
  const tokens = value.split(/\s+/u).filter(Boolean);
  return tokens.length === 1 && /^'none'$/iu.test(tokens[0]!);
}

function rank(verdict: Verdict): number {
  // Strongest first. Used to intersect several enforced policies.
  return { BLOCKED: 0, RESTRICTED: 1, CAPABLE: 2, UNKNOWN: 3 }[verdict];
}

function verdictForPolicy(policy: string): {
  verdict: Verdict;
  connectSrc: string | null;
  viaDefaultSrc: boolean;
} {
  const { value, viaDefaultSrc } = resolveConnectSource(policy);
  if (value === null)
    return { verdict: 'CAPABLE', connectSrc: null, viaDefaultSrc };
  if (value === '')
    // `connect-src` with an empty value is an empty source list, which permits
    // nothing -- the browser treats it as 'none'.
    return { verdict: 'BLOCKED', connectSrc: "'none'", viaDefaultSrc };
  return {
    verdict: isNone(value) ? 'BLOCKED' : 'RESTRICTED',
    connectSrc: value,
    viaDefaultSrc,
  };
}

/**
 * The verdict for everything a response declared.
 *
 * Several enforced policies **intersect**: a request has to satisfy all of
 * them, so the strictest wins. Report-only policies are excluded from the
 * intersection entirely, because the browser enforces none of them -- reading
 * one as protection is the same mistake this tool exists to stop people
 * making, run in reverse.
 */
export function verdictFor(policies: readonly PolicyInput[]): VerdictResult {
  const enforced = policies.filter(
    (entry) => !entry.reportOnly && entry.policy.trim() !== '',
  );
  const reported = policies.filter(
    (entry) => entry.reportOnly && entry.policy.trim() !== '',
  );

  if (enforced.length === 0) {
    const reportOnlyOnly = reported.length > 0;
    /*
     * A report-only policy restricts nothing, so the verdict is CAPABLE
     * whatever it says -- including when it says `'none'`.
     *
     * This is the case an earlier implementation got half right: it downgraded
     * a report-only `'none'` to CAPABLE but left a report-only source list
     * reported as RESTRICTED, crediting the same unenforced policy with
     * restricting while refusing to credit it with blocking. Either the browser
     * enforces a policy or it does not.
     *
     * The source list is still returned, because a reader is better served by
     * seeing the directive that exists and being told it is not enforced than
     * by being shown nothing at all.
     */
    const declared = reported[0]
      ? verdictForPolicy(reported[0].policy)
      : { connectSrc: null, viaDefaultSrc: false };
    return {
      verdict: 'CAPABLE',
      connectSrc: declared.connectSrc,
      viaDefaultSrc: declared.viaDefaultSrc,
      reportOnlyOnly,
      summary: reportOnlyOnly
        ? 'A policy is declared but only in report-only form, which the browser does not enforce. The page is able to transmit what you give it.'
        : 'No policy restricts where this page may connect, so it is able to transmit what you give it.',
    };
  }

  let strongest = verdictForPolicy(enforced[0]!.policy);
  for (const entry of enforced.slice(1)) {
    const candidate = verdictForPolicy(entry.policy);
    if (rank(candidate.verdict) < rank(strongest.verdict))
      strongest = candidate;
  }

  const summary =
    strongest.verdict === 'BLOCKED'
      ? `The browser refuses every connection this page attempts${
          strongest.viaDefaultSrc ? ', through its default-src fallback' : ''
        }. It cannot send your file anywhere, even if its code tried to.`
      : `Connections are limited to a named list${
          strongest.viaDefaultSrc ? ' inherited from default-src' : ''
        }, so the page may transmit to those destinations.`;

  return { ...strongest, reportOnlyOnly: false, summary };
}

/** Convenience wrapper matching the shape the extension and script use. */
export function verdictFromCsp(
  csp: string | null | undefined,
  reportOnly = false,
): VerdictResult {
  if (!csp) return verdictFor([]);
  return verdictFor([{ policy: csp, reportOnly }]);
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  BLOCKED: 'Cannot send your file anywhere',
  RESTRICTED: 'Can send to a named list of destinations',
  CAPABLE: 'Able to send your file',
  UNKNOWN: 'Could not read the policy',
};

/**
 * The sentence that keeps this tool honest, rendered beside every verdict that
 * is not BLOCKED. It is not a disclaimer to be trimmed later; it is the reason
 * a reader can trust the BLOCKED results.
 */
export const NOT_AN_ACCUSATION =
  'Able to send is not the same as does send. Processing files on a server is a normal and legitimate design, and most products that do it say so openly. This measures capability, never intent — and never whether a page has a bug.';
