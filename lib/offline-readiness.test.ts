import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  ENGINE_PATH_PREFIX,
  OFFLINE_CACHE_PREFIX,
  offlineCacheName,
  summariseOfflineHolding,
} from './offline-readiness';

/*
  The cases a real browser will not produce on demand.

  `/pdf/compress-offline` reports what this browser holds rather than telling
  anyone the page works offline, so the report is the feature and a wrong one is
  worse than none: "ready" on a browser that cannot compress is precisely the
  lie the page was written to replace. The interesting states -- a cache that
  exists and is empty, a held page with no engine, an engine with no page -- all
  need a partly-filled cache, which is the one thing an end-to-end test cannot
  arrange without faking the thing it is meant to prove.
*/

const ROUTE = '/pdf/compress-offline';
const ENGINE = `${ENGINE_PATH_PREFIX}pdf-merge.worker-D8TQZxHx.js`;

describe('summariseOfflineHolding', () => {
  it('is ready only when the page and an engine are both held', () => {
    const readiness = summariseOfflineHolding({
      paths: ['/', ROUTE, ENGINE, '/_next/static/chunks/framework-x.js'],
      route: ROUTE,
    });
    expect(readiness.ready).toBe(true);
    expect(readiness.page).toBe(true);
    expect(readiness.engine).toBe(true);
    expect(readiness.held).toBe(4);
    expect(readiness.missing).toEqual([]);
  });

  it('refuses to call a held page ready with no engine behind it', () => {
    // The exact state every installed browser was in until 2026-09-24: the
    // page opened with the network off and the first file failed.
    const readiness = summariseOfflineHolding({
      paths: ['/', ROUTE, '/pdf/compress'],
      route: ROUTE,
    });
    expect(readiness.ready).toBe(false);
    expect(readiness.page).toBe(true);
    expect(readiness.engine).toBe(false);
    expect(readiness.missing).toEqual(['the compression engine']);
  });

  it('refuses an engine with no page to run it on', () => {
    const readiness = summariseOfflineHolding({
      paths: [ENGINE],
      route: ROUTE,
    });
    expect(readiness.ready).toBe(false);
    expect(readiness.missing).toEqual(['this page']);
  });

  it('names both when the cache exists and is empty', () => {
    const readiness = summariseOfflineHolding({ paths: [], route: ROUTE });
    expect(readiness.ready).toBe(false);
    expect(readiness.held).toBe(0);
    expect(readiness.missing).toEqual(['this page', 'the compression engine']);
  });

  it('counts a repeated path once', () => {
    const readiness = summariseOfflineHolding({
      paths: [ROUTE, ROUTE, ENGINE],
      route: ROUTE,
    });
    expect(readiness.held).toBe(2);
  });

  it('does not accept another page as this one', () => {
    // A cache holding `/pdf/compress` says nothing about whether
    // `/pdf/compress-offline` opens, and the two are one character apart.
    const readiness = summariseOfflineHolding({
      paths: ['/pdf/compress', ENGINE],
      route: ROUTE,
    });
    expect(readiness.page).toBe(false);
  });
});

describe('offlineCacheName', () => {
  it('finds this site’s cache among whatever else the browser holds', () => {
    expect(
      offlineCacheName(['workbox-precache', `${OFFLINE_CACHE_PREFIX}abc123`]),
    ).toBe(`${OFFLINE_CACHE_PREFIX}abc123`);
  });

  it('is undefined when the worker has never installed here', () => {
    expect(offlineCacheName([])).toBeUndefined();
    expect(offlineCacheName(['something-else'])).toBeUndefined();
  });
});

describe('the constants match the code that fills the cache', () => {
  const root = path.resolve(import.meta.dirname, '..');
  const read = (relative: string) =>
    readFileSync(path.join(root, relative), 'utf8');

  it('reads the same cache name the service worker writes', () => {
    // `public/sw.js` builds it as a template literal, so the prefix is matched
    // rather than the whole name.
    expect(read('public/sw.js')).toContain(OFFLINE_CACHE_PREFIX);
  });

  it('looks for engines where the precache build puts them', () => {
    // Both this module and `referencedWorkers` in the build script identify an
    // engine by this directory. If a bundler moves them, the build script stops
    // holding them and this panel starts reporting "not ready" -- so the two
    // must be one decision, and this is the test that keeps them one.
    expect(
      read('scripts/build-service-worker-precache.mjs'),
      'the precache build no longer scans the engine directory this module checks',
    ).toContain(ENGINE_PATH_PREFIX.replaceAll('/', '\\/'));
  });
});
