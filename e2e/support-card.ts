import type { Page } from '@playwright/test';

import {
  SUPPORT_PREFERENCE_KEY,
  supportPreference,
} from '../lib/support-preference';

/**
 * Keeps the relief-moment support card out of a spec that downloads twice.
 *
 * WHY, MEASURED. `components/completion-value-dialog.tsx` opens a `<dialog>`
 * 400 ms after any click on a `[data-receipt-download]` element, fixed at
 * `bottom-4 right-4` with `z-[80]` — which is over the save control that
 * triggered it. A test that downloads once never notices. A test that downloads
 * twice on the same page has its second click land underneath the card, and
 * Playwright then retries that click until the test times out.
 *
 * On 2026-09-29 this took down the WebKit run of
 * `e2e/pdf-sign.spec.ts` › "lands the stamp upright…" (CI run 36568633398):
 * the button was reported "visible, enabled and stable", then
 * `<dialog open …> subtree intercepts pointer events` on every retry for the
 * full 180 s. Reproduced locally by making the second save wait 700 ms — it
 * fails with exactly that error without this helper and passes with it.
 *
 * IT IS A RACE, so it does not appear on a fast machine — that test passes
 * alone in 3.6 s, and its whole file serially in 21.4 s — and it moves whenever
 * the suite's timing changes. Waiting the card out, or raising a timeout, would
 * leave the result to whichever happened to be quicker. This removes the card
 * from the run instead, by writing the same preference key the dialog's own gate
 * reads (`mayOfferSupport`): a `lastOffered` of now means "offered recently", so
 * the card stays shut for the seven-day cooldown. Deterministic, and free.
 *
 * The key and the stored shape are imported rather than written out, so this
 * cannot go on "suppressing" a key the product has renamed — the import breaks
 * instead of the card quietly coming back and taking a WebKit run with it.
 *
 * WHAT THIS IS NOT. It is not a fix for the card covering the control that
 * opened it. That is a real defect and not a test artifact: a visitor who wants
 * a second download cannot reach it until they dismiss the card, and
 * `/pdf/sign`, `/pdf/to-excel` and the video tools all offer two. It is filed
 * separately. Nor does suppressing it here lose coverage — no spec in `e2e/`
 * asserts the card at all, which is its own gap.
 */
export async function keepTheSupportCardShut(page: Page) {
  await page.addInitScript(
    ([key, value]) => {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* Storage is optional; without it the card is merely possible again. */
      }
    },
    [SUPPORT_PREFERENCE_KEY, supportPreference(Date.now())] as const,
  );
}
