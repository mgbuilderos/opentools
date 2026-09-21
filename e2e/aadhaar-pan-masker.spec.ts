import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

import { verhoeffCheckDigit } from '../lib/tools/id-mask/mask';

/** A 12-digit number whose last digit is its Verhoeff check digit. */
function aadhaar(first11: string) {
  return `${first11}${verhoeffCheckDigit(first11.split('').map(Number))}`;
}

const VALID = aadhaar('23456789012');
const VALID_B = aadhaar('87654321098');
// Last digit changed, so it fails the checksum and is masked on shape only.
const TYPO = `${VALID_B.slice(0, 11)}${(Number(VALID_B[11]) + 1) % 10}`;
const group = (value: string, separator: string) =>
  [value.slice(0, 4), value.slice(4, 8), value.slice(8)].join(separator);
const ZERO_WIDTH = String.fromCharCode(0x200b);

/**
 * Waits until React has taken the prerendered page over.
 *
 * Every page here is prerendered to static HTML. Text typed into a control
 * before hydration lands in the DOM and never in React's state, so the tool
 * goes on believing the box is empty and its button stays disabled for the
 * rest of the test -- which is what this spec did on WebKit, intermittently,
 * with the text plainly visible in the failure snapshot beside a counter
 * reading "0 characters". So type a probe until the page answers, then clear
 * it.
 *
 * Each attempt clears the box first. Retrying with the same text is not enough
 * and deadlocks: React records the value it finds on the node when it hydrates
 * -- the text already typed into it -- and then ignores every later event that
 * carries that same value, so the box can never be re-announced.
 */
async function waitForHydration(page: Page) {
  const area = page.getByLabel('Text to mask');
  const run = page.getByRole('button', { name: 'Mask numbers' });
  await expect(async () => {
    await area.fill('');
    await area.fill('probe');
    await expect(run).toBeEnabled({ timeout: 500 });
  }).toPass({ timeout: 30_000 });
  await area.fill('');
}

async function mask(page: Page, text: string) {
  await waitForHydration(page);
  await page.getByLabel('Text to mask').fill(text);
  await page.getByRole('button', { name: 'Mask numbers' }).click();
  await expect(
    page.getByRole('heading', { name: /^(Masked|No Aadhaar)/u }),
  ).toBeVisible({ timeout: 30_000 });
}

async function savedText(page: Page, name: string) {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: `Download ${name}` }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe(name);
  return readFile(await file.path(), 'utf8');
}

