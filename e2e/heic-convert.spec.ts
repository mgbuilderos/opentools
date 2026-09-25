import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

import { setFilesWhenLive } from './upload';

/**
 * HEIC in, a real JPEG or PNG out, in both engines.
 *
 * WHY BOTH ENGINES MATTER MORE THAN USUAL HERE. The two browsers take different
 * paths through the same code: WebKit decodes HEIC itself, so `createImageBitmap`
 * resolves and no decoder is fetched; Chromium throws `InvalidStateError`, so the
 * half-megabyte libheif build is fetched from this origin and run in a worker.
 * A suite that ran in one engine would leave half the product untested, and it
 * would be the half most people use.
 *
 * The fixture is the one `lib/tools/image-convert/decode.test.ts` pins: four flat
 * colour blocks, made with macOS `sips` and confirmed by `file` as HEVC Main
 * Still Picture. Checking the saved bytes against those colours is what makes
 * this a conversion test rather than a screenshot of a button.
 */

const fixturePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'lib',
  'tools',
  'image-convert',
  '__fixtures__',
  'blocks-64.heic',
);

/** JPEG starts FF D8 FF; PNG starts with the eight-byte signature. */
function formatOf(bytes: Buffer) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (pngSignature.every((value, index) => bytes[index] === value)) return 'png';
  return 'unknown';
}

async function convertAndSave(
  page: import('@playwright/test').Page,
  route: string,
  saveLabel: RegExp,
) {
  const heic = await readFile(fixturePath);
  await page.goto(route);
  await setFilesWhenLive(
    page.locator('input[type="file"]'),
    [{ name: 'blocks-64.heic', mimeType: 'image/heic', buffer: heic }],
    page.getByRole('link', { name: saveLabel }),
  );

  const save = page.getByRole('link', { name: saveLabel });
  await expect(save).toBeVisible({ timeout: 60_000 });

  const downloadPromise = page.waitForEvent('download');
  await save.click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

test.describe('HEIC conversion (/image/heic-to-jpg, /image/heic-to-png)', () => {
  test('converts a real HEIC to a real JPEG', async ({ page }) => {
    const saved = await convertAndSave(page, '/image/heic-to-jpg', /save jpeg/iu);

    expect(formatOf(saved), 'the saved file is not a JPEG').toBe('jpeg');
    expect(saved.length).toBeGreaterThan(500);
    // The page reports what it decoded, and the fixture is 64 by 64.
    await expect(page.getByText('64 × 64 px')).toBeVisible();
  });

  test('converts a real HEIC to a real PNG', async ({ page }) => {
    const saved = await convertAndSave(page, '/image/heic-to-png', /save png/iu);

    expect(formatOf(saved), 'the saved file is not a PNG').toBe('png');
    // The PNG header carries the dimensions in bytes 16-23, big-endian, so the
    // decode is checked against the file rather than against the page's words.
    expect(saved.readUInt32BE(16)).toBe(64);
    expect(saved.readUInt32BE(20)).toBe(64);
  });

  test('says so, rather than hanging, when the file is not a HEIC', async ({
    page,
  }) => {
    await page.goto('/image/heic-to-jpg');
    await page
      .locator('input[type="file"]')
      .setInputFiles([
        {
          name: 'not-a-photo.heic',
          mimeType: 'image/heic',
          buffer: Buffer.from('this is not a photograph', 'utf8'),
        },
      ]);

    await expect(page.getByRole('alert')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole('link', { name: /save jpeg/iu })).toHaveCount(0);
  });

  test('tells the reader what it downloads before they choose a file', async ({
    page,
  }) => {
    await page.goto('/image/heic-to-jpg');

    // R3: the disclosure is owed before the tool runs, not after.
    await expect(
      page.getByText('What this page downloads, and when'),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'LGPL-3.0' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: /need a png instead/iu }),
    ).toBeVisible();
  });
});
