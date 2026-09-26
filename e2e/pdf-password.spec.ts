import { readFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { LIVE_TOOL_ROUTES } from '../lib/seo/live-tools';

/**
 * `/pdf/password` is the only tool a person hands a secret to.
 *
 * Every other route takes a file. This one takes a file *and* the password
 * that opens it, which is why the page promises the password never reaches
 * "telemetry, an error string, the DOM after use, or a console log". A promise
 * in that shape is exactly what `AGENTS.md` forbids making without a test
 * behind the exact wording, so here is the test.
 *
 * It caught one: a controlled input serialises its value, so the password was
 * still in the DOM after a successful unlock. Measured in Chromium on
 * 2026-09-26. The field is now cleared on success.
 *
 * The fixture is one of `lib/formats/pdfcrypt/__fixtures__`, made with
 * PyMuPDF/MuPDF rather than by the code under test, so a bug in our own
 * encryptor cannot make this pass.
 */
const ROUTE = '/pdf/password';
const PASSWORD = 'secret';
const FIXTURE = path.join(
  'lib',
  'formats',
  'pdfcrypt',
  '__fixtures__',
  'aes256UserPassword.pdf',
);

test.describe('pdf password tool', () => {
  test.skip(!LIVE_TOOL_ROUTES.includes(ROUTE), `${ROUTE} is not registered`);

  test('unlocks a real AES-256 PDF and keeps the password off the wire and out of the DOM', async ({
    page,
  }) => {
    const requested: string[] = [];
    const logged: string[] = [];
    page.on('request', (request) => requested.push(request.url()));
    page.on('console', (message) => logged.push(message.text()));

    await page.goto(ROUTE);
    await page.waitForLoadState('networkidle');

    await page.evaluate(async (data) => {
      const binary = atob(data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const file = new File([bytes], 'locked.pdf', { type: 'application/pdf' });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      const input = document.querySelector<HTMLInputElement>(
        'input[type=file]',
      );
      if (!input) throw new Error('no file input on the password tool');
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, readFileSync(FIXTURE, 'base64'));

    // The tool reads the encryption dictionary before asking for anything.
    await expect(page.getByText(/AES-256/i).first()).toBeVisible({
      timeout: 15_000,
    });

    await page.locator('input[type=password]').first().fill(PASSWORD);
    await page.getByRole('button', { name: 'Unlock PDF', exact: true }).click();

    /*
     * Guards the guard. Everything below passes against a page that quietly
     * did nothing, so the success state has to be on screen first.
     */
    await expect(page.getByText(/Successfully Unlocked/i)).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator('a[download]').first()).toBeVisible();

    expect(
      await page.content(),
      'the password is still in the DOM after use, which the page says it is not',
    ).not.toContain(PASSWORD);
    expect(
      requested.filter((url) => url.includes(PASSWORD)),
      'the password reached a URL',
    ).toEqual([]);
    expect(
      logged.filter((line) => line.includes(PASSWORD)),
      'the password reached the console',
    ).toEqual([]);
    expect(
      requested.filter(
        (url) =>
          !url.includes('localhost') &&
          !url.startsWith('data:') &&
          !url.startsWith('blob:'),
      ),
      'the page talked to somewhere off-origin',
    ).toEqual([]);
  });
});
