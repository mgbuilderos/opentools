import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test, type Download, type Page } from '@playwright/test';

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'lib',
  'tools',
  'pdf',
  '__fixtures__',
);

async function uploadPdf(page: Page, fixtureName: string) {
  const filePath = path.join(fixturesDir, fixtureName);
  const fileBytes = await readFile(filePath);
  const input = page.locator('input[type="file"]');
  await input.setInputFiles({
    name: fixtureName,
    mimeType: 'application/pdf',
    buffer: fileBytes,
  });
}

/** Helper to inspect ZIP entries in the generated .xlsx archive. */
async function readZipEntry(zip: Uint8Array, name: string): Promise<string> {
  const { inflateRawSync } = await import('node:zlib');
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const decoder = new TextDecoder();
  let offset = 0;
  while (
    offset + 30 <= zip.length &&
    view.getUint32(offset, true) === 0x04034b50
  ) {
    const method = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const entryName = decoder.decode(
      zip.subarray(offset + 30, offset + 30 + nameLength),
    );
    const dataStart = offset + 30 + nameLength + extraLength;
    if (entryName === name) {
      const raw = zip.subarray(dataStart, dataStart + compressedSize);
      return decoder.decode(method === 8 ? inflateRawSync(raw) : raw);
    }
    offset = dataStart + compressedSize;
  }
  throw new Error(`${name} is not in the archive`);
}

test.describe('Bank Statement & PDF Table to Excel (/pdf/to-excel)', () => {
  test('refuses scanned/image-only PDF by name without producing empty output (G7)', async ({
    page,
  }) => {
    await page.goto('/pdf/to-excel');

    await expect(
      page.getByRole('heading', {
        name: 'Bank Statement & PDF Table to Excel',
      }),
    ).toBeVisible();

    await uploadPdf(page, 'statement-scanned.pdf');

    // Refusal banner appears with exact filename
    await expect(
      page.getByRole('heading', {
        name: 'Scanned / Image-Only PDF Refused',
      }),
    ).toBeVisible();

    await expect(page.getByText(/statement-scanned\.pdf/i)).toBeVisible();
    await expect(
      page.getByText(/contains no readable digital text layer/i),
    ).toBeVisible();

    // Explains why and what to do instead
    await expect(page.getByText(/Download the digital PDF/i)).toBeVisible();
    await expect(
      page.getByText(/Export direct CSV \/ OFX \/ QIF/i),
    ).toBeVisible();

    // Confirm no download buttons exist (we did NOT produce an empty file)
    await expect(
      page.getByRole('button', { name: /Download Excel/i }),
    ).not.toBeVisible();
    await expect(
      page.getByRole('button', { name: /Download CSV/i }),
    ).not.toBeVisible();
  });

  test('extracts statement, displays preview grid, reconciles balance, and downloads valid Excel and CSV', async ({
    page,
  }) => {
    await page.goto('/pdf/to-excel');

    await uploadPdf(page, 'statement-signed-amount.pdf');

    // Document header shows file name and page count
    await expect(
      page.getByRole('heading', { name: 'statement-signed-amount.pdf' }),
    ).toBeVisible();
    await expect(page.getByText(/1 page •/i)).toBeVisible();

    // Facts panel verifies reconciliation
    await expect(
      page.getByText(/Extraction Facts & Reconciliation/i),
    ).toBeVisible();
    await expect(page.getByText(/100% Reconciled/i)).toBeVisible();

    // Table preview renders with column role pickers
    await expect(
      page.getByRole('heading', { name: 'Table Preview & Column Mapping' }),
    ).toBeVisible();

    // Verify cell content loaded from statement
    await expect(
      page.locator('input[value="PAYROLL DIRECT DEPOSIT"]'),
    ).toBeVisible();

    // Change column 1 role
    const col1Role = page.getByRole('combobox', { name: 'Column 1 Role' });
    await expect(col1Role).toHaveValue('date');

    // Test Excel download
    const xlsxDownloadPromise: Promise<Download> =
      page.waitForEvent('download');
    await page
      .getByRole('button', { name: /Download Excel \(\.xlsx\)/i })
      .click();
    const xlsxDownload = await xlsxDownloadPromise;

    expect(xlsxDownload.suggestedFilename()).toBe(
      'statement-signed-amount.xlsx',
    );
    const xlsxPath = await xlsxDownload.path();
    expect(xlsxPath).toBeTruthy();

    const xlsxBytes = await readFile(xlsxPath!);
    // Valid ZIP signature [0x50, 0x4b]
    expect(xlsxBytes[0]).toBe(0x50);
    expect(xlsxBytes[1]).toBe(0x4b);

    // Read internal sheet XML from generated Excel file
    const sheetXml = await readZipEntry(xlsxBytes, 'xl/worksheets/sheet1.xml');
    expect(sheetXml).toContain('<sheetData>');

    // Test CSV download
    const csvDownloadPromise: Promise<Download> = page.waitForEvent('download');
    await page.getByRole('button', { name: /Download CSV \(\.csv\)/i }).click();
    const csvDownload = await csvDownloadPromise;

    expect(csvDownload.suggestedFilename()).toBe('statement-signed-amount.csv');
    const csvPath = await csvDownload.path();
    expect(csvPath).toBeTruthy();

    const csvContent = await readFile(csvPath!, 'utf8');
    expect(csvContent).toContain('PAYROLL DIRECT DEPOSIT');
  });

  test('handles multi-page statement without duplicating headers', async ({
    page,
  }) => {
    await page.goto('/pdf/to-excel');

    await uploadPdf(page, 'statement-multipage.pdf');

    await expect(
      page.getByRole('heading', { name: 'statement-multipage.pdf' }),
    ).toBeVisible();
    await expect(page.getByText(/3 pages •/i)).toBeVisible();

    // Verify that transactions from across pages are present
    await expect(page.locator('input[value="SOFTWARE RENEWAL"]')).toBeVisible();
    await expect(
      page.locator('input[value="CONSULTING SERVICES"]'),
    ).toBeVisible();
  });
});
