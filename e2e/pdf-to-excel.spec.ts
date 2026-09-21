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

/**
 * Hand the page a PDF, and make sure the page actually took it.
 *
 * The input is server-rendered, so it exists before React has hydrated and
 * attached the change handler. Setting files in that window fires an event
 * into nothing: the upload silently does not happen and the page sits on its
 * empty drop zone until the test times out somewhere far away, looking like a
 * broken feature. Reproduced at three workers, roughly one run in four —
 * `rows: 0, frame: 0` with the drop-zone copy still on screen.
 *
 * So: wait for the chunks to land, then confirm the app moved off the empty
 * state, and set the files once more if it did not.
 */
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

  // The drop zone is replaced the moment a file is accepted, whatever the
  // outcome after that — results, a refusal, or an error.
  const dropZone = page.getByText('Drop your bank statement or PDF table here');
  try {
    await expect(dropZone).toBeHidden({ timeout: 5000 });
  } catch {
    await input.setInputFiles([]);
    await input.setInputFiles(file);
    await expect(dropZone).toBeHidden({ timeout: 20000 });
  }
}

/**
 * Wait for the page view to finish drawing.
 *
 * The overlay positions its dividers from the rendered canvas's dimensions, so
 * nothing about the grid is assertable until pdf.js has painted. Waiting on
 * the canvas is a real readiness signal; a fixed sleep is not.
 */
