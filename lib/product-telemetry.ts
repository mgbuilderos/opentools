/**
 * The nine counters this product is allowed to increment, and nothing else.
 *
 * ## Why this exists at all
 *
 * Until now the site measured nothing in the browser, and the one thing the
 * business needs to know was therefore unmeasurable: **did a visitor actually
 * finish a piece of work?** Cloudflare counts page requests, Search Console
 * counts impressions, and neither can see a job complete — the result is
 * produced in the tab and never reported anywhere. A visit that opens one page,
 * compresses a PDF and leaves is the product working perfectly, and it was
 * indistinguishable from a bounce.
 *
 * The owner approved this on 2026-09-28, narrowly: fixed signals, no content,
 * no identifier. `AGENTS.md`, business rule 10 and ADR-020 record the amended
 * rule. This module is the only place a signal can be sent from, so the whole
 * of the promise is auditable by reading one file.
 *
 * ## Why an image, and not `fetch` or `sendBeacon`
 *
 * Every response this site serves carries `connect-src 'none'`. That header is
 * the product's one real promise — the page *cannot* upload your file, because
 * the browser refuses to open the connection — and `e2e/egress-proof.spec.ts`
 * asserts it on every build. `fetch`, `XMLHttpRequest`, `sendBeacon` and
 * WebSocket are all governed by it, so any of them would mean relaxing the one
 * header that matters, on every page, to count a visit.
 *
 * `img-src 'self'` is already permitted (page icons and the share card need
 * it). An `Image` pointed at a fixed same-origin path therefore needs **no CSP
 * change at all** — `lib/security/product-telemetry-csp.test.ts` asserts the
 * policy is byte-identical before and after this feature. An image request also
 * cannot carry a body: there is no API to give it one. The transport is
 * incapable of sending a file even if a future change tried to.
 *
 * ## What is sent
 *
 * One GET to one of nine compile-time constants below. No query string, no
 * fragment, no headers we set, no body, no cookie (the site sets none), no
 * identifier of any kind. Two requests to `/telemetry/v1/completed-web.svg`
 * from the same browser are indistinguishable from two different people, and
 * that is deliberate: the aggregate count is the entire product of this file.
 *
 * ## What is never sent
 *
 * No file bytes, filename, extension, MIME type, size, page count, dimension,
 * pasted text, tool output, tool or operation id, recipe or Ask Link value,
 * duration, error text, URL, query, fragment, referrer, timestamp, job id,
 * session id, device id, install id, locale, country or device characteristic.
 * `recordProductSignal` takes no user-derived argument — it takes one member of
 * a closed union and nothing else, which is why a mistake of that kind cannot
 * be made through this API. `lib/product-telemetry.test.ts` proves it.
 *
 * Cloudflare's ordinary server logs still see the IP and user agent of any
 * request, this one included, exactly as they see every page request. That is
 * disclosed in `.github/SECURITY.md` and on `/privacy`; it is not copied into
 * any application database and nothing joins it to anything.
 */

/** The closed set of events. Adding a member here is the only way to add one. */
export const PRODUCT_SIGNALS = [
  'pwa-installed',
  'pwa-launch',
  'completed-web',
  'completed-pwa',
  'share-target-opened',
  'file-handler-opened',
  'install-prompt-shown',
  'install-prompt-accepted',
  'install-prompt-dismissed',
] as const;

export type ProductSignal = (typeof PRODUCT_SIGNALS)[number];

/** The version in the path is the contract with the collector. */
export const TELEMETRY_PREFIX = '/telemetry/v1/';

/**
 * Event to path, hard-coded, one entry each.
 *
 * A literal record rather than `${TELEMETRY_PREFIX}${event}.svg`, so that the
 * set of URLs this file can ever produce is visible in the source and provable
 * by a test, rather than being whatever string reaches the function.
 */
