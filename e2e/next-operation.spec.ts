import { expect, test, type Page } from '@playwright/test';

import { testPdf } from './fixtures';

/**
 * A finished job used to end in a download and a dead end.
 *
 * The measurement behind this: on 24 September 939 people arrived and one of
 * them opened a second content page (`docs/traffic-log.csv`). The receipt is the
 * one moment the produced file is still in hand, so it is where the next
 * operation belongs — and the promise it makes is specific enough to be tested,
 * that the file does not have to be chosen again.
 *
 * This asserts the whole path in a real browser: compress a PDF, save it, and
 * press what the receipt offers. Anything short of a populated file input on the
 * next page is the bug this feature exists to remove.
 */

const CARD = 'dialog[aria-labelledby="completion-title"]';
const SECTION = 'Next, without choosing the file again';

async function choosePdf(page: Page, buffer: Buffer, name = 'source.pdf') {
  await expect(async () => {
    const chooser = page.waitForEvent('filechooser', { timeout: 2_000 });
    await page
      .getByRole('button', { name: /choose a pdf/iu })
      .first()
      .click();
    await (await chooser).setFiles({ name, mimeType: 'application/pdf', buffer });
  }).toPass({ timeout: 45_000 });
}

/**
 * Compress, save, and hand back the open receipt.
 *
 * The card opens 400 ms after a click on the download control, not when the job
 * finishes — see `components/completion-value-dialog.tsx`. So the download is
 * part of the setup rather than an extra step, and the card is waited for rather
 * than timed, so the test does not depend on how loaded the machine is.
 */
async function receiptAfterCompressing(page: Page) {
  await page.goto('/pdf/compress');
  await choosePdf(page, await testPdf(3));

  const compress = page.getByRole('button', { name: 'Compress PDF' });
  await expect(compress).toBeEnabled({ timeout: 60_000 });
  await compress.click();
  await expect(
    page.getByRole('heading', { name: /^Done — \d+% smaller$/u }),
  ).toBeVisible({ timeout: 120_000 });

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save compressed PDF' }).click();
  await download;

  const card = page.locator(CARD);
  // The card must really be here. A run where it never opened would satisfy
  // every "is not offered" assertion below while proving nothing at all.
  await expect(card).toBeVisible({ timeout: 15_000 });
  return card;
}

/**
 * Take both handoff stores away, standing in for a browser that has: a private
 * window, blocked site data, or WebKit on this origin. Only the handoff's own
 * keys are refused, so everything else on the page behaves normally and the
 * failure under test is the one being measured.
 */
async function refuseStorage(page: Page) {
  await page.addInitScript(() => {
    delete (window as { indexedDB?: IDBFactory }).indexedDB;
    // Deliberately unbound: it is re-entered below with the storage object as
    // its own receiver, which is the only way to keep every other key working.
    // oxlint-disable-next-line typescript/unbound-method
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key.startsWith('opentools-handoff')) throw new Error('blocked');
      return setItem.call(this, key, value);
    };
  });
}

async function anyInputHasAFile(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLInputElement>('input[type="file"]')].some(
      (input) => (input.files?.length ?? 0) > 0,
    ),
  );
}

