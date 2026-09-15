import { test, expect } from '@playwright/test';

test('AI background removal test', async ({ page }) => {
  await page.goto('/image/background-remover');

  // Wait for React to hydrate
  await page.waitForTimeout(1000);

  // Verify UI has AI mode selected
  const aiRadio = page.locator(
    'input[type="radio"][value="ai"], input[name="bgMode"]:first-of-type',
  );
  await expect(aiRadio).toBeVisible();

  // generate a fake 100x100 image
  const base64Image = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 100, 100);
    return canvas.toDataURL('image/png').split(',')[1];
  });

  const imageBuffer = Buffer.from(base64Image, 'base64');

  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Choose an image' }).click();
  const fileChooser = await fileChooserPromise;

  await fileChooser.setFiles({
    name: 'test.png',
    mimeType: 'image/png',
    buffer: imageBuffer,
  });

  // The auto-run should kick in. The first run loads the self-hosted model and runtime.
  // We wait for the 'Done' text
  await expect(page.getByText(/Done —/)).toBeVisible({ timeout: 60000 });

  console.log('AI extraction completed successfully!');
});
