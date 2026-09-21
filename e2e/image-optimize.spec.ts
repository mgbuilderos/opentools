import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

import { readZip } from '../lib/tools/archive/zip-reader';
import { setFilesWhenLive } from './upload';

const fixtureDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'lib',
  'tools',
  'html',
  '__fixtures__',
);

test.describe('Image optimizer batches (/image/optimize)', () => {
  test('optimizes three files and downloads every result as one ZIP', async ({
    page,
  }) => {
    const product = await readFile(path.join(fixtureDir, 'product.png'));
    await page.goto('/image/optimize');
    await setFilesWhenLive(
      page.locator('input[type="file"]'),
      [
        { name: 'first.png', mimeType: 'image/png', buffer: product },
        { name: 'second.png', mimeType: 'image/png', buffer: product },
        { name: 'third.png', mimeType: 'image/png', buffer: product },
      ],
      page.getByText('Batch of 3 files'),
    );

    await expect(page.getByText('Batch of 3 files')).toBeVisible();
    await page.getByRole('button', { name: 'Optimize all' }).click();
    await expect(page.locator('[data-batch-result="done"]')).toHaveCount(3);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download all as ZIP' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('optimized-images.zip');
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    const archive = readZip(new Uint8Array(await readFile(downloadPath!)));
    expect(archive.entries).toHaveLength(3);
  });

  test('names a corrupt middle file and still processes the file after it', async ({
    page,
  }) => {
    const product = await readFile(path.join(fixtureDir, 'product.png'));
    await page.goto('/image/optimize');
    await setFilesWhenLive(
      page.locator('input[type="file"]'),
      [
        { name: 'first.png', mimeType: 'image/png', buffer: product },
        {
          name: 'deliberately-corrupt.png',
          mimeType: 'image/png',
          buffer: Buffer.from('not an image'),
        },
        { name: 'last.png', mimeType: 'image/png', buffer: product },
      ],
      page.getByRole('button', { name: 'Optimize all' }),
    );

    await page.getByRole('button', { name: 'Optimize all' }).click();
    await expect(page.locator('[data-batch-result="done"]')).toHaveCount(2);
    await expect(page.locator('[data-batch-result="failed"]')).toHaveCount(1);
    await expect(
      page.getByText('deliberately-corrupt.png', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText('last.png', { exact: true })).toBeVisible();
  });
});