export const SIGNAL_PATHS: Readonly<Record<ProductSignal, string>> = {
  'pwa-installed': '/telemetry/v1/pwa-installed.svg',
  'pwa-launch': '/telemetry/v1/pwa-launch.svg',
  'completed-web': '/telemetry/v1/completed-web.svg',
  'completed-pwa': '/telemetry/v1/completed-pwa.svg',
  'share-target-opened': '/telemetry/v1/share-target-opened.svg',
  'file-handler-opened': '/telemetry/v1/file-handler-opened.svg',
  'install-prompt-shown': '/telemetry/v1/install-prompt-shown.svg',
  'install-prompt-accepted': '/telemetry/v1/install-prompt-accepted.svg',
  'install-prompt-dismissed': '/telemetry/v1/install-prompt-dismissed.svg',
};

/** Where someone who does not want to be counted turns this off. */
export const TELEMETRY_OPT_OUT_KEY = 'opentools-product-signals';
const OPTED_OUT = 'off';

/**
 * Requests still in flight.
 *
 * An `Image` with no reference to it is garbage from the moment the statement
 * ends, and a collected image may never issue its request — the count would
 * then quietly under-report on exactly the fastest machines. Holding each one
 * until `load` or `error` is the whole reason this set exists; the entry is
 * removed either way, so nothing accumulates.
 */
const inFlight = new Set<HTMLImageElement>();

/**
 * Whether this browser has asked, by a standard mechanism, not to be measured.
 *
 * Global Privacy Control is a legally recognised signal in several
 * jurisdictions and Do Not Track is not, but both are unambiguous statements of
 * preference and honouring a preference costs us one number. The local opt-out
 * is the third: `/privacy` writes it, and it is a single fixed string rather
 * than anything that could identify the person who set it.
 */
export function signalsSuppressed(): boolean {
  if (typeof navigator === 'undefined') return true;
  try {
    const nav = navigator as Navigator & {
      globalPrivacyControl?: boolean;
      doNotTrack?: string | null;
      msDoNotTrack?: string | null;
    };
    if (nav.globalPrivacyControl === true) return true;
    const dnt =
      nav.doNotTrack ??
      nav.msDoNotTrack ??
      (typeof window !== 'undefined'
        ? (window as unknown as { doNotTrack?: string | null }).doNotTrack
        : null);
    if (dnt === '1' || dnt === 'yes') return true;
  } catch {
    // A browser that will not answer the question is not a reason to count it.
    return true;
  }
  try {
    if (localStorage.getItem(TELEMETRY_OPT_OUT_KEY) === OPTED_OUT) return true;
  } catch {
    // Blocked storage means we cannot read a preference. Counting anyway would
    // be the wrong way to resolve that, but so would never counting a private
    // window: the opt-out is the narrow case, so absence reads as "not set".
  }
  return false;
}

/**
 * Whether the browser is certain it has no network.
 *
 * Read only in the negative direction, and deliberately. `navigator.onLine`
 * being `true` means nothing at all — a captive portal and a dead uplink both
 * report online — but `false` is the one answer the browser is sure of, and it
 * is enough to skip work that cannot succeed.
 *
 * WHY THIS IS HERE RATHER THAN LEAVING THE REQUEST TO FAIL. An installed app
 * opened with no network still runs every precached tool, and ADR-020's promise
 * for that visit is that nothing is sent and the event goes permanently
 * uncounted. Without this the second half was true and the first was not: the
 * `Image` was still created, its request still issued, and `onerror` still fired
 * — the count was lost either way, but the page had asked the network for
 * something the offline payload does not hold.
 *
 * `e2e/offline-cold-start.spec.ts` is what makes that distinction matter. It
 * records every request that fails while offline and requires the list to be
 * empty, because a missed font, stylesheet or second engine is exactly how a
 * tool half-works offline without saying so. Exempting this path there would
 * have widened a guard on the product to accommodate a counter; not issuing the
 * request keeps the guard absolute and makes the documented behaviour literal.
 *
 * Note that this is NOT the same condition `e2e/product-telemetry.spec.ts`
 * creates with `page.route(..., abort)`. Route-abort leaves `onLine` true, so
 * the signal is still attempted and still fails there — which is the real-world
 * case of a browser that believes it is online and is not, and is the case worth
 * keeping a test on.
 */
