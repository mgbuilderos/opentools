import { test, expect } from '@playwright/test';

test('Upscaler page loads', async ({ page }) => {
  await page.goto('/image/upscaler');
  await expect(page.locator('h1')).toHaveText(/AI Image Upscaler/i);
});
