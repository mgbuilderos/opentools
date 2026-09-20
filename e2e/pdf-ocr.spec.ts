import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

import { expect, test, type Page } from '@playwright/test';

import { testPdf } from './fixtures';

async function textPng(page: Page) {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 260;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#000000';
    context.font = 'bold 96px Arial, sans-serif';
    context.textBaseline = 'middle';
    context.fillText('SEARCHABLE OCR PAGE', 45, 130);
    return canvas.toDataURL('image/png').split(',')[1]!;
  });
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
      .getByRole('button', { name: /check scan, then download 9,832,213 bytes/iu })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Done — 1 page searchable' }),
    ).toBeVisible({ timeout: 180_000 });
    await expect(page.getByRole('cell', { name: /^1$/u })).toHaveCount(2);

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
    expect(extracted.replace(/\s+/gu, ' ').trim()).toContain(
      'SEARCHABLE OCR PAGE',
    );
  });

  test('refuses a text PDF before any OCR asset is requested', async ({ page }) => {
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
    await expect(page.getByRole('button', { name: 'Save searchable PDF' })).toHaveCount(
      0,
    );
  });
});
