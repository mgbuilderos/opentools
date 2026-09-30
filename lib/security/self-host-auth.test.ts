import { describe, expect, it } from 'vitest';

import {
  authorise,
  constantTimeEquals,
  decodeBasic,
  DEFAULT_PROXY_SECRET_HEADER,
  MAX_IDENTITY_LENGTH,
  readCredentials,
  readTrustedProxy,
  sanitiseIdentity,
} from './self-host-auth';

const basic = (user: string, password: string) =>
  `Basic ${btoa(`${user}:${password}`)}`;

/** Case-insensitive like the real `Headers`, which is what production passes. */
const headers = (entries: Record<string, string>) => ({
  get(name: string) {
    const wanted = name.toLowerCase();
    for (const [key, value] of Object.entries(entries)) {
      if (key.toLowerCase() === wanted) return value;
    }
    return null;
  },
});

const PROXY_ENV = {
  OPENTOOLS_AUTH_TRUSTED_HEADER: 'x-forwarded-user',
  OPENTOOLS_AUTH_PROXY_SECRET: 'a-long-shared-secret',
};

/**
 * The gate exists for self-hosted deployments only. The two failure modes that
 * would actually matter in production are the ones fixed here: quietly turning
 * the gate ON for the public site, which would break the product's core
 * promise of no account; and quietly leaving it OFF when an operator thought
 * they had configured it, which would expose an internal deployment.
 */
