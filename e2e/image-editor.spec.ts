import { test, expect } from '@playwright/test';

test.describe('Image Editor Tool', () => {
  test('should load the background remover and apply changes', async ({
    page,
  }) => {
    await page.goto('/image/background-remover');

    // Check if the page title is correct
    await expect(page.locator('h1')).toContainText('Remove solid background');

    // Ensure the checkerboard background is applied
    const _previewContainer = page.locator('.bg-\\[url\\(.*\\)\\]');
    // It might not exist until an image is loaded, let's load a mock image.

    // We can intercept the file chooser or just upload directly
    // Create a simple blank white 10x10 image buffer for testing
    const base64WhiteImage =
      'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAXSURBVChTY/z//z8DNgBDGBWjYhSMMwAAvzMRf30T+k0AAAAASUVORK5CYII=';
    const imageBuffer = Buffer.from(base64WhiteImage, 'base64');

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

    // Check the 'Remove a plain-color background' checkbox is checked (should be by default in this route)
    const removeBgCheckbox = page.getByRole('checkbox', {
      name: 'Remove a plain-color background',
    });
    await expect(removeBgCheckbox).toBeChecked();

    // Click 'Remove background' (the button we just renamed)
    await page.getByRole('button', { name: 'Remove background' }).click();

    // Verify completion
    await expect(page.getByText('Done — 10 × 10px')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Save image' }),
    ).toBeVisible();
  });
});