async function waitForGrid(page: Page): Promise<void> {
  // 45s covers the cold server: the first page load after the suite's
  // webServer boots has to deliver the pdf.js chunks, and with three browsers
  // arriving together the first one can take tens of seconds. A warm run
  // resolves this in about a second. The budget does not hide a regression —
  // if the grid stops rendering the canvas never appears and this still fails.
  await expect(
    page.locator('[data-testid="pdf-grid-frame"] canvas'),
  ).toBeVisible({ timeout: 45000 });
  await expect(page.getByTestId('column-divider').first()).toBeVisible({
    timeout: 15000,
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

test.describe('Bank statement PDF to Excel for client books (/pdf/to-excel)', () => {
  test('refuses scanned/image-only PDF by name without producing empty output (G7)', async ({
    page,
  }) => {
    await page.goto('/pdf/to-excel');

    await expect(
      page.getByRole('heading', {
        // The heading now names the job rather than the file formats: the
        // page carries a practice brief from lib/practice-briefs.ts.
        name: 'Bank statement PDF to Excel for client books',
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
      page.getByRole('button', { name: 'Read this scan with OCR' }),
    ).toBeVisible();
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

  test('hands a refused statement scan to PDF OCR without choosing it again', async ({
    page,
  }) => {
    await page.goto('/pdf/to-excel');
    await uploadPdf(page, 'statement-scanned.pdf');
    await page.getByRole('button', { name: 'Read this scan with OCR' }).click();
    await expect(page).toHaveURL(/\/pdf\/ocr$/u);
    await expect(
      page.getByText('statement-scanned.pdf', { exact: true }),
    ).toBeVisible({ timeout: 10_000 });
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

  test('reads the columns off a ruled PDF and says so, rather than guessing', async ({
    page,
  }) => {
    // Renders a full page with pdf.js on top of the extraction. That is real
    // work, and at three parallel workers several browsers do it at once —
    // the same contention the config already caps for the model-loading
    // specs. Marked slow rather than given a bigger timeout, so a genuine
    // product regression still shows up as a failure and not as a long wait.
    test.slow();
    await page.goto('/pdf/to-excel');
    await uploadPdf(page, 'statement-ruled.pdf');

    // Extraction first — the facts panel is rendered from its result, so
    // asserting the panel before a row exists is asserting out of order and
    // spends the whole timeout budget waiting for the wrong thing.
    await expect(page.locator('input[value="01/04/2026"]')).toBeVisible({
      timeout: 45000,
    });

    // Then: the facts panel must state HOW the columns were found. This is
    // the claim the whole lattice engine exists to be able to make.
    await expect(page.getByText('Read from the drawn lines')).toBeVisible();

    // Eight transactions over two pages, header counted once, footer dropped.
    await expect(page.locator('input[value="30/04/2026"]')).toBeVisible();
    await expect(page.locator('input[value="NORTHERN RENT DD"]')).toBeVisible();

    // The repeated header on page 2 must not have become a data row. Scoped
    // to the body: the column-name row is editable too, so an unscoped
    // "Date" matches the header the table is supposed to have.
    await expect(page.locator('tbody input[value="Date"]')).toHaveCount(0);
    // Nor the footer, which lattice drops for free by sitting outside the
    // ruled area.
    await expect(page.locator('tbody input[value*="Sort code"]')).toHaveCount(
      0,
    );
  });

  test('draws the page with a divider per column boundary', async ({
    page,
  }) => {
    // Renders a full page with pdf.js on top of the extraction. That is real
    // work, and at three parallel workers several browsers do it at once —
    // the same contention the config already caps for the model-loading
    // specs. Marked slow rather than given a bigger timeout, so a genuine
    // product regression still shows up as a failure and not as a long wait.
    test.slow();
    await page.goto('/pdf/to-excel');
    await uploadPdf(page, 'statement-ruled.pdf');

    await waitForGrid(page);
    // Six boundaries for the five-column ruled statement.
    await expect(page.getByTestId('column-divider')).toHaveCount(6);
  });

  test('a divider removed on the page view merges two columns in the table', async ({
    page,
  }) => {
    // Renders a full page with pdf.js on top of the extraction. That is real
    // work, and at three parallel workers several browsers do it at once —
    // the same contention the config already caps for the model-loading
    // specs. Marked slow rather than given a bigger timeout, so a genuine
    // product regression still shows up as a failure and not as a long wait.
    test.slow();
    await page.goto('/pdf/to-excel');
    await uploadPdf(page, 'statement-ruled.pdf');
    await waitForGrid(page);
    await expect(page.getByTestId('column-divider')).toHaveCount(6);

    // Before: the date and the description are separate cells.
    await expect(page.locator('input[value="01/04/2026"]')).toBeVisible();
    await expect(page.locator('input[value="Opening balance"]')).toBeVisible();

    // Remove the divider between them, with the keyboard rather than a drag,
    // because the feature must work without a mouse.
    const dividers = page.getByTestId('column-divider');
    await dividers.nth(1).focus();
    await page.keyboard.press('Delete');

    await expect(page.getByTestId('column-divider')).toHaveCount(5);
    // After: one cell holding both, which is what merging the columns means.
    await expect(
      page.locator('input[value="01/04/2026 Opening balance"]'),
    ).toBeVisible();
  });

  test("refuses to remove the table's own outer edge", async ({ page }) => {
    // Renders a full page with pdf.js on top of the extraction. That is real
    // work, and at three parallel workers several browsers do it at once —
    // the same contention the config already caps for the model-loading
    // specs. Marked slow rather than given a bigger timeout, so a genuine
    // product regression still shows up as a failure and not as a long wait.
    test.slow();
    await page.goto('/pdf/to-excel');
    await uploadPdf(page, 'statement-ruled.pdf');
    await waitForGrid(page);
    await expect(page.getByTestId('column-divider')).toHaveCount(6);

    // Removing it would not merge anything: it would drop every value to the
    // left of the table out of the extraction.
    await page.getByTestId('column-divider').first().focus();
    await page.keyboard.press('Delete');
    await expect(page.getByTestId('column-divider')).toHaveCount(6);
    await expect(page.locator('input[value="01/04/2026"]')).toBeVisible();
  });

  test('names a broken running balance instead of scoring the document', async ({
    page,
  }) => {
    // Renders a full page with pdf.js on top of the extraction. That is real
    // work, and at three parallel workers several browsers do it at once —
    // the same contention the config already caps for the model-loading
    // specs. Marked slow rather than given a bigger timeout, so a genuine
    // product regression still shows up as a failure and not as a long wait.
    test.slow();
    await page.goto('/pdf/to-excel');
    await uploadPdf(page, 'statement-ruled.pdf');

    // A clean statement flags nothing.
    await expect(page.getByText('Nothing flagged')).toBeVisible({
      timeout: 45000,
    });
    await expect(page.getByTestId('cell-flags')).toHaveCount(0);

    // Break one balance the way a misread digit would. Addressed by its
    // accessible name, not by its value: `fill` changes the value, and a
    // value selector then stops resolving to the element being edited.
    const balance = page.getByLabel('Row 3 Column 5', { exact: true });
    await expect(balance).toHaveValue('4,550.00');
    await balance.fill('9,999.99');

    const flags = page.getByTestId('cell-flags');
    await expect(flags).toBeVisible();
    await expect(flags).toContainText('running balance does not continue');
    // And never a percentage, which is the rule this panel exists under.
    await expect(flags).not.toContainText('%');

    // The flag reaches a screen reader too, not just the eye: the cell's own
    // accessible name now carries the reason. (This is also why the exact
    // name above stops matching once the cell is flagged.)
    await expect(
      page.getByLabel('Row 3 Column 5. Needs a look:'),
    ).toBeVisible();
  });
});
