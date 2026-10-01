import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { PRODUCT_SIGNALS, SIGNAL_PATHS } from './product-telemetry';

/**
 * The service worker must never be able to answer a counter.
 *
 * Two things would break if it could, and both would be invisible.
 *
 * 1. **A precached counter is a counter that stops counting.** The worker
 *    answers from its own cache, the request never reaches Cloudflare, and the
 *    number flattens. The site would look abandoned.
 * 2. **A synthesised 200 would report an event that never left the device.**
 *    An installed app with no network must simply fail to send the signal.
 *    Nothing is queued, nothing is replayed on reconnection, and an offline
 *    completion is honestly uncounted. That is a stated undercount in ADR-020,
 *    not a gap to close later — closing it would mean storing events, which
 *    means storing state about a person's work.
 *
 * `public/sw.js` already cannot do either, by construction: it only answers a
 * path in `INDEX`, and only when `navigator.onLine` is false. This file
 * asserts that the construction is still what it is, because the failure mode
 * of a precache list is that something quietly joins it.
 */
const projectRoot = path.resolve(import.meta.dirname, '..');
const read = (relative: string) =>
  readFileSync(path.join(projectRoot, relative), 'utf8');

const builder = read('scripts/build-service-worker-precache.mjs');
const worker = read('public/sw.js');

describe('the precache builder cannot pick up a counter', () => {
  it('lists no telemetry path in its shell or its pages', () => {
    // MUTATION GUARD. Add '/telemetry/v1/completed-web.svg' to SHELL or PAGES
    // and this fails.
    const listed = builder.slice(
      builder.indexOf('const SHELL'),
      builder.indexOf('const routes ='),
    );
    expect(listed).not.toContain('/telemetry');
    for (const signal of PRODUCT_SIGNALS) {
      expect(listed, signal).not.toContain(SIGNAL_PATHS[signal]);
    }
  });

  it('only follows /_next/static assets out of the pages it holds', () => {
    // The two crawlers are what could pull a file in without anyone listing
    // it. Both are pinned to `/_next/static/`, and a counter lives under
    // `/telemetry/`, so neither can reach one.
    expect(builder).toContain('/_next/static/');
    const referenced = builder.slice(
      builder.indexOf('function referencedAssets'),
      builder.indexOf('const routes ='),
    );
    expect(referenced).not.toContain('/telemetry');
    expect(referenced).toMatch(/\\\/_next\\\/static\\\//u);
  });

  it('produces an index with no counter in it, when a build exists', () => {
    // The real proof, available only after `npm run build`. Absent a build
    // this states plainly that there is nothing to inspect rather than
    // passing on an empty set — the same convention as
    // `lib/edge-cache-headers.test.ts`.
    const client = path.join(projectRoot, 'dist/client');
    if (!existsSync(client)) {
      expect(existsSync(path.join(projectRoot, 'dist'))).toBe(false);
      return;
    }
    /*
     * The build id, not the filename. `sw.js` imports its payload as
     * `importScripts(`/sw-precache-index-${BUILD}.js`)`, so the composed
     * filename appears nowhere in the file — a first version of this test
     * searched for it, found nothing, and failed on a build that was
     * perfectly correct.
     */
    const build = /const BUILD = '([^']+)'/u.exec(
      readFileSync(path.join(client, 'sw.js'), 'utf8'),
    )?.[1];
    expect(build, 'the built worker carries no precache build id').toBeTruthy();
    expect(build!.startsWith('__OPENTOOLS')).toBe(false);

    const index = path.join(client, `sw-precache-index-${build}.js`);
    expect(existsSync(index), `${index} is missing`).toBe(true);
    const held = readFileSync(index, 'utf8');
    // The list the worker consults synchronously before answering anything.
    expect(held).not.toContain('/telemetry/');
    for (const signal of PRODUCT_SIGNALS) {
      expect(held, signal).not.toContain(SIGNAL_PATHS[signal]);
    }
    // And the bytes themselves, so a path absent from the index but present
    // in the payload would still be caught.
    const body = path.join(client, `sw-precache-body-${build}.js`);
    if (existsSync(body)) {
      const entries = /"entries":\[([\s\S]*?)\]/u.exec(
        readFileSync(body, 'utf8'),
      );
      if (entries) expect(entries[1]).not.toContain('/telemetry/');
    }
  });
});

describe('the worker cannot synthesise a successful counter response', () => {
  it('answers only paths it holds bytes for', () => {
    expect(worker).toContain('if (!INDEX.has(new URL(key).pathname)) return;');
  });

  it('steps aside entirely while the browser reports itself online', () => {
    expect(worker).toContain('if (self.navigator.onLine) return;');
  });

  it('has no queue, no replay and no retry of any kind', () => {
    for (const forbidden of [
      'SyncManager',
      'periodicsync',
      'BackgroundFetch',
      'setInterval',
    ]) {
      expect(worker, forbidden).not.toContain(forbidden);
    }
    // `sync` appears only inside `skipWaiting`/`clients.claim` prose, never as
    // a registered event.
    expect(worker).not.toMatch(/addEventListener\(\s*'sync'/u);
  });

  it('mentions no telemetry path at all', () => {
    expect(worker).not.toContain('/telemetry');
  });
});
