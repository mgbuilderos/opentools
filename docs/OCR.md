# OCR implementation

OpenTools exposes two English-only, on-device OCR surfaces:

- `/image/to-text` reads PNG, JPEG, WebP and BMP images, one at a time or as a sequential batch.
- `/pdf/ocr` turns an image-only PDF into a searchable PDF and a plain-text download.

Neither route imports Tesseract.js in its initial client bundle or requests an OCR asset when the route loads or a file is selected. The first request happens only after the user presses a button whose label states the exact maximum initial transfer: **9,832,213 bytes (9.38 MiB)**.

## Vendored runtime

The runtime is pinned and served from `public/ocr`; it has no CDN fallback.

| Component                     | Version       | License    | Checked-in runtime bytes |
| ----------------------------- | ------------- | ---------- | -----------------------: |
| `tesseract.js` worker         | 7.0.0         | Apache-2.0 |                  111,307 |
| English `4.0.0_best_int` data | 1.0.0 package | Apache-2.0 |                2,952,873 |
| fallback LSTM core            | 7.0.0         | Apache-2.0 |                6,751,845 |
| SIMD LSTM core                | 7.0.0         | Apache-2.0 |                6,757,073 |
| relaxed-SIMD LSTM core        | 7.0.0         | Apache-2.0 |                6,768,033 |

A browser downloads the worker, English data and one compatible core, not all three cores. The largest possible combination is therefore 111,307 + 2,952,873 + 6,768,033 = **9,832,213 bytes**. `lib/tools/ocr/assets.test.ts` compares this disclosure with the actual checked-in file sizes so a runtime update cannot silently make the promise stale.

Source URLs, file ownership and local license copies are recorded in `public/ocr/PROVENANCE.txt`. SHA-256 checksums for the runtime inputs are:

| File                      | SHA-256                                                            |
| ------------------------- | ------------------------------------------------------------------ |
| `worker.min.js`           | `576b7df7e3393e137e51849357c9adb53fe7ac1bb69bfa06cf3d61520f182c6d` |
| `lang/eng.traineddata.gz` | `45b4cb346724ac1774f1c36f42f182b887bcdb28ebe63e6fff90ac41f3fcff91` |
| fallback JS wrapper       | `eef5f8b2f8e20e150680b20adaec4a60babafee3adbe8a94583c81fee46e8680` |
| fallback WASM             | `66b17df6e20e150680b20adaec4a60babafee3adbe8a94583c81fee46e8680`   |
| SIMD JS wrapper           | `c58b46a4c796c0b8afccf77591d5b875b6896b45d402bbce8caa6f5362447b38` |
| SIMD WASM                 | `34e8d50cac216427d86bf397d610fdd9f49492539bbcdfbfccc4eda20c810bea` |
| relaxed-SIMD JS wrapper   | `861a536cf9ef8e63cb644d57bab39c388f37f7d6b6f60024b741c5f6b39a59b3` |
| relaxed-SIMD WASM         | `7985c92d4c64e7267d24cadffe1b2a1da6bf8aa55fdcaf953fe94fe122a24545` |

## Runtime and security boundary

`lib/tools/ocr/runtime.ts` dynamically imports `tesseract.js` only after explicit user action. It passes local `workerPath`, `corePath` and `langPath` values and sets `workerBlobURL: false`. The dedicated worker is therefore created directly from `/ocr/worker.min.js` rather than from a blob that would inherit the page policy.

The tool pages retain the site's strict `connect-src 'none'` policy. Only responses under `/ocr/*` receive the existing self-hosted-model policy (`connect-src 'self'` plus the required WebAssembly execution policy). The service worker is unchanged and does not precache OCR files. Browser egress tests fail on any off-origin request.

Tesseract reports worker progress to both interfaces. Cancelling aborts the active recognition job and terminates its worker; if cancellation happens during worker initialisation, the just-created worker is terminated as soon as initialisation returns. Image batches use one worker sequentially and the shared batch runner stops before beginning another file.

## Image recognition

The image tool accepts PNG, JPEG, WebP and BMP files up to 40 MiB each. It returns editable/selectable text, a `.txt` download, measured whole-image confidence, and a review view that marks words below the deterministic 75 confidence threshold. Confidence is recogniser output, not a correctness claim.

Word boxes are assembled into top-to-bottom lines by the pure function in `lib/tools/ocr/layout.ts`. Its tests cover reading order, line construction, empty input, confidence clamping and the low-confidence boundary without loading a model or WebAssembly.

## Searchable PDF construction

The PDF tool accepts one PDF up to 150 MiB and 50 pages. Before creating the OCR worker, it extracts the existing text layer with PDF.js. Any selectable text causes an explicit refusal, and browser coverage proves that refusal makes no request under `/ocr/`.

For a scan, each page is rendered at 2× scale, capped at 16 million pixels, and recognised sequentially. `lib/tools/pdf/ocr-pdf.ts` loads the original document and appends each recognised word with PDF text rendering mode 3 (`Invisible`). The original page content is not rasterised, replaced or visibly redrawn. Word coordinates are mapped from the rendered page back into PDF page coordinates. The result preserves the page count and visual page content while adding a searchable text layer. A separate UTF-8 plain-text download and per-page measured confidence are also provided.

The invisible layer uses the standard Helvetica font and the product is English-only. Unsupported non-ASCII glyphs are normalised or omitted from that PDF layer; the plain-text result retains the recogniser's text. Rotated or unusually transformed source pages can have less exact selection geometry even when search and extraction work.

The PDF-to-Word and PDF-to-Excel scanned-document refusals offer **Read this scan with OCR**. The existing in-memory/IndexedDB handoff carries the already-selected file so the user does not have to choose it again.

## Verification

The focused unit suite covers OCR assets, layout, PDF layer construction, batch execution and scoped CSP behavior. Browser tests run in Chromium and WebKit and prove:

- a cold route and file selection request no OCR assets;
- an explicit size-labelled action recognises the committed `e2e/fixtures/ocr-known-text.svg` fixture as `OPEN TOOLS OCR` exactly;
- a two-image batch completes sequentially;
- an image-only PDF produces a `%PDF-` download whose text is independently recovered by the system `pdftotext` executable;
- an existing-text PDF is refused before model download;
- both PDF-to-Word and PDF-to-Excel carry refused scans into PDF OCR; and
- no OCR flow makes an off-origin request.

OCR remains probabilistic. Users should check names, numbers, punctuation, skewed pages, handwriting, low-contrast input and every low-confidence word before relying on the output.
