import { expect, test } from '@playwright/test';

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

  /**
   * Chromium fires `beforeinstallprompt` only when its own installability
   * heuristics are satisfied, which they are not in an automated run, and the
   * event cannot be requested. `lib/pwa-install.ts` captures whatever arrives
   * on that name, so handing it one puts the page in the state a real visitor
   * reaches — which is the state whose *timing* is under test here.
   */
  async function makeInstallable(page: import('@playwright/test').Page) {
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

    await input.setInputFiles({
      name: 'statement.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.7 a small file to checksum'),
    });
    await page.getByRole('button', { name: 'Calculate hash' }).click();
    await expect(banner(page)).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: 'Dismiss' }).click();
    await expect(banner(page)).toHaveCount(0);

    // The product's argument is that it does not nag. A second visit that
    // finishes a second job must still say nothing.
    await page.goto('/file/hash-calculator');
    await expect(input).toBeAttached({ timeout: 15_000 });
    await makeInstallable(page);
    await input.setInputFiles({
      name: 'statement.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.7 a small file to checksum'),
    });
    await page.getByRole('button', { name: 'Calculate hash' }).click();
    await page.waitForTimeout(2000);
    await expect(banner(page), 'the install offer came back after a dismissal').toHaveCount(0);
  });
});