describe('self-host auth', () => {
  describe('is off unless deliberately configured', () => {
    it('is disabled with an empty environment — the public site', () => {
      expect(authorise({}, null).kind).toBe('disabled');
      expect(authorise({}, basic('a', 'b')).kind).toBe('disabled');
    });

    it('is disabled when the variables are absent', () => {
      expect(readCredentials({})).toBeNull();
      expect(readCredentials({ SOMETHING_ELSE: 'x' })).toBeNull();
    });

    it('treats whitespace-only as absent', () => {
      expect(
        readCredentials({
          OPENTOOLS_AUTH_USER: '   ',
          OPENTOOLS_AUTH_PASSWORD: '',
        }),
      ).toBeNull();
    });
  });

  describe('fails closed when half-configured', () => {
    // An operator who sets a user and forgets the password must not end up
    // with an open instance they believe is protected.
    it('refuses everything when the password is missing', () => {
      const env = { OPENTOOLS_AUTH_USER: 'ops' };
      expect(readCredentials(env)).toBe('misconfigured');
      expect(authorise(env, basic('ops', '')).kind).toBe('challenge');
      expect(authorise(env, null).kind).toBe('challenge');
    });

    it('refuses everything when the user is missing', () => {
      const env = { OPENTOOLS_AUTH_PASSWORD: 'hunter2' };
      expect(readCredentials(env)).toBe('misconfigured');
      expect(authorise(env, basic('', 'hunter2')).kind).toBe('challenge');
    });
  });

  describe('when configured', () => {
    const env = {
      OPENTOOLS_AUTH_USER: 'ops',
      OPENTOOLS_AUTH_PASSWORD: 'correct horse',
    };

    it('admits the right credentials', () => {
      expect(authorise(env, basic('ops', 'correct horse')).kind).toBe(
        'allowed',
      );
    });

    it.each([
      ['no header', null],
      ['wrong password', basic('ops', 'wrong')],
      ['wrong user', basic('nope', 'correct horse')],
      ['both wrong', basic('nope', 'wrong')],
      ['empty password', basic('ops', '')],
      ['bearer token', 'Bearer abc123'],
      ['malformed base64', 'Basic !!!!'],
      ['no separator', `Basic ${btoa('opsnopassword')}`],
      ['empty user', `Basic ${btoa(':correct horse')}`],
      ['scheme only', 'Basic'],
    ])('challenges on %s', (_name, header) => {
      expect(authorise(env, header).kind).toBe('challenge');
    });

    it('accepts a password containing a colon', () => {
      const colonEnv = {
        OPENTOOLS_AUTH_USER: 'ops',
        OPENTOOLS_AUTH_PASSWORD: 'a:b:c',
      };
      expect(authorise(colonEnv, basic('ops', 'a:b:c')).kind).toBe('allowed');
    });
  });

  describe('comparison does not leak by timing', () => {
    it('matches only identical strings', () => {
      expect(constantTimeEquals('abc', 'abc')).toBe(true);
      expect(constantTimeEquals('abc', 'abd')).toBe(false);
      expect(constantTimeEquals('abc', 'ab')).toBe(false);
      expect(constantTimeEquals('', '')).toBe(true);
    });

    it('does not return early inside the comparison loop', () => {
      // A prefix match and a first-character mismatch must cost the same, or
      // the length of the correct prefix is recoverable over many requests.
      //
      // The length guard before the loop is deliberately allowed: strings of
      // different lengths cannot be compared byte-wise at all, and Node's own
      // `timingSafeEqual` rejects them outright. Length is a far weaker leak
      // than prefix, and hiding it would require padding every comparison.
      const source = constantTimeEquals.toString();
      // Just the loop body — slicing from `for (` also swallows the function's
      // own final return, which is legitimate and made this fail on correct
      // code the first time it was written.
      const loop = /for\s*\([^)]*\)\s*\{([\s\S]*?)\}/u.exec(source)?.[1] ?? '';
      expect(loop, 'loop body not found').not.toBe('');
      expect(loop, 'the loop bails out early').not.toMatch(/\breturn\b/u);
      // Accumulate-then-compare, rather than compare-then-branch.
      expect(loop).toContain('^');
      expect(loop).toContain('|=');
      expect(source).toMatch(/return difference === 0/u);
    });
  });

  describe('decodes what browsers actually send', () => {
    it('reads a standard header', () => {
      expect(decodeBasic(basic('ops', 'pw'))).toEqual({
        user: 'ops',
        password: 'pw',
      });
    });

    it('is case-insensitive about the scheme', () => {
      expect(decodeBasic(`basic ${btoa('ops:pw')}`)).toEqual({
        user: 'ops',
        password: 'pw',
      });
    });

    it('returns null rather than throwing on rubbish', () => {
      expect(decodeBasic(null)).toBeNull();
      expect(decodeBasic('')).toBeNull();
      expect(decodeBasic('Basic')).toBeNull();
    });
  });

  /*
   * Mode 2. The reason this exists is a procurement review that asks for single
   * sign-on: the organisation's identity provider stays the only thing that
   * knows who anyone is, and this container is told the answer by their proxy.
   *
   * Every test below is about the same danger from a different angle. A
   * forwarded header is a claim anyone who can reach the port can make, so the
   * failure to prevent is an instance that looks gated and is not.
   */
  describe('trusted-proxy mode', () => {
    describe('reading the configuration', () => {
      it('is off when neither variable is set', () => {
        expect(readTrustedProxy({})).toBeNull();
      });

      it('refuses to start on a header with no secret', () => {
        // The whole point. This is the configuration that would otherwise
        // believe whatever a browser claimed.
        expect(
          readTrustedProxy({
            OPENTOOLS_AUTH_TRUSTED_HEADER: 'x-forwarded-user',
          }),
        ).toBe('misconfigured');
      });

      it('refuses to start on a secret with no header', () => {
        expect(readTrustedProxy({ OPENTOOLS_AUTH_PROXY_SECRET: 's' })).toBe(
          'misconfigured',
        );
      });

      it('defaults the secret header and lowercases both names', () => {
        expect(
          readTrustedProxy({
            OPENTOOLS_AUTH_TRUSTED_HEADER: '  X-Forwarded-User  ',
            OPENTOOLS_AUTH_PROXY_SECRET: ' s3cret ',
          }),
        ).toEqual({
          identityHeader: 'x-forwarded-user',
          secretHeader: DEFAULT_PROXY_SECRET_HEADER,
          secret: 's3cret',
        });
      });

      it('takes a chosen secret header', () => {
        const read = readTrustedProxy({
          ...PROXY_ENV,
          OPENTOOLS_AUTH_PROXY_SECRET_HEADER: 'X-Authelia-Shared',
        });
        expect(read).toMatchObject({ secretHeader: 'x-authelia-shared' });
      });
    });

    describe('deciding a request', () => {
      it('admits a request the proxy vouched for, and reports who', () => {
        expect(
          authorise(
            PROXY_ENV,
            null,
            headers({
              [DEFAULT_PROXY_SECRET_HEADER]: 'a-long-shared-secret',
              'X-Forwarded-User': 'priya@example.org',
            }),
          ),
        ).toEqual({ kind: 'allowed', identity: 'priya@example.org' });
      });

      it('refuses a forged identity that carries no secret', () => {
        // Somebody on the internal network calling the container directly.
        expect(
          authorise(PROXY_ENV, null, headers({ 'X-Forwarded-User': 'admin' })),
        ).toEqual({ kind: 'refused', reason: 'not-from-the-proxy' });
      });

      it('refuses a wrong secret', () => {
        expect(
          authorise(
            PROXY_ENV,
            null,
            headers({
              [DEFAULT_PROXY_SECRET_HEADER]: 'a-long-shared-secrew',
              'X-Forwarded-User': 'admin',
            }),
          ),
        ).toEqual({ kind: 'refused', reason: 'not-from-the-proxy' });
      });

      it('refuses when the proxy forwarded nobody', () => {
        // The secret is right, so the proxy is real -- but single sign-on was
        // bypassed, and admitting this would make that request the invisible
        // one.
        expect(
          authorise(
            PROXY_ENV,
            null,
            headers({ [DEFAULT_PROXY_SECRET_HEADER]: 'a-long-shared-secret' }),
          ),
        ).toEqual({ kind: 'refused', reason: 'no-identity-forwarded' });
      });

      it('refuses when there are no headers at all rather than throwing', () => {
        expect(authorise(PROXY_ENV, null)).toEqual({
          kind: 'refused',
          reason: 'not-from-the-proxy',
        });
      });

      it('refuses every request while half-configured', () => {
        expect(
          authorise(
            { OPENTOOLS_AUTH_TRUSTED_HEADER: 'x-forwarded-user' },
            null,
            headers({ 'X-Forwarded-User': 'admin' }),
          ),
        ).toEqual({
          kind: 'refused',
          reason: 'incomplete-proxy-configuration',
        });
      });

      it('refuses when both modes are configured, rather than guessing', () => {
        expect(
          authorise(
            {
              ...PROXY_ENV,
              OPENTOOLS_AUTH_USER: 'ops',
              OPENTOOLS_AUTH_PASSWORD: 'pw',
            },
            basic('ops', 'pw'),
            headers({
              [DEFAULT_PROXY_SECRET_HEADER]: 'a-long-shared-secret',
              'X-Forwarded-User': 'priya@example.org',
            }),
          ),
        ).toEqual({ kind: 'refused', reason: 'ambiguous-configuration' });
      });

      it('ignores Basic credentials in this mode', () => {
        // No second way in. A correct-looking password must not substitute for
        // having come through the proxy.
        expect(authorise(PROXY_ENV, basic('ops', 'pw'), headers({}))).toEqual({
          kind: 'refused',
          reason: 'not-from-the-proxy',
        });
      });
    });

    describe('the forwarded name is cleaned before it can reach a log', () => {
      it('drops a name that is empty or whitespace', () => {
        expect(sanitiseIdentity(null)).toBeNull();
        expect(sanitiseIdentity('')).toBeNull();
        expect(sanitiseIdentity('   ')).toBeNull();
      });

      it('removes control characters, so a header cannot forge a log line', () => {
        expect(sanitiseIdentity('ops\n{"event":"forged"}')).toBe(
          'ops{"event":"forged"}',
        );
        expect(sanitiseIdentity('a\u0000b\u007fc')).toBe('abc');
      });

      it('bounds the length', () => {
        expect(sanitiseIdentity('x'.repeat(500))).toHaveLength(
          MAX_IDENTITY_LENGTH,
        );
      });

      it('leaves an ordinary name alone', () => {
        expect(sanitiseIdentity(' priya@example.org ')).toBe(
          'priya@example.org',
        );
      });
    });
  });

  /*
   * The public site's behaviour, restated as a test because it is the one thing
   * no change here may alter: with no variables set, nothing is gated.
   */
  describe('the public site is untouched by either mode', () => {
    it('is disabled with an empty environment and a full set of headers', () => {
      expect(
        authorise(
          {},
          basic('anyone', 'anything'),
          headers({
            'X-Forwarded-User': 'someone',
            [DEFAULT_PROXY_SECRET_HEADER]: 'whatever',
          }),
        ),
      ).toEqual({ kind: 'disabled' });
    });
  });
});
