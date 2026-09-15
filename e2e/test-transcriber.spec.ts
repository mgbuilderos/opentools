import { test, expect } from '@playwright/test';

test('Transcriber page loads', async ({ page }) => {
  await page.goto('/audio/transcribe');
  await expect(page.locator('h1')).toHaveText(/AI Audio Transcriber/i);
});
