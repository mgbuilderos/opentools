import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test, type Page } from '@playwright/test';

/**
 * The service worker controls **every navigation on the site**, so its worst
 * case is the whole site's worst case — the same lesson the dropzone collector
 * taught, in a place with even less margin.
 *
 * What happened, and what these tests exist to stop happening again: the worker
 * was written network-first, falling back to cache and then to an "You are
 * offline" notice. But every response here carries `connect-src 'none'`,
 * including `/sw.js` itself, and a worker inherits the policy served with its
 * own script. `connect-src` governs `fetch()` inside a worker. So the worker
 * could not fetch **anything**: its network-first path always rejected, its
 * install-time precache always failed, and the cache it fell back to was
 * therefore always empty.
 *
 * The result on the live site was that the first page loaded, the worker
 * activated and claimed the page, and **every navigation after that showed the
 * offline notice** while the network was perfectly healthy.
 *
 * No test caught it because no test had ever registered the worker.
 */

/** Waits until a worker is actually controlling the page, not merely registered. */
async function waitForController(page: Page) {
  await page.waitForFunction(
    () => navigator.serviceWorker.controller !== null,
    undefined,
    { timeout: 20_000 },
  );
}

test.describe('the service worker', () => {
  test('does not replace a working page with an offline notice', async ({ page }) => {
    await page.goto('/');
    await waitForController(page);

    // The failure needs a *second* navigation: the first one happens before the
    // worker controls anything, which is exactly why this was invisible.
    await page.goto('/pdf/merge');

    const body = await page.locator('body').innerText();
    expect(body, 'the worker served its offline notice while online').not.toContain(
      'You are offline',
    );
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('keeps serving real pages across several navigations', async ({ page }) => {
    await page.goto('/');
    await waitForController(page);

    for (const route of ['/audio/mp3-toolkit', '/file/archive', '/pdf/merge', '/']) {
      await page.goto(route);
      const body = await page.locator('body').innerText();
      expect(body, `${route} served the offline notice`).not.toContain('You are offline');
      await expect(page.locator('input[type="file"]').first()).toBeAttached({
        timeout: 15_000,
      });
    }
  });

  test('still registers, so the browser can offer to install the site', async ({
    page,
  }) => {
    // Installability is why the worker exists at all. Whatever it does about
    // caching, it must keep a fetch handler and stay registered.
    await page.goto('/');
    await waitForController(page);
    const registered = await page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      return registrations.some((entry) => entry.active !== null);
    });
    expect(registered).toBe(true);
  });

  test('never claims an offline ability the policy does not permit', () => {
    // Read from disk, not through the page: `connect-src 'none'` forbids the
    // page from fetching anything, including this file. An earlier version of
    // this test fetched it and failed — which is the policy working.
    const source = readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'sw.js'),
      'utf8',
    );
    // Comments are stripped first. The file documents the bug it is avoiding,
    // so it names it in prose — what matters is that it does not survive into
    // code. An earlier version of this test read the whole file and failed on
    // its own explanation.
    const code = source
      .replace(/\/\*[\s\S]*?\*\//gu, '')
      .replace(/^\s*\/\/.*$/gmu, '');

    // The notice was served in place of real pages while the network was fine.
    expect(code, 'the offline notice is back in the code').not.toContain('You are offline');

    /*
     * This used to assert that `respondWith` appeared nowhere at all, on the
     * reasoning that a worker which cannot fetch has nothing true to answer
     * with. The premise was wrong rather than the caution: `connect-src`
     * governs `fetch` and `cache.add`, while `importScripts` is governed by
     * `script-src 'self'` and `cache.put` stores a Response that already
     * exists — so the bytes can be shipped to the worker as a script and it
     * does have something real to serve. Measured in Chromium against this
     * build served with the production headers.
     *
     * What is still forbidden is the thing that actually broke the site: a
     * fetch the header refuses, committed to inside `respondWith`. The full
     * set of invariants is asserted in `lib/service-worker.test.ts`, which
     * runs in the unit gate on every build rather than only here.
     */
    expect(code, 'the worker calls fetch, which our own header refuses').not.toMatch(
      /\bfetch\s*\(/u,
    );
    expect(code, 'the worker answers a GET without checking it is offline').toContain(
      'if (self.navigator.onLine) return;',
    );
  });

  test('the install prompt does not overstate what works offline', async ({ page }) => {
    /*
     * Rule: no claim unless code or a test proves it. Offline now genuinely
     * works — `e2e/share-target.spec.ts` loads a tool with the network
     * switched off — but it covers the app shell and the handful of pages in
     * the precache list, not the site. "Works offline" as a flat statement
     * would still promise more than is true, so the banner sells the share
     * sheet, which is true everywhere.
     */
    const source = readFileSync(
      path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        '..',
        'components',
        'install-prompt.tsx',
      ),
      'utf8',
    );
    const rendered = source.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^\s*\/\/.*$/gmu, '');
    expect(rendered).not.toMatch(/works offline/iu);
    expect(rendered).not.toMatch(/no internet/iu);

    // And the prompt is still there doing its actual job.
    await page.goto('/');
    expect(source).toContain('Add to Home Screen');
  });
});
