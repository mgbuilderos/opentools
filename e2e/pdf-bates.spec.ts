import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test, type Download, type Page } from '@playwright/test';
import { PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName } from 'pdf-lib';

const fixtureDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'lib',
  'tools',
  'pdf',
  '__fixtures__',
);

async function uploadPdfs(page: Page, filenames: string[]) {
  const filePaths = filenames.map((f) => path.join(fixtureDir, f));
  const input = page.locator('input[type="file"]');
  await input.setInputFiles(filePaths);
}

test.describe('Bates Numbering for PDFs (/pdf/bates)', () => {
  test('stamps a single document with prefix, custom starting number, padding, and page labels', async ({
    page,
  }) => {
    await page.goto('/pdf/bates');

    // Verify heading
    await expect(
      page.getByRole('heading', { name: 'Bates Numbering for PDFs' }),
    ).toBeVisible();

    // Upload source sample (5 pages)
    await uploadPdfs(page, ['source-sample.pdf']);

    // Queue card appears
    await expect(page.getByText('source-sample.pdf')).toBeVisible();
    await expect(page.getByText(/5 pages •/)).toBeVisible();

    // Set configuration: Prefix, starting number, suffix
    const prefixInput = page.locator('input[placeholder="EXHIBIT-"]');
    await prefixInput.fill('CONF-');

    const startNumInput = page.locator('input[type="number"]');
    await startNumInput.fill('501');

    const suffixInput = page.locator('input[placeholder="-CONF"]');
    await suffixInput.fill('-US');

    // Check projected range updates in real time
    await expect(page.getByText('CONF-000501-US – CONF-000505-US').first()).toBeVisible();

    // Select position: top-right
    await page.getByRole('button', { name: 'Top Right' }).click();

    // Click stamp button
    const stampBtn = page.getByRole('button', { name: /Stamp 1 Document/i });
    await stampBtn.click();

    // Complete state
    await expect(page.getByText('Bates Numbering Complete')).toBeVisible();
    await expect(page.getByText('CONF-000501-US – CONF-000505-US').first()).toBeVisible();

    // Download stamped PDF
    const downloadPromise: Promise<Download> = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Download' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('source-sample-bates.pdf');
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();

    const downloadedBytes = await readFile(downloadPath!);
    const stampedDoc = await PDFDocument.load(downloadedBytes);
    expect(stampedDoc.getPageCount()).toBe(5);

    // Verify PageLabels
    const pageLabels = stampedDoc.catalog.lookup(PDFName.of('PageLabels'), PDFDict);
    expect(pageLabels).toBeDefined();
    const nums = pageLabels.lookup(PDFName.of('Nums'), PDFArray);
    expect(nums.size()).toBe(10); // 5 pages * 2

    const firstLabel = (nums.lookup(1, PDFDict) as PDFDict)
      .lookup(PDFName.of('P'), PDFHexString)
      .decodeText();
    const lastLabel = (nums.lookup(9, PDFDict) as PDFDict)
      .lookup(PDFName.of('P'), PDFHexString)
      .decodeText();

    expect(firstLabel).toBe('CONF-000501-US');
    expect(lastLabel).toBe('CONF-000505-US');
  });

  test('continuously sequences multiple documents and produces a merged exhibit bundle', async ({
    page,
  }) => {
    await page.goto('/pdf/bates');

    // Upload two documents (5 pages + 2 pages = 7 total)
    await uploadPdfs(page, ['source-sample.pdf', 'source-sample-2.pdf']);

    await expect(page.getByText('Exhibit Sequence (2 files)')).toBeVisible();
    await expect(page.getByText(/7 total pages/i)).toBeVisible();

    // Use default prefix EXHIBIT- and starting number 1
    await expect(page.getByText('EXHIBIT-000001 – EXHIBIT-000007')).toBeVisible();

    // Click Stamp
    const stampBtn = page.getByRole('button', { name: /Stamp 2 Documents/i });
    await stampBtn.click();

    // Complete state
    await expect(page.getByText('Bates Numbering Complete')).toBeVisible();
    await expect(
      page.getByText('Combined Legal Exhibit Bundle'),
    ).toBeVisible();

    // Download combined bundle
    const downloadPromise: Promise<Download> = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Download Combined PDF' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('exhibit-bundle-bates.pdf');
    const downloadPath = await download.path();
    const downloadedBytes = await readFile(downloadPath!);
    const bundleDoc = await PDFDocument.load(downloadedBytes);

    expect(bundleDoc.getPageCount()).toBe(7);

    // Verify continuous labels in merged bundle
    const pageLabels = bundleDoc.catalog.lookup(PDFName.of('PageLabels'), PDFDict);
    expect(pageLabels).toBeDefined();
    const nums = pageLabels.lookup(PDFName.of('Nums'), PDFArray);
    expect(nums.size()).toBe(14); // 7 pages * 2

    const firstLabel = (nums.lookup(1, PDFDict) as PDFDict)
      .lookup(PDFName.of('P'), PDFHexString)
      .decodeText();
    const lastLabel = (nums.lookup(13, PDFDict) as PDFDict)
      .lookup(PDFName.of('P'), PDFHexString)
      .decodeText();

    expect(firstLabel).toBe('EXHIBIT-000001');
    expect(lastLabel).toBe('EXHIBIT-000007');
  });

  test('refuses invalid non-PDF file upload with friendly error', async ({
    page,
  }) => {
    await page.goto('/pdf/bates');

    // Upload a non-PDF file
    const input = page.locator('input[type="file"]');
    await input.setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Plain text content'),
    });

    await expect(
      page.getByText('Please select standard PDF documents (.pdf).'),
    ).toBeVisible();
  });
});