function certainlyOffline(): boolean {
  if (typeof navigator === 'undefined') return false;
  try {
    return navigator.onLine === false;
  } catch {
    // A browser that will not answer is not a browser we assume is offline:
    // guessing offline here would silently stop counting for everyone.
    return false;
  }
}

/** Turn the counters off, or on, for this browser only. */
export function setProductSignalsEnabled(enabled: boolean): void {
  try {
    if (enabled) localStorage.removeItem(TELEMETRY_OPT_OUT_KEY);
    else localStorage.setItem(TELEMETRY_OPT_OUT_KEY, OPTED_OUT);
  } catch {
    /* Nothing to remember it with. The page will say so rather than lie. */
  }
}

export function productSignalsEnabled(): boolean {
  try {
    return localStorage.getItem(TELEMETRY_OPT_OUT_KEY) !== OPTED_OUT;
  } catch {
    return true;
  }
}

/**
 * Whether this document is running as an installed app.
 *
 * `display-mode: standalone` is the standard, and `navigator.standalone` is
 * Safari's own flag, which predates it and is the only signal iOS gives. Both
 * are read because iOS is where installation is most common and least visible
 * to us — see the undercount note in ADR-020.
 */
export function isStandaloneDocument(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
    if (window.matchMedia?.('(display-mode: window-controls-overlay)').matches)
      return true;
    return (
      (navigator as unknown as { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

/**
 * Increment one counter. Returns whether a request was issued, for tests.
 *
 * Takes a member of a closed union and nothing else: there is no second
 * parameter, so no caller can attach a detail to a signal, and no reviewer has
 * to check whether one did. Every failure is swallowed — a counter must never
 * be able to make a finished job look unfinished.
 */
export function recordProductSignal(signal: ProductSignal): boolean {
  if (typeof window === 'undefined' || typeof Image === 'undefined')
    return false;
  // A string that is not one of the nine is not a signal, whatever its type
  // says. This is the guard that makes the path map exhaustive at runtime too.
  if (!Object.hasOwn(SIGNAL_PATHS, signal)) return false;
  const path = SIGNAL_PATHS[signal];
  if (signalsSuppressed()) return false;
  // Nothing to send it down, and the offline payload does not hold it.
  if (certainlyOffline()) return false;

  try {
    const beacon = new Image();
    inFlight.add(beacon);
    const done = () => {
      inFlight.delete(beacon);
    };
    beacon.onload = done;
    // No retry, ever. A failed signal is a lost count, which is the correct
    // outcome: retrying would turn one event into several and would mean
    // holding state about a request that did not happen.
    beacon.onerror = done;
    beacon.decoding = 'async';
    beacon.src = path;
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ *
 * Did a person actually do anything?
 * ------------------------------------------------------------------ */

/**
 * Whether this document has seen a real interaction from a real person.
 *
 * ## The bug this exists to kill
 *
 * Measured on the live site, 2026-10-04: open `/math/pressure-converter`,
 * touch nothing at all, and two seconds later
 * `/telemetry/v1/completed-web.svg` has been requested and the page reads
 * "Done — Pressure converter". The workbench seeds its fields from
 * `field.defaultValue`, auto-runs 250ms later, and calls `announceCompletion`
 * — all before the visitor has done a single thing. **70 live `/math/` routes
 * behave this way.**
 *
 * That made the one number this whole feature exists to produce a count of
 * *page loads*, not of finished work, on the routes most likely to be opened
 * by accident. The business definition it is supposed to answer is "a visitor
 * opens OpenTools and **completes at least one useful operation**", and
 * converting the number 1 that nobody typed is not that. Worse, it was
 * unfalsifiable in the flattering direction: a quiet inflation that would have
 * been read as demand.
 *
 * ## Why it is gated here and not in the workbench
 *
 * One place, covering every tool that auto-runs now or later, rather than 70
 * routes and a rule the next workbench has to remember. It also leaves the
 * product alone: the receipt still opens on the auto-run, because showing
 * someone the tool works instantly is a reasonable thing for the page to do.
 * It is only the *count* that must not treat it as a success.
 *
 * ## Why these two sources, OR'd
 *
 * `navigator.userActivation.hasBeenActive` is the standard answer and is
 * exactly right where it exists (verified present and correctly `false` on the
 * live site in Chromium). But it is set only by *activation triggering* input
 * — and dropping a file dragged from the desktop is not one of them, nor is it
 * implemented in older Safari. A visitor who drags a PDF straight onto a tool
 * and never clicks has unambiguously used the product, so losing that would
 * trade one wrong number for another.
 *
 * So the flag below is OR'd in, set by the events a person cannot produce by
 * arriving: pointer, key, touch, paste, drop and a committed `change`. It can
 * only ever add a count relative to `hasBeenActive` alone, never remove one.
 * `isTrusted` is required, so nothing the page dispatches at itself qualifies.
 */
let sawInteraction = false;

const INTERACTION_EVENTS = [
  'pointerdown',
  'keydown',
  'touchstart',
  'paste',
  'drop',
  'change',
] as const;

/**
 * Watch one target for the first real interaction, then stop watching.
 *
 * Takes its target rather than closing over `window` so the behaviour is
 * reachable from a unit test: `vitest.config.ts` sets `environment: 'node'`,
 * where there is no `window` at import time at all, and a module-scope
 * listener bound to it would be permanently unexercised — the shape of
 * "tested, and the test proves nothing" this repo has been bitten by before.
 */
export function installInteractionWatch(target: EventTarget): () => void {
  const handler = (event: Event) => {
    // A synthetic event is the page talking to itself, which is not a visitor.
    if (!event.isTrusted) return;
    sawInteraction = true;
    stop();
  };
  const stop = () => {
    for (const name of INTERACTION_EVENTS) {
      target.removeEventListener(name, handler, true);
    }
  };
  for (const name of INTERACTION_EVENTS) {
    // Capturing, so a handler that stops propagation cannot hide the person,
    // and passive, so this can never delay an interaction it only observes.
    target.addEventListener(name, handler, { capture: true, passive: true });
  }
  return stop;
}

if (typeof window !== 'undefined') installInteractionWatch(window);

export function visitorHasActed(): boolean {
  if (sawInteraction) return true;
  try {
    const activation = (
      navigator as Navigator & {
        userActivation?: { hasBeenActive?: boolean };
      }
    ).userActivation;
    return activation?.hasBeenActive === true;
  } catch {
    // Nothing to ask. Treated as "no interaction seen": the alternative is
    // counting an automatic first run, which is the defect this guards.
    return false;
  }
}

/* ------------------------------------------------------------------ *
 * The once-per-document completion guard
 * ------------------------------------------------------------------ */

/**
 * Module state, so it lives exactly as long as the document does.
 *
 * "At most once per page visit" is the definition of a successful visit, and a
 * page visit is a document. Anything longer-lived — storage, a cookie, an id —
 * would be the persistent identifier this design exists to avoid, and anything
 * shorter would count a tool that finishes twice as two visitors.
 */
let completionRecorded = false;

/**
 * The first finished job in this document, and only the first.
 *
 * Called from `announceCompletion`, which is the single boundary every tool
 * already goes through. It is deliberately not passed the `CompletionDetail`
 * that boundary carries: the operation name, duration, summary and metrics are
 * all real facts about the person's file, and none of them may reach a counter.
 */
export function recordCompletionSignal(): boolean {
  if (completionRecorded) return false;
  /*
   * BEFORE the flag is spent, deliberately.
   *
   * An auto-run must not consume the document's one completion: the visitor
   * who then types something real has genuinely finished a job, and that is
   * the event worth counting. Gating after the assignment would silently
   * convert "we did not count the robot" into "we never counted this person",
   * which is the same defect wearing the opposite sign.
   */
  if (!visitorHasActed()) return false;
  completionRecorded = true;
  return recordProductSignal(
    isStandaloneDocument() ? 'completed-pwa' : 'completed-web',
  );
}

/** Test seam. Never called by application code. */
export function resetProductTelemetryForTests(): void {
  completionRecorded = false;
  sawInteraction = false;
  inFlight.clear();
}

/** Test seam: how many requests are still being held against garbage collection. */
export function inFlightSignalCount(): number {
  return inFlight.size;
}
