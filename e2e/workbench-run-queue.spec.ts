import { createHash } from 'node:crypto';

import { expect, test, type Page } from '@playwright/test';

/**
 * A change made while a workbench is still computing must not be lost.
 *
 * WHY THIS SPEC INJECTS A DELAY, AND WHY THAT IS NOT CHEATING.
 *
 * `components/schema-workbench-tool.tsx` runs the operation on a 250 ms
 * debounce. Until 2026-09-30 the tick was guarded by `if (!running)`, which
 * read `running` out of the closure the effect was created in and skipped —
 * and because `running` is not a dependency of that effect, the run that
 * finished never re-armed the tick it had displaced. The visitor's last change
 * was dropped for good.
 *
 * That guard cannot be reached through any operation this site ships today,
 * and the reason is structural rather than a matter of speed. Every `run`
 * settles inside a single microtask drain — even the three declared `async`,
 * because none of them awaits a macrotask source: no `fetch`, no dynamic
 * `import()`, no Worker, no `setTimeout`, no `FileReader`. React schedules its
 * re-render behind that drain, so `running` goes true and false without a
 * single commit in between. Measured before this spec was written: a
 * MutationObserver watching for the component's own "Working..." indicator saw
 * it 0 times in 15 attempts on `/developer/checksum-calculator`, at 1 MB, 8 MB
 * and 24 MB of input. A bigger input does not widen the window, it does not
 * open it at all.
 *
 * So the delay below is not a slower version of something the suite could
 * otherwise observe — it is the only way to observe it. It adds a real
 * macrotask inside `SubtleCrypto.prototype.digest`, which is exactly what
 * would arrive the day hashing moves to a Worker or the QR library is loaded
 * on demand, both of which are plausible here. The component's behaviour is
 * not stubbed; only the timing of a browser API it already awaits.
 *
 * Run against the pre-fix bytes this spec fails: the panel keeps the checksum
 * of the FIRST text for ever, which on a checksum tool means the page attests
 * to bytes the visitor is no longer looking at.
 *
 * The deterministic, machine-independent half of this guard is
 * `lib/workbench-run-queue.test.ts`, which does not need a browser at all.
 */

const DIGEST_DELAY_MS = 1200;

const sha256 = (text: string) =>
  createHash('sha256').update(text, 'utf8').digest('hex');

/** Adds one real macrotask to every WebCrypto digest on this page. */
async function delayDigest(page: Page) {
  await page.addInitScript((ms) => {
    // Read through the property descriptor rather than `SubtleCrypto.prototype
    // .digest`, which lint rejects as an unbound method reference.
    const descriptor = Object.getOwnPropertyDescriptor(
      SubtleCrypto.prototype,
      'digest',
    );
    const real = descriptor?.value as (
      this: SubtleCrypto,
      ...args: unknown[]
    ) => Promise<ArrayBuffer>;
    Object.defineProperty(SubtleCrypto.prototype, 'digest', {
      configurable: true,
      writable: true,
      value: async function (this: SubtleCrypto, ...args: unknown[]) {
        const result = await real.apply(this, args);
        await new Promise((resolve) => setTimeout(resolve, ms));
        return result;
      },
    });
  }, DIGEST_DELAY_MS);
}

/**
 * Puts text in the one textarea on the page. `fill` is safe here because every
 * caller has already waited for the result panel, which only appears once the
 * run that fires on mount has finished — so React is hydrated by definition
 * and cannot undo the value, which is the trap PR #96 documents.
 */
async function enter(page: Page, text: string) {
  await page.locator('textarea').fill(text);
}

function panel(page: Page) {
  return page.locator('section[aria-live="polite"] pre');
}

test.describe('Workbench run queue', () => {
  test('keeps the change made while the tool was still computing', async ({
    page,
  }) => {
    await delayDigest(page);
    await page.goto('/developer/checksum-calculator');
    await page.locator('textarea').waitFor();

    const first = 'first text, typed and then replaced';
    const second = 'second text, typed while the first was still hashing';

    // Let the run that fires on mount finish, so the panel below can only be
    // showing one of the two strings this test supplies.
    await expect(panel(page)).toBeVisible({ timeout: 15_000 });

    await enter(page, first);
    // Wait for the component's own indicator: it renders only while a run is
    // in flight, so typing now is a visitor typing into a busy tool. It is
    // also the assertion that the delay above really opened the window — on
    // undelayed bytes this line fails rather than passing vacuously.
    await expect(page.getByText('Working...')).toBeVisible({ timeout: 15_000 });

    await enter(page, second);

    // The panel must settle on the SECOND text. Before the fix it settled on
    // the first and stayed there.
    await expect(panel(page)).toHaveText(sha256(second), { timeout: 20_000 });
    await expect(panel(page)).not.toHaveText(sha256(first));

    // And it must not still be claiming to work once it has caught up.
    await expect(page.getByText('Working...')).toHaveCount(0);
  });

  test('settles on the last of several changes made during one run', async ({
    page,
  }) => {
    await delayDigest(page);
    await page.goto('/developer/checksum-calculator');
    await page.locator('textarea').waitFor();
    await expect(panel(page)).toBeVisible({ timeout: 15_000 });

    await enter(page, 'one');
    await expect(page.getByText('Working...')).toBeVisible({ timeout: 15_000 });

    // Three more changes while that run is in flight. Only the last is worth
    // computing, and it is the one that must be on screen at the end.
    await enter(page, 'two');
    await enter(page, 'three');
    await enter(page, 'four');

    await expect(panel(page)).toHaveText(sha256('four'), { timeout: 25_000 });
  });
});
