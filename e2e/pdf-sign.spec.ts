import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

import { testFormPdf, testPdf } from './fixtures';

/**
 * A signing tool is only worth shipping if the values and the signature are
 * really in the saved file, so these specs reopen the download with pdf-lib
 * rather than trusting the receipt on screen.
 */
async function choosePdf(page: Page, buffer: Buffer, name = 'form.pdf') {
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

async function drawSignature(page: Page) {
  // Located by CSS: getByLabel does not match a bare canvas.
  const pad = page.locator('canvas[aria-label="Signature pad"]');
  await expect(pad).toBeVisible();
  // Measure after scrolling: the pad sits below the fold, and mouse events at
  // coordinates outside the viewport never reach it.
  await pad.scrollIntoViewIfNeeded();
  const box = (await pad.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.6);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.3, {
    steps: 8,
  });
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.7, {
    steps: 8,
  });
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.35, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(page.getByText('Signature ready')).toBeVisible();
}

async function savedPdf(page: Page) {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save completed PDF' }).click();
  return readFile(await (await download).path());
}

test.describe('Sign and fill PDF', () => {
  test('writes the form values and the signature into the saved file', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(String(error)));

    await page.goto('/pdf/sign');
    await choosePdf(page, await testFormPdf());

    await page.getByLabel('applicant.name').fill('Maulik Gupta');
    await page.getByLabel('agree.terms').check();
    await page.getByLabel('address.country').selectOption('Singapore');
    await drawSignature(page);

    // Leave the form editable so the values can be read back as field values.
    await page.getByLabel('Make the document final').uncheck();
    await page.getByRole('button', { name: 'Finish PDF' }).click();

    await expect(
      page.getByRole('heading', { name: /^Done — \d+ pages? ready$/u }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText('Drawn onto the page')).toBeVisible();

    const saved = await savedPdf(page);
    const { PDFDocument } = await import('pdf-lib');
    const form = (await PDFDocument.load(saved)).getForm();
    expect(form.getTextField('applicant.name').getText()).toBe('Maulik Gupta');
    expect(form.getCheckBox('agree.terms').isChecked()).toBe(true);
    expect(form.getDropdown('address.country').getSelected()).toEqual([
      'Singapore',
    ]);

    expect(errors, `page errors: ${errors.join(' | ')}`).toEqual([]);
  });

  test('making it final removes the form and keeps the page', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.goto('/pdf/sign');
    await choosePdf(page, await testFormPdf());

    await page.getByLabel('applicant.name').fill('Final Answer');
    await expect(page.getByLabel('Make the document final')).toBeChecked();
    await page.getByRole('button', { name: 'Finish PDF' }).click();

    await expect(
      page.getByRole('heading', { name: /^Done — \d+ pages? ready$/u }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/now final/u)).toBeVisible();

    const saved = await savedPdf(page);
    const { PDFDocument } = await import('pdf-lib');
    const reopened = await PDFDocument.load(saved);
    expect(reopened.getForm().getFields()).toHaveLength(0);
    expect(reopened.getPageCount()).toBe(1);
  });

  test('signs a PDF that has no form fields at all', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('/pdf/sign');
    await choosePdf(page, await testPdf(2), 'plain.pdf');

    await expect(
      page.getByText('This PDF has no fillable form fields'),
    ).toBeVisible();
    await drawSignature(page);
    await page.getByRole('button', { name: 'Finish PDF' }).click();

    await expect(
      page.getByRole('heading', { name: /^Done — 2 pages ready$/u }),
    ).toBeVisible({ timeout: 60_000 });

    const saved = await savedPdf(page);
    const { PDFDocument } = await import('pdf-lib');
    expect((await PDFDocument.load(saved)).getPageCount()).toBe(2);
  });

  test('says plainly that this is not a certified signature', async ({
    page,
  }) => {
    await page.goto('/pdf/sign');
    await expect(
      page.getByText('This draws a signature, it does not certify one.'),
    ).toBeVisible();
    await expect(
      page.getByText(/no certificate and no audit trail/u),
    ).toBeVisible();
  });
});
