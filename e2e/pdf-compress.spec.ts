import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

import { readZip } from '../lib/tools/archive/zip-reader';
import { testPdf, testPhotoPdf } from './fixtures';
import { setFilesWhenLive } from './upload';

/**
 * Compression is only worth shipping if the file a person ends up with is both
 * smaller and still a working PDF, so this saves the download and reads it back
 * with pdf-lib rather than trusting the receipt on screen.
 */
async function choosePdf(page: Page, buffer: Buffer, name = 'source.pdf') {
  await expect(async () => {
    const chooser = page.waitForEvent('filechooser', { timeout: 2_000 });
    await page
      .getByRole('button', { name: /choose a pdf/iu })
      .first()
      .click();
    await (
      await chooser
    ).setFiles({
      name,
      mimeType: 'application/pdf',
      buffer,
    });
  }).toPass({ timeout: 45_000 });
}

async function savedPdfBytes(page: Page) {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save compressed PDF' }).click();
  return readFile(await (await download).path());
}

test.describe('Compress PDF', () => {
  test('makes a photo-heavy PDF smaller and the result still opens', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(String(error)));

    await page.goto('/pdf/compress');
    const source = await testPhotoPdf(page, 3);
    await choosePdf(page, source);

    await page.getByRole('slider', { name: 'Photo quality' }).fill('50');
    await page
      .getByRole('combobox', { name: 'Largest photo edge' })
      .selectOption('1000');

    const compress = page.getByRole('button', { name: 'Compress PDF' });
    await expect(compress).toBeEnabled({ timeout: 30_000 });
    await compress.click();

    await expect(
      page.getByRole('heading', { name: /^Done — \d+% smaller$/u }),
    ).toBeVisible({ timeout: 120_000 });
    await expect(page.getByText(/\d+ re-encoded/u)).toBeVisible();

    const saved = await savedPdfBytes(page);
    expect(new TextDecoder('ascii').decode(saved.subarray(0, 5))).toBe('%PDF-');
    expect(saved.length).toBeLessThan(source.length);

    const { PDFDocument } = await import('pdf-lib');
    const reopened = await PDFDocument.load(saved);
    expect(reopened.getPageCount()).toBe(3);

    expect(errors, `page errors: ${errors.join(' | ')}`).toEqual([]);
  });

  test('says so plainly when a text-only PDF cannot be made smaller', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.goto('/pdf/compress');
    await choosePdf(page, await testPdf(2), 'text-only.pdf');

    const compress = page.getByRole('button', { name: 'Compress PDF' });
    await expect(compress).toBeEnabled({ timeout: 30_000 });
    await compress.click();

    // Either outcome is honest; what must never happen is a bigger file sold
    // as a smaller one.
    const receipt = page.getByRole('heading', {
      name: /^Done — (\d+% smaller|this PDF was already as small as we can make it)$/u,
    });
    await expect(receipt).toBeVisible({ timeout: 60_000 });

    const saved = await savedPdfBytes(page);
    const source = await testPdf(2);
    expect(saved.length).toBeLessThanOrEqual(source.length);
    const { PDFDocument } = await import('pdf-lib');
    expect((await PDFDocument.load(saved)).getPageCount()).toBe(2);
  });

  test('refuses a file that is not a PDF', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/pdf/compress');
    await choosePdf(
      page,
      Buffer.from('this is not a pdf at all', 'utf8'),
      'notes.txt.pdf',
    );

    await expect(page.getByRole('alert')).toContainText(
      /could not be read as a supported PDF/iu,
      { timeout: 30_000 },
    );
  });

  test('compresses three PDFs and downloads all outputs as a ZIP', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const source = await testPdf(2);
    await page.goto('/pdf/compress');
    await setFilesWhenLive(
      page.locator('input[type="file"]'),
      [
        { name: 'first.pdf', mimeType: 'application/pdf', buffer: source },
        { name: 'second.pdf', mimeType: 'application/pdf', buffer: source },
        { name: 'third.pdf', mimeType: 'application/pdf', buffer: source },
      ],
      page.getByRole('button', { name: 'Compress all' }),
    );

    await page.getByRole('button', { name: 'Compress all' }).click();
    await expect(page.locator('[data-batch-result="done"]')).toHaveCount(3, {
      timeout: 60_000,
    });
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download all as ZIP' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('compressed-pdfs.zip');
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    expect(
      readZip(new Uint8Array(await readFile(downloadPath!))).entries,
    ).toHaveLength(3);
  });
});
