import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Download, type Page } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

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
  const file = {
    name: fixtureName,
    mimeType: 'application/pdf',
    buffer: fileBytes,
  };

  await page.waitForLoadState('networkidle');
  await input.setInputFiles(file);

  const dropZone = page.getByText('Select or Drop a PDF to Redact');
  try {
    await expect(dropZone).toBeHidden({ timeout: 5000 });
  } catch {
    await input.setInputFiles([]);
    await input.setInputFiles(file);
    await expect(dropZone).toBeHidden({ timeout: 20000 });
  }
}

test.describe('/pdf/redact — True PDF Redaction Tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pdf/redact');
  });

  test('displays Operator v1 layout and file dropzone', async ({ page }) => {
    await expect(page.locator('#tool')).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 1, name: /Black Out PDF|Redact/i }),
    ).toBeVisible();
    await expect(page.getByText('Select or Drop a PDF to Redact')).toBeVisible();
    await expect(page.getByText('Choose PDF file')).toBeVisible();
  });

  test('refuses empty 0-byte file with error alert (G7)', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    const input = page.locator('input[type="file"]');
    const file = {
      name: 'empty.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.alloc(0),
    };
    await input.setInputFiles(file);

    const alert = page.getByRole('alert');
    try {
      await expect(alert).toBeVisible({ timeout: 5000 });
    } catch {
      await input.setInputFiles([]);
      await input.setInputFiles(file);
      await expect(alert).toBeVisible({ timeout: 15000 });
    }
    await expect(alert).toContainText(/empty|zero byte/i);
  });

  test('loads document, searches text, detects PII, adds manual box, and verifies download', async ({
    page,
  }) => {
    // 1. Upload contract fixture
    await uploadPdf(page, 'contract-source.pdf');

    // Workspace should now be visible
    await expect(page.getByText('contract-source.pdf')).toBeVisible();
    await expect(page.getByText('2 pages')).toBeVisible();
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });

    // Page navigation check
    await expect(page.getByText('Page 1 of 2')).toBeVisible();
    await page.getByRole('button', { name: 'Next Page' }).click();
    await expect(page.getByText('Page 2 of 2')).toBeVisible();
    await page.getByRole('button', { name: 'Previous Page' }).click();
    await expect(page.getByText('Page 1 of 2')).toBeVisible();

    // 2. Search & Mark Text
    const searchInput = page.locator('#search-redact-input');
    await searchInput.fill('Confidential');
    await page.getByRole('button', { name: 'Mark Occurrences' }).click();

    // Staged list should have 1 item
    await expect(page.getByText(/Staged Redactions \(1\)/i)).toBeVisible();
    await expect(page.getByText(/P1:\s*Search:\s*"Confidential"/i)).toBeVisible();

    // 3. Detect PII Secrets
    await page.getByRole('button', { name: 'Detect Secrets' }).click();
    await page.getByRole('button', { name: 'Scan & Mark PII' }).click();

    // Should detect email, card, IP -> total count increases to 4
    await expect(page.getByText(/Staged Redactions \(4\)/i)).toBeVisible();

    // 4. Draw / Manual Box
    await page.getByRole('button', { name: 'Draw / Manual Box' }).click();
    await page.getByRole('button', { name: 'Add Box to Page' }).click();

    // Total staged count is now 5
    await expect(page.getByText(/Staged Redactions \(5\)/i)).toBeVisible();
    await expect(page.getByText(/P1:\s*Manual redaction/i)).toBeVisible();

    // Verify overlaid DOM box can be selected and focused
    const box = page.locator('button[aria-label*="Redaction box"]').first();
    await expect(box).toBeVisible();
    await box.click();

    // 5. Apply Redaction & Download
    const applyBtn = page.getByRole('button', { name: 'Apply Redactions & Export' });
    await applyBtn.click();

    // Verification facts panel appears
    await expect(page.getByText('Redaction Complete & Verified')).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByText('Pages Redacted (Rasterised)')).toBeVisible();
    await expect(page.getByText('Pages Preserved (Vector Text)')).toBeVisible();

    // Download redacted PDF
    const downloadPromise: Promise<Download> = page.waitForEvent('download');
    await page.locator('[data-receipt-download="true"]').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('contract-source-redacted.pdf');
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();

    const downloadedBytes = await readFile(downloadPath!);
    expect(downloadedBytes.byteLength).toBeGreaterThan(10000);

    // Verify with pdf-lib: 2 pages, no metadata
    const redactedDoc = await PDFDocument.load(downloadedBytes);
    expect(redactedDoc.getPageCount()).toBe(2);
    expect(redactedDoc.getTitle() ?? '').toBe('');
    expect(redactedDoc.getAuthor() ?? '').toBe('');

    // Physical text verification: secrets must be 100% physically absent from PDF bytes!
    const secrets = [
      'Confidential Settlement Agreement',
      'john.doe@secretcorp.com',
      '4111 1111 1111 1111',
      '192.168.1.100',
    ];
    const rawPdfString = Buffer.from(downloadedBytes).toString('latin1');
    for (const secret of secrets) {
      expect(rawPdfString).not.toContain(secret);
    }
  });
});
