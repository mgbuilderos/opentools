import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { proxy } from './proxy';

const AUTH_USER = 'OPENTOOLS_AUTH_USER';
const AUTH_PASSWORD = 'OPENTOOLS_AUTH_PASSWORD';

/**
 * These tests exercise `proxy()` itself rather than the gate's own functions,
 * which `lib/security/self-host-auth.test.ts` already covers. The distinction
 * matters: those unit tests passed while nothing called the gate at all. What
 * is pinned here is the wiring, and the order it runs in.
 */

const request = (path: string, authorization?: string) =>
  new NextRequest(`https://example.test${path}`, {
    headers: authorization ? { authorization } : {},
  });

const basic = (user: string, password: string) =>
  `Basic ${btoa(`${user}:${password}`)}`;

const gateOn = (user = 'ops', password = 'correct horse') => {
  process.env[AUTH_USER] = user;
  process.env[AUTH_PASSWORD] = password;
};

afterEach(() => {
  delete process.env[AUTH_USER];
  delete process.env[AUTH_PASSWORD];
  vi.restoreAllMocks();
});

describe('proxy — public site', () => {
  it('does not challenge when no credentials are configured', () => {
    const response = proxy(request('/pdf/compress'));
    expect(response.status).not.toBe(401);
    expect(response.headers.get('WWW-Authenticate')).toBeNull();
  });

  it('still sets the security headers it set before the gate existed', () => {
    const response = proxy(request('/pdf/compress'));
    expect(response.headers.get('Content-Security-Policy')).toContain(
      "default-src 'self'",
    );
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });
});

describe('proxy — self-host gate', () => {
  it('challenges an unauthenticated request once configured', () => {
    gateOn();
    const response = proxy(request('/pdf/compress'));
    expect(response.status).toBe(401);
    expect(response.headers.get('WWW-Authenticate')).toContain('Basic');
  });

  it('never lets a credential prompt be cached or indexed', () => {
    gateOn();
    const response = proxy(request('/'));
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex');
  });

  it('admits the configured credentials', () => {
    gateOn();
    const response = proxy(
      request('/pdf/compress', basic('ops', 'correct horse')),
    );
    expect(response.status).not.toBe(401);
  });

  it('refuses a wrong password', () => {
    gateOn();
    const response = proxy(request('/pdf/compress', basic('ops', 'wrong')));
    expect(response.status).toBe(401);
  });

  it('refuses everything when only half-configured, rather than admitting everyone', () => {
    process.env[AUTH_USER] = 'ops';
    const response = proxy(request('/pdf/compress'));
    expect(response.status).toBe(401);
  });

  it('refuses before the visit log runs, so a rejected request is not recorded', () => {
    gateOn();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    proxy(request('/pdf/compress'));
    expect(log).not.toHaveBeenCalled();

    // The same path logs normally once the request is allowed, which is what
    // makes the assertion above about ordering rather than about logging.
    proxy(request('/pdf/compress', basic('ops', 'correct horse')));
    expect(log).toHaveBeenCalled();
  });
});

/**
 * Whether the share loop is closing, answered from the server alone.
 *
 * The site has no client-side analytics and must not gain any, so nothing on
 * the page may report an arrival. The edge already emits one structured event
 * per page request; the only question is whether that event can tell a
 * colleague who was sent a setup link apart from a visitor who searched. It
 * could not, and these pin that it now can.
 */
describe('proxy — recipe arrivals are visible in the server counts', () => {
  const logged = (path: string) => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    proxy(request(path));
    const lines = log.mock.calls.map((call) => JSON.parse(String(call[0])));
    return lines.find((line) => line.event === 'tool_impression');
  };

  it('marks a visit that arrived on a shared setup link', () => {
    expect(
      logged('/shared/image/optimize?format=png&quality=70')?.arrival,
    ).toBe('recipe');
    expect(logged('/shared/text/case-converter?mode=upper')?.arrival).toBe(
      'recipe',
    );
  });

  /*
   * The shared path is what makes this countable. Tool pages are prerendered
   * static assets and never reach the worker, so an arrival on the tool's own
   * path cannot be observed here however the URL is decorated — which is why
   * the link is given a path of its own instead.
   */
  it('counts the arrival under the tool it leads to', () => {
    const event = logged('/shared/image/optimize?format=png');
    expect(event?.path).toBe('/shared/image/optimize');
    expect(event?.tool).toBe('/image/optimize');
  });

  it('sends a shared link on to the working tool, settings intact', () => {
    const response = proxy(request('/shared/image/optimize?format=png&width=720'));
    expect(response.status).toBe(307);
    const location = new URL(String(response.headers.get('location')));
    expect(location.pathname).toBe('/image/optimize');
    expect(location.search).toBe('?format=png&width=720');
  });

  // Temporary, not permanent: a cached redirect would stop the second person
  // opening the same link from ever reaching the server, undercounting exactly
  // the links that were shared most.
  it('does not let the redirect be cached away', () => {
    expect(proxy(request('/shared/text/case-converter?mode=upper')).status).toBe(
      307,
    );
  });

  it('forwards nowhere that is not a declared tool', () => {
    expect(proxy(request('/shared/not-a-tool')).status).not.toBe(307);
    expect(proxy(request('/shared/https://evil.test')).status).not.toBe(307);
  });

  it('marks a visit that simply opened the tool', () => {
    expect(logged('/image/optimize')?.arrival).toBe('direct');
    expect(logged('/')?.arrival).toBe('direct');
  });

  it('does not credit a link the tool would ignore', () => {
    expect(logged('/image/optimize?format=gif')?.arrival).toBe('direct');
  });

  // Links copied before the shared path existed still work; they simply land
  // as an ordinary visit, which is honest — that visit is served from a static
  // asset and is not observable here at all in production.
  it('still recognises a settings link on the tool path itself', () => {
    expect(logged('/image/optimize?format=png')?.arrival).toBe('recipe');
  });

  /*
   * The settings themselves must never reach the log. Knowing that a share
   * worked needs a count; knowing what someone chose needs a reason, and there
   * is not one. A log that holds settings is a log that grows an obligation.
   */
  it('records that a link was used and never what was in it', () => {
    const event = logged('/shared/image/optimize?format=png&quality=70&width=48');
    expect(event?.arrival).toBe('recipe');

    // `time` is dropped before the scan, and the first version of this test is
    // why: it searched the whole serialised event for the shared values, and
    // a millisecond clock contains any given pair of digits soon enough. It
    // failed on '48' inside a timestamp, having asserted nothing about the
    // fields it was written to guard. The param names are checked too, since
    // leaking `quality=70` as a key is the same leak as leaking the number.
    const recorded = { ...event };
    delete recorded.time;
    const serialised = JSON.stringify(recorded);
    for (const secret of [
      'png',
      'format',
      'quality',
      'width',
      '70',
      '48',
    ]) {
      expect(serialised, `the log carried ${secret}`).not.toContain(secret);
    }
  });
});
