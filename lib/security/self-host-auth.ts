/**
 * Optional gate for self-hosted deployments. **Off unless configured.**
 *
 * The public site must never require a credential — no account, no signup, is
 * the product. This exists for the other deployment: an organisation running
 * the container inside its own network, where "anyone who can reach the port
 * gets the site" is the reason their security reviewer will not sign it off.
 *
 * That is the gap between a project and something a company can deploy, and it
 * is deliberately narrow. Neither mode here is an identity system: this file
 * stores nobody, issues no session, and keeps no record between requests.
 *
 * **Two modes, and never both at once.**
 *
 * 1. `OPENTOOLS_AUTH_USER` + `OPENTOOLS_AUTH_PASSWORD` — HTTP Basic over
 *    whatever TLS the operator terminates in front. One shared credential for
 *    the whole instance. It answers "is this person allowed to reach this
 *    instance at all" and nothing about who they are.
 *
 * 2. `OPENTOOLS_AUTH_TRUSTED_HEADER` + `OPENTOOLS_AUTH_PROXY_SECRET` — the
 *    organisation's own single sign-on terminates in a proxy in front
 *    (oauth2-proxy, Authelia, an identity-aware gateway, a reverse proxy bound
 *    to a directory), and that proxy forwards the authenticated name in a
 *    header. This is the mode that answers a procurement review asking for SSO
 *    without this container ever learning a directory, storing an account, or
 *    holding a password — their identity provider stays the only system that
 *    knows who anybody is.
 *
 *    **A forwarded header is a claim, not proof.** Anything that can reach the
 *    port can invent one, so mode 2 also requires a shared secret that the
 *    proxy sends and an ordinary client does not have. Configuring the header
 *    without the secret does not start the mode; it refuses every request. That
 *    is deliberate: the failure an operator must never get is an instance that
 *    looks gated and believes whatever a browser tells it.
 *
 * Fails closed in every direction: half-configured, both-configured, wrong
 * secret and missing identity each refuse every request rather than admit one.
 */

export interface SelfHostCredentials {
  user: string;
  password: string;
}

export type AuthOutcome =
  | { kind: 'disabled' }
  /*
   * `identity` is present only in trusted-proxy mode, is the name the operator's
   * own proxy authenticated, and is never stored. It reaches the visit log only
   * when the operator sets OPENTOOLS_AUDIT_IDENTITY — see `proxy.ts`.
   */
  | { kind: 'allowed'; identity?: string }
  /* 401 with a WWW-Authenticate header. Basic mode only. */
  | { kind: 'challenge' }
  /*
   * 403. Trusted-proxy mode answers this rather than 401 because there is
   * nothing a browser could usefully re-send: the credential belongs to the
   * proxy, so prompting the person in front of the screen for one can only ever
   * fail, and a Basic dialog they cannot satisfy reads as a broken site rather
   * than a misrouted request.
   */
  | { kind: 'refused'; reason: RefusalReason };

export type RefusalReason =
  /* Both modes configured at once. Refuses rather than silently picking one. */
  | 'ambiguous-configuration'
  /* Trusted-proxy mode named a header but no secret, or a secret but no header. */
  | 'incomplete-proxy-configuration'
  /* The request did not carry the shared secret: it did not come via the proxy. */
  | 'not-from-the-proxy'
  /* It came via the proxy, which forwarded no authenticated name. */
  | 'no-identity-forwarded';

/**
 * Reads credentials from the environment. Returns null when the gate is off,
 * which is the case for the public site and for a container started without
 * them.
 *
 * Both values must be present and non-empty. A configured user with an empty
 * password is a misconfiguration that would otherwise admit everyone, so it is
 * treated as "configured but impossible to satisfy" rather than "off".
 */
export function readCredentials(
  env: Record<string, string | undefined>,
): SelfHostCredentials | null | 'misconfigured' {
  const user = env.OPENTOOLS_AUTH_USER?.trim() ?? '';
  const password = env.OPENTOOLS_AUTH_PASSWORD ?? '';
  if (!user && !password) return null;
  if (!user || !password) return 'misconfigured';
  return { user, password };
}

