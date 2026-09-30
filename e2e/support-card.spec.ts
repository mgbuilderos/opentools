import { expect, test, type Page } from '@playwright/test';

import { typeAndRun } from './hydration';

/**
 * Browser coverage for the relief-moment support card
 * (`components/completion-value-dialog.tsx`).
 *
 * ## Why this file exists
 *
 * The card is the one place this product asks for money, and until now not a
 * single assertion in `e2e/` touched it. Its whole behaviour — that it appears
 * after a save, that it can be dismissed, that it stays quiet for seven days
 * afterwards, and that "never" means never — lived only in the component and in
 * `lib/support-preference.ts`, and the unit tests cover the *predicate*
 * (`mayOfferSupport`) rather than the surface that calls it. A predicate that
 * returns the right boolean while the dialog forgets to ask it is exactly the
 * failure no unit test here can see.
 *
 * That gap is also why the suppression added by PR #88 (`e2e/support-card.ts`,
 * `keepTheSupportCardShut`) costs no coverage: there was none to lose. This
 * file is the coverage, so the suppression stays a test-isolation device rather
 * than a way of never looking at the card again.
 *
 * ## Why `/data/csv-to-json`
 *
 * It is the cheapest page that produces a real receipt: text in, text out, no
 * file picker, no wasm, no model. `announceCompletion` is called with metrics,
 * which the dialog requires (`result?.metrics?.length`), and the page carries
 * exactly one `[data-receipt-download]` control.
 *
 * ## What this file deliberately does not cover
 *
 * Whether the card *covers* the control it was opened by. That is a separate
 * defect — it cost CI run 36568633398 a full 180 s WebKit timeout on
 * `e2e/pdf-sign.spec.ts`, and it reproduces on this very page: measured on the
 * pre-fix build, at 1280x720 the card is 384x523 at (880,181) while the only
 * download control is 36x36 at (1124,342), so the control's centre hit-tests to
 * a paragraph inside the card; at 375x812 the card is 343x535 and covers it
 * again. The geometry fix and its guard live together in
 * `lib/completion-card-placement.ts` and `e2e/completion-card.spec.ts`. Keeping
 * the invariant in one place means one failure message when it breaks, rather
 * than two specs disagreeing about which of them owns it.
 *
 * ## Why the fixed waits
 *
 * Normally a sleep in a browser test is a smell. Here the thing under test *is*
 * a timer: the dialog opens 400 ms after the click, on purpose, so that the
 * download is visibly under way before anything is asked of the person. The
 * only way to assert that the card stayed shut is to wait past the delay that
 * would have opened it. `SETTLE_MS` is that wait, and it is deliberately several
 * times the delay so a loaded runner cannot turn "quiet" into a false pass.
 */

const TOOL = '/data/csv-to-json';

/** Mirrors `SUPPORT_PREFERENCE_KEY` in `lib/support-preference.ts`. */
const PREFERENCE_KEY = 'tools-support-preference-v1';
/** Mirrors `SUPPORT_COOLDOWN_MS` in `lib/support-preference.ts`. */
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

const CARD = 'dialog[aria-labelledby="completion-title"]';

/**
 * Comfortably past the dialog's own 400 ms delay, and past the milestone card's
 * 1200 ms settle as well, so "nothing appeared" means nothing was going to.
 */
const SETTLE_MS = 2000;

const CSV = 'name,role\nAda,Engineer\nGrace,Admiral';

/**
 * Seed the stored preference before the page's own scripts run.
 *
 * `addInitScript` rather than `evaluate` because the dialog reads this key
 * inside a click handler that is registered on mount — writing it after the
 * page has loaded would be a race against the very code under test.
 */
async function seedPreference(page: Page, value: string | null) {
  await page.addInitScript(
    ([key, stored]) => {
      try {
        if (stored === null) localStorage.removeItem(key);
        else localStorage.setItem(key, stored);
      } catch {
        /* A browser with storage blocked still runs the page. */
      }
    },
    [PREFERENCE_KEY, value] as const,
  );
}

function preferenceOffered(msAgo: number, never = false) {
  return JSON.stringify({ lastOffered: Date.now() - msAgo, never });
}

