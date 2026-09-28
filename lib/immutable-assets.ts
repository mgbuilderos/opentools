/**
 * Version tokens for the vendored binaries under `public/ort`, `public/models`
 * and `public/wasm`, so those files can be served `immutable` honestly.
 *
 * These four are the heaviest thing the site hands a visitor — 17.8 MB on disk,
 * and 7.45 MB over the wire before the background remover can start (3.09 MB
 * for the Brotli-compressed ORT runtime plus 4.36 MB for weights that barely
 * compress at all). Until 2026-09-27 they were also the only large assets with
 * no cache policy of their own: they fell through to the `/*` rule in
 * `public/_headers` and were served `max-age=0, must-revalidate`.
 *
 * Measured against production on 2026-09-27, before this existed:
 *
 *   /ort/ort-wasm-simd-threaded.wasm   max-age=0, must-revalidate, s-maxage=3600
 *   /models/u2netp.onnx                max-age=0, must-revalidate, s-maxage=3600
 *   /wasm/libheif.wasm                 max-age=0, must-revalidate, s-maxage=3600
 *   /ocr/core/tesseract-core-*.wasm    max-age=31536000, immutable  <- already right
 *
 * So a returning visitor had to ask the server about every one of them before
 * the tool would start, and a browser that had evicted the 12 MB ORT binary —
 * large entries are evicted first — paid the entire download again.
 *
 * ## Why the version lives in the query string
 *
 * `immutable` is a promise that the bytes at this URL will never change, and it
 * is only keepable if the URL changes when the bytes do. These filenames come
 * from the upstream package and stay the same across versions, and renaming
 * them is not free either: ORT resolves `mjs` and `wasm` as a pair, and the
 * OCR prefix next door depends on sibling filenames. A query string changes the
 * URL without touching a filename.
 *
 * That only works if the shared cache keys on the query string, so it was
 * verified against production rather than assumed (2026-09-27): two requests
 * for `/wasm/libheif.wasm?v=a<n>` answered `cf-cache-status: MISS` then `HIT`,
 * a third for `?v=b<n>` answered `MISS`, and all three still carried the
 * `Cache-Control` from the matching `public/_headers` rule — the asset layer
 * matches the rule on the path and ignores the query.
 *
 * ## What keeps this honest
 *
 * Each token is the first 16 hex characters of the file's SHA-256.
 * `immutable-assets.test.ts` recomputes all four from `public/` and fails when
 * one is stale, so a replaced binary cannot keep its old URL — which is the one
 * way `immutable` turns into a visitor pinned to a year-old cache entry. It
 * also fails if `public/_headers` stops covering one of these prefixes, because
 * a token in the URL buys nothing while the response still says `max-age=0`.
 *
 * `/models/u2netp.onnx` is pinned twice over: its token is the leading half of
 * `U2NETP.sha256`, which `u2netp.test.ts` already checks against the file.
 */
export const IMMUTABLE_ASSET_VERSIONS = {
  '/ort/ort-wasm-simd-threaded.mjs': 'e9ba2350c370278f',
  '/ort/ort-wasm-simd-threaded.wasm': '06b3f98e5aa2fffe',
  '/models/u2netp.onnx': '309c8469258dda74',
  '/wasm/libheif.wasm': 'e4aa8333fbe55ec7',
} as const;

export type ImmutableAssetPath = keyof typeof IMMUTABLE_ASSET_VERSIONS;

/**
 * The URL to fetch one of these assets from. Always use this rather than the
 * bare path: the bare path is a cache entry that can never be invalidated.
 */
export function immutableAssetUrl(assetPath: ImmutableAssetPath): string {
  return `${assetPath}?v=${IMMUTABLE_ASSET_VERSIONS[assetPath]}`;
}