/** What mode 2 needs. Both fields are required; see `readTrustedProxy`. */
export interface TrustedProxyConfig {
  /** Header the proxy puts the authenticated name in, e.g. `x-forwarded-user`. */
  identityHeader: string;
  /** Header carrying the shared secret. Defaults to `x-opentools-proxy-secret`. */
  secretHeader: string;
  /** The secret itself, compared in constant time. */
  secret: string;
}

/** The default name for the secret header, when the operator does not choose one. */
export const DEFAULT_PROXY_SECRET_HEADER = 'x-opentools-proxy-secret';

/**
 * Reads trusted-proxy configuration. Null when the mode is off.
 *
 * Returns `'misconfigured'` when exactly one of the two required variables is
 * set. That is the case worth being strict about: an operator who sets the
 * header and forgets the secret has built an instance that believes any browser
 * claiming to be anyone, and would have no way to notice. Refusing every
 * request is loud, and a loud failure on the day of the rollout is far cheaper
 * than a quiet one found by an auditor.
 */
export function readTrustedProxy(
  env: Record<string, string | undefined>,
): TrustedProxyConfig | null | 'misconfigured' {
  const identityHeader = env.OPENTOOLS_AUTH_TRUSTED_HEADER?.trim() ?? '';
  const secret = env.OPENTOOLS_AUTH_PROXY_SECRET?.trim() ?? '';
  if (!identityHeader && !secret) return null;
  if (!identityHeader || !secret) return 'misconfigured';
  const secretHeader =
    env.OPENTOOLS_AUTH_PROXY_SECRET_HEADER?.trim() ||
    DEFAULT_PROXY_SECRET_HEADER;
  return {
    identityHeader: identityHeader.toLowerCase(),
    secretHeader: secretHeader.toLowerCase(),
    secret,
  };
}

/** The longest identity kept. Longer ones are truncated, not refused. */
export const MAX_IDENTITY_LENGTH = 128;

/**
 * Makes a forwarded name safe to put in a log line and bounded in size.
 *
 * Control characters go first. `JSON.stringify` would escape a newline rather
 * than emit it, so this is not the only thing standing between a forwarded
 * header and a forged log entry — but the visit log is one JSON object per line
 * read by whatever the operator points at it, and a value that has already been
 * cleaned cannot become an injection the day something writes it unquoted.
 *
 * Returns null for a name that is empty once cleaned, which callers treat the
 * same as a header the proxy never sent.
 */
export function sanitiseIdentity(raw: string | null): string | null {
  if (!raw) return null;
  /* eslint-disable-next-line no-control-regex -- the point is to remove these. */
  const cleaned = raw.replace(/[\u0000-\u001f\u007f]/gu, '').trim();
  if (!cleaned) return null;
  return cleaned.slice(0, MAX_IDENTITY_LENGTH);
}

/**
 * Whether the operator asked for the forwarded name in their own log lines.
 *
 * Accepts the spellings people actually type into a compose file. Anything else,
 * including the empty string, is off — a variable that exists but says `false`
 * must never read as consent. Meaningless without trusted-proxy mode, because
 * there is no forwarded name to record; `proxy.ts` checks both.
 */
