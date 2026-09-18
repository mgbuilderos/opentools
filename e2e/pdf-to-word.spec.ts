import { readFile } from 'node:fs/promises';

import { expect, test, type Download, type Page } from '@playwright/test';

import { testPdf } from './fixtures';

/**
 * A PDF whose pages are drawings only — what a scan or a phone photo of paper
 * produces. It must be refused, not converted into an empty document.
 */
async function scannedPdf() {
  const { PDFDocument } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([300, 400]);
  page.drawRectangle({ x: 20, y: 20, width: 260, height: 360 });
  return Buffer.from(await pdf.save());
}

async function choosePdf(page: Page, bytes: Buffer, name = 'source.pdf') {
  await page.getByLabel('Choose a PDF').setInputFiles({
    name,
    mimeType: 'application/pdf',
    buffer: bytes,
  });
}

async function savedDocx(page: Page) {
  const download: Promise<Download> = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save Word document' }).click();
  return readFile((await (await download).path())!);
}

/**
 * Read one file out of a ZIP without a library: find its local header, then
 * inflate or copy the bytes. The point is to open our own output the way any
 * reader would, rather than trusting the code that produced it.
 */
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

test.describe('PDF to Word', () => {
  test('converts a real PDF into a Word file that carries its text', async ({
    page,
  }) => {
    await page.goto('/pdf/to-word');
    await choosePdf(page, await testPdf(3), 'report.pdf');
    await page.getByRole('button', { name: 'Convert to Word' }).click();

    await expect(
      page.getByRole('heading', { name: /^Done — 3 pages converted$/u }),
    ).toBeVisible({ timeout: 60_000 });

    const docx = await savedDocx(page);
    // A real reader starts by checking this is a ZIP at all.
    expect([docx[0], docx[1]]).toEqual([0x50, 0x4b]);

    const document = await readZipEntry(docx, 'word/document.xml');
    expect(document).toContain('Page 1');
    expect(document).toContain('Page 2');
    expect(document).toContain('Page 3');
    // Pagination is the one layout fact a text conversion can keep.
    expect(document).toContain('w:type="page"');

    // And the package a reader needs is complete.
    await expect(readZipEntry(docx, '[Content_Types].xml')).resolves.toContain(
      'wordprocessingml',
    );
  });

  test('names the downloaded file after the PDF', async ({ page }) => {
    await page.goto('/pdf/to-word');
    await choosePdf(page, await testPdf(1), 'Rental Agreement.pdf');
    await page.getByRole('button', { name: 'Convert to Word' }).click();
    await expect(page.getByRole('heading', { name: /converted/u })).toBeVisible(
      { timeout: 60_000 },
    );

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save Word document' }).click();
    expect((await download).suggestedFilename()).toBe('Rental Agreement.docx');
  });

  test('refuses a scanned PDF and explains why, with no file to download', async ({
    page,
  }) => {
    await page.goto('/pdf/to-word');
    await choosePdf(page, await scannedPdf(), 'scan.pdf');
    await page.getByRole('button', { name: 'Convert to Word' }).click();

    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible({ timeout: 60_000 });
    await expect(alert).toContainText('no text in it');
    await expect(alert).toContainText(/scan|photo/iu);
    // Nothing is offered for download, so nobody saves an empty document.
    await expect(
      page.getByRole('button', { name: 'Save Word document' }),
    ).toHaveCount(0);
  });

  test('states the limits of the conversion before anything is converted', async ({
    page,
  }) => {
    await page.goto('/pdf/to-word');
    const body = page.locator('#tool');
    await expect(body).toContainText('does not');
    await expect(body).toContainText(/columns/iu);
    await expect(body).toContainText(/never sent to a server/iu);
  });
});