test.describe('what to do next with the file that was just made', () => {
  test('carries the compressed PDF into the tool the receipt offered', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const card = await receiptAfterCompressing(page);

    await expect(card.getByText(SECTION)).toBeVisible();

    const next = card.getByRole('button', { name: 'Rotate PDF', exact: true });
    await expect(next).toBeVisible();
    await next.click();

    await page.waitForURL(/\/pdf\/page-tools/u);

    // The whole promise, in one assertion: no second trip to the file picker.
    await expect
      .poll(() => anyInputHasAFile(page), { timeout: 20_000 })
      .toBe(true);
    await expect(page.getByText('compressed.pdf').first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test('never offers back the tool that just ran', async ({ page }) => {
    test.setTimeout(240_000);
    const card = await receiptAfterCompressing(page);

    await expect(card.getByText(SECTION)).toBeVisible();
    // `/pdf/compress` is not among the PDF actions today, so the real risk is a
    // label that walks the person back to where they are. Checked by label
    // because the controls are buttons and carry no href to inspect.
    await expect(
      card.getByRole('button', { name: /compress/iu }),
    ).toHaveCount(0);
  });

  test('sends nothing off this origin while handing the file over', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const card = await receiptAfterCompressing(page);
    const origin = new URL(page.url()).origin;
    const offOrigin: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).origin !== origin) offOrigin.push(request.url());
    });

    await card.getByRole('button', { name: 'Rotate PDF', exact: true }).click();
    await page.waitForURL(/\/pdf\/page-tools/u);
    await expect
      .poll(() => anyInputHasAFile(page), { timeout: 20_000 })
      .toBe(true);
    expect(offOrigin).toEqual([]);
  });

  /**
   * The branch neither engine reaches on its own, and the one mobile Safari
   * reaches in the field.
   *
   * `lib/file-handoff.ts` records that WebKit will not open IndexedDB on this
   * site and that its `sessionStorage` fallback is capped, so a large output
   * there cannot travel; a private window can refuse both at any size. Both
   * stores are refused here rather than fixturing a file over the cap, because
   * the marker is deliberately NOT keyed on size — the visitor's experience is
   * the same whatever the reason, and a storage refusal on a small file is
   * precisely the case a size test would let arrive silent.
   *
   * The person is told at the page they land on, not on the card they are
   * leaving. That half of the design is taken from `9c348c0`.
   */
  test('opens the tool and says so there when the file could not be carried', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await refuseStorage(page);

    const card = await receiptAfterCompressing(page);
    await card.getByRole('button', { name: 'Rotate PDF', exact: true }).click();

    await page.waitForURL(/\/pdf\/page-tools/u, { timeout: 20_000 });
    expect(new URL(page.url()).searchParams.get('handoff')).toBe('not-carried');
    // The tool it was going to, not a consolation page — and the `tool` the
    // receipt offered survived the extra parameter.
    expect(new URL(page.url()).searchParams.get('tool')).toBe('rotate-pdf');

    const notice = page.getByTestId('handoff-not-carried');
    await expect(notice).toBeVisible({ timeout: 15_000 });
    // No cause is claimed. The refusal here is storage being taken away, not
    // size and not Safari, and the copy must not say otherwise.
    await expect(notice).not.toContainText(/safari|too large|size/iu);

    // And no file arrived, which is the state the notice is describing.
    expect(await anyInputHasAFile(page)).toBe(false);
  });

  /**
   * The notice is a fixed panel, and this repo already has a spec because a
   * fixed panel landed on top of a download control once. Held at the width it
   * happened at.
   */
  test('the notice leaves the tool usable at phone width', async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await refuseStorage(page);

    const card = await receiptAfterCompressing(page);
    await card.getByRole('button', { name: 'Rotate PDF', exact: true }).click();
    await page.waitForURL(/\/pdf\/page-tools/u, { timeout: 20_000 });
    await expect(page.getByTestId('handoff-not-carried')).toBeVisible({
      timeout: 15_000,
    });

    // The control the notice tells them to use has to be reachable, which is
    // the same question Playwright's actionability check asks.
    const chooser = page.getByRole('button', { name: /choose a pdf/iu }).first();
    await expect(chooser).toBeVisible();
    await expect(chooser).toBeEnabled();
    const covered = await page.evaluate(() => {
      const control = document.querySelector<HTMLElement>(
        'input[type="file"]',
      )?.closest('label, div, form') as HTMLElement | null;
      const panel = document.querySelector('[data-testid="handoff-not-carried"]');
      if (!control || !panel) return false;
      const box = control.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return false;
      const hit = document.elementFromPoint(
        box.left + box.width / 2,
        box.top + box.height / 2,
      );
      return Boolean(hit && panel.contains(hit));
    });
    expect(covered).toBe(false);
  });

  /**
   * The receipt is rendered on every tool page by `app-shell.tsx`, and only two
   * of the 66 callers of `announceCompletion` pass an output today. A tool that
   * passes none must look exactly as it did before — an empty section, or worse
   * a button that hands nothing to a tool, would be a promise broken at the one
   * moment this product has the person's trust.
   */
  test('shows no next-operation section for a tool that produces no file', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.goto('/text/case-converter');
    const card = page.locator(CARD);
    await expect(card.getByText(SECTION)).toHaveCount(0);
  });
});
