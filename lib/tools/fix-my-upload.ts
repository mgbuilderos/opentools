/**
 * Fix My Upload — a site whose upload just rejected a file can send the person
 * here to correct it, and get the corrected file back without either of us
 * uploading anything.
 *
 * WHY THIS EXISTS. Every upload form on the web rejects files with a sentence
 * like *"your image must be JPEG, under the size limit, and no wider than 1200
 * px"* and then leaves the person to solve it. What they usually do is search,
 * land on an ad-funded converter, and upload the document that was too sensitive
 * to upload in the first place. This turns that dead end into a link: the
 * requirement travels, the file does not.
 *
 * WHAT THIS MODULE IS, AND WHAT IT IS DELIBERATELY NOT. It is the *transport*
 * for a requirement that already has a home. `lib/tools/ask-link.ts` owns what a
 * request may contain — the finite list of request types, the allowlisted
 * parameters, the bounds, the sanitisers, the plain-language descriptions — and
 * this module carries one of those across a window boundary. It defines **no
 * requirement type of its own**. A second requirement model would be a second
 * place for a leak to be introduced and a second answer to "what may this
 * product be asked to do", and the owner's brief forbids exactly that.
 *
 * ── THE RETURN CHANNEL, WHICH IS THE WHOLE SECURITY QUESTION ──────────────
 *
 * The corrected file has to reach the site that asked for it. That means naming
 * a destination, and naming a destination is how this kind of feature becomes a
 * data-exfiltration hole. Three rules make it safe, and the first is the one
 * everything else rests on:
 *
 * **1. The destination origin is read from the MessageEvent, never from the
 * URL.** A `?return=https://example.test` parameter would be an attacker-typed
 * destination: send someone a link with your own origin in it and the file comes
 * to you. So there is no such parameter and no allowlist to configure. The
 * integrator's page must `postMessage` to this window first, and the origin we
 * reply to is `event.origin` from that message — a value the *browser* supplies
 * and a page cannot forge. `readIntegratorHello` therefore takes the origin as
 * a separate argument from the data, so a caller cannot accidentally take it
 * from the payload.
 *
 * **2. Nothing is returned without the person choosing to return it.** The
 * origin is shown to them in plain words before they decide, and it is shown
 * from the same browser-supplied value, so what they read is what will receive
 * the file.
 *
 * **3. `targetOrigin` is always that exact origin, never `'*'`.** A wildcard
 * would hand the file to whatever window happens to be listening.
 *
 * WHY A POPUP AND NOT AN IFRAME, which is not a style preference:
 * `lib/security/content-security-policy.ts` sends `frame-ancestors 'none'` on
 * every route except `/embed/:path+`, and `lib/security/embed-framing.test.ts`
 * fails the build if any other route stops sending it. Framing this would mean
 * relaxing a guarded invariant. A top-level popup is also the honest choice:
 * the visitor sees this site's real origin in their own address bar and can
 * judge where their file is being handled, which is something no iframe can
 * offer them.
 *
 * NOTHING HERE MOVES BYTES OVER A NETWORK. `postMessage` is an in-browser
 * channel between two windows on the same machine; the page's `connect-src
 * 'none'` is unchanged and still means no script here can open a connection.
 */
import {
  findAskRequest,
  sanitiseAskValues,
  type AskRequest,
} from './ask-link';
import type { RecipeValues } from './recipe-link';

/**
 * Protocol version, carried on every message in both directions.
 *
 * An integrator's snippet lives on somebody else's site and is updated when
 * they get round to it, which may be never. So a message whose version this
 * build does not understand is ignored rather than guessed at, and a future
 * version can recognise an old integrator instead of misreading it.
 */
export const FIX_PROTOCOL_VERSION = 1;

/** The channel name, so unrelated `postMessage` traffic is never mistaken for ours. */
export const FIX_PROTOCOL = 'opentools.fix-my-upload';

/** Messages an integrating page may send to this window. */
export const INTEGRATOR_HELLO = 'hello';
/** Messages this window sends back to the integrating page. */
export const OPENTOOLS_READY = 'ready';
export const OPENTOOLS_RESULT = 'result';
export const OPENTOOLS_CANCELLED = 'cancelled';

/** What a valid hello resolved to: a declared request and sanitised settings. */
export type IntegratorHello = {
  readonly request: AskRequest;
  readonly values: RecipeValues;
  /**
   * The origin to reply to, taken from the `MessageEvent` rather than the
   * payload. See the header: this is the single fact the whole security model
   * rests on.
   */
  readonly origin: string;
};

/**
 * An origin this window may send a file back to.
 *
 * Deliberately narrow: an exact `scheme://host[:port]`, https only, with no
 * path, query, fragment, credentials, or trailing slash. `http:` is refused
 * because a file returned over plaintext is readable by anything on the path —
 * with one exception for local development hosts, which cannot be reached from
 * another machine.
 */
