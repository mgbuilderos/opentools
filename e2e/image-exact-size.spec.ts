import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

import { readDpi, readJpegDpi, readPngDpi } from '../lib/tools/exact-size';
import { testDetailedPng } from './fixtures';

/**
 * The removed exact-KB tool only calculated a plan. These specs hold the
 * replacement to the file itself: the download is saved and its byte length,
 * decoded pixels and stored DPI are checked, not the receipt on screen.
 */

async function chooseImage(page: Page, buffer: Buffer, name = 'photo.png') {
  await expect(async () => {
    const chooser = page.waitForEvent('filechooser', { timeout: 2_000 });
    await page
      .getByRole('button', { name: /^choose (other )?images$/iu })
      .first()
      .click();
    await (await chooser).setFiles({ name, mimeType: 'image/png', buffer });
  }).toPass({ timeout: 45_000 });
  await expect(page.getByText(name)).toBeVisible();
}

async function saveDownload(page: Page) {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /^Save .+\.(jpg|png)$/u }).click();
  const file = await download;
  return {
    name: file.suggestedFilename(),
    bytes: await readFile((await file.path())!),
  };
}

/** Decodes the saved bytes in the browser and returns the real pixel size. */
async function decodedSize(page: Page, bytes: Uint8Array, type: string) {
  return page.evaluate(
    async ([base64, mime]) => {
      const binary = atob(base64);
      const data = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([data], { type: mime }));
      return { width: bitmap.width, height: bitmap.height };
    },
    [Buffer.from(bytes).toString('base64'), type] as const,
  );
}

function trackPageErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  return errors;
}

test.describe('Resize image to exact KB', () => {
  test('saves a JPEG under the KB limit at exact pixels with 300 DPI', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const errors = trackPageErrors(page);
    await page.goto('/image/exact-size');
    await chooseImage(page, await testDetailedPng(page));

    await page.getByLabel('Maximum size (KB)').fill('20');
    await page.getByLabel('Width (px)').fill('200');
    await page.getByLabel('Height (px)').fill('230');
    await page.getByLabel('DPI').fill('300');
    await expect(
      page.getByRole('radio', { name: /crop to fill/iu }),
    ).toBeChecked();
    await page.getByRole('button', { name: 'Fit to size' }).click();

    const results = page.getByRole('heading', { name: 'Results' });
    await expect(results).toBeVisible({ timeout: 60_000 });
    await expect(results).toBeFocused();
    await expect(
      page.getByRole('heading', { name: 'Meets every requirement' }),
    ).toBeVisible();

    const saved = await saveDownload(page);
    expect(saved.name).toBe('photo-200x230.jpg');
    expect([saved.bytes[0], saved.bytes[1]]).toEqual([0xff, 0xd8]);
    expect(saved.bytes.length).toBeLessThanOrEqual(20 * 1024);
    // A limit this generous for 200 × 230 should not be met by a tiny file.
    expect(saved.bytes.length).toBeGreaterThan(5 * 1024);
    expect(await decodedSize(page, saved.bytes, 'image/jpeg')).toEqual({
      width: 200,
      height: 230,
    });
    expect(readJpegDpi(new Uint8Array(saved.bytes))).toEqual({
      units: 1,
      x: 300,
      y: 300,
    });
    expect(errors, `page errors: ${errors.join(' | ')}`).toEqual([]);
  });

  test('refuses to shrink pixels on its own, then shrinks when allowed', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const errors = trackPageErrors(page);
    await page.goto('/image/exact-size');
    await chooseImage(page, await testDetailedPng(page));

    await page.getByLabel('Maximum size (KB)').fill('4');
    await page.getByLabel('Width (px)').fill('1200');
    await page.getByRole('button', { name: 'Fit to size' }).click();

    await expect(
      page.getByRole('heading', { name: /^Does not meet: maximum size/u }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(
      page.getByText(/Can’t reach 4 KB at 1200 × 900 px/u),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /^Save / })).toHaveCount(0);

    await page
      .getByRole('button', { name: 'Allow smaller pixels and try again' })
      .click();
    await expect(
      page.getByText(/^Pixels reduced from 1200 × 900 px to/u),
    ).toBeVisible({
      timeout: 60_000,
    });

    const saved = await saveDownload(page);
    expect(saved.bytes.length).toBeLessThanOrEqual(4 * 1024);
    const size = await decodedSize(page, saved.bytes, 'image/jpeg');
    expect(size.width).toBeLessThan(1200);
    // The shape is kept: 4:3 within a pixel of rounding.
    expect(Math.abs(size.width * 3 - size.height * 4)).toBeLessThanOrEqual(4);
    expect(errors, `page errors: ${errors.join(' | ')}`).toEqual([]);
  });

  test('writes pHYs DPI into a PNG and honours the 1,000-byte KB', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const errors = trackPageErrors(page);
    await page.goto('/image/exact-size');
    await chooseImage(page, await testDetailedPng(page, 300, 200));

    await page.getByLabel('Output format').selectOption('image/png');
    await page.getByLabel('What 1 KB means').selectOption('1000');
    await page.getByLabel('Maximum size (KB)').fill('500');
    await page.getByLabel('Width (px)').fill('150');
    await page.getByLabel('DPI').fill('200');
    await page.getByRole('button', { name: 'Fit to size' }).click();

    await expect(
      page.getByRole('heading', { name: 'Meets every requirement' }),
    ).toBeVisible({ timeout: 60_000 });
    const saved = await saveDownload(page);
    expect(saved.name).toBe('photo-150x100.png');
    expect(saved.bytes.length).toBeLessThanOrEqual(500 * 1000);
    expect(await decodedSize(page, saved.bytes, 'image/png')).toEqual({
      width: 150,
      height: 100,
    });
    const phys = readPngDpi(new Uint8Array(saved.bytes));
    expect(phys?.unit).toBe(1);
    expect(phys?.pixelsPerMetreX).toBe(7874); // round(200 / 0.0254)
    expect(readDpi(new Uint8Array(saved.bytes))).toBe(200);
    expect(errors, `page errors: ${errors.join(' | ')}`).toEqual([]);
  });
});
