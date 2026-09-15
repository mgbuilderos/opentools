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

AI and media runtime packages:

- `@xenova/transformers` 2.x — Apache-2.0.
- `@tensorflow/tfjs` 4.x — Apache-2.0.
- `upscaler` 1.x — MIT.
- `onnxruntime-web` 1.21.0 — MIT (Microsoft). Its WebAssembly binary is
  self-hosted at `public/ort/ort-wasm-simd-threaded.wasm`.

Model weights:

- `public/models/u2netp.onnx` — U²-Net (lite) by Xuebin Qin et al.,
  Apache-2.0 (<https://github.com/xuebinqin/U-2-Net/blob/master/LICENSE>).
  ONNX export from the rembg project (MIT). SHA-256
  `309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8`.
  Apache-2.0 is compatible with this project's MIT license; this notice must
  be kept when redistributing the weights.

Development-only independent validation uses `pdfjs-dist` 6.3.289 under Apache-2.0.

This summary does not replace the license texts distributed in the installed packages or the production notice/SBOM process.
