import { test, expect } from '@playwright/test';

import { testPng } from './fixtures';

test.describe('Image Editor Tool', () => {
  test('should load the background remover and apply changes', async ({
    page,
  }) => {
    // First run fetches the model and WebAssembly runtime from this site.
    test.setTimeout(180_000);
    await page.goto('/image/background-remover');

    await expect(page.locator('h1')).toContainText('Remove solid background');

    // A subject on a plain field: the AI mode this route defaults to needs
    // something to actually find.
    const imageBuffer = testPng(64);

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Choose an image' }).click();
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles({
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: imageBuffer,
    });

    await expect(page.locator('p.truncate')).toHaveText('test-image.png');

    // The background-remover route turns this on by default. Match on a
    // substring: the control's accessible name carries its help text too.
    const removeBgCheckbox = page.getByRole('checkbox', {
      name: /Remove background/u,
    });
    await expect(removeBgCheckbox).toBeChecked();

    await page.getByRole('button', { name: 'Remove background' }).click();

    await expect(page.getByText('Done — 64 × 64px')).toBeVisible({
      timeout: 120_000,
    });
    await expect(
      page.getByRole('button', { name: 'Save image' }),
    ).toBeVisible();
  });
});
