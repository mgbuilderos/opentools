# Third-party notices — private release candidate

Exact versions, tarball integrity values, transitive packages, and the engineering decision are recorded in [`../../governance/licenses/GATE_A_DEPENDENCY_REVIEW.md`](../../governance/licenses/GATE_A_DEPENDENCY_REVIEW.md) and `package-lock.json`.

Primary runtime packages:

- `pdf-lib` 1.17.1 — MIT.
- `@pdf-lib/standard-fonts` 1.0.0 — MIT.
- `@pdf-lib/upng` 1.0.1 — MIT.
- `pako` 1.0.11 — MIT and Zlib.
- `tslib` 1.14.1 — 0BSD.
- `qrcode` 1.5.4 — MIT.
- `dijkstrajs` 1.0.3 — MIT.
- `pngjs` 5.0.0 — MIT.
- `yargs` 15.4.1 and its locked transitives — MIT-family/package-declared terms; see the SBOM for the complete graph.
- React packages 19.2.8 — MIT.
- Base UI React 1.7.0 — MIT.
- Lucide React 1.31.0 — ISC.
- vinext 1.0.0-beta.9 — MIT.

AI runtime packages:

- `onnxruntime-web` 1.21.0 — MIT (Microsoft). Its WebAssembly binary is
  self-hosted at `public/ort/ort-wasm-simd-threaded.wasm`.

Model weights:

- `public/models/u2netp.onnx` — U²-Net (lite) by Xuebin Qin et al.,
  Apache-2.0 (<https://github.com/xuebinqin/U-2-Net/blob/master/LICENSE>).
  ONNX export from the rembg project (MIT). SHA-256
  `309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8`.
  Apache-2.0 is compatible with this project's MIT license; this notice must
  be kept when redistributing the weights.

## LGPL-3.0 component — HEIC decoding

`libheif-js` 1.23.2 is **LGPL-3.0**, the only non-permissive licence in this
project. The owner accepted it on 2026-09-24 specifically for HEIC decoding
(`implementation/DECISION_LOG.md`). This project's own code remains MIT and the
repository LICENSE is unchanged.

- Upstream: libheif by Dirk Farin / struktur AG —
  <https://github.com/strukturag/libheif>. Corresponding source for the exact
  version shipped here: <https://github.com/strukturag/libheif/releases>.
  The npm wrapper's source is at <https://github.com/catdad-experiments/libheif-js>.
- Full LGPL-3.0 text ships in the installed package at
  `node_modules/libheif-js/LICENSE` and `node_modules/libheif-js/libheif-wasm/LICENSE`.

**The binary is a separate, replaceable artefact, and that is a licence
condition rather than a packaging preference.** `public/wasm/libheif.wasm`
(1,422,377 bytes, SHA-256 `e4aa8333fbe55ec7c6c776f735236f40bed9103188498f8131d4e52b73cdfee8`)
is served as its own file and loaded at runtime; substituting your own build of
libheif is a matter of replacing that one file. Separate runtime loading is the
analogue of dynamic linking, which is the LGPL clause permitting use from a
non-GPL project.

**Do not switch to the `libheif-js/wasm-bundle` entry point.** It resolves to
`libheif-bundle.js`, which embeds the same binary as base64 — one file with no
path to configure, so it is the natural default — and statically bundling the
LGPL binary would breach the separability condition this approval rests on. It
is also larger: 0.66 MB gzipped against 0.45 MB for the separate `.wasm`.

**Patents.** HEVC decoding carries patent claims. The owner accepted that
exposure on 2026-09-24; it has **not** been cleared. No page, notice or
marketing copy may describe this tool as patent-safe.

Development-only independent validation uses `pdfjs-dist` 6.3.289 under Apache-2.0.

This summary does not replace the license texts distributed in the installed packages or the production notice/SBOM process.
