import { readFile } from 'node:fs/promises';

import { expect, test, type Page } from '@playwright/test';

async function textPng(page: Page, text = 'OPEN TOOLS OCR') {
  const base64 = await page.evaluate((value) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 260;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#000000';
    context.font = 'bold 96px Arial, sans-serif';
    context.textBaseline = 'middle';
    context.fillText(value, 55, 130);
    return canvas.toDataURL('image/png').split(',')[1]!;
  }, text);
  return Buffer.from(base64, 'base64');
}

test.describe('Image to text OCR', () => {
  test('loads no OCR asset before the stated user action, then reads known text exactly', async ({
    page,
  }) => {
    const ocrRequests: string[] = [];
    const offOrigin: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.pathname.startsWith('/ocr/')) ocrRequests.push(url.pathname);
      if (url.origin !== 'http://localhost:8788') offOrigin.push(request.url());
    });

    await page.goto('/image/to-text');
    await page.waitForLoadState('networkidle');
    expect(ocrRequests, 'cold route loaded an OCR asset').toEqual([]);

    const image = await textPng(page);
    await page.getByLabel('Choose images for text recognition').setInputFiles({
      name: 'known-text.png',
      mimeType: 'image/png',
      buffer: image,
    });
    expect(ocrRequests, 'file selection loaded an OCR asset').toEqual([]);

    await page
      .getByRole('button', { name: /download 9,832,213 bytes .* and read text/iu })
      .click();
    const output = page.getByLabel('Recognised text from known-text.png');
    await expect(output).toHaveValue('OPEN TOOLS OCR', { timeout: 120_000 });
    expect(ocrRequests.some((url) => url.endsWith('/worker.min.js'))).toBe(true);
    expect(ocrRequests.some((url) => url.endsWith('/eng.traineddata.gz'))).toBe(
      true,
    );
    expect(offOrigin).toEqual([]);

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download .txt' }).click();
    const saved = await download;
    expect(saved.suggestedFilename()).toBe('known-text-text.txt');
    expect(await readFile((await saved.path())!, 'utf8')).toBe('OPEN TOOLS OCR');
  });

  test('runs multiple images sequentially through the shared batch runner', async ({
    page,
  }) => {
    await page.goto('/image/to-text');
    await page.waitForLoadState('networkidle');
    const first = await textPng(page, 'FIRST IMAGE');
    const second = await textPng(page, 'SECOND IMAGE');
    await page.getByLabel('Choose images for text recognition').setInputFiles([
      { name: 'first.png', mimeType: 'image/png', buffer: first },
      { name: 'second.png', mimeType: 'image/png', buffer: second },
    ]);
    await page
      .getByRole('button', { name: /and read 2 images/iu })
      .click();
    await expect(page.locator('[data-batch-result="done"]')).toHaveCount(2, {
      timeout: 180_000,
    });
    await expect(page.getByLabel('Recognised text from first.png')).toHaveValue(
      'FIRST IMAGE',
    );
    await expect(page.getByLabel('Recognised text from second.png')).toHaveValue(
      'SECOND IMAGE',
    );
  });
});
