/**
 * Content Security Policy shared by `proxy.ts` and `next.config.ts`.
 * `public/_headers` mirrors it for statically served assets.
 *
 * Every route blocks all network connections. The background-removal pages and
 * their worker are the only exception: they may fetch same-origin assets (the
 * ONNX Runtime WebAssembly binary and model weights) and compile WebAssembly.
 * No third-party origin is ever allowed.
 */
const LOCAL_MODEL_PATHS = [
  /^\/image\/(?:background-remover|editor)\/?$/u,
  /^\/_next\/static\/workers\/background-removal\.worker-[\w-]+\.js$/u,
  /^\/ocr\//u,
];

/** Next.js header `source` patterns matching LOCAL_MODEL_PATHS. */
export const LOCAL_MODEL_SOURCES = [
  '/image/background-remover',
  '/image/editor',
  '/_next/static/workers/:file(background-removal\\.worker-[\\w-]+\\.js)',
  '/ocr/:path*',
];

export function loadsLocalModel(pathname: string) {
  return LOCAL_MODEL_PATHS.some((pattern) => pattern.test(pathname));
}

export function contentSecurityPolicy({
  development = false,
  localModel = false,
}: { development?: boolean; localModel?: boolean } = {}) {
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
    "frame-ancestors 'none'",
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