test.describe('Aadhaar and PAN masker', () => {
  test('masks every number, reports counts, and passes the re-check', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.goto('/life-admin/aadhaar-pan-masker');
    await expect(
      page.getByText(
        'This tool reads text only. It does not read images, scans or PDFs.',
      ),
    ).toBeVisible();

    const hidden = `${VALID.slice(0, 3)}${ZERO_WIDTH}${VALID.slice(3, 4)} ${VALID.slice(4, 8)} ${VALID.slice(8)}`;
    const text = [
      `Asha: ${group(VALID, ' ')}, PAN ABCPE1234F`,
      `Ravi: ${group(TYPO, '-')}`,
      `Hidden: ${hidden}`,
      'Card 4111 1111 1111 1111',
    ].join('\n');
    await mask(page, text);

    const output = await page.locator('#masked-output').inputValue();
    expect(output).toBe(
      [
        `Asha: XXXX XXXX ${VALID.slice(8)}, PAN XXXXXX234F`,
        `Ravi: XXXX-XXXX-${TYPO.slice(8)}`,
        `Hidden: XXX${ZERO_WIDTH}X XXXX ${VALID.slice(8)}`,
        'Card 4111 1111 1111 1111',
      ].join('\n'),
    );
    await expect(page.getByTestId('count-aadhaar-valid')).toHaveText('2');
    await expect(page.getByTestId('count-aadhaar-shape')).toHaveText('1');
    await expect(page.getByTestId('count-pan')).toHaveText('1');
    await expect(page.getByTestId('count-long-runs')).toHaveText('1');
    await expect(page.getByText(/^Re-check passed/u)).toBeVisible();
    await expect(page.locator('#tool').getByRole('alert')).toHaveCount(0);

    expect(await savedText(page, 'masked-text.txt')).toBe(output);

    // Hiding all ten PAN characters is an option, and changing it clears the
    // old result rather than leaving a stale one to copy.
    await page.getByLabel(/Hide all 10/u).check();
    await expect(page.locator('#masked-output')).toHaveCount(0);
    await page.getByRole('button', { name: 'Mask numbers' }).click();
    await expect(page.locator('#masked-output')).toHaveValue(
      /PAN XXXXXXXXXX\n/u,
    );
    expect(errors).toEqual([]);
  });

  test('blocks copy and download until a re-check warning is acknowledged', async ({
    page,
  }) => {
    await page.goto('/life-admin/aadhaar-pan-masker');
    // A PAN-shaped value with a fourth letter no PAN uses, and 12 digits in a
    // grouping no Aadhaar uses: the masker leaves both, the re-check does not.
    await mask(
      page,
      `Clean ${group(VALID, ' ')}\nOdd ABCDE1234F and 234567 890124`,
    );

    await expect(page.locator('#masked-output')).toHaveValue(
      `Clean XXXX XXXX ${VALID.slice(8)}\nOdd ABCDE1234F and 234567 890124`,
    );
    const warning = page.locator('#tool').getByRole('alert');
    await expect(warning).toContainText('Not clean: 2 places');
    await expect(
      warning.getByRole('button', { name: /Line 2, column 5 · PAN-like/u }),
    ).toBeVisible();
    await expect(
      warning.getByRole('button', { name: /Line 2, column 20 · 12 digits/u }),
    ).toBeVisible();

    const download = page.getByRole('button', {
      name: 'Download masked-text.txt',
    });
    const copy = page.getByRole('button', { name: 'Copy masked text' });
    await expect(download).toBeDisabled();
    await expect(copy).toBeDisabled();

    // Selecting a finding highlights it in the result.
    await warning.getByRole('button', { name: /PAN-like/u }).click();
    const selected = await page
      .locator('#masked-output')
      .evaluate((area: HTMLTextAreaElement) =>
        area.value.slice(area.selectionStart, area.selectionEnd),
      );
    expect(selected).toBe('ABCDE1234F');

    await page.getByLabel(/I have checked these places/u).check();
    await expect(download).toBeEnabled();
    await expect(copy).toBeEnabled();
    expect(await savedText(page, 'masked-text.txt')).toContain(
      'Odd ABCDE1234F',
    );
  });

  test('reads a text file, names the download after it, and refuses a PDF', async ({
    page,
  }) => {
    await page.goto('/life-admin/aadhaar-pan-masker');
    await waitForHydration(page);
    const input = page.getByLabel('Open a text file');
    await input.setInputFiles({
      name: 'people.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(`name,id\nAsha,"${group(VALID, ' ')}"\n`),
    });
    await expect(page.getByLabel('Text to mask')).toHaveValue(
      `name,id\nAsha,"${group(VALID, ' ')}"\n`,
    );
    await page.getByRole('button', { name: 'Mask numbers' }).click();
    expect(await savedText(page, 'people-masked.csv')).toBe(
      `name,id\nAsha,"XXXX XXXX ${VALID.slice(8)}"\n`,
    );

    await input.setInputFiles({
      name: 'scan.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.7\n'),
    });
    await expect(page.locator('#tool').getByRole('alert')).toContainText(
      'It does not read images, scans or PDFs',
    );
    await expect(page.locator('#masked-output')).toHaveCount(0);
  });
});

test.describe('the masker and the single-number tools share one engine', () => {
  test('the Aadhaar masking tool hides exactly what the masker hides', async ({
    page,
  }) => {
    // The claim the page makes in its own copy. If these two ever disagree,
    // one of them is showing a number the other hides.
    const typed = `${VALID.slice(0, 4)}-${VALID.slice(4, 8)}-${VALID.slice(8)}`;
    const expected = `XXXX-XXXX-${VALID.slice(8)}`;

    await page.goto('/life-admin/aadhaar-masking-tool');
    const field = page.getByLabel('12-digit Aadhaar number');
    // Same prerender race as above, with this page's own controls.
    await expect(async () => {
      await field.fill('');
      await field.fill(typed);
      await expect(page.getByText(expected, { exact: true })).toBeVisible({
        timeout: 500,
      });
    }).toPass({ timeout: 30_000 });

    await page.goto('/life-admin/aadhaar-pan-masker');
    await mask(page, typed);
    await expect(page.locator('#masked-output')).toHaveValue(expected);
  });

  test('is reachable by browsing, not only by searching', async ({ page }) => {
    // Owner rule, 2026-09-20: listing a tool in the catalogue is not enough —
    // someone browsing the categories has to be able to find it.
    await page.goto('/?category=life-admin');
    const link = page
      .locator('a[href="/life-admin/aadhaar-pan-masker"]')
      .first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(
      page.getByRole('heading', { name: 'Mask Aadhaar and PAN numbers' }),
    ).toBeVisible();
  });
});