export function auditIdentityEnabled(
  env: Record<string, string | undefined>,
): boolean {
  const raw = env.OPENTOOLS_AUDIT_IDENTITY?.trim().toLowerCase() ?? '';
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

/** Just enough of `Headers` to decide, so a test needs no `Request`. */
export interface HeaderReader {
  get(name: string): string | null;
}

/**
 * Compares two strings without returning early on the first difference.
 *
 * A plain `===` leaks the length of the matching prefix through timing, which
 * over enough requests narrows a password. The cost here is a few microseconds
 * on a request that is already doing far more work.
 */
export function constantTimeEquals(a: string, b: string): boolean {
  // Length is not secret — comparing different lengths byte-wise would read
  // past the end — but the comparison below still runs to completion.
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
}

/** Decodes `Basic base64(user:password)`. Returns null on anything malformed. */
export function decodeBasic(header: string | null): SelfHostCredentials | null {
  if (!header) return null;
  const [scheme, encoded] = header.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'basic' || !encoded) return null;
  let decoded: string;
  try {
    decoded = atob(encoded.trim());
  } catch {
    return null;
  }
  // The password may itself contain a colon; only the first one separates.
  const separator = decoded.indexOf(':');
  if (separator < 1) return null;
  return {
    user: decoded.slice(0, separator),
    password: decoded.slice(separator + 1),
  };
}

/**
 * The decision. `disabled` means no gate is configured and the request should
 * proceed untouched — the public site's only path.
 */
export function authorise(
  env: Record<string, string | undefined>,
  authorizationHeader: string | null,
  headers?: HeaderReader | null,
): AuthOutcome {
  const configured = readCredentials(env);
  const proxy = readTrustedProxy(env);

  /*
   * Both modes at once. Picking one would mean guessing which the operator
   * meant, and either guess turns a deployment they believe is gated by their
   * identity provider into one gated by a shared password, or the reverse.
   */
  if (configured !== null && proxy !== null) {
    return { kind: 'refused', reason: 'ambiguous-configuration' };
  }

  if (proxy !== null) {
    if (proxy === 'misconfigured') {
      return { kind: 'refused', reason: 'incomplete-proxy-configuration' };
    }
    /*
     * No headers to read means no secret was presented, which is exactly what
     * an unconfigured caller looks like. Refuse rather than fall through: in
     * this mode there is no second way in.
     */
    const offeredSecret = headers?.get(proxy.secretHeader) ?? null;
    if (
      !offeredSecret ||
      !constantTimeEquals(offeredSecret.trim(), proxy.secret)
    ) {
      return { kind: 'refused', reason: 'not-from-the-proxy' };
    }
    const identity = sanitiseIdentity(
      headers?.get(proxy.identityHeader) ?? null,
    );
    /*
     * The secret was right, so this did come through the proxy — but the proxy
     * forwarded nobody. Admitting it would mean the one request that bypassed
     * single sign-on is the one nobody can see afterwards.
     */
    if (!identity) return { kind: 'refused', reason: 'no-identity-forwarded' };
    return { kind: 'allowed', identity };
  }

  if (configured === null) return { kind: 'disabled' };
  // Half-configured refuses everything rather than admitting everyone.
  if (configured === 'misconfigured') return { kind: 'challenge' };

  const offered = decodeBasic(authorizationHeader);
  if (!offered) return { kind: 'challenge' };

  // Both compared, always, so a wrong username costs the same as a wrong
  // password and neither can be probed separately.
  const userOk = constantTimeEquals(offered.user, configured.user);
  const passwordOk = constantTimeEquals(offered.password, configured.password);
  return userOk && passwordOk ? { kind: 'allowed' } : { kind: 'challenge' };
}

/**
 * The 403 sent in trusted-proxy mode. The body names the reason because the only
 * person who ever sees it is whoever is wiring the proxy up, and "Forbidden"
 * alone would have them guessing between four different mistakes. None of the
 * four reveals anything a caller could use: not the secret, not the header
 * names, not whether an identity would have been accepted.
 */
export function refusedResponse(reason: RefusalReason): Response {
  return new Response(`Refused: ${reason}. See docs/SELF_HOSTING.md.`, {
    status: 403,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}

/** The 401 sent when the gate is on and unsatisfied. */
export function challengeResponse(): Response {
  return new Response('Authentication required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="OpenTools", charset="UTF-8"',
      'Content-Type': 'text/plain; charset=utf-8',
      // A credential prompt must never be cached or indexed.
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
