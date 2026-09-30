import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Waiting until React has taken over a prerendered control.
 *
 * ## The race
 *
 * Every tool page here is prerendered to static HTML, so its inputs and buttons
 * exist in the DOM before React attaches a single handler. Text written into a
 * control in that window lands on the node and never reaches React's state. The
 * tool goes on believing the box is empty, its run button stays `disabled`, and
 * the test fails somewhere else entirely — on a result that never appears, or a
 * click Playwright retries until it times out. It reads as a product bug and is
 * not one.
 *
 * `e2e/aadhaar-pan-masker.spec.ts`, `e2e/audio-convert.spec.ts`,
 * `e2e/bench.spec.ts`, `e2e/canvas-and-pdf-tools.spec.ts` and
 * `e2e/ask-link.spec.ts` each wrote their own comment about this, which is how
 * it kept coming back: five descriptions of one race and no shared way to wait
 * for it. This module is that way.
 *
 * ## Why `networkidle` is not the answer
 *
 * `page.waitForLoadState('networkidle')` was the idiom, and it does not detect
 * hydration. It resolves when no request has been in flight for 500ms; React
 * hydrating is CPU work that can finish either side of that, so on a fast
 * network with a busy runner the wait returns while the controls are still
 * inert. It passes almost always, which is the worst property a guard can have:
 * `ask-link.spec.ts` had a function *named* `hydrated` whose whole body was that
 * one call, so every caller was documented as protected and none of them were.
 *
 * ## What actually proves it
 *
 * Only the page answering. Type a probe into the control and wait for something
 * to change that only React can change — a button becoming enabled. When that
 * happens, handlers are attached and state is live.
 *
 * ## The clear is not optional
 *
 * Each attempt clears the field before typing. Retrying with the same text
 * deadlocks, and the reason is worth stating because the fix looks redundant
 * without it: React records whatever value it finds on the node at the moment it
 * hydrates — including text typed in before that — and then ignores any later
 * event carrying that same value, because as far as it is concerned nothing
 * changed. A retry loop that re-types the same string can therefore never
 * re-announce the field, and the button stays disabled for the whole timeout.
 *
 * That signature is unmistakable in a CI log: the same
 * `element is not enabled` line hundreds of times over, rather than a wait that
 * eventually succeeds. It is what `aadhaar-pan-masker.spec.ts` recorded
 * observing on WebKit, "with the text plainly visible in the failure snapshot
 * beside a counter reading 0 characters".
 */

/** How long one probe waits for the page to answer before trying again. */
const PROBE_TIMEOUT = 500;

/** How long to keep probing before giving up on the page entirely. */
const HYDRATION_TIMEOUT = 30_000;

/**
 * How long one attempt waits when the page has real work to do before it can
 * answer — parsing an MP4 the test just handed it, say. Longer than
 * `PROBE_TIMEOUT`, which only has to cover a re-render.
 */
const SETTLE_TIMEOUT = 3_000;

/**
 * Repeats an input action until the page visibly answers it.
 *
 * The same race as `waitForHydration`, for the inputs that cannot be probed
 * with a string. A file chosen before React is listening is set on the node and
 * never reaches state, and the three ways that then surfaces all look like
 * different bugs:
 *
 * - the run button stays `disabled`, because it is gated on the file —
 *   `/file/hash-calculator` renders `disabled={!file || busy}`;
 * - the run button never *exists*, because the whole panel is conditional on the
 *   parsed file — `/video/trim` renders its controls under `loaded && video`, so
 *   the click waits on an element that is never coming;
 * - nothing at all happens, because the handler guards itself — that page's
 *   `onRun` opens with `if (!loaded) return;`.
 *
 * One cause, so one wait. `proof` is whatever the page shows once it has taken
 * the input, and it is the caller's job to pick something only React can
 * produce. Re-running the action is safe where a text `fill` would deadlock:
 * a file input carries a `FileList` rather than a string value, so React has no
 * same-value short circuit to hit.
 */
