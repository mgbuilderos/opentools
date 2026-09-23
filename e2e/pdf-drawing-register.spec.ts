import { PDFDocument, StandardFonts } from 'pdf-lib';
import { expect, test } from '@playwright/test';

import { setFilesWhenLive } from './upload';

/**
 * Behavioural coverage for `/pdf/drawing-register`.
 *
 * `all-tools-smoke.spec.ts` already loads this route and checks the shell
 * renders. That is not coverage of a tool whose whole job is reading four
 * fields out of a corner of the page — it would pass just as happily if the
 * register came back empty.
 *
 * The drawing set is built here rather than committed, because the property
 * under test is *where the text sits*: a title block is the lower-right
 * quadrant, and a generator makes that placement explicit instead of burying
 * it in a binary.
 */

const TOOL = '/pdf/drawing-register';

/** A4 landscape, which is what a drawing sheet actually is. */
const SHEET: [number, number] = [842, 595];

interface Sheet {
  number: string;
  title: string;
  revision: string;
  date: string;
}

const SHEETS: Sheet[] = [
  {
    number: 'A-101',
    title: 'GROUND FLOOR PLAN',
    revision: 'C',
    date: '2026-04-11',
  },
  {
    number: 'A-102',
    title: 'FIRST FLOOR PLAN',
    revision: 'B',
    date: '2026-04-11',
  },
  {
    number: 'S-201',
    title: 'FOUNDATION DETAILS',
    revision: 'A',
    date: '2026-05-02',
  },
];

/**
 * A set whose title block sits where a title block sits — bottom right —
 * with body content elsewhere so the tool has to choose, not just read
 * whatever text it finds.
 */
async function drawingSet(scannedTail = 0): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (const sheet of SHEETS) {
    const page = doc.addPage(SHEET);
    // Body of the drawing — must NOT end up in the register.
    page.drawText('GENERAL ARRANGEMENT — NOT TO SCALE', {
      x: 60,
      y: 520,
      size: 14,
      font,
    });
    page.drawText('REFER TO STRUCTURAL ENGINEER FOR ALL DIMENSIONS', {
      x: 60,
      y: 480,
      size: 10,
      font,
    });
    // A decoy that looks exactly like a title-block field but sits in the
    // body — a revision note stamped on the drawing itself, which is common.
    // Only the region filter can exclude this; label parsing cannot, because
    // it is labelled correctly. This is what makes the test discriminate.
    page.drawText('DRAWING NO: X-999-DECOY', {
      x: 60,
      y: 440,
      size: 10,
      font,
    });

    // Title block, lower right.
    let y = 120;
    for (const line of [
      `DRAWING NO: ${sheet.number}`,
      `TITLE: ${sheet.title}`,
      `REV: ${sheet.revision}`,
      `DATE: ${sheet.date}`,
      'DRAWN BY: J. OKONKWO',
    ]) {
      page.drawText(line, { x: 560, y, size: 9, font });
      y -= 16;
    }
  }

  // Pages with no text at all — what a scanned sheet looks like to a reader.
  for (let i = 0; i < scannedTail; i += 1) doc.addPage(SHEET);

  return Buffer.from(await doc.save());
}

test.describe('PDF drawing register (/pdf/drawing-register)', () => {
  test('reads the title block, not the body of the drawing', async ({
    page,
  }) => {
    test.slow();
    await page.goto(TOOL);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      /Drawing Register/i,
    );

    await setFilesWhenLive(
      page.locator('input[type="file"]').first(),
      {
        name: 'project-set.pdf',
        mimeType: 'application/pdf',
        buffer: await drawingSet(),
      },
      page.getByText(/A-101/).first(),
    );

    // Every sheet's number and title must reach the register.
    for (const sheet of SHEETS) {
      await expect(page.getByText(sheet.number).first()).toBeVisible({
        timeout: 45_000,
      });
      await expect(page.getByText(sheet.title).first()).toBeVisible();
    }

    // And the decoy must not. This is the assertion that proves the tool
    // reads a *region* rather than everything on the page: `X-999-DECOY` is
    // labelled exactly like a real title-block field, so label parsing alone
    // would take it. Only the lower-right region filter rejects it.
    await expect(page.getByText(/X-999-DECOY/)).toHaveCount(0);
    await expect(page.getByText(/NOT TO SCALE/)).toHaveCount(0);
  });

  test('says how many sheets were scans, and points at the OCR tool', async ({
    page,
  }) => {
    test.slow();
    await page.goto(TOOL);
    await setFilesWhenLive(
      page.locator('input[type="file"]').first(),
      {
        name: 'part-scanned-set.pdf',
        mimeType: 'application/pdf',
        buffer: await drawingSet(2),
      },
      page.getByText(/A-101/).first(),
    );

    // G7: name what could not be read rather than silently returning three
    // rows for a five-sheet set.
    await expect(page.getByText(/2 scanned sheets/i).first()).toBeVisible({
      timeout: 45_000,
    });

    const ocrLink = page.locator('a[href="/pdf/ocr"]').first();
    await expect(ocrLink).toBeVisible();
    await ocrLink.click();
    await expect(page).toHaveURL(/\/pdf\/ocr/u);
  });

  test('exports the register as a real CSV file', async ({ page }) => {
    test.slow();
    await page.goto(TOOL);
    await setFilesWhenLive(
      page.locator('input[type="file"]').first(),
      {
        name: 'project-set.pdf',
        mimeType: 'application/pdf',
        buffer: await drawingSet(),
      },
      page.getByText(/A-101/).first(),
    );

    const download = page.waitForEvent('download', { timeout: 45_000 });
    await page.getByRole('button', { name: /CSV/i }).first().click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/\.csv$/u);
  });
});
