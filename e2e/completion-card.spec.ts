/**
 * The support card must never take the download control away from the visitor.
 *
 * WHY THIS EXISTS. `components/completion-value-dialog.tsx` opens a non-modal
 * `<dialog>` 400 ms after a click on a `[data-receipt-download]`, and nothing
 * takes it down again but the X, "Not now" or Escape. Fixed at `bottom-4
 * right-4` it landed on top of the control that opened it. Measured on the
 * built app at `/pdf/sign` before the fix: desktop 1280x720, card 384 x 548 at
 * (880,156)-(1264,704), "Save completed PDF" at (1029.6,455.7)-(1156,499.7) —
 * entirely inside it, `elementFromPoint` at the control's own centre returning
 * the card, and a second save impossible. At 390x844 the card spans 92% of the
 * width and does the same. That is a visitor who cannot save twice, not a test
 * artifact, and it took down the WebKit run of `e2e/pdf-sign.spec.ts` in CI run
 * 36568633398.
 *
 * WHAT THIS HOLDS. That the card still appears — suppressing it would pass a
 * test that proves nothing — and that with it open every download control is
 * still hit-testable and a second save really downloads. `lib/completion-card-
 * placement.test.ts` holds the geometry at viewports a browser run cannot
 * afford; this holds the real thing in both engines.
 *
 * It waits for the card rather than racing its 400 ms timer, so it does not
 * depend on how loaded the machine is.
 */
import { expect, test, type Page } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

const CARD = 'dialog[aria-labelledby="completion-title"]';

async function signablePdf() {
  const doc = await PDFDocument.create();
  doc.addPage([595, 842]);
  return Buffer.from(await doc.save());
}

async function readyToSave(page: Page) {
  await page.goto('/pdf/sign');
  await expect(async () => {
    const chooser = page.waitForEvent('filechooser', { timeout: 2_000 });
    await page
      .getByRole('button', { name: /choose a pdf/iu })
      .first()
      .click();
    await (await chooser).setFiles({
      name: 'card.pdf',
      mimeType: 'application/pdf',
      buffer: await signablePdf(),
    });
  }).toPass({ timeout: 45_000 });
  await expect(
    page.getByRole('heading', { name: 'card.pdf', exact: true }),
  ).toBeVisible({ timeout: 60_000 });

  await page.getByRole('radio', { name: 'Type your name' }).check();
  await page.getByRole('textbox', { name: 'Type your name' }).fill('Signer');
  await expect(page.getByText('Signature ready')).toBeVisible();
  await page.getByRole('button', { name: 'Finish PDF' }).click();
  await expect(
    page.getByRole('heading', { name: /^Done — \d+ pages? ready$/u }),
  ).toBeVisible({ timeout: 60_000 });
}

/**
 * For every enabled download control: does a click at its own centre reach it?
 * This is the same question Playwright's actionability check asks, asked of
 * every control rather than only the one a test happens to want next.
 */
async function coveredControls(page: Page) {
  return page.evaluate((cardSelector) => {
    const card = document.querySelector<HTMLDialogElement>(cardSelector);
    const controls = Array.from(
      document.querySelectorAll<HTMLElement>('[data-receipt-download]'),
    ).filter((control) => {
      const rect = control.getBoundingClientRect();
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        !control.matches(':disabled, [aria-disabled="true"]')
      );
    });
    return controls
      .map((control) => {
        const rect = control.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        if (y < 0 || y > innerHeight || x < 0 || x > innerWidth) return null;
        const hit = document.elementFromPoint(x, y);
        if (hit && control.contains(hit)) return null;
        return {
          label: (
            control.getAttribute('aria-label') ||
            control.textContent ||
            '?'
          )
            .trim()
            .slice(0, 40),
          coveredBy: card && hit && card.contains(hit) ? 'the support card' : 'something else',
        };
      })
      .filter((entry) => entry !== null);
  }, CARD);
}

