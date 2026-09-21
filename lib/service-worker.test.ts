import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { contentSecurityPolicy } from './security/content-security-policy';

/**
 * The service worker controls **every navigation on the site**, so its worst
 * case is the whole site's worst case.
 *
 * What happened once: the worker was written network-first, falling back to
 * cache and then to an "You are offline" notice. Every response here carries
 * `connect-src 'none'`, `/sw.js` included, and a worker inherits the policy
 * served with its own script — so it could not fetch anything. Its
 * network-first path always rejected, its precache always failed, and the
 * cache it fell back to was therefore always empty. The first page loaded, the
 * worker claimed it, and **every navigation after that showed the offline
 * notice** while the network was perfectly healthy. Nothing caught it, because
 * the origin kept answering 200 to every probe: the failure was manufactured
 * inside the visitor's browser.
 *
 * These are the invariants that make the current worker unable to repeat it,
 * checked in the unit gate rather than only in Playwright so that no build can
 * pass without them.
 */
const projectRoot = path.resolve(import.meta.dirname, '..');
const workerSource = readFileSync(
  path.join(projectRoot, 'public/sw.js'),
  'utf8',
);
const precacheSource = readFileSync(
  path.join(projectRoot, 'scripts/build-service-worker-precache.mjs'),
  'utf8',
);

/** The file documents the bugs it avoids, so prose is not evidence either way. */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^\s*\/\/.*$/gmu, '');
}

const worker = code(workerSource);

describe('the service worker under connect-src none', () => {
  it('never reaches for the network, which our own header would refuse', () => {
    // Measured in Chromium against this build served with the production
    // headers: `fetch` and `cache.add` both fail with "Failed to fetch",
    // while `importScripts` and `cache.put` succeed. A worker that calls
    // either of the first two has committed to a promise that cannot resolve.
    expect(worker, 'the worker calls fetch, which is refused').not.toMatch(
      /\bfetch\s*\(/u,
    );
    expect(worker, 'cache.add fetches for you, and is refused').not.toMatch(
      /\.add(?:All)?\s*\(/u,
    );
    expect(worker).not.toMatch(
      /XMLHttpRequest|EventSource|sendBeacon|RTCPeerConnection/u,
    );
  });

  it('does not bring back the offline notice', () => {
    expect(worker).not.toContain('You are offline');
  });

  /*
   * The worker does answer requests now, which the previous one could not
   * safely do. What makes that safe is the gate, not good intentions: a GET is
   * only answered when the browser itself reports no network. Deleting that
   * line is how the original bug comes back, so it is named here.
   */
  it('answers a GET only when the browser says it is offline', () => {
    expect(worker).toContain('if (self.navigator.onLine) return;');
    const gate = worker.indexOf('if (self.navigator.onLine) return;');
    const rescue = worker.lastIndexOf('event.respondWith(');
    expect(gate, 'the online gate is missing').toBeGreaterThan(-1);
    expect(
      rescue,
      'the rescue no longer sits behind the online gate',
    ).toBeGreaterThan(gate);
  });

  it('answers a POST only for the share target', () => {
    expect(worker).toContain(
      "if (request.method === 'POST' && url.pathname === SHARE_TARGET_PATH)",
    );
    // Anything else with a body is left alone entirely.
    expect(worker).toContain("if (request.method !== 'GET') return;");
  });

  it('ignores other origins', () => {
    expect(worker).toContain(
      'if (url.origin !== self.location.origin) return;',
    );
  });

  it('never fails its own install, which would make the site uninstallable', () => {
    const body =
      /async function precache\(\)\s*\{([\s\S]*?)\n\}/u.exec(
        workerSource,
      )?.[1] ?? '';
    expect(body, 'precache is no longer a function in this file').not.toBe('');
    expect(body, 'precache does not swallow its own failure').toContain(
      '} catch {',
    );
  });
});

describe('a cached page carries the policy of a served one', () => {
  /*
   * A response the worker synthesises does not come from the origin, so it
   * arrives with none of the origin's headers. Serving a cached page without
   * them would hand someone the one page on this site that is not sealed.
   */
  it('stamps the content security policy onto every cached response', () => {
    expect(worker).toContain("'Content-Security-Policy': body.csp");
    expect(worker).toContain("'X-Content-Type-Options': 'nosniff'");
  });

  it('takes that policy from public/_headers rather than a copy of it', () => {
    expect(precacheSource).toContain(
      "readFileSync(path.join(ROOT, 'public/_headers'), 'utf8')",
    );
    // A hardcoded policy is a policy that falls behind the real one. The
    // script explains the constraint in prose, so only its code is read.
    expect(code(precacheSource)).not.toContain("connect-src 'none'");
  });

  it('and public/_headers is the policy the app generates', () => {
    const headers = readFileSync(
      path.join(projectRoot, 'public/_headers'),
      'utf8',
    );
    expect(headers).toContain(contentSecurityPolicy());
  });

  /*
   * `/image/background-remover` and `/image/editor` are served a deliberately
   * looser policy so the local model can load its weights. Caching them would
   * stamp the strict `/*` policy on a page that needs the loose one, and the
   * model would fail to load with no clue why.
   */
  it('never precaches the two routes that run on a different policy', () => {
    const pages =
      /const PAGES = \[([\s\S]*?)\];/u.exec(precacheSource)?.[1] ?? '';
    expect(pages).not.toContain('background-remover');
    expect(pages).not.toContain('image/editor');
  });
});
