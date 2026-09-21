import { describe, expect, it } from 'vitest';

import {
  authorise,
  constantTimeEquals,
  decodeBasic,
  readCredentials,
} from './self-host-auth';

const basic = (user: string, password: string) =>
  `Basic ${btoa(`${user}:${password}`)}`;

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
});
