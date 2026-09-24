import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test, type Download } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

const fixtureDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'lib',
  'tools',
  'spreadsheet',
  '__fixtures__',
);

test.describe('Excel to PDF in-browser vector conversion', () => {
  test('converts sales.xlsx to a downloadable vector PDF with zero server upload', async ({
    page,
  }) => {
    // Collect all network requests to prove zero egress
    const offOriginRequests: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (
        url.hostname !== 'localhost' &&
        url.hostname !== '127.0.0.1' &&
        !url.protocol.startsWith('blob:') &&
        !url.protocol.startsWith('data:')
      ) {
        offOriginRequests.push(request.url());
      }
    });

    await page.goto('/pdf/excel-to-pdf');

    // Heading and privacy guarantee must be visible
    await expect(
      page.getByRole('heading', { name: /Convert Excel to PDF Online/i }),
    ).toBeVisible();
    await expect(page.getByText(/Zero-Egress Security/i)).toBeVisible();

    // Upload sales.xlsx fixture
    const salesBuffer = await readFile(path.join(fixtureDir, 'sales.xlsx'));
    const fileInput = page.locator('#excel-file-upload');
    await fileInput.setInputFiles({
      name: 'sales.xlsx',
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: salesBuffer,
    });

    // Verify file info and workbook sheet preview
    await expect(page.getByText('sales.xlsx')).toBeVisible();
    await expect(page.getByText(/3 sheet\(s\)/i)).toBeVisible();
    await expect(page.getByText('Sales', { exact: true })).toBeVisible();
    await expect(page.getByText('Empty Sheet', { exact: true })).toBeVisible();
    await expect(page.getByText('Gaps', { exact: true })).toBeVisible();

    // Trigger conversion
    const convertBtn = page.getByRole('button', { name: /Convert to PDF/i });
    await expect(convertBtn).toBeEnabled();
    await convertBtn.click();

    // Expect receipt card
    await expect(
      page.getByText(/PDF Generated Successfully/i),
    ).toBeVisible();
    await expect(page.getByText(/Processed Rows/i)).toBeVisible();

    // Wait for download event and click Download button
    const downloadPromise: Promise<Download> = page.waitForEvent('download');
    const downloadBtn = page.locator('button[data-receipt-download="true"]').first();
    await expect(downloadBtn).toBeVisible();
    await downloadBtn.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('sales.pdf');

    // Read and verify the downloaded bytes
    const downloadedPath = await download.path();
    expect(downloadedPath).toBeTruthy();
    const pdfBytes = await readFile(downloadedPath!);

    expect(pdfBytes.length).toBeGreaterThan(1000);
    const pdfHeader = pdfBytes.subarray(0, 5).toString();
    expect(pdfHeader).toBe('%PDF-');

    // Parse with pdf-lib to assert structure
    const doc = await PDFDocument.load(pdfBytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(3);

    // Assert zero egress
    expect(offOriginRequests).toEqual([]);
  });
});
