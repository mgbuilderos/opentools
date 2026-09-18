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
    // so it names both of these in prose — what matters is that neither
    // survives into code. An earlier version of this test read the whole file
    // and failed on its own explanation.
    const code = source
      .replace(/\/\*[\s\S]*?\*\//gu, '')
      .replace(/^\s*\/\/.*$/gmu, '');

    // The notice was served in place of real pages while the network was fine.
    expect(code, 'the offline notice is back in the code').not.toContain('You are offline');
    // `respondWith` is the only way a worker can replace a page with its own
    // answer. While fetching is refused, this file must never call it.
    expect(code, 'the worker is answering requests again').not.toContain('respondWith');
  });

  test('the install prompt does not promise offline use', async ({ page }) => {
    // Rule: no claim unless code or a test proves it. While `connect-src 'none'`
    // refuses every fetch a worker could make, nothing on this origin can be
    // cached, so the site does not work offline and must not say it does. The
    // prompt said "Works offline afterwards" and "keeps working — even with no
    // internet", both of which stopped being true the moment the worker could
    // not fill a cache.
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