for (const [label, viewport] of [
  ['desktop', { width: 1280, height: 720 }],
  ['phone', { width: 390, height: 844 }],
] as const) {
  test(`the support card leaves the download control clickable — ${label}`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(viewport);
    await readyToSave(page);

    const save = page.getByRole('button', { name: 'Save completed PDF' });
    await save.scrollIntoViewIfNeeded();

    const first = page.waitForEvent('download');
    await save.click();
    await first;

    // The card must actually be here. A run where it never opened would pass
    // every assertion below while proving nothing.
    const card = page.locator(CARD);
    await expect(card).toBeVisible({ timeout: 10_000 });

    // The card really was in the way here, so this route is a live test of the
    // rule and not one that passes because nothing overlapped. If this ever
    // fails, the layout moved and the premise needs re-measuring, not deleting.
    await expect(card).toHaveAttribute('data-lifted', 'true');
    expect(await coveredControls(page)).toEqual([]);

    // And the visitor's actual next action works, with the card still open.
    const second = page.waitForEvent('download', { timeout: 15_000 });
    await save.click({ timeout: 15_000 });
    expect((await second).suggestedFilename()).toBe('completed.pdf');
    await expect(card).toBeVisible();
  });
}

/**
 * A second route, deliberately unlike the first: one small icon-sized download
 * control, no file upload, no worker. It runs in a second or two, so the rule
 * is held on more than the one tool that happened to fail in CI. On a 1280
 * viewport the card's column (x 880-1264) overlaps the right edge of the
 * centred content column, which is where result panels put their controls —
 * so this is the common shape, not an outlier.
 */
for (const [label, viewport] of [
  ['desktop', { width: 1280, height: 720 }],
  ['phone', { width: 390, height: 844 }],
] as const) {
  test(`a single icon download control stays clickable — ${label}`, async ({
    page,
  }) => {
    // The default 30 s is not enough for this app under a loaded suite: the
    // retry below was still waiting for hydration when the budget ran out,
    // twice in three runs. This is the same allowance the rest of the file
    // makes, and it is not standing in for the card race — that is fixed in
    // the product, and nothing here waits on the 400 ms timer.
    test.setTimeout(120_000);
    await page.setViewportSize(viewport);
    await page.goto('/data/csv-to-json');
    /*
      A fill that lands before React has hydrated sets the textarea and not the
      state behind it: measured in WebKit, the DOM value held the CSV while the
      page's own counter still read "0 characters" and "Convert to JSON" stayed
      disabled. The page is served by the service worker, so it is interactive
      long before it is hydrated, and this lost roughly one run in four.

      Re-filling the same string does not recover it — with the value already
      in place there is no transition for React to hear. Clearing first and
      re-entering it does, every time it was tried. So each attempt makes a
      real change rather than repeating one that has already been swallowed.
    */
    const input = page.locator('textarea').first();
    const convert = page.getByRole('button', { name: 'Convert to JSON' });
    await expect(async () => {
      await input.fill('');
      await input.fill('name,city\nAsha,Mumbai\nRavi,Pune\n');
      await expect(convert).toBeEnabled({ timeout: 1_000 });
    }).toPass({ timeout: 30_000 });
    await convert.click();

    const save = page.getByRole('button', { name: 'Download result' });
    await expect(save).toBeVisible({ timeout: 30_000 });
    await save.scrollIntoViewIfNeeded();

    const first = page.waitForEvent('download');
    await save.click();
    await first;

    const card = page.locator(CARD);
    await expect(card).toBeVisible({ timeout: 10_000 });
    await expect(card).toHaveAttribute('data-lifted', 'true');
    expect(await coveredControls(page)).toEqual([]);

    const second = page.waitForEvent('download', { timeout: 15_000 });
    await save.click({ timeout: 15_000 });
    await second;
    await expect(card).toBeVisible();
  });
}

test('the card is dismissible and gives focus back to the control', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await readyToSave(page);

  const save = page.getByRole('button', { name: 'Save completed PDF' });
  const download = page.waitForEvent('download');
  await save.click();
  await download;

  const card = page.locator(CARD);
  await expect(card).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Dismiss support prompt' }).click();
  await expect(card).toBeHidden();
});
