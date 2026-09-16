import { test, expect } from '@playwright/test';

import { testPng } from './fixtures';

test.describe('Image Editor Tool', () => {
  test('should load the background remover and apply changes', async ({
    page,
  }) => {
    // First run fetches the model and WebAssembly runtime from this site.
    test.setTimeout(180_000);
    await page.goto('/image/background-remover');

    // Check if the page title is correct
    await expect(page.locator('h1')).toContainText('Remove solid background');

    // Ensure the checkerboard background is applied
    const _previewContainer = page.locator('.bg-\\[url\\(.*\\)\\]');
    // It might not exist until an image is loaded, let's load a mock image.

    // We can intercept the file chooser or just upload directly
    // A subject on a plain field: the AI mode this route defaults to needs
    // something to actually find.
    const imageBuffer = testPng(64);

    // Choose file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Choose an image' }).click();
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles({
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: imageBuffer,
    });

    // Verify image is loaded in preview
    await expect(page.locator('p.truncate')).toHaveText('test-image.png');

    // The background-remover route turns this on by default. Match on a
    // substring: the control's accessible name carries its help text too.
    const removeBgCheckbox = page.getByRole('checkbox', {
      name: /Remove background/u,
    });
    await expect(removeBgCheckbox).toBeChecked();

    // Click 'Remove background' (the button we just renamed)
    await page.getByRole('button', { name: 'Remove background' }).click();

    // Verify completion
    await expect(page.getByText('Done — 64 × 64px')).toBeVisible({
      timeout: 120_000,
    });
    await expect(
      page.getByRole('button', { name: 'Save image' }),
    ).toBeVisible();
  });
});
