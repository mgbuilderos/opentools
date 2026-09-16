import { expect, test, type Page } from '@playwright/test';

import { testPdf, testPng } from './fixtures';

/**
 * C3, part two: the 13 destinations `e2e/browser-operations.spec.ts` cannot
 * reach.
 *
 * Every other operation is a pure function that the bundled harness can call
 * directly. The image editor and the PDF page tools are not — they run on
 * Canvas, Blob, Worker and pdf-lib inside a React component, so the only way to
 * know they work in a browser is to drive the page. Both engines, because
 * Canvas and Blob behaviour is exactly where WebKit differs.
 */

function trackPageErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  return errors;
}

/**
 * Picks a file through the page's own chooser button.
 *
 * Setting the hidden input directly is unreliable here: the native change event
 * lands before React hydrates and is then lost, leaving the page in its empty
 * state. Going through the button both waits for hydration and exercises the
 * path a person actually takes, so it is retried until the handler is live.
 */
async function chooseFile(
  page: Page,
  buttonName: string | RegExp,
  file: { name: string; mimeType: string; buffer: Buffer },
) {
  await expect(async () => {
    const chooser = page.waitForEvent('filechooser', { timeout: 2_000 });
    await page.getByRole('button', { name: buttonName }).first().click();
    await (await chooser).setFiles(file);
  }).toPass({ timeout: 45_000 });
}

test.describe('PDF page tools', () => {
  test('applies page changes to a real multi-page PDF', async ({ page }) => {
    test.setTimeout(120_000);
    const errors = trackPageErrors(page);

    await page.goto('/pdf/page-tools');
    await chooseFile(page, /choose a pdf/iu, {
      name: 'three-pages.pdf',
      mimeType: 'application/pdf',
      buffer: await testPdf(3),
    });

    const apply = page.getByRole('button', { name: 'Apply PDF changes' });
    await expect(apply).toBeEnabled({ timeout: 30_000 });
    await apply.click();

    await expect(
      page.getByRole('heading', { name: /^Done — \d+ pages? ready$/u }),
    ).toBeVisible({ timeout: 60_000 });
    // Rendered as <a download> but exposed with role=button, so match on the
    // accessible name rather than the element type.
    await expect(
      page.getByRole('button', { name: 'Save edited PDF' }),
    ).toBeVisible();
    expect(errors, `page errors: ${errors.join(' | ')}`).toEqual([]);
  });

  test('offers a control for every PDF page operation the catalog calls live', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await page.goto('/pdf/page-tools');
    await chooseFile(page, /choose a pdf/iu, {
      name: 'three-pages.pdf',
      mimeType: 'application/pdf',
      buffer: await testPdf(3),
    });
    await expect(
      page.getByRole('button', { name: 'Apply PDF changes' }),
    ).toBeEnabled({ timeout: 30_000 });

    // lib/seo/live-tools.ts calls these six operations live *because* this page
    // runs them. If a control disappears, that list is wrong and the guides
    // start advertising a tool with nothing behind it.
    const body = page.locator('body');
    for (const control of [
      /rotate/iu,
      /order/iu,
      /delete|remove/iu,
      /page number/iu,
      /watermark/iu,
      /title|metadata|author/iu,
    ]) {
      await expect(body).toContainText(control);
    }
  });
});

test.describe('Image editor', () => {
  test('applies edits to a real image', async ({ page }) => {
    test.setTimeout(120_000);
    const errors = trackPageErrors(page);

    await page.goto('/image/editor');
    await chooseFile(page, /choose an image/iu, {
      name: 'pattern.png',
      mimeType: 'image/png',
      buffer: testPng(64),
    });

    const apply = page.getByRole('button', { name: 'Apply edits' });
    await expect(apply).toBeEnabled({ timeout: 30_000 });
    await apply.click();

    await expect(
      page.getByRole('heading', { name: /^Done — \d+ × \d+px$/u }),
    ).toBeVisible({ timeout: 60_000 });
    expect(errors, `page errors: ${errors.join(' | ')}`).toEqual([]);
  });

  test('removes a plain background', async ({ page }) => {
    test.setTimeout(180_000);
    const errors = trackPageErrors(page);

    await page.goto('/image/background-remover');
    await chooseFile(page, /choose an image/iu, {
      name: 'pattern.png',
      mimeType: 'image/png',
      buffer: testPng(64),
    });

    // solid-background-remover is the operation the catalog calls live; the AI
    // mode is a separate offer with its own spec. Choosing an image on this
    // route auto-starts an AI run, which disables the mode radios while it
    // works — so retry until the switch actually takes rather than clicking
    // into a control that is briefly disabled again.
    const solidMode = page.getByRole('radio', { name: /solid colou?r/iu });
    await expect(async () => {
      await expect(solidMode).toBeEnabled();
      await solidMode.check();
      await expect(solidMode).toBeChecked();
    }).toPass({ timeout: 150_000 });

    const remove = page.getByRole('button', { name: 'Remove background' });
    await expect(remove).toBeEnabled({ timeout: 30_000 });
    await remove.click();

    await expect(
      page.getByRole('heading', { name: /^Done — \d+ × \d+px$/u }),
    ).toBeVisible({ timeout: 120_000 });
    expect(errors, `page errors: ${errors.join(' | ')}`).toEqual([]);
  });
});