/** Convert the sample CSV and click Save, which is what arms the card. */
async function convertAndSave(page: Page) {
  await page.goto(TOOL);
  await typeAndRun(
    page.getByPlaceholder('name,role'),
    page.getByRole('button', { name: 'Convert to JSON' }),
    CSV,
  );
  const save = page.getByRole('button', { name: 'Download result' });
  await expect(save).toBeVisible();
  const download = page.waitForEvent('download');
  await save.click();
  await download;
  return save;
}

test.describe('the relief-moment support card', () => {
  test('appears after a save, and says what just ran', async ({ page }) => {
    await seedPreference(page, null);
    await convertAndSave(page);

    const card = page.locator(CARD);
    await expect(card).toBeVisible();
    await expect(card.getByText('Instant Private Result')).toBeVisible();
    // The receipt's own facts, not boilerplate: the dialog refuses to open
    // without metrics, and these are the ones CSV to JSON announces.
    await expect(card.getByText('Processing time')).toBeVisible();
    await expect(card.getByText('This browser')).toBeVisible();
  });

  test('is dismissed by its close button, and that starts the cooldown', async ({
    page,
  }) => {
    await seedPreference(page, null);
    await convertAndSave(page);

    const card = page.locator(CARD);
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: 'Dismiss support prompt' }).click();
    await expect(card).toBeHidden();

    /*
      The cooldown is not a separate mechanism that runs later — it is this
      write. If the dialog closed without recording it, the card would return on
      the next save, and every other assertion in this file about seven days
      would be testing a rule nothing had switched on.
    */
    const stored = await page.evaluate(
      (key) => localStorage.getItem(key),
      PREFERENCE_KEY,
    );
    expect(stored).not.toBeNull();
    const preference = JSON.parse(stored ?? '{}') as {
      lastOffered?: number;
      never?: boolean;
    };
    expect(typeof preference.lastOffered).toBe('number');
    expect(preference.never).toBe(false);
  });

  test('is dismissed by Escape', async ({ page }) => {
    await seedPreference(page, null);
    await convertAndSave(page);

    const card = page.locator(CARD);
    await expect(card).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(card).toBeHidden();
  });

  test('is dismissed by "Not now"', async ({ page }) => {
    await seedPreference(page, null);
    await convertAndSave(page);

    const card = page.locator(CARD);
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: 'Not now' }).click();
    await expect(card).toBeHidden();
  });

  test('stays shut inside the seven-day cooldown', async ({ page }) => {
    // Asked six days ago: one day short.
    await seedPreference(page, preferenceOffered(6 * 24 * 60 * 60 * 1000));
    await convertAndSave(page);

    await page.waitForTimeout(SETTLE_MS);
    await expect(page.locator(CARD)).toHaveCount(0);
  });

  test('offers again once the seven days have passed', async ({ page }) => {
    // An hour past the boundary, so a slow runner cannot land back inside it.
    await seedPreference(page, preferenceOffered(COOLDOWN_MS + 60 * 60 * 1000));
    await convertAndSave(page);

    await expect(page.locator(CARD)).toBeVisible();
  });

  test('stays shut for ever once someone has said never', async ({ page }) => {
    /*
      `never` is written by the milestone card's "Don't ask again", not by this
      dialog — but it is this dialog the instruction is mostly aimed at, and
      `mayOfferSupport` is the one place both surfaces agree to honour it. A
      `lastOffered` far in the past proves the flag is what kept it shut, and
      not the cooldown.
    */
    await seedPreference(page, preferenceOffered(365 * 24 * 60 * 60 * 1000, true));
    await convertAndSave(page);

    await page.waitForTimeout(SETTLE_MS);
    await expect(page.locator(CARD)).toHaveCount(0);
  });

  test('asks at most once per page load', async ({ page }) => {
    await seedPreference(page, null);
    const save = await convertAndSave(page);

    const card = page.locator(CARD);
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: 'Not now' }).click();
    await expect(card).toBeHidden();

    // A second save on the same page must not bring it back: `offeredThisPage`
    // is the in-memory cap that still holds when storage is blocked.
    const second = page.waitForEvent('download');
    await save.click();
    await second;
    await page.waitForTimeout(SETTLE_MS);
    await expect(card).toHaveCount(0);
  });

});
