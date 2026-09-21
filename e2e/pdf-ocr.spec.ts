import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

import { expect, test, type Page } from '@playwright/test';

import { testPdf } from './fixtures';

const knownTextSvg = await readFile(
  new URL('./fixtures/ocr-known-text.svg', import.meta.url),
  'utf8',
);

async function textPng(page: Page) {
  const base64 = await page.evaluate(async (svg) => {
    const image = new Image();
    const url = URL.createObjectURL(
      new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }),
    );
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    URL.revokeObjectURL(url);
    return canvas.toDataURL('image/png').split(',')[1]!;
  }, knownTextSvg);
  return Buffer.from(base64, 'base64');
}

async function scannedPdf(page: Page) {
  const { PDFDocument } = await import('pdf-lib');
  const document = await PDFDocument.create();
  const image = await document.embedPng(await textPng(page));
  const pdfPage = document.addPage([600, 130]);
  pdfPage.drawImage(image, { x: 0, y: 0, width: 600, height: 130 });
  return Buffer.from(await document.save());
}

test.describe('PDF OCR', () => {
  test('keeps the scanned page and produces text that pdftotext can read', async ({
    page,
  }) => {
    await page.goto('/pdf/ocr');
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Choose a scanned PDF').setInputFiles({
      name: 'paper-scan.pdf',
      mimeType: 'application/pdf',
      buffer: await scannedPdf(page),
    });
    await page
      .getByRole('button', {
        name: /check scan, then download 9,832,213 bytes/iu,
      })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Done — 1 page searchable' }),
    ).toBeVisible({ timeout: 180_000 });
    await expect(page.locator('table tbody tr')).toHaveCount(1);
    await expect(page.locator('table tbody tr')).toContainText(/^1/u);

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save searchable PDF' }).click();
    const saved = await download;
    expect(saved.suggestedFilename()).toBe('paper-scan-searchable.pdf');
    const path = (await saved.path())!;
    const bytes = await readFile(path);
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    const extracted = execFileSync('pdftotext', [path, '-'], {
      encoding: 'utf8',
    });
    expect(extracted.replace(/\s+/gu, ' ').trim()).toContain('OPEN TOOLS OCR');
  });

  test('refuses a text PDF before any OCR asset is requested', async ({
    page,
  }) => {
    const ocrRequests: string[] = [];
    page.on('request', (request) => {
      const path = new URL(request.url()).pathname;
      if (path.startsWith('/ocr/')) ocrRequests.push(path);
    });
    await page.goto('/pdf/ocr');
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Choose a scanned PDF').setInputFiles({
      name: 'digital.pdf',
      mimeType: 'application/pdf',
      buffer: await testPdf(1),
    });
    await page
      .getByRole('button', { name: /check scan, then download/iu })
      .click();
    const refusal = page.getByRole('alert');
    await expect(refusal).toContainText('already contains selectable text', {
      timeout: 60_000,
    });
    expect(ocrRequests).toEqual([]);
    await expect(
      page.getByRole('button', { name: 'Save searchable PDF' }),
    ).toHaveCount(0);
  });
});
