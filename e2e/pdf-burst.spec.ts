import { PDFDocument, StandardFonts } from 'pdf-lib';
import { expect, test } from '@playwright/test';

import { setFilesWhenLive } from './upload';

/**
 * Behavioural coverage for `/pdf/burst`.
 *
 * The split is the easy half. **The naming is the half competitors paywall** —
 * EverMap puts the rules behind its Pro tier — and it is the half a smoke
 * test cannot see. So this asserts that the output filename carries the text
 * the rule matched, not just that some files came out.
 */

const TOOL = '/pdf/burst';

const INVOICES = ['INV-4471', 'INV-4472', 'INV-4473'];

/** Three two-page invoices in one file, each headed by its own number. */
async function invoiceBundle(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const number of INVOICES) {
    const first = doc.addPage([595, 842]);
    first.drawText(`INVOICE ${number}`, { x: 60, y: 760, size: 16, font });
    first.drawText('Amount due on receipt.', { x: 60, y: 720, size: 11, font });
    const second = doc.addPage([595, 842]);
    second.drawText('Terms and conditions', { x: 60, y: 760, size: 11, font });
  }
  return Buffer.from(await doc.save());
}

test.describe('Burst PDF by rule (/pdf/burst)', () => {
  test('splits on a regex and names each file from what it matched', async ({
    page,
  }) => {
    test.slow();
    await page.goto(TOOL);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      /Burst PDF/i,
    );

    await page.selectOption('#burst-strategy', 'regex-pattern');
    await page.fill('#burst-regex', 'INVOICE\\s+(INV-\\d+)');
    await page.fill('#burst-template', '{match}.pdf');

    await setFilesWhenLive(
      page.locator('input[type="file"]').first(),
      {
        name: 'invoice-bundle.pdf',
        mimeType: 'application/pdf',
        buffer: await invoiceBundle(),
      },
      page.getByText(/INV-4471|Output Filename|Matched Value/i).first(),
    );

    // The plan has to show what it matched and what it will call the file.
    // Three invoices in, three outputs planned.
    for (const number of INVOICES) {
      await expect(page.getByText(number).first()).toBeVisible({
        timeout: 45_000,
      });
    }

    // The naming rule is the point: the filename must carry the match, not a
    // sequence number. `{match}.pdf` with INV-4471 means INV-4471.pdf.
    const body = await page.locator('body').innerText();
    expect(body, 'the output name must come from the matched text').toMatch(
      /INV-4471\.pdf/u,
    );

    // Two pages per invoice, so a correct split is page ranges of two — not
    // six single pages.
    expect(body).toMatch(/1\s*[-–—]\s*2|Pages 1/u);
  });

  test('changes the plan when the rule changes', async ({ page }) => {
    test.slow();
    await page.goto(TOOL);
    await page.selectOption('#burst-strategy', 'regex-pattern');
    await page.fill('#burst-regex', 'INVOICE\\s+(INV-\\d+)');
    await page.fill('#burst-template', '{match}.pdf');

    await setFilesWhenLive(
      page.locator('input[type="file"]').first(),
      {
        name: 'invoice-bundle.pdf',
        mimeType: 'application/pdf',
        buffer: await invoiceBundle(),
      },
      page.getByText(/INV-4471/i).first(),
    );
    await expect(page.getByText('INV-4471').first()).toBeVisible({
      timeout: 45_000,
    });

    // Switch to a fixed interval of one page: six pages must become six
    // outputs, and the invoice-derived names must go away.
    await page.selectOption('#burst-strategy', 'fixed-interval');
    await page.fill('#burst-interval', '1');
    await page.getByRole('button', { name: /plan|update/i }).first().click();

    await expect(page.getByText('INV-4471.pdf')).toHaveCount(0, {
      timeout: 30_000,
    });
  });
});
