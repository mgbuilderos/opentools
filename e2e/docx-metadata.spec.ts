import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test, type Download, type Page } from '@playwright/test';

import { extractEntry, readZip } from '../lib/tools/archive/zip-reader';
import { readDocxMetadata } from '../lib/tools/docx/metadata';

const fixtureDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'lib',
  'tools',
  'docx',
  '__fixtures__',
);

async function uploadDocx(page: Page, filename: string) {
  const filePath = path.join(fixtureDir, filename);
  const input = page.locator('input[type="file"]');
  await input.setInputFiles(filePath);
}

test.describe('Word Document (.docx) Metadata Viewer & Stripper (/documents/metadata)', () => {
  test('inspects author, company, duration, comments, RSIDs, and hidden deleted text', async ({
    page,
  }) => {
    await page.goto('/documents/metadata');

    // Page heading
    await expect(
      page.getByRole('heading', {
        name: 'Word Document (.docx) Metadata Stripper & Inspector',
      }),
    ).toBeVisible();

    // Upload test fixture with known metadata and tracked changes
    await uploadDocx(page, 'tracked-doc.docx');

    // File summary
    await expect(page.getByText('tracked-doc.docx')).toBeVisible();
    await expect(
      page.getByText('Microsoft Word Document (.docx)'),
    ).toBeVisible();

    // Author & Document Identity
    await expect(page.getByText('Jane Lawyer').first()).toBeVisible();
    await expect(page.getByText('Partner Bob').first()).toBeVisible();
    await expect(
      page.getByText('Confidential Settlement Agreement'),
    ).toBeVisible();
    await expect(page.getByText('Litigation Settlement')).toBeVisible();

    // Organization & Editing Statistics
    await expect(page.getByText('Acme Legal LLP')).toBeVisible();
    await expect(page.getByText('Managing Partner Smith')).toBeVisible();
    await expect(page.getByText(/145 total minutes/)).toBeVisible();

    // Reviewer comments
    await expect(
      page.getByText(
        'Do not share the $250k initial offer with opposing counsel.',
      ),
    ).toBeVisible();

    // Machine RSIDs
    await expect(page.getByText('00AA1122').first()).toBeVisible();

    // Tracked changes & secret deleted text
    await expect(page.getByText('Hidden Deleted Text Warning')).toBeVisible();
    await expect(
      page.getByText('Payment of $250,000 shall be wired within 30 days.'),
    ).toBeVisible();
    await expect(
      page.getByText(
        'Payment of $1,000,000 shall be wired within 5 business days.',
      ),
    ).toBeVisible();
  });

  test('cleans metadata and accepts revisions (purging deleted text forever)', async ({
    page,
  }) => {
    await page.goto('/documents/metadata');
    await uploadDocx(page, 'tracked-doc.docx');

    // Select "Accept Revisions"
    await page.getByRole('radio', { name: /^Accept Revisions/ }).check();

    // Trigger download
    const cleanButton = page.getByRole('button', {
      name: 'Clean & download .docx',
    });
    await expect(cleanButton).toBeVisible();

    const downloadPromise: Promise<Download> = page.waitForEvent('download');
    await cleanButton.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('tracked-doc_clean_accept.docx');

    // Inspect downloaded file bytes
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    const downloadedBytes = new Uint8Array(await readFile(downloadPath!));

    // Verify with metadata reader
    const report = await readDocxMetadata(downloadedBytes);
    expect(report.core.creator).toBeNull();
    expect(report.core.lastModifiedBy).toBeNull();
    expect(report.app.company).toBeNull();
    expect(report.app.manager).toBeNull();
    expect(report.comments).toHaveLength(0);
    expect(report.rsids.count).toBe(0);
    expect(report.trackedChanges.insertionsCount).toBe(0);
    expect(report.trackedChanges.deletionsCount).toBe(0);

    // Verify XML text
    const archive = readZip(downloadedBytes);
    const docEntry = archive.entries.find(
      (e) => e.path === 'word/document.xml',
    );
    expect(docEntry).toBeDefined();
    const docXml = new TextDecoder().decode(
      await extractEntry(downloadedBytes, docEntry!),
    );
    expect(docXml).toContain(
      'Payment of $1,000,000 shall be wired within 5 business days.',
    );
    expect(docXml).not.toContain('$250,000');

    // Output banner visible
    await expect(
      page.getByText('Document sanitized and downloaded successfully'),
    ).toBeVisible();
  });

  test('cleans metadata and rejects revisions (restoring deleted text)', async ({
    page,
  }) => {
    await page.goto('/documents/metadata');
    await uploadDocx(page, 'tracked-doc.docx');

    // Select "Reject Revisions"
    await page.getByRole('radio', { name: /^Reject Revisions/ }).check();

    const cleanButton = page.getByRole('button', {
      name: 'Clean & download .docx',
    });
    const downloadPromise: Promise<Download> = page.waitForEvent('download');
    await cleanButton.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('tracked-doc_clean_reject.docx');

    const downloadPath = await download.path();
    const downloadedBytes = new Uint8Array(await readFile(downloadPath!));

    const archive = readZip(downloadedBytes);
    const docEntry = archive.entries.find(
      (e) => e.path === 'word/document.xml',
    );
    const docXml = new TextDecoder().decode(
      await extractEntry(downloadedBytes, docEntry!),
    );
    // Deleted text was restored
    expect(docXml).toContain(
      'Payment of $250,000 shall be wired within 30 days.',
    );
    // Inserted text was purged
    expect(docXml).not.toContain('$1,000,000');
  });

  test('clears document when Clear button is clicked', async ({ page }) => {
    await page.goto('/documents/metadata');
    await uploadDocx(page, 'tracked-doc.docx');
    await expect(page.getByText('tracked-doc.docx')).toBeVisible();

    await page.getByRole('button', { name: 'Clear' }).click();

    await expect(
      page.getByText('Choose a Word document or drop it here'),
    ).toBeVisible();
    await expect(page.getByText('tracked-doc.docx')).not.toBeVisible();
  });

  test('cleans three documents and downloads all outputs as a ZIP', async ({
    page,
  }) => {
    const fixture = await readFile(path.join(fixtureDir, 'tracked-doc.docx'));
    await page.goto('/documents/metadata');
    await page.locator('input[type="file"]').setInputFiles([
      {
        name: 'first.docx',
        mimeType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        buffer: fixture,
      },
      {
        name: 'second.docx',
        mimeType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        buffer: fixture,
      },
      {
        name: 'third.docx',
        mimeType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        buffer: fixture,
      },
    ]);

    await page.getByRole('button', { name: 'Clean all documents' }).click();
    await expect(page.locator('[data-batch-result="done"]')).toHaveCount(3);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download all as ZIP' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('clean-documents.zip');
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    expect(
      readZip(new Uint8Array(await readFile(downloadPath!))).entries,
    ).toHaveLength(3);
  });
});
