/**
 * Turn whatever a visitor pasted into policies `verdictFor` can judge.
 *
 * The input is deliberately unconstrained, because the places a header comes
 * from all format it differently and none of them is wrong:
 *
 *   - `curl -I https://…`            `content-security-policy: connect-src 'none'`
 *   - DevTools "Copy response headers"  same, occasionally with a status line
 *   - DevTools, one header copied     `connect-src 'none'; default-src 'self'`
 *   - A colleague, in a chat message  any of the above, re-wrapped
 *
 * Asking for one of these and rejecting the rest would make the tool feel
 * broken when the visitor did nothing wrong. So: if a line looks like a CSP
 * header take it as one, and if the whole paste looks like a bare policy take
 * *that*, rather than returning nothing and blaming them.
 *
 * A header value may be folded across continuation lines (RFC 9110 deprecates
 * folding, but pasted terminal output wraps anyway), so a line that starts with
 * whitespace and follows a header is appended to it.
 */

import type { PolicyInput } from './verdict';

const CSP_HEADER = /^content-security-policy(-report-only)?\s*:\s*(.*)$/iu;

/** Directive names that make a paste recognisable as a bare policy. */
const LOOKS_LIKE_POLICY =
  /\b(?:connect|default|script|style|img|font|frame|form-action|base-uri|object)-src\b|\bform-action\b|\bbase-uri\b/iu;

export interface ParsedHeaders {
  readonly policies: readonly PolicyInput[];
  /** True when the paste contained no recognisable policy at all. */
  readonly empty: boolean;
  /** How the policies were recognised, for the "what we read" line. */
  readonly source: 'headers' | 'bare-policy' | 'none';
}

export function parsePastedHeaders(input: string): ParsedHeaders {
  const text = input.trim();
  if (!text) return { policies: [], empty: true, source: 'none' };

  const policies: PolicyInput[] = [];
  const lines = text.split(/\r?\n/u);
  let open: { reportOnly: boolean; parts: string[] } | null = null;

  const close = () => {
    if (!open) return;
    const policy = open.parts.join(' ').trim();
    if (policy) policies.push({ policy, reportOnly: open.reportOnly });
    open = null;
  };

  for (const line of lines) {
    const match = CSP_HEADER.exec(line.trim());
    if (match) {
      close();
      open = { reportOnly: Boolean(match[1]), parts: [match[2] ?? ''] };
      continue;
    }
    // A continuation: indented, and we are inside a header. Anything else ends
    // the current header -- including a blank line or another header name.
    if (open && /^\s/u.test(line) && line.trim()) {
      open.parts.push(line.trim());
      continue;
    }
    close();
  }
  close();

  if (policies.length > 0) return { policies, empty: false, source: 'headers' };

  // No header line. If the paste itself reads as a policy, treat it as one --
  // copying a single header's *value* out of DevTools is the common case.
  if (LOOKS_LIKE_POLICY.test(text) && !/^\s*</u.test(text))
    return {
      policies: [{ policy: text, reportOnly: false }],
      empty: false,
      source: 'bare-policy',
    };

  return { policies: [], empty: true, source: 'none' };
}

/**
 * A URL the visitor typed, normalised, or `null` if it cannot be one.
 *
 * `https://` is added when a scheme is missing, because people paste hostnames.
 * Anything that is not http(s) is refused: a `javascript:` or `data:` URL in
 * the box is either a mistake or an attempt to get this page to echo something
 * executable back, and neither has a useful answer.
 */
export function normaliseTarget(input: string): URL | null {
  const text = input.trim();
  if (!text) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/iu.test(text)
    ? text
    : `https://${text}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (!url.hostname.includes('.') && url.hostname !== 'localhost')
      return null;
    return url;
  } catch {
    return null;
  }
}
