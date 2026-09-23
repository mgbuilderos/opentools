import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { expect, test } from '@playwright/test';

import { setFilesWhenLive } from './upload';

/**
 * Behavioural coverage for `/pdf/preflight`.
 *
 * The point of a preflight check is that it **fails** a file that would fail
 * at the printer. A spec that only feeds it a good file proves nothing: it
 * would pass against a tool that says "looks fine" to everything.
 *
 * So both fixtures are built here — one with a trim box and bleed, one
 * without — and the test asserts the two are told apart.
 */

const TOOL = '/pdf/preflight';

/** A5 at 72 dpi, in points. */
const TRIM: [number, number] = [420, 595];
/** 3 mm of bleed on each edge, in points. */
const BLEED = 8.5;

async function pressReadyPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([TRIM[0] + BLEED * 2, TRIM[1] + BLEED * 2]);
  // Artwork runs to the edge of the media box, which is what bleed is for.
  page.drawRectangle({
    x: 0,
    y: 0,
    width: TRIM[0] + BLEED * 2,
    height: TRIM[1] + BLEED * 2,
    color: rgb(0.1, 0.1, 0.1),
  });
  page.drawText('PRESS READY', { x: 60, y: 300, size: 18, font });
  page.setTrimBox(BLEED, BLEED, TRIM[0], TRIM[1]);
  page.setBleedBox(0, 0, TRIM[0] + BLEED * 2, TRIM[1] + BLEED * 2);
  return Buffer.from(await doc.save());
}

async function noBleedPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  // No trim box, no bleed box, artwork flush to the page edge.
  const page = doc.addPage(TRIM);
  page.drawText('NO BLEED SET', { x: 60, y: 300, size: 18, font });
  return Buffer.from(await doc.save());
}

test.describe('PDF print preflight (/pdf/preflight)', () => {
  test('passes a file that carries a trim box and bleed', async ({ page }) => {
    test.slow();
    await page.goto(TOOL);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      /Preflight/i,
    );

    await setFilesWhenLive(
      page.locator('input[type="file"]').first(),
      {
        name: 'press-ready.pdf',
        mimeType: 'application/pdf',
        buffer: await pressReadyPdf(),
      },
      page.getByText(/bleed|trim/i).first(),
    );

    await expect(
      page.getByText(/Press Ready|Standard Bleed/i).first(),
    ).toBeVisible({ timeout: 45_000 });
  });

  test('fails a file with no trim box or bleed, and says which', async ({
    page,
  }) => {
    test.slow();
    await page.goto(TOOL);
    await setFilesWhenLive(
      page.locator('input[type="file"]').first(),
      {
        name: 'no-bleed.pdf',
        mimeType: 'application/pdf',
        buffer: await noBleedPdf(),
      },
      page.getByText(/bleed|trim/i).first(),
    );

    // Assert the TRIM & BLEED verdict specifically. "Press Ready" is the
    // verdict of the *colour space* tile and is correct here — this fixture
    // has no images at all, so there is nothing in RGB to flag. Reading it as
    // a whole-file verdict is how a preflight test passes a failing file.
    const bleedTile = page.locator('div', { hasText: /Trim & Bleed/iu }).last();
    await expect(bleedTile).toContainText(/\d+\s+Issues/iu, {
      timeout: 45_000,
    });
    await expect(bleedTile).not.toContainText(/Standard Bleed/iu);
  });

  test('says on the page what it does not check', async ({ page }) => {
    test.slow();
    // Total ink coverage and ICC conversion need a colour-managed CMYK
    // rasteriser, which this tool does not have. The brief required the page
    // to say so rather than let a printer assume otherwise.
    await page.goto(TOOL);
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/ink coverage|ICC/iu);
  });
});
