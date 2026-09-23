import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { extractEntry, readZip } from '@/lib/tools/archive/zip-reader';

test.describe('The Bench', () => {
  test('is discoverable from the home page and opens from search', async ({
    page,
  }) => {
    await page.goto('/');
    // The prerendered input exists before its React change handler is hydrated.
    await page.waitForTimeout(500);
    await page.getByRole('combobox', { name: 'Search tools' }).fill('The Bench');
    const benchResult = page.getByRole('option', { name: /The Bench/u });
    await expect(benchResult).toBeVisible();
    await benchResult.click();

    await expect(page).toHaveURL(/\/bench$/u);
    await expect(
      page.getByRole('heading', { name: 'The Bench' }),
    ).toBeVisible();
  });

  test('previews and runs files without external egress', async ({ page }) => {
    const external: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (!['127.0.0.1', 'localhost'].includes(url.hostname))
        external.push(request.url());
    });

    await page.goto('/bench');
    await expect(
      page.getByRole('heading', { name: 'The Bench' }),
    ).toBeVisible();
    await page
      .getByLabel('Upload file to inspect and detect tools')
      .setInputFiles([
        {
          name: 'alpha.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('one two three'),
        },
        {
          name: 'beta.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('four five'),
        },
      ]);
    await expect(page.getByTestId('input-summary')).toContainText(
      '2 files ready',
    );
    await page.getByRole('button', { name: 'Dry run first file' }).click();
    await expect(page.getByTestId('dry-run')).toContainText(
      'alpha-word-counter.txt',
    );
    await page.getByRole('button', { name: 'Run 2 files' }).click();
    await expect(
      page.getByTestId('outcomes').getByRole('listitem'),
    ).toHaveCount(2);
    const receipt = page.getByTestId('receipt');
    await expect(receipt).toContainText('Inputs: 2');
    await expect(receipt).toContainText('Succeeded: 2');

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download receipt.txt' }).click();
    const receiptDownload = await downloadPromise;
    expect(receiptDownload.suggestedFilename()).toBe('receipt.txt');
    const receiptPath = await receiptDownload.path();
    expect(receiptPath).not.toBeNull();
    const receiptText = await readFile(receiptPath!, 'utf8');
    expect(receiptText.endsWith(
      'Bytes uploaded: 0 - this page cannot make a network request.',
    )).toBe(true);
    expect(external).toEqual([]);
  });

  test('runs a two-step pipeline over two files with zero external egress', async ({
    page,
  }) => {
    const external: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (!['127.0.0.1', 'localhost'].includes(url.hostname))
        external.push(request.url());
    });

    await page.goto('/bench');
    await expect(
      page.getByRole('heading', { name: 'The Bench' }),
    ).toBeVisible();
    await page
      .getByLabel('Upload file to inspect and detect tools')
      .setInputFiles([
        {
          name: 'alpha.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('one two three'),
        },
        {
          name: 'beta.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('four five'),
        },
      ]);

    await page
      .getByRole('button', { name: 'Add Word counter as step' })
      .click();
    await page.getByLabel('Search operations').fill('text reverser');
    await page
      .getByLabel('Operation', { exact: true })
      .selectOption('text:text-reverser');
    await page
      .getByRole('button', { name: 'Add Text reverser as step' })
      .click();
    await expect(page.getByTestId('pipeline-steps').getByRole('listitem')).toHaveCount(
      2,
    );

    await page
      .getByRole('button', { name: 'Run pipeline over 2 files' })
      .click();
    await expect(
      page.getByTestId('outcomes').getByRole('listitem'),
    ).toHaveCount(2);
    await expect(page.getByTestId('receipt')).toContainText('Steps:');
    await expect(page.getByTestId('receipt')).toContainText(
      '1. Word counter (word-counter @ text)',
    );
    await expect(page.getByTestId('receipt')).toContainText(
      '2. Text reverser (text-reverser @ text)',
    );

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download results ZIP' }).click();
    const resultDownload = await downloadPromise;
    const resultPath = await resultDownload.path();
    expect(resultPath).not.toBeNull();
    const zipBytes = new Uint8Array(await readFile(resultPath!));
    const archive = readZip(zipBytes);
    const texts = await Promise.all(
      archive.entries.map(async (entry) =>
        new TextDecoder().decode(await extractEntry(zipBytes, entry)),
      ),
    );
    expect(texts.toSorted()).toEqual(['2', '3']);
    expect(external).toEqual([]);
  });

  test('names the folder mode available in this browser', async ({ page }) => {
    await page.goto('/bench');
    await expect(
      page.getByText(/browser can read a folder|folders read-only/u),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Choose folder for ZIP' }),
    ).toBeVisible();
  });

  test('measures one file against its dedicated workbench', async ({
    page,
  }, testInfo) => {
    const fixture = {
      name: 'timing.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('one two three'),
    };

    await page.goto('/text/workbench?tool=word-counter');
    await expect(page.getByLabel('Text to count')).toBeVisible();
    await page.waitForTimeout(500);
    const dedicatedStarted = performance.now();
    await page.getByLabel('Text to count').fill('one two three');
    await expect(page.getByRole('heading', { name: /Done/u })).toBeVisible();
    const dedicatedMs = performance.now() - dedicatedStarted;

    await page.goto('/bench');
    await expect(
      page.getByRole('heading', { name: 'The Bench' }),
    ).toBeVisible();
    await page.waitForTimeout(500);
    await page
      .getByLabel('Upload file to inspect and detect tools')
      .setInputFiles(fixture);
    const benchStarted = performance.now();
    await page.getByRole('button', { name: 'Run 1 files' }).click();
    await expect(
      page.getByTestId('outcomes').getByRole('listitem'),
    ).toHaveCount(1);
    const benchMs = performance.now() - benchStarted;

    console.info(
      `${testInfo.project.name} single-file timing: dedicated ${dedicatedMs.toFixed(1)} ms; Bench ${benchMs.toFixed(1)} ms`,
    );
    expect(benchMs).toBeLessThan(2_000);
  });
});
