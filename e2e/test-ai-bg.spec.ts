import { test, expect } from '@playwright/test';

import { testPng } from './fixtures';

test('AI background removal test', async ({ page }) => {
  // The first run fetches a 4.4 MB model and a 12 MB WebAssembly runtime from
  // this site before it can infer anything, which is well past the 30s default.
  test.setTimeout(180_000);
  await page.goto('/image/background-remover');

  // Wait for React to hydrate
  await page.waitForTimeout(1000);

  // Verify UI has AI mode selected. Match by accessible name: the old CSS
  // selector matched both radios and failed strict mode.
  const aiRadio = page.getByRole('radio', { name: 'AI Subject (Smart)' });
  await expect(aiRadio).toBeVisible();
  await expect(aiRadio).toBeChecked();

  // A subject on a plain field. A flat single-colour square has no subject at
  // all, and the model correctly refuses it — which is not what this test is
  // trying to prove.
  const imageBuffer = testPng(100);

  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Choose an image' }).click();
  const fileChooser = await fileChooserPromise;

  await fileChooser.setFiles({
    name: 'test.png',
    mimeType: 'image/png',
    buffer: imageBuffer,
  });

  // Choosing an image on this route starts the run on its own; nothing else
  // needs clicking.
  await expect(page.getByText(/Done —/)).toBeVisible({ timeout: 60000 });

  console.log('AI extraction completed successfully!');
});
