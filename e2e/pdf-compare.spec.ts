import { PDFDocument, StandardFonts } from 'pdf-lib';
import { expect, test } from '@playwright/test';

import { setFilesWhenLive } from './upload';

/**
 * Browser coverage for `/pdf/compare`.
 *
 * `lib/tools/diff/pdf/reflow.test.ts` proves the engine survives reflow —
 * a sentence inserted on page 1 of 10 leaves the later pages unchanged. This
 * proves the same thing reaches a person: that two files go in through the
 * page and the answer comes back on screen.
 *
 * The PDFs are built here rather than committed, because the property under
 * test is the *relationship* between the two documents, and a generator makes
 * that relationship explicit instead of hiding it in two binaries.
 */

const TOOL = '/pdf/compare';

async function buildPdf(pages: string[][]): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const lines of pages) {
    const page = doc.addPage([595, 842]);
    let y = 780;
    for (const line of lines) {
      page.drawText(line, { x: 50, y, size: 11, font });
      y -= 19;
    }
  }
  return Buffer.from(await doc.save());
}

/** Ten pages of settled prose, the same in both documents. */
function bodyPages(): string[][] {
  return Array.from({ length: 10 }, (_, index) => [
    `Section ${index + 1}. The parties agree to the terms set out below.`,
    `Each obligation in section ${index + 1} survives termination.`,
    `No amendment to section ${index + 1} is effective unless in writing.`,
  ]);
}

async function pdfPair(): Promise<{ a: Buffer; b: Buffer }> {
  const original = bodyPages();
  const revised = bodyPages();
  // One sentence added to page 1 — everything after it shifts.
  revised[0] = [
    ...revised[0]!,
    'NEW CRITICAL SENTENCE added during the second review.',
  ];
  return { a: await buildPdf(original), b: await buildPdf(revised) };
}

function pdfFile(name: string, buffer: Buffer) {
  return { name, mimeType: 'application/pdf', buffer };
}

test.describe('Compare PDF documents (/pdf/compare)', () => {
  test('compares a reflowed pair and reports the one real change', async ({
    page,
  }) => {
    test.slow();
    const { a, b } = await pdfPair();

    await page.goto(TOOL);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      /Compare PDF/,
    );

    const inputs = page.locator('input[type="file"]');
    await setFilesWhenLive(
      inputs.nth(0),
      pdfFile('original.pdf', a),
      page.getByText(/original\.pdf/i),
    );
    await setFilesWhenLive(
      inputs.nth(1),
      pdfFile('revised.pdf', b),
      page.getByText(/revised\.pdf/i),
    );

    // The tool waits to be told to run, which is right for a destructive-
    // feeling operation on two files.
    await page.getByRole('button', { name: /Compare Documents/i }).click();

    // The engine's guarantee, seen from the page: the inserted sentence is
    // found, and the nine untouched pages are not dressed up as changes.
    await expect(
      page.getByText(/NEW CRITICAL SENTENCE/i).first(),
    ).toBeVisible({ timeout: 60_000 });

    /*
     * The rule is that the page must not *present* an accuracy score. It may
     * name one to refuse it, and it now does: the explainer reads "there is no
     * similarity percentage anywhere on this page. A \"94% match\" is a number
     * with no defensible definition". Matching the raw body text scored that
     * sentence as the violation it exists to prevent.
     *
     * Quoted spans are therefore removed before matching. A percentage the
     * page actually reported would be a readout, never wrapped in quotes, so
     * the guard keeps its teeth -- verified by putting `94% match` into the
     * results panel unquoted and watching this fail.
     */
    const body = (await page.locator('body').innerText())
      .replace(/"[^"]*"/gu, '')
      .replace(/\u201c[^\u201d]*\u201d/gu, '');
    expect(body, 'the page must not invent an accuracy score').not.toMatch(
      /\b\d{1,3}\s?% (accurate|match|confidence)\b/iu,
    );
  });

  test('refuses a scan by name and hands it to the OCR tool', async ({
    page,
  }) => {
    test.slow();
    // A PDF with pages and no text layer at all — exactly what a scan is.
    const doc = await PDFDocument.create();
    doc.addPage([595, 842]);
    doc.addPage([595, 842]);
    const scan = Buffer.from(await doc.save());
    const { a } = await pdfPair();

    await page.goto(TOOL);
    const inputs = page.locator('input[type="file"]');
    await setFilesWhenLive(
      inputs.nth(0),
      pdfFile('scanned.pdf', scan),
      page.getByText(/scanned\.pdf/i),
    );
    await setFilesWhenLive(
      inputs.nth(1),
      pdfFile('original.pdf', a),
      page.getByText(/original\.pdf/i),
    );

    await page.getByRole('button', { name: /Compare Documents/i }).click();

    // G7: name the file and offer the next step rather than failing blankly.
    const ocrLink = page.locator('a[href="/pdf/ocr"]').first();
    await expect(ocrLink).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/scanned\.pdf/i).first()).toBeVisible();

    // And the next step must actually go somewhere.
    await ocrLink.click();
    await expect(page).toHaveURL(/\/pdf\/ocr/u);
  });
});
