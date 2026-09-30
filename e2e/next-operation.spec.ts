import { expect, test, type Page } from '@playwright/test';
import { testPdf } from './fixtures';

/**
 * Depth: post-result next operation chain (Brief 11, Task A).
 *
 * Verifies:
 * 1. Output file carried via existing `file-handoff.ts` so the target tool loads with the file ready (zero re-picks).
 * 2. Next operations rendered strictly above the support ask; support ask rendered exactly once.
 * 3. WebKit fallback honesty: when `handoff=oversized`, the target tool explains the file must be selected again.
 */

async function choosePdf(page: Page, buffer: Buffer, name = 'source.pdf') {
  await expect(async () => {
    const chooser = page.waitForEvent('filechooser', { timeout: 2_000 });
    await page
      .getByRole('button', { name: /choose a pdf/iu })
      .first()
      .click();
    await (
      await chooser
    ).setFiles({
      name,
      mimeType: 'application/pdf',
      buffer,
    });
  }).toPass({ timeout: 45_000 });
}

test.describe('Post-result next operation chain', () => {
  test('offers matching next operations, carries the output file, and places next ops above support ask', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    // 1. Start at /pdf/compress
    await page.goto('/pdf/compress');
    await choosePdf(page, await testPdf(2), 'contract.pdf');

    // 2. Compress the PDF
    const compress = page.getByRole('button', { name: 'Compress PDF' });
    await expect(compress).toBeEnabled({ timeout: 30_000 });
    await compress.click();

    const receipt = page.getByRole('heading', {
      name: /^Done — (\d+% smaller|this PDF was already as small as we can make it)$/u,
    });
    await expect(receipt).toBeVisible({ timeout: 60_000 });

    // 3. Click save to trigger the non-modal completion card
    const saveButton = page.getByRole('button', { name: 'Save compressed PDF' });
    await saveButton.scrollIntoViewIfNeeded();

    const downloadEvent = page.waitForEvent('download');
    await saveButton.click();
    await downloadEvent;

    // 4. Assert completion card appears
    const card = page.locator('dialog[aria-labelledby="completion-title"]');
    await expect(card).toBeVisible({ timeout: 10_000 });

    // 5. Assert next operations container is present and rendered strictly ABOVE the support ask
    const nextOpsContainer = card.locator('[data-testid="next-operations"]');
    await expect(nextOpsContainer).toBeVisible();

    const supportAsk = card.getByText(/Built by an independent developer/u);
    await expect(supportAsk).toBeVisible();
    await expect(supportAsk).toHaveCount(1);

    const nextOpsBox = await nextOpsContainer.boundingBox();
    const supportAskBox = await supportAsk.boundingBox();
    expect(nextOpsBox).not.toBeNull();
    expect(supportAskBox).not.toBeNull();
    expect(nextOpsBox!.y).toBeLessThan(supportAskBox!.y);

    // 6. Up to 3 next operations offered, each accepting the output type
    const opButtons = nextOpsContainer.locator('button');
    const opCount = await opButtons.count();
    expect(opCount).toBeGreaterThan(0);
    expect(opCount).toBeLessThanOrEqual(3);

    // 7. Click the first next operation (e.g. Rotate PDF)
    const firstOp = opButtons.first();
    await firstOp.click();

    // 8. Assert navigation lands on the target tool with the file already loaded (zero re-picks)
    await expect(page).toHaveURL(/\/pdf\/page-tools\?tool=rotate-pdf/);
    await expect(page.getByText('original remains unchanged')).toBeVisible({
      timeout: 30_000,
    });
  });

  test('displays honest one-line explanation when handoff is oversized', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto('/pdf/page-tools?tool=rotate-pdf&handoff=oversized');

    const notice = page.getByTestId('oversized-notice');
    await expect(notice).toBeVisible();
    await expect(
      notice.getByText(
        'This file is too large to carry over automatically in Safari. Please select the file again to continue.',
      ),
    ).toBeVisible();
  });
});
