/**
 * Content Security Policy shared by `proxy.ts` and `next.config.ts`.
 * `public/_headers` mirrors it for statically served assets.
 *
 * Every route blocks all network connections. The background-removal pages and
 * their worker are the only exception: they may fetch same-origin assets (the
 * ONNX Runtime WebAssembly binary and model weights) and compile WebAssembly.
 * No third-party origin is ever allowed.
 *
 * `frame-ancestors 'none'` on every route is the second invariant, and
 * `/embed/*` is its single deliberate exception -- see
 * `decisions/ADR-019-embed-frame-ancestors.md` and
 * `lib/security/embed-framing.test.ts`, which fails the build if any other
 * route ever stops sending `'none'`. The exception relaxes framing and nothing
 * else: an embed page keeps `connect-src 'none'`, so the tool inside a frame
 * is as sealed as the tool on this site, and the page that frames it is
 * cross-origin and cannot read into it.
 */
const LOCAL_MODEL_PATHS = [
  /^\/image\/(?:background-remover|editor)\/?$/u,
  /^\/_next\/static\/workers\/background-removal\.worker-[\w-]+\.js$/u,
  // The HEIC pages fetch `public/wasm/libheif.wasm` from this origin, and only
  // where the browser cannot decode HEIC itself. Same exception, same reason:
  // the alternative is uploading the photograph to a machine that holds an
  // HEVC licence. See HEIC_BUILD_SPEC.md section 4.
  /^\/image\/heic-to-(?:jpg|png)\/?$/u,
  /^\/_next\/static\/workers\/heic-decode\.worker-[\w-]+\.js$/u,
  /^\/wasm\//u,
  /^\/ocr\//u,
];

/**
 * The one prefix that may be framed by another site. Everything under it is a
 * text-in / text-out tool with no file input and no support prompt (business
 * rule 33 as amended 2026-09-24).
 */
export const EMBED_PATH_PREFIX = '/embed/';

/**
 * Next.js `source` for the framable routes. `:path+` (one or more) and not
 * `:path*`, so `/embed` itself -- the page that hands a site owner the snippet
 * -- is NOT matched, and keeps `frame-ancestors 'none'` with the rest of the
 * site. Only `/embed/<tool>` may be framed. `public/_headers` expresses the
 * same split: `/embed/*` matches `/embed/table-converter` and not `/embed`.
 */
export const EMBED_SOURCE = '/embed/:path+';

/**
 * Next.js `source` for every other route. A negative lookahead rather than a
 * plain `/:path*` because `X-Frame-Options: DENY` has no "any origin" value to
 * override it with -- the only way to stop sending it on the embed routes is
 * to not match them in the first place. `header-parity.test.ts` reads this
 * constant, so the two files cannot drift apart over it.
 */
export const NON_EMBED_SOURCE = '/:path((?!embed/).*)';

/**
 * True only for a framable tool page. `/embed` and `/embed/` are the snippet
 * page and are not framable, which is why this is a prefix test with something
 * required after it rather than a `startsWith` on `/embed`.
 */
export function isEmbedRoute(pathname: string) {
  return (
    pathname.startsWith(EMBED_PATH_PREFIX) &&
    pathname.length > EMBED_PATH_PREFIX.length
  );
}

/** Next.js header `source` patterns matching LOCAL_MODEL_PATHS. */
export const LOCAL_MODEL_SOURCES = [
  '/image/background-remover',
  '/image/editor',
  '/_next/static/workers/:file(background-removal\\.worker-[\\w-]+\\.js)',
  '/image/heic-to-jpg',
  '/image/heic-to-png',
  '/_next/static/workers/:file(heic-decode\\.worker-[\\w-]+\\.js)',
  '/wasm/:path*',
  '/ocr/:path*',
];

export function loadsLocalModel(pathname: string) {
  return LOCAL_MODEL_PATHS.some((pattern) => pattern.test(pathname));
}

export function contentSecurityPolicy({
  development = false,
  localModel = false,
  embeddable = false,
}: {
  development?: boolean;
  localModel?: boolean;
  embeddable?: boolean;
} = {}) {
  const connectSrc = development
    ? "connect-src 'self' ws: wss:"
    : localModel
      ? "connect-src 'self'"
      : "connect-src 'none'";
  const scriptSrc =
    development || localModel
      ? "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'"
      : "script-src 'self' 'unsafe-inline'";
  return [
    "default-src 'self'",
    "base-uri 'self'",
    connectSrc,
    "font-src 'self'",
    "form-action 'none'",
    embeddable ? 'frame-ancestors *' : "frame-ancestors 'none'",
    "img-src 'self' blob: data:",
    "object-src 'none'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    // WebRTC is not covered by connect-src, so a peer connection would be a way
    // out of an otherwise sealed page. Chromium honours this directive; other
    // engines ignore it, which is why `local-source-policy.test.ts` also fails
    // the build if RTCPeerConnection appears in our own code.
    "webrtc 'block'",
    "worker-src 'self' blob:",
  ].join('; ');
}
