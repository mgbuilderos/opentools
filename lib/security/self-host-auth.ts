/**
 * Optional gate for self-hosted deployments. **Off unless configured.**
 *
 * The public site must never require a credential — no account, no signup, is
 * the product. This exists for the other deployment: an organisation running
 * the container inside its own network, where "anyone who can reach the port
 * gets the site" is the reason their security reviewer will not sign it off.
 *
 * That is the gap between a project and something a company can deploy, and it
 * is deliberately narrow. This is HTTP Basic over whatever TLS the operator
 * terminates in front of it. It is not SSO, not user management, and not an
 * identity system — it answers one question, "is this person allowed to reach
 * this instance at all", and nothing about who they are. Anything more would
 * mean storing people, which this product does not do.
 *
 * Fails closed in the only direction that matters: if credentials are
 * configured but malformed, every request is refused rather than admitted.
 */

export interface SelfHostCredentials {
  user: string;
  password: string;
}

export type AuthOutcome =
  | { kind: 'disabled' }
  | { kind: 'allowed' }
  | { kind: 'challenge' };

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
): AuthOutcome {
  const configured = readCredentials(env);
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
