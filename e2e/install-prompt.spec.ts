import { expect, test, type Locator, type Page } from '@playwright/test';

import { actUntilEnabled, waitForReact } from './hydration';

/**
 * The install offer is spent once — dismissing it is remembered forever — so
 * when it is spent is the whole design.
 *
 * It used to render on arrival, which is the worst possible moment: a
 * first-time visitor has had nothing from this site yet and is being asked to
 * put it on their home screen. It is now held back until a tool has actually
 * finished someone's work, and these tests hold it there.
 */
test.describe('the install offer', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'beforeinstallprompt and programmatic installation are Chromium-only',
  );

  /*
   * Each of these drives a real tool run through a real page load, and the
   * dismissal test does it twice. On a machine already busy — this site's own
   * worker unpacks a 0.69 MB offline payload and writes 74 cache entries on
   * first visit — that does not reliably fit the default 30s.
   */
  test.describe.configure({ timeout: 90_000 });

  /**
   * Runs a hash, waiting for the page to have taken the file before clicking.
   *
   * `/file/hash-calculator` renders `disabled={!file || busy}`, so the run button
   * is gated on React having heard about the file. Setting it and clicking in the
   * same breath races the re-render, and if the file was set before hydration it
   * never lands in state at all -- the button stays disabled and the click is
   * retried until it times out. That is a flaky failure with nothing to do with
   * the install offer this spec is about, and it happened in CI on 2026-09-28.
   *
   * `toBeAttached` above is not the same guarantee: it says the node is in the
   * DOM, which it is from the moment the prerendered HTML arrives.
   */
  async function hashTheFile(page: Page, input: Locator) {
    await actUntilEnabled(
      () =>
        input.setInputFiles({
          name: 'statement.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('%PDF-1.7 a small file to checksum'),
        }),
      page.getByRole('button', { name: 'Calculate hash' }),
    );
    await page.getByRole('button', { name: 'Calculate hash' }).click();
  }

  /**
   * Chromium fires `beforeinstallprompt` only when its own installability
   * heuristics are satisfied, which they are not in an automated run, and the
   * event cannot be requested. `lib/pwa-install.ts` captures whatever arrives
   * on that name, so handing it one puts the page in the state a real visitor
   * reaches — which is the state whose *timing* is under test here.
   */
  async function makeInstallable(page: Page) {
    /*
     * Wait for the bundle before dispatching. `lib/pwa-install.ts` attaches its
     * listener at module scope, so an event fired before the bundle runs reaches
     * nobody -- and both the browser and this test hand over exactly one, so it
     * is lost rather than late. The banner then never appears and the failure
     * reads as a broken install offer. Flaky in CI on 2026-09-28, and reproduced
     * here failing 2 runs in 3 before this wait.
     */
    await waitForReact(page);
    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt', { cancelable: true });
      (event as Event & { prompt?: () => Promise<void> }).prompt = () => Promise.resolve();
      window.dispatchEvent(event);
    });
  }

  const banner = (page: import('@playwright/test').Page) =>
    page.locator('[data-install-prompt]');

  test('is not offered on arrival, and is offered the moment a job finishes', async ({
    page,
  }) => {
    await page.goto('/file/hash-calculator');
    const input = page.locator('input[type="file"]').first();
    await expect(input).toBeAttached({ timeout: 15_000 });
    await makeInstallable(page);

    // Nothing has been done for this person yet.
    await expect(
      banner(page),
      'the install offer was made before the site had done anything',
    ).toHaveCount(0);

    // A real run of a real tool, not a synthesised event: the banner is
    // supposed to follow the product's own completion, wherever it comes from.
    await input.setInputFiles({
      name: 'statement.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.7 a small file to checksum'),
    });
    await page.getByRole('button', { name: 'Calculate hash' }).click();

    await expect(banner(page)).toBeVisible({ timeout: 20_000 });
    await expect(banner(page)).toContainText('one tap away');
  });

  test('stays away for good once it is dismissed', async ({ page }) => {
    await page.goto('/file/hash-calculator');
    const input = page.locator('input[type="file"]').first();
    await expect(input).toBeAttached({ timeout: 15_000 });
    await makeInstallable(page);

    await hashTheFile(page, input);
    await expect(banner(page)).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: 'Dismiss' }).click();
    await expect(banner(page)).toHaveCount(0);

    // The product's argument is that it does not nag. A second visit that
    // finishes a second job must still say nothing.
    await page.goto('/file/hash-calculator');
    await expect(input).toBeAttached({ timeout: 15_000 });
    await makeInstallable(page);
    await hashTheFile(page, input);
    // Wait for the job to have actually finished rather than for a fixed
    // stretch of time. A sleep here made the test a race against whatever else
    // the machine was doing — including this site's own worker unpacking its
    // offline payload — and it lost that race once.
    await expect(page.getByText('Done — SHA-256 calculated')).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      banner(page),
      'the install offer came back after a dismissal',
    ).toHaveCount(0);
  });
});
