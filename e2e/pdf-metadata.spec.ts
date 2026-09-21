import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test, type Page } from '@playwright/test';

import { readPdfMetadata } from '../lib/tools/pdf/metadata';

const fixture = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'lib',
  'tools',
  'pdf',
  '__fixtures__',
  'revealing-metadata.pdf',
);

async function upload(page: Page) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Select PDF' }).click();
  await (await chooser).setFiles(fixture);
}

test.describe('/pdf/metadata', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pdf/metadata');
  });

  test('shows what the file reveals, grouped by where it hides', async ({
    page,
  }) => {
    await upload(page);

    // The document properties everyone knows to check.
    await expect(page.getByText('Jane Partner').first()).toBeVisible();
    await expect(
      page.getByText('Confidential Merger Memo').first(),
    ).toBeVisible();

    // The XMP packet, which is the reason this tool exists: it is a second
    // copy of the same identity that clearing the properties does not remove.
    await expect(page.getByText('XMP packet').first()).toBeVisible();
    await expect(page.getByText('Author (XMP)').first()).toBeVisible();
    await expect(page.getByText('uuid:9f2b-lineage').first()).toBeVisible();

    await expect(page.getByText('File identifier').first()).toBeVisible();
    await expect(
      page.getByText('Created', { exact: true }).first(),
    ).toBeVisible();
  });

  test('the downloaded file no longer carries any of it', async ({ page }) => {
    await upload(page);
    await expect(page.getByText('Jane Partner').first()).toBeVisible();

    const download = await Promise.race([
      page.waitForEvent('download'),
      page
        .getByRole('button', { name: 'Remove all and download' })
        .click()
        .then(() => page.waitForEvent('download')),
    ]);

    const saved = await download.path();
    expect(saved).toBeTruthy();
    const bytes = new Uint8Array(await readFile(saved!));

    // The assertion that matters is on the BYTES, not on the parsed fields:
    // an earlier version of the strip removed the references and left the
    // objects, so the file parsed clean while still spelling out the name.
    const text = Buffer.from(bytes).toString('latin1');
    expect(text).not.toContain('Jane Partner');
    expect(text).not.toContain('Confidential Merger Memo');
    expect(text).not.toContain('xmpmeta');
    expect(text).not.toContain('uuid:9f2b-lineage');

    const report = await readPdfMetadata(bytes);
    expect(report.findings).toEqual([]);
    expect(report.hasXmp).toBe(false);
  });

  test('sends nothing anywhere while doing it', async ({ page }) => {
    const offOrigin: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (!url.startsWith('http://localhost') && !url.startsWith('blob:')) {
        offOrigin.push(url);
      }
    });

    await upload(page);
    await expect(page.getByText('Jane Partner').first()).toBeVisible();
    expect(offOrigin).toEqual([]);
  });
});
