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

  /**
   * The page title, the meta description and the file picker all promise
   * multi-page PDFs, and nothing tested that claim -- no unit test, no e2e
   * test, no fixture. The PDF never reaches `convertFilesToHtml`, which refuses
   * anything that is not an image; the component rasterises each page to a PNG
   * first, in the browser, which is why this can only be checked here.
   *
   * `two-page.pdf` is written by hand in `__fixtures__` so it owes nothing to
   * the code under test. Poppler's `pdfinfo` reads it as 2 pages at 200x100
   * pts. The two pages have different shapes so the slices can be told apart
   * by their dimensions alone.
   */
  test('splits a multi-page PDF into one image per page', async ({ page }) => {
    await page.goto('/web/file-to-html');

    const input = page.locator('input[type="file"]');
    await input.setInputFiles(path.join(htmlFixturesDir, 'two-page.pdf'));

    // One slice per page, named for the page it came from, and landscape
    // before portrait -- so the order of the document survived.
    await expect(page.getByText('two-page_page_1.png')).toBeVisible();
    await expect(page.getByText('two-page_page_2.png')).toBeVisible();

    // Page 1 is 200x100 pts and page 2 is 100x200, rendered at `scale = 2`
    // (pdf-slices.ts) for a crisp raster. The shapes prove each slice came
    // from its own page rather than one page being rendered twice.
    await expect(page.getByText('400 × 200 px')).toBeVisible();
    await expect(page.getByText('200 × 400 px')).toBeVisible();

    const convertBtn = page.getByRole('button', {
      name: 'Generate HTML & Package',
    });
    await convertBtn.click();
    await expect(page.getByText('Conversion Complete')).toBeVisible();

    const downloadZipLink = page.locator('a[download$="_email_package.zip"]');
    const [zipDownload] = await Promise.all([
      page.waitForEvent('download'),
      downloadZipLink.click(),
    ]);
    const zipPath = await zipDownload.path();
    expect(zipPath).toBeTruthy();
    if (!zipPath) return;

    const zipBytes = new Uint8Array(await readFile(zipPath));
    const archive = readZip(zipBytes);
    const images = archive.entries
      .map((e) => e.path)
      .filter((p) => p.startsWith('images/'));

    // Two pages in, two images out, and they are real PNGs rather than the
    // PDF handed through under a new name.
    expect(images).toHaveLength(2);
    for (const imagePath of images) {
      const entry = archive.entries.find((e) => e.path === imagePath)!;
      const bytes = await extractEntry(zipBytes, entry);
      expect(bytes.slice(0, 8)).toEqual(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      );
    }

    const indexEntry = archive.entries.find((e) => e.path === 'index.html')!;
    const indexHtml = new TextDecoder().decode(
      await extractEntry(zipBytes, indexEntry),
    );
    for (const imagePath of images) {
      expect(indexHtml).toContain(imagePath);
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
