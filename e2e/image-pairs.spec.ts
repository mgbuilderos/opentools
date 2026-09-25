import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

import { setFilesWhenLive } from './upload';

/**
 * A generated pair page converts, rather than merely describing a conversion.
 *
 * That is the whole difference between this family and the thin-page pile the
 * project de-indexed: the page arrives set to the pair in its URL and the tool
 * on it does the job. One pair is enough to prove the route, the component and
 * the registry agree -- the other fifteen differ only in which two formats the
 * same code is handed, and `lib/seo/image-pairs.test.ts` covers that part.
 */

const productPng = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'lib',
  'tools',
  'html',
  '__fixtures__',
  'product.png',
);

test.describe('image pair pages (/convert/png-to-jpg)', () => {
  test('converts a real PNG and hands back a real JPEG', async ({ page }) => {
    const png = await readFile(productPng);
    await page.goto('/convert/png-to-jpg');

    await expect(
      page.getByRole('heading', { name: 'PNG to JPEG converter' }),
    ).toBeVisible();

    await setFilesWhenLive(
      page.locator('input[type="file"]'),
      [{ name: 'product.png', mimeType: 'image/png', buffer: png }],
      page.getByRole('link', { name: /save jpeg/iu }),
    );

    const save = page.getByRole('link', { name: /save jpeg/iu });
    await expect(save).toBeVisible({ timeout: 60_000 });

    const downloadPromise = page.waitForEvent('download');
    await save.click();
    const download = await downloadPromise;
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    const saved = Buffer.concat(chunks);

    // FF D8 FF is a JPEG. A canvas asked for a type it cannot write returns a
    // PNG instead of failing, so checking the bytes is the only way to know
    // the file is what its name says.
    expect([saved[0], saved[1], saved[2]]).toEqual([0xff, 0xd8, 0xff]);
    expect(download.suggestedFilename()).toBe('product.jpg');
  });

  test('links its siblings as pages a crawler can follow', async ({ page }) => {
    await page.goto('/convert/png-to-jpg');

    // The reverse pair first: someone on the wrong one of the two is one click
    // from the right one.
    await expect(
      page.getByRole('link', { name: 'JPEG to PNG', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'PNG to WebP', exact: true }),
    ).toBeVisible();
  });
});
