import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

import { readZip } from '../lib/tools/archive/zip-reader';
import { setFilesWhenLive } from './upload';

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'lib',
  'tools',
  'html',
  '__fixtures__',
);

const designFixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'lib',
  'tools',
  'design',
  '__fixtures__',
);

test.describe('Designer Tools Suite', () => {
  // Uploads here go through `setFilesWhenLive`, whose fallback re-selects the
  // file if the first selection was lost to hydration. That fallback cannot
  // finish inside the 30 s default, and a test that dies mid-retry reports the
  // reaction locator as missing rather than the timeout as the cause.
  test.describe.configure({ timeout: 120_000 });

  test.describe('SVG Optimizer & Raster Converter (/image/svg)', () => {
    test('optimizes SVG, sanitizes scripts, and exports PNG raster', async ({
      page,
    }) => {
      await page.goto('/image/svg');

      // 1. Verify title
      await expect(
        page.getByRole('heading', { name: 'SVG Optimizer & PNG Converter' }),
      ).toBeVisible();

      // 2. Upload vector fixture
      const svgPath = path.join(fixturesDir, 'logo.svg');
      await setFilesWhenLive(
        page.locator('input[type="file"]'),
        [svgPath],
        page.getByText('Original Size'),
      );

      // 3. Metrics bar appears
      await expect(page.getByText('Original Size')).toBeVisible();
      await expect(page.getByText('Optimized Size')).toBeVisible();
      await expect(page.getByText('Byte Savings')).toBeVisible();

      // 4. Download clean SVG
      const downloadSvgLink = page.locator('a[download^="optimized_"]');
      await expect(downloadSvgLink).toBeVisible();

      const [svgDownload] = await Promise.all([
        page.waitForEvent('download'),
        downloadSvgLink.click(),
      ]);

      const downloadedSvgPath = await svgDownload.path();
      expect(downloadedSvgPath).toBeTruthy();
      if (downloadedSvgPath) {
        const content = await readFile(downloadedSvgPath, 'utf8');
        expect(content).toContain('<svg');
        expect(content).toContain('viewBox');
      }

      // 5. Switch to Clean XML Code tab
      await page.getByRole('button', { name: 'Clean XML Code' }).click();
      const codeArea = page.locator('textarea');
      await expect(codeArea).toBeVisible();
      await expect(codeArea).toContainText('<svg');

      // 6. Export as PNG raster
      const [pngDownload] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: /Export as PNG/i }).click(),
      ]);

      const downloadedPngPath = await pngDownload.path();
      expect(downloadedPngPath).toBeTruthy();
    });

    test('optimizes three SVGs and downloads all vectors as a ZIP', async ({
      page,
    }) => {
      const source = await readFile(path.join(fixturesDir, 'logo.svg'));
      await page.goto('/image/svg');
      await setFilesWhenLive(
        page.locator('input[type="file"]'),
        [
          { name: 'first.svg', mimeType: 'image/svg+xml', buffer: source },
          { name: 'second.svg', mimeType: 'image/svg+xml', buffer: source },
          { name: 'third.svg', mimeType: 'image/svg+xml', buffer: source },
        ],
        page.getByRole('button', { name: 'Optimize all SVGs' }),
      );

      await page.getByRole('button', { name: 'Optimize all SVGs' }).click();
      await expect(page.locator('[data-batch-result="done"]')).toHaveCount(3);
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Download all as ZIP' }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe('optimized-svgs.zip');
      const downloadPath = await download.path();
      expect(downloadPath).toBeTruthy();
      expect(
        readZip(new Uint8Array(await readFile(downloadPath!))).entries,
      ).toHaveLength(3);
    });
  });

  test.describe('Colour Converter & Palette Extractor (/image/colour)', () => {
    test('converts color spaces and displays CMYK print notice', async ({
      page,
    }) => {
      await page.goto('/image/colour');

      // 1. Verify title
      await expect(
        page.getByRole('heading', {
          name: 'Colour Converter & Palette Extractor',
        }),
      ).toBeVisible();

      // 2. Default color converter tab is active
      await expect(
        page.getByText('CMYK Print Reproduction Notice'),
      ).toBeVisible();

      // Change HEX input
      const hexInput = page.getByLabel('HEX Color Code');
      await hexInput.fill('#ff5722');

      // Check RGB and HSL update
      await expect(page.getByText('rgb(255, 87, 34)')).toBeVisible();
    });

    test('extracts dominant color palette using Median Cut quantization', async ({
      page,
    }) => {
      await page.goto('/image/colour');

      // Switch to Palette Extractor tab
      await page
        .getByRole('button', { name: 'Image Palette Extractor' })
        .click();

      // Upload image fixture
      const imgPath = path.join(designFixturesDir, 'palette-sample.png');
      await setFilesWhenLive(
        page.locator('input[type="file"]'),
        [imgPath],
        page.getByText(/Extracted Swatches/i),
      );

      // Palette results appear
      await expect(page.getByText(/Extracted Swatches/i)).toBeVisible();
      await expect(page.getByText('Algorithm Methodology')).toBeVisible();
      await expect(
        page.getByText(/Median Cut Color Quantization/i),
      ).toBeVisible();

      // Download palette JSON
      const downloadJsonLink = page.locator('a[download$="_palette.json"]');
      await expect(downloadJsonLink).toBeVisible();

      const [jsonDownload] = await Promise.all([
        page.waitForEvent('download'),
        downloadJsonLink.click(),
      ]);

      const jsonPath = await jsonDownload.path();
      expect(jsonPath).toBeTruthy();
      if (jsonPath) {
        const parsed = JSON.parse(await readFile(jsonPath, 'utf8'));
        expect(parsed.method).toBe('Median Cut Color Quantization');
        expect(parsed.swatches.length).toBeGreaterThanOrEqual(4);
      }
    });
  });
});
