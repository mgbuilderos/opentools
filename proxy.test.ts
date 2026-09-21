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
