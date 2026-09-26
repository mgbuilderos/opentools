import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

import { LIVE_TOOL_ROUTES } from '../lib/seo/live-tools';

/**
 * A statement converter that is quietly wrong is worse than none.
 *
 * Nobody re-adds a column of figures they just paid a tool to extract, so a
 * dropped row or a misread decimal separator is believed. The check is
 * therefore not "did it produce a table" but "does the table match the file",
 * measured against a fixture whose contents were read with `pdftotext` rather
 * than with the code under test.
 *
 * Fixture: `statement-debit-credit.pdf`, a UK current account with separate
 * withdrawal and deposit columns — opening 1,200.00, then −12.80, +850.00 and
 * −45.00, closing 1,992.20.
 */
const ROUTE = '/finance/bank-statement';
const FIXTURE = 'lib/tools/pdf/__fixtures__/statement-debit-credit.pdf';

test.describe('bank statement converter', () => {
  test.skip(!LIVE_TOOL_ROUTES.includes(ROUTE), `${ROUTE} is not registered`);

  test('extracts every row, reconciles the running balance, and uploads nothing', async ({
    page,
  }) => {
    const requested: string[] = [];
    page.on('request', (request) => requested.push(request.url()));

    await page.goto(ROUTE);
    await page.waitForLoadState('networkidle');

    await page.evaluate(async (data) => {
      const binary = atob(data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const file = new File([bytes], 'stmt.pdf', { type: 'application/pdf' });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      const input = document.querySelector<HTMLInputElement>(
        'input[type=file]',
      );
      if (!input) throw new Error('no file input on the statement converter');
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, readFileSync(FIXTURE, 'base64'));

    // Guards the guard: without the preview on screen every check below is
    // satisfied by a page that did nothing.
    await expect(page.getByText(/Extracted Statement Preview/i)).toBeVisible({
      timeout: 30_000,
    });

    const shown = (await page.evaluate(() => document.body.innerText)).replace(
      /\s+/gu,
      ' ',
    );

    // Every figure from the file, read independently with pdftotext.
    for (const value of [
      '1,200.00',
      '12.80',
      '1,187.20',
      '850.00',
      '2,037.20',
      '45.00',
      '1,992.20',
    ]) {
      expect(shown, `${value} is missing from the extracted table`).toContain(
        value,
      );
    }

    // The reconciliation is the reason to trust the rest of it.
    expect(shown).toContain('Running Balance Verified');
    expect(shown).not.toContain('Reconciliation Discrepancy Detected');

    // The user sees the table before anything can be exported.
    await expect(
      page.getByRole('button', { name: /Export CSV/i }),
    ).toBeVisible();

    expect(
      requested.filter(
        (url) =>
          !url.includes('localhost') &&
          !url.startsWith('data:') &&
          !url.startsWith('blob:'),
      ),
      'a bank statement page talked to somewhere off-origin',
    ).toEqual([]);
  });
});
