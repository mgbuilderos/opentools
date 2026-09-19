import { expect, test, type Page } from '@playwright/test';
import { testPdf } from './fixtures';

/**
 * The reported bug, in one test: drop a PDF into the box on the home page,
 * pick a tool, and the PDF is gone — you have to choose it again. On a phone
 * that is most of the work.
 */

async function dropPdf(page: Page, bytes: Buffer, name = 'statement.pdf') {
  await page
    .getByLabel('Upload file to inspect and detect tools')
    .setInputFiles({ name, mimeType: 'application/pdf', buffer: bytes });
}

test.describe('the file follows you to the tool you picked', () => {
  // These ran in Chromium only until 2026-09-19, because the handoff did not
  // work in WebKit and therefore not on an iPhone. The cause was that the file
  // was stored as a `File`, and WebKit refuses to put a `Blob` or a `File`
  // into IndexedDB on this site — the write transaction errors silently.
  // `lib/file-handoff.ts` stores the bytes instead, and the skip is gone.
  // See docs/WEBKIT_BLOB_INDEXEDDB.md.

  test('a PDF dropped on the home page arrives at the PDF tool', async ({
    page,
  }) => {
    await page.goto('/');
    await dropPdf(page, await testPdf(3));

    await expect(page.getByText('PDF Document')).toBeVisible();
    await page.getByRole('link', { name: 'Rotate PDF', exact: true }).click();

    await page.waitForURL(/\/pdf\/page-tools/u);

    // The tool must have the file already — no second trip to the file picker.
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const inputs = [
              ...document.querySelectorAll<HTMLInputElement>(
                'input[type="file"]',
              ),
            ];
            return inputs.some((input) => (input.files?.length ?? 0) > 0);
          }),
        { timeout: 15_000 },
      )
      .toBe(true);

    await expect(page.getByText('statement.pdf').first()).toBeVisible();
  });

  test('works at phone width, which is where it was reported', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await dropPdf(page, await testPdf(2), 'receipt.pdf');

    await page.getByRole('link', { name: 'Rotate PDF', exact: true }).click();
    await page.waitForURL(/\/pdf\/page-tools/u);

    await expect(page.getByText('receipt.pdf').first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('a file nobody collected is not left lying around', async ({ page }) => {
    await page.goto('/');
    await dropPdf(page, await testPdf(1), 'private.pdf');
    await page.getByRole('link', { name: 'Rotate PDF', exact: true }).click();
    await page.waitForURL(/\/pdf\/page-tools/u);
    await expect(page.getByText('private.pdf').first()).toBeVisible({
      timeout: 15_000,
    });

    // Handed over once and deleted. Opening another tool directly must not
    // resurrect somebody's document.
    await page.goto('/pdf/merge');
    await page.waitForTimeout(1500);
    const stillThere = await page.evaluate(() => {
      const inputs = [
        ...document.querySelectorAll<HTMLInputElement>('input[type="file"]'),
      ];
      return inputs.some((input) => (input.files?.length ?? 0) > 0);
    });
    expect(stillThere).toBe(false);
  });

  test('sends nothing off this origin while handing the file over', async ({
    page,
  }) => {
    await page.goto('/');
    const origin = new URL(page.url()).origin;
    const offOrigin: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).origin !== origin) {
        offOrigin.push(request.url());
      }
    });

    await dropPdf(page, await testPdf(2));
    await page.getByRole('link', { name: 'Rotate PDF', exact: true }).click();
    await page.waitForURL(/\/pdf\/page-tools/u);
    expect(offOrigin).toEqual([]);
  });
});
