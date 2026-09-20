import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test, type Page } from '@playwright/test';

import { extractEntry, readZip } from '../lib/tools/archive/zip-reader';

const htmlFixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'lib',
  'tools',
  'html',
  '__fixtures__',
);

async function uploadFiles(page: Page, filenames: string[]) {
  const filePaths = filenames.map((f) => path.join(htmlFixturesDir, f));
  const input = page.locator('input[type="file"]');
  await input.setInputFiles(filePaths);
}

test.describe('File to HTML Converter (/web/file-to-html)', () => {
  test('converts multiple images to email marketing ZIP and standalone web HTML', async ({
    page,
  }) => {
    await page.goto('/web/file-to-html');

    // 1. Verify display hierarchy and educational notice
    await expect(
      page.getByRole('heading', { name: 'File to HTML Converter' }),
    ).toBeVisible();
    await expect(
      page.getByText('Email Marketing vs Web HTML: Why Hosted Assets Matter'),
    ).toBeVisible();

    // 2. Upload images (JPEG, PNG, WebP)
    await uploadFiles(page, ['banner.jpg', 'product.png', 'promo.webp']);

    // Slices list appears with filenames and dimensions
    await expect(page.getByText('banner.jpg')).toBeVisible();
    await expect(page.getByText('product.png')).toBeVisible();
    await expect(page.getByText('promo.webp')).toBeVisible();
    await expect(page.getByText('8 × 8 px')).toBeVisible();
    await expect(page.getByText('64 × 64 px').first()).toBeVisible();

    // 3. Customize template options
    const titleInput = page.getByLabel('Document / Email Title');
    await titleInput.fill('Autumn Campaign');

    const preheaderInput = page.getByLabel(/Preheader Text/);
    await preheaderInput.fill('Exclusive autumn collection preview');

    // 4. Trigger conversion
    const convertBtn = page.getByRole('button', {
      name: 'Generate HTML & Package',
    });
    await convertBtn.click();

    // 5. Verification: Success banner & dual tabs
    await expect(page.getByText('Conversion Complete')).toBeVisible();

    // Email marketing tab is active by default
    const downloadZipLink = page.locator('a[download$="_email_package.zip"]');
    await expect(downloadZipLink).toBeVisible();

    // Download and inspect ZIP package
    const [zipDownload] = await Promise.all([
      page.waitForEvent('download'),
      downloadZipLink.click(),
    ]);

    const zipPath = await zipDownload.path();
    expect(zipPath).toBeTruthy();
    if (zipPath) {
      const zipBytes = new Uint8Array(await readFile(zipPath));
      // Verify ZIP contains index.html, README.txt, and image assets
      const archive = readZip(zipBytes);
      const paths = archive.entries.map((e) => e.path);

      expect(paths).toContain('index.html');
      expect(paths).toContain('README.txt');
      expect(paths).toContain('images/banner.jpg');
      expect(paths).toContain('images/product.png');
      expect(paths).toContain('images/promo.webp');

      const indexEntry = archive.entries.find((e) => e.path === 'index.html')!;
      const indexHtmlBytes = await extractEntry(zipBytes, indexEntry);
      const indexHtml = new TextDecoder().decode(indexHtmlBytes);
      expect(indexHtml).toContain('Autumn Campaign');
      expect(indexHtml).toContain('Exclusive autumn collection preview');
      expect(indexHtml).toContain('images/banner.jpg');
      expect(indexHtml).toContain('images/product.png');
      expect(indexHtml).toContain('images/promo.webp');
      // Verify email table structure
      expect(indexHtml).toContain('role="presentation"');
      expect(indexHtml).toContain('display: block');
    }

    // 6. Switch to Standalone Web Page tab
    const webTabBtn = page.getByRole('button', {
      name: 'Standalone Web Page (.html)',
    });
    await webTabBtn.click();

    const downloadWebLink = page.locator('a[download$="_standalone.html"]');
    await expect(downloadWebLink).toBeVisible();

    // Download standalone HTML and inspect base64 data URIs
    const [htmlDownload] = await Promise.all([
      page.waitForEvent('download'),
      downloadWebLink.click(),
    ]);

    const htmlPath = await htmlDownload.path();
    expect(htmlPath).toBeTruthy();
    if (htmlPath) {
      const htmlContent = await readFile(htmlPath, 'utf8');
      expect(htmlContent).toContain('Autumn Campaign');
      expect(htmlContent).toContain('data:image/jpeg;base64,');
      expect(htmlContent).toContain('data:image/png;base64,');
      expect(htmlContent).toContain('data:image/webp;base64,');
    }
  });

  test('refuses invalid or non-image files with clear guidance', async ({
    page,
  }) => {
    await page.goto('/web/file-to-html');

    // Upload invalid file (package.json as non-image)
    const packageJsonPath = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '..',
      'package.json',
    );
    const input = page.locator('input[type="file"]');
    await input.setInputFiles([packageJsonPath]);

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByText(/is not a supported format/i)).toBeVisible();
  });
});
