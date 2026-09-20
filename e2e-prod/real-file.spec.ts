import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

import { extractEntry, readZip } from '../lib/tools/archive/zip-reader';

/**
 * Drives a real file through the **deployed** site.
 *
 * Every other suite builds locally and proves something about an artifact on
 * this laptop. Release verification here has repeatedly stopped at "the page
 * returns 200", and a 200 is exactly what the site returned throughout the
 * service-worker outage that had it broken for every returning visitor.
 *
 * So this uploads a bank statement to production, reads the rows the page
 * extracted, downloads the spreadsheet it produces, and opens that spreadsheet
 * to check the numbers are really in it. Nothing is stubbed.
 *
 * Not part of `npm run qc`: it needs the internet and a deployed site, and the
 * gate has to pass on a machine with neither.
 */
const fixtures = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'lib',
  'tools',
  'pdf',
  '__fixtures__',
);

// Poppler's `pdftotext -layout` reads these exact values out of the fixture,
// so they are what the file contains rather than what our own reader says.
const EXPECTED = [
  { description: 'PAYROLL DIRECT DEPOSIT', amount: '2,450.00' },
  { description: 'ELECTRIC UTILITY BILL', amount: '-120.50' },
  { description: 'WHOLE FOODS MARKET', amount: '-85.20' },
  { description: 'MONTHLY RENT TRANSFER', amount: '-1,500.00' },
];

test('a real bank statement becomes a real spreadsheet, on the deployed site', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin !== 'https://getopentools.com') requests.push(request.url());
  });

  // `networkidle`, not the default `load`. The page is prerendered HTML, so the
  // file input exists and accepts a file well before React has hydrated and
  // attached its change handler -- and a file set on an input nobody is
  // listening to is silently dropped, with no error anywhere. That produced a
  // 30-second timeout in Chromium while WebKit, which hydrated faster, passed
  // the same test. It looked like a browser difference and was a race.
  await page.goto('/pdf/to-excel', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();

  const fixture = path.join(fixtures, 'statement-signed-amount.pdf');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'statement-signed-amount.pdf',
    mimeType: 'application/pdf',
    buffer: await readFile(fixture),
  });

  // The extracted cells are editable inputs, not text nodes, so they are read
  // by value. Checked against the page rather than assumed.
  for (const row of EXPECTED) {
    await expect(
      page.locator(`input[value*="${row.description}"]`),
    ).toHaveValue(row.description, { timeout: 30_000 });
  }

  // The page's own reconciliation check: the running balance has to agree with
  // the amounts, which is the thing a bookkeeper would otherwise verify by hand.
  await expect(page.getByText(/100% Reconciled/i)).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Download Excel \(\.xlsx\)/i }).click(),
  ]);
  const saved = await download.path();
  expect(saved, 'production produced no file').toBeTruthy();
  if (!saved) return;

  // An .xlsx is a ZIP of XML. Open it and look for the values rather than
  // trusting the download's existence, which is the mistake a 200 check makes.
  const bytes = new Uint8Array(await readFile(saved));
  const archive = readZip(bytes);
  const paths = archive.entries.map((entry) => entry.path);
  expect(paths).toContain('[Content_Types].xml');
  expect(paths.some((entry) => entry.startsWith('xl/worksheets/'))).toBe(true);

  const sheet = archive.entries.find((entry) =>
    entry.path.startsWith('xl/worksheets/sheet'),
  )!;
  const strings = archive.entries.find(
    (entry) => entry.path === 'xl/sharedStrings.xml',
  );
  const decoder = new TextDecoder();
  const sheetXml = decoder.decode(await extractEntry(bytes, sheet));
  const stringXml = strings
    ? decoder.decode(await extractEntry(bytes, strings))
    : '';
  const workbookText = sheetXml + stringXml;

  for (const row of EXPECTED) {
    expect(
      workbookText,
      `"${row.description}" is missing from the spreadsheet production produced`,
    ).toContain(row.description);
  }
  // 2450 rather than "2,450.00": the writer stores a number, not the text of
  // one, which is the difference between a spreadsheet and a picture of a
  // spreadsheet. A bookkeeper has to be able to sum this column.
  expect(workbookText).toMatch(/2450/u);

  expect(
    requests,
    'the deployed page sent something off its own origin',
  ).toEqual([]);
});
