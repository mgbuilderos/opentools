import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test, type Download, type Page } from '@playwright/test';

import { parseCsv } from '../lib/tools/spreadsheet/csv';
import { cellToText, readXlsx } from '../lib/tools/spreadsheet/xlsx-reader';

const fixtureDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'lib',
  'tools',
  'spreadsheet',
  '__fixtures__',
);

/**
 * `sales.xlsx` is written by openpyxl. Its ground truth, from openpyxl reading
 * it back, is in `lib/tools/spreadsheet/xlsx-reader.test.ts`. The tests below
 * read the **downloaded file** rather than the screen, so a preview that looked
 * right while the conversion was wrong would still fail.
 */
const XLSX = 'sales.xlsx';

async function chooseFile(page: Page, label: string, name: string, buffer?: Buffer) {
  await page.getByLabel(label).setInputFiles({
    name,
    mimeType: name.endsWith('.xlsx')
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'text/csv',
    buffer: buffer ?? (await readFile(path.join(fixtureDir, name))),
  });
}

async function saved(page: Page) {
  const download: Promise<Download> = page.waitForEvent('download');
  await page.getByRole('button', { name: /^Save / }).click();
  return readFile((await (await download).path())!);
}

test.describe('Excel converter', () => {
  test('opens a spreadsheet and shows what is in it', async ({ page }) => {
    await page.goto('/data/excel');
    await chooseFile(page, 'Choose a spreadsheet', XLSX);

    // The sheet the workbook lists first, and its real shape.
    await expect(page.getByText(/Sales — 7 rows, 6 columns/u)).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Region' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'North' })).toBeVisible();
    // A date, shown as a date rather than as the number a spreadsheet stores.
    await expect(page.getByRole('cell', { name: '2023-03-15' })).toBeVisible();
  });

  test('lists every sheet, in workbook order', async ({ page }) => {
    await page.goto('/data/excel');
    await chooseFile(page, 'Choose a spreadsheet', XLSX);

    // Wait for the selector to exist before reading it. WebKit renders it a
    // beat later than Chromium, and reading straight away returned an empty
    // list rather than failing — an undefined option, not a wrong one.
    await expect(page.locator('select#sheet')).toBeVisible();
    const options = await page.locator('select#sheet option').allTextContents();
    expect(options[0]).toContain('Sales');
    expect(options[1]).toContain('Empty Sheet');
    expect(options[2]).toContain('Gaps');
  });

  test('the CSV it hands back holds the real values', async ({ page }) => {
    await page.goto('/data/excel');
    await chooseFile(page, 'Choose a spreadsheet', XLSX);
    await page.getByRole('button', { name: 'Convert this sheet to CSV' }).click();

    const rows = parseCsv(new TextDecoder().decode(await saved(page)));
    expect(rows[0]).toEqual(['Region', 'Units', 'Price', 'Signed', 'Notes', 'Active']);
    expect(rows[1][0]).toBe('North');
    expect(rows[1][1]).toBe('120');
    // A date written as a date, and `false` surviving as a value.
    expect(rows[1][3]).toBe('2023-03-15');
    expect(rows[2][5]).toBe('FALSE');
    // Text that would break a naive CSV writer.
    expect(rows[3][4]).toBe('has a, comma');
    expect(rows[4][4]).toBe('quote " inside');
  });

  test('writes the byte-order mark, so Excel reopens it as UTF-8', async ({ page }) => {
    // Without it, Excel reads the file as the local codepage and any text
    // outside ASCII is mangled on the way back in.
    await page.goto('/data/excel');
    await chooseFile(page, 'Choose a spreadsheet', XLSX);
    await page.getByRole('button', { name: 'Convert this sheet to CSV' }).click();

    const bytes = await saved(page);
    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf]);
  });

  test('converts the sheet the reader picked, not always the first', async ({ page }) => {
    await page.goto('/data/excel');
    await chooseFile(page, 'Choose a spreadsheet', XLSX);
    await page.locator('select#sheet').selectOption({ index: 2 });
    await page.getByRole('button', { name: 'Convert this sheet to CSV' }).click();

    // The "Gaps" sheet holds A1, D2 and B5, so the cells must land in those
    // columns rather than being packed to the left.
    const rows = parseCsv(new TextDecoder().decode(await saved(page)));
    expect(rows[0][0]).toBe('a');
    expect(rows[1][3]).toBe('sparse');
    expect(rows[4][1]).toBe('5');
  });

  test('makes a real spreadsheet from a CSV', async ({ page }) => {
    await page.goto('/data/excel');
    await page.getByRole('tab', { name: 'Make a spreadsheet' }).click();
    await chooseFile(
      page,
      'Choose a CSV file',
      'people.csv',
      Buffer.from('name,city,code\r\n"Ada, L",Mumbai,007\r\n"He said ""hi""",Delhi,042\r\n'),
    );

    await expect(page.getByText(/2 rows|3 rows/u)).toBeVisible();
    await page.getByRole('button', { name: 'Make an Excel file' }).click();

    const book = await readXlsx(new Uint8Array(await saved(page)));
    const rows = book.sheets[0].rows;
    expect(cellToText(rows[0][0])).toBe('name');
    expect(cellToText(rows[1][0])).toBe('Ada, L');
    expect(cellToText(rows[2][0])).toBe('He said "hi"');
    // Leading zeros survive, because every value is written as text.
    expect(cellToText(rows[1][2])).toBe('007');
  });

  test('works out that a European export uses semicolons', async ({ page }) => {
    // The comma is the decimal point in much of Europe, so Excel exports with
    // semicolons there. Reading it as comma-separated gives one column.
    await page.goto('/data/excel');
    await page.getByRole('tab', { name: 'Make a spreadsheet' }).click();
    await chooseFile(
      page,
      'Choose a CSV file',
      'euro.csv',
      Buffer.from('name;price\r\nwidget;1,50\r\nbolt;0,80\r\n'),
    );

    await expect(page.getByText(/separated by semicolons/u)).toBeVisible();
    await page.getByRole('button', { name: 'Make an Excel file' }).click();

    const book = await readXlsx(new Uint8Array(await saved(page)));
    expect(book.sheets[0].columnCount).toBe(2);
    expect(cellToText(book.sheets[0].rows[1][1])).toBe('1,50');
  });

  test('names the old .xls format rather than calling it corrupt', async ({ page }) => {
    // An .xls is an OLE compound document — a different format that happens to
    // hold spreadsheets. Its signature is unmistakable.
    const ole = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0, 0, 0, 0, 0]);
    await page.goto('/data/excel');
    await chooseFile(page, 'Choose a spreadsheet', 'old.xlsx', ole);

    await expect(page.getByRole('alert')).toContainText('old .xls file');
    await expect(page.getByRole('button', { name: 'Convert this sheet to CSV' })).toHaveCount(0);
  });

  test('says a ZIP is not a spreadsheet', async ({ page }) => {
    const zip = await readFile(path.join(fixtureDir, '..', '..', 'archive', '__fixtures__', 'simple.zip'));
    await page.goto('/data/excel');
    await chooseFile(page, 'Choose a spreadsheet', 'notasheet.xlsx', zip);

    await expect(page.getByRole('alert')).toContainText('does not contain a spreadsheet');
  });

  test('tells the reader when a formula had no saved result', async ({ page }) => {
    // The fixture's A7 holds `=A2` with no cached value. Showing an empty cell
    // with no explanation looks like the tool lost data.
    await page.goto('/data/excel');
    await chooseFile(page, 'Choose a spreadsheet', XLSX);
    await expect(page.getByText(/Formulas are not calculated here/u)).toBeVisible();
  });

  test('sends nothing off this origin while doing the work', async ({ page }) => {
    await page.goto('/data/excel');
    const origin = new URL(page.url()).origin;
    const offOrigin: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).origin !== origin) offOrigin.push(request.url());
    });

    await chooseFile(page, 'Choose a spreadsheet', XLSX);
    await page.getByRole('button', { name: 'Convert this sheet to CSV' }).click();
    await expect(page.getByRole('button', { name: /^Save / })).toBeVisible();

    expect(offOrigin).toEqual([]);
  });
});