export async function actUntilVisible(
  act: () => Promise<void>,
  proof: Locator,
  settleTimeout = SETTLE_TIMEOUT,
): Promise<void> {
  await expect(async () => {
    await act();
    await expect(proof).toBeVisible({ timeout: settleTimeout });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
}

/** `actUntilVisible` for a page that answers by enabling a control. */
export async function actUntilEnabled(
  act: () => Promise<void>,
  control: Locator,
  settleTimeout = SETTLE_TIMEOUT,
): Promise<void> {
  await expect(async () => {
    await act();
    await expect(control).toBeEnabled({ timeout: settleTimeout });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
}

/**
 * Types into a controlled text input until its effect is on the page.
 *
 * For a field whose output is text rather than a button — a colour converter
 * showing `rgb(...)` for the hex it was given. A controlled input makes the
 * pre-hydration case worse than a lost keystroke: React renders `value` from its
 * own state, so on hydrating it writes the old value back over what was typed,
 * and the single `fill` most specs do is not merely ignored but undone.
 *
 * Clears before each attempt for the reason in this module's header: React
 * ignores an event carrying the value it already believes the node holds, so a
 * retry that re-types the same string cannot re-announce the field.
 */
export async function typeUntilVisible(
  field: Locator,
  text: string,
  proof: Locator,
  settleTimeout = PROBE_TIMEOUT,
): Promise<void> {
  await expect(async () => {
    await field.fill('');
    await field.fill(text);
    await expect(proof).toBeVisible({ timeout: settleTimeout });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
}

/**
 * Waits until `field` is one React is listening to, then leaves it empty.
 *
 * `enabledOnInput` is any control the page enables once the field is non-empty —
 * usually the tool's run button. It is the observable that makes hydration a
 * fact rather than an assumption, so it has to be something only React drives.
 */
export async function waitForHydration(
  field: Locator,
  enabledOnInput: Locator,
): Promise<void> {
  await expect(async () => {
    // Clear first. See "The clear is not optional" above — without this the
    // retry cannot work, it can only wait.
    await field.fill('');
    await field.fill('probe');
    await expect(enabledOnInput).toBeEnabled({ timeout: PROBE_TIMEOUT });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
  await field.fill('');
}

/**
 * Fills a hydrated field and clicks its now-enabled button.
 *
 * The click is a single action rather than a retried one. Once hydration is
 * established the button's enabled state is a settled fact, so a click that
 * finds it disabled is a real defect and should fail the test rather than be
 * papered over by another retry loop.
 */
export async function typeAndRun(
  field: Locator,
  runButton: Locator,
  text: string,
): Promise<void> {
  await waitForHydration(field, runButton);
  await field.fill(text);
  await expect(runButton).toBeEnabled();
  await runButton.click();
}

/**
 * Chooses an operation on a workbench shell and waits until React owns it.
 *
 * The auto-running workbenches — `/subtitles/workbench`, `/text/workbench`,
 * `/math/workbench`, `/date/workbench` and the rest of
 * `components/schema-workbench-tool.tsx`'s workbench routes — have
 * no run button to wait on. They debounce their own run 250ms after the last
 * change, so `waitForHydration` and `typeAndRun` above have nothing to watch.
 * What every one of them does have is a prerendered
 * `<select value={operation.id}>` that React controls.
 *
 * ## The race
 *
 * Measured on `/subtitles/workbench` with the page's own JS delayed 1.5s: a
 * `selectOption` issued before React attaches sets the node to the chosen
 * operation, and React writes the default straight back over it on hydrating —
 * `subtitle-to-vtt` in, `subtitle-to-srt` out. The choice is not merely
 * ignored, it is undone, and nothing says so. The test then fills in its input,
 * the shell runs the *default* operation over it, and the failure surfaces much
 * further down as a result in the wrong format. That is why this read for weeks
 * as a product bug in the subtitle converter.
 *
 * The shell's own recovery cannot help here. The effect that re-applies a
 * selection reads `?tool=` from the address bar, and a `selectOption` React
 * never heard writes nothing there — so the one mechanism built to converge
 * this is never engaged.
 *
 * ## What proves React took it
 *
 * That same `?tool=`. `selectOperation` sets it with `history.replaceState`,
 * and the only path to that line is React's own `onChange`. The query appearing
 * is therefore proof the event was *handled*, not merely dispatched — the
 * property `networkidle` could never give. It is also a latch: once the
 * operation is named in the URL, the shell's effect converges the selection
 * back to it if anything later disagrees, which is what makes the subsequent
 * `fill` safe without a second wait.
 *
 * ## Not for the per-tool pages
 *
 * Only the workbench routes, where the dropdown changes the operation in
 * place. The same component also renders one operation per page under
 * `app/<category>/[tool]/`, and there `selectOperation` calls
 * `window.location.assign` instead of touching `?tool=` — so this would wait
 * out its full timeout. It fails loudly rather than silently, but use a
 * navigation there, not this.
 *
 * ## Why there is no clear here, unlike the text case
 *
 * Measured, not assumed. The same-value short circuit that deadlocks a re-typed
 * text field cannot arise: React has already reset the node to its own state
 * by the time a retry runs, so the next `selectOption` carries a genuinely new
 * value and is announced. Adding a select-away-and-back step would be dead
 * code defending against a case this component cannot reach.
 */
export async function selectOperationUntilApplied(
  page: Page,
  select: Locator,
  operationId: string,
): Promise<void> {
  const named = new RegExp(
    `[?&]tool=${operationId.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}(?:&|$)`,
    'u',
  );
  await expect(async () => {
    await select.selectOption(operationId);
    await expect(page).toHaveURL(named, { timeout: PROBE_TIMEOUT });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
}

/**
 * The same wait for a page whose readiness shows on a control that takes no
 * typing — a converter that enables its button once a format is chosen, say.
 *
 * No probe and no clear, because there is no field to announce: the control
 * either responds to React or it does not, and waiting on it is enough.
 */
export async function waitForEnabled(
  control: Locator,
  timeout = HYDRATION_TIMEOUT,
): Promise<void> {
  await expect(control).toBeEnabled({ timeout });
}

/**
 * A last resort for a page with no control to watch.
 *
 * Kept so that callers with nothing better are at least explicit about it, and
 * so the reason is attached to the call rather than rediscovered. Prefer
 * `waitForHydration` or `waitForEnabled` wherever a control exists — this one
 * cannot tell you that React arrived, only that the network went quiet.
 */
export async function networkSettled(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
}

/**
 * Waits until React has hydrated the page at all, with no control to watch.
 *
 * A last resort with a narrow purpose: some tests must act on the page before
 * any product observable exists. `install-prompt.spec.ts` is the case that
 * forced this. It dispatches a fake `beforeinstallprompt`, and
 * `lib/pwa-install.ts` attaches its listener at module scope precisely so a real
 * one is not missed — but module scope still means *when the bundle runs*. An
 * event dispatched before that is lost for good, because the browser hands over
 * exactly one and so does the test. The banner then never appears, and the
 * failure reads as "the install offer is broken".
 *
 * Nothing product-level can be waited on there: the banner is deliberately
 * withheld until a job finishes, which is the thing under test, and the captured
 * prompt is module state the page does not expose.
 *
 * So this checks React's own marker on a hydrated node. That is an internal, and
 * naming it as one is the point: it is stable across React 16–19 and is the
 * standard probe, but if a future React drops the `__reactFiber$` prefix this
 * fails loudly on a timeout rather than silently going back to not waiting —
 * which is the failure mode worth choosing.
 *
 * Prefer `waitForHydration`, `actUntilVisible` or `typeUntilVisible` whenever the
 * page gives you something real to wait on.
 */
export async function waitForReact(
  page: Page,
  timeout = HYDRATION_TIMEOUT,
): Promise<void> {
  await page.waitForFunction(
    () =>
      [
        document.querySelector('#tool'),
        document.body,
        document.body.firstElementChild,
      ].some(
        (node) =>
          node !== null &&
          Object.keys(node).some(
            (key) =>
              key.startsWith('__reactFiber$') ||
              key.startsWith('__reactContainer$'),
          ),
      ),
    undefined,
    { timeout },
  );
}
