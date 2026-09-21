import { expect, test } from '@playwright/test';

import { createAuditFixtureWorkbook } from '../lib/tools/audit/workbook/fixture';
import { setFilesWhenLive } from './upload';

/**
 * Browser coverage for `/data/workbook-audit`.
 *
 * `lib/tools/audit/workbook/audit.test.ts` already proves the engine finds
 * each defect class. This proves the *page*: that a real file reaches the
 * engine and the findings reach the screen. That is the half a unit test
 * cannot see, and the tool shipped without it the day after the browser gate
 * was added for exactly that reason.
 *
 * The workbook comes from the same committed fixture generator the unit suite
 * audits, so the bytes under test are the bytes already reasoned about, and no
 * binary has to be carried into `e2e/`.
 */

const TOOL = '/data/workbook-audit';

async function fixtureBuffer(): Promise<Buffer> {
  const bytes = await createAuditFixtureWorkbook();
  return Buffer.from(bytes);
}

test.describe('Excel workbook audit (/data/workbook-audit)', () => {
  test('audits a real workbook and locates its findings by cell', async ({
    page,
  }) => {
    test.slow();
    await page.goto(TOOL);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      /Excel Workbook Audit/,
    );

    await setFilesWhenLive(
      page.locator('input[type="file"]').first(),
      {
        name: 'audit-fixture.xlsx',
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: await fixtureBuffer(),
      },
      page.getByText(/Total findings/i),
    );

    // Counted and shown, not merely computed.
    const total = page.getByText(/Total findings/i).first();
    await expect(total).toBeVisible({ timeout: 45_000 });

    // A finding without a location cannot be acted on, so the sheet-and-cell
    // chip has to render — addressed by its own hook, not by a text pattern.
    //
    // An earlier version of this matched `/\w+!([A-Z]{1,3}\d+)/` anywhere on
    // the page and was hollow: blanking the location entirely left it green,
    // because the finding's own message also quotes the cell. Asserting on
    // the element is what makes the claim real.
    const location = page.getByTestId('finding-location').first();
    await expect(location).toBeVisible({ timeout: 15_000 });
    // A location is a sheet and then one of: a cell (`B4`), a row (`7`), a
    // range (`A1:D9`), or `Sheet-level` for a finding about the sheet itself.
    // Measured, not assumed — the fixture's first finding reads `AuditTest!7`.
    await expect(location).toHaveText(
      /^[\w ]+!(?:[A-Z]{1,3}\d{1,5}(?::[A-Z]{1,3}\d{1,5})?|\d{1,7}|Sheet-level)$/u,
    );

    // The rule the engine enforces per finding holds for the rendered page
    // too: Benford flags a column worth a look, and is never called fraud.
    const body = (await page.locator('body').innerText()).toLowerCase();
    expect(body, 'the page must never use the word fraud').not.toContain(
      'fraud',
    );
  });

  test('offers the audit report as a real download', async ({ page }) => {
    test.slow();
    await page.goto(TOOL);
    await setFilesWhenLive(
      page.locator('input[type="file"]').first(),
      {
        name: 'audit-fixture.xlsx',
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: await fixtureBuffer(),
      },
      page.getByText(/Total findings/i),
    );

    const trigger = page.locator('[data-receipt-download]').first();
    await expect(trigger).toBeVisible({ timeout: 45_000 });

    const download = page.waitForEvent('download', { timeout: 45_000 });
    await trigger.click();
    const file = await download;
    // An auditor hands the report to someone else, so it has to be a file
    // with a name, not a panel on a screen.
    expect(file.suggestedFilename()).toMatch(/\.(xlsx|csv)$/u);
  });

  test('refuses a file that is not a workbook, by name', async ({ page }) => {
    test.slow();
    await page.goto(TOOL);
    await setFilesWhenLive(
      page.locator('input[type="file"]').first(),
      {
        name: 'not-a-workbook.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('this is plainly not a spreadsheet'),
      },
      page.getByText(/not-a-workbook\.txt|\.xlsx|could not|unsupported/iu),
    );

    // G7: say which file and why. Never an empty result that reads as a
    // working tool finding nothing wrong.
    await expect(
      page
        .getByText(/not-a-workbook\.txt|\.xlsx|could not|unsupported/iu)
        .first(),
    ).toBeVisible({ timeout: 45_000 });
  });
});