export function isReturnableOrigin(origin: unknown): origin is string {
  if (typeof origin !== 'string' || origin === '' || origin.length > 2048) {
    return false;
  }
  // `null` is what a sandboxed or file:// document reports. It is not an
  // address, and `postMessage` to it would throw.
  if (origin === 'null') return false;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.username || url.password) return false;
  if (url.pathname !== '/' || url.search || url.hash) return false;
  const local =
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.hostname === '[::1]' ||
    url.hostname.endsWith('.localhost');
  if (url.protocol === 'http:') return local;
  if (url.protocol !== 'https:') return false;
  // `new URL('https://x.test/').origin` normalises away the path; comparing
  // against it rejects anything that was not already a bare origin.
  return url.origin === origin;
}

/**
 * How an origin is shown to the person deciding whether to send their file.
 *
 * The host alone, because that is the part a person can actually judge —
 * `example.test`, not `https://example.test`. The scheme is not dropped from
 * the *decision*, only from the sentence: `isReturnableOrigin` has already
 * refused anything but https outside local development.
 */
export function describeReturnTarget(origin: string): string {
  try {
    return new URL(origin).host;
  } catch {
    return origin;
  }
}

/**
 * Read a hello from an integrating page.
 *
 * `origin` is the second argument and not a field of `data` on purpose: it must
 * come from the `MessageEvent`, and a signature that took it from the payload
 * would let a page name its own destination. Everything in `data` is treated as
 * hostile — it arrived from a site we do not control.
 *
 * Returns null for anything unrecognised, which the caller renders as "this did
 * not come from an integration we understand" rather than guessing.
 */
export function readIntegratorHello(
  data: unknown,
  origin: unknown,
): IntegratorHello | null {
  if (!isReturnableOrigin(origin)) return null;
  if (typeof data !== 'object' || data === null) return null;

  const message = data as Record<string, unknown>;
  if (message.channel !== FIX_PROTOCOL) return null;
  if (message.version !== FIX_PROTOCOL_VERSION) return null;
  if (message.type !== INTEGRATOR_HELLO) return null;

  const request = findAskRequest(
    typeof message.request === 'string' ? message.request : null,
  );
  if (!request) return null;

  /*
   * The settings go through the request's own sanitiser, which encodes and
   * decodes them against the declaration — so a parameter the definition does
   * not declare, a number out of bounds, or a choice the tool does not offer is
   * simply not present afterwards. An integrator cannot widen what its own
   * request may ask for, and cannot smuggle a field through by naming it.
   */
  const raw =
    typeof message.values === 'object' && message.values !== null
      ? (message.values as RecipeValues)
      : {};

  return { request, values: sanitiseAskValues(request, raw), origin };
}

/** The envelope every outbound message shares. */
function envelope(type: string) {
  return { channel: FIX_PROTOCOL, version: FIX_PROTOCOL_VERSION, type } as const;
}

/** Sent once this window has understood the request and is ready for the person. */
export function readyMessage() {
  return envelope(OPENTOOLS_READY);
}

/**
 * Sent when the person chooses to send the corrected file back.
 *
 * The `File` travels as a structured clone — the browser copies the bytes
 * between two windows in the same process. It is not serialised to text, not
 * base64'd, and not sent anywhere: there is no network involved in a
 * `postMessage`, which is why this can exist at all under `connect-src 'none'`.
 */
export function resultMessage(file: File) {
  return { ...envelope(OPENTOOLS_RESULT), file };
}

/** Sent when the person closes the window or declines to send anything. */
export function cancelledMessage(reason: 'dismissed' | 'declined') {
  return { ...envelope(OPENTOOLS_CANCELLED), reason };
}

/**
 * Read a message this window sent, from the integrator's side.
 *
 * Exported so the SDK and its tests share one definition of the protocol with
 * the page rather than each carrying their own copy of the shape — the drift
 * that a second definition invites is the same class of fault as a second
 * requirement registry, just smaller.
 */
export type OpenToolsMessage =
  | { readonly type: typeof OPENTOOLS_READY }
  | { readonly type: typeof OPENTOOLS_RESULT; readonly file: File }
  | {
      readonly type: typeof OPENTOOLS_CANCELLED;
      readonly reason: 'dismissed' | 'declined';
    };

export function readOpenToolsMessage(data: unknown): OpenToolsMessage | null {
  if (typeof data !== 'object' || data === null) return null;
  const message = data as Record<string, unknown>;
  if (message.channel !== FIX_PROTOCOL) return null;
  if (message.version !== FIX_PROTOCOL_VERSION) return null;

  if (message.type === OPENTOOLS_READY) return { type: OPENTOOLS_READY };
  if (message.type === OPENTOOLS_RESULT) {
    // `instanceof File` rather than a duck-typed check: a structured clone
    // preserves the class, and anything else is not a file however it is shaped.
    return typeof File !== 'undefined' && message.file instanceof File
      ? { type: OPENTOOLS_RESULT, file: message.file }
      : null;
  }
  if (message.type === OPENTOOLS_CANCELLED) {
    const reason = message.reason === 'declined' ? 'declined' : 'dismissed';
    return { type: OPENTOOLS_CANCELLED, reason };
  }
  return null;
}
