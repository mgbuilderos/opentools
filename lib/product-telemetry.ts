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
  completionRecorded = true;
  return recordProductSignal(
    isStandaloneDocument() ? 'completed-pwa' : 'completed-web',
  );
}

/** Test seam. Never called by application code. */
export function resetProductTelemetryForTests(): void {
  completionRecorded = false;
  inFlight.clear();
}

/** Test seam: how many requests are still being held against garbage collection. */
export function inFlightSignalCount(): number {
  return inFlight.size;
}
