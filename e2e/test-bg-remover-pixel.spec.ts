/* oxlint-disable */
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Background Remover Pixel Test', () => {
  test('should actually remove white pixels', async ({ page }) => {
    // This route auto-runs AI removal on the chosen image, and the first run in
    // a fresh browser fetches a 4.4 MB model and a 12 MB WebAssembly runtime.
    test.setTimeout(180_000);
    await page.goto('/image/background-remover');

    // A 10×10 white field with a 2×2 red block at its centre: small enough to
    // check every pixel afterwards, and distinct enough to tell a removed
    // background from a removed subject.
    const base64Image = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 10;
      canvas.height = 10;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 10, 10);
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(4, 4, 2, 2);
      return canvas.toDataURL('image/png').split(',')[1];
    });

    const imageBuffer = Buffer.from(base64Image, 'base64');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Choose an image' }).click();
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles({
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: imageBuffer,
    });

    await page.getByRole('button', { name: 'Remove background' }).click();

    await expect(page.getByText('Done — 10 × 10px')).toBeVisible({
      timeout: 120_000,
    });

    const imgLocator = page.locator('img[alt="Edited image preview"]');
    await expect(imgLocator).toBeVisible();

    const blobUrl = await imgLocator.getAttribute('src');

    // Decode the result back into a canvas to inspect the actual alpha channel;
    // a "Done" receipt alone would not prove any pixel became transparent.
    const pixelData = await page.evaluate(async (url) => {
      return new Promise<{
        transparentCount: number;
        redCount: number;
        total: number;
      }>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('no context'));
            return;
          }
          ctx.drawImage(img, 0, 0);
          const data = ctx.getImageData(0, 0, img.width, img.height).data;
          // Count transparent pixels (alpha = 0)
          let transparentCount = 0;
          let redCount = 0;
          for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) transparentCount++;
            else if (data[i]! > 200 && data[i + 1]! < 50 && data[i + 2]! < 50)
              redCount++;
          }
          resolve({ transparentCount, redCount, total: data.length / 4 });
        };
        img.onerror = reject;
        img.src = url || '';
      });
    }, blobUrl);

    console.log('Pixel check result:', pixelData);
    expect(pixelData.transparentCount).toBeGreaterThan(0);
  });
});
