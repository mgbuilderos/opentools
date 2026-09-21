import { expect, test } from '@playwright/test';

test.describe('The Bench', () => {
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
