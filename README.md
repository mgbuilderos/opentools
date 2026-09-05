# Local tools release candidate

The quality-first implementation slice of the All-in-One Browser Tools blueprint. The UI deliberately uses the neutral working label `Tools`; no proposed brand or domain has been approved for public use.

## Working routes

- `/` — searchable implemented catalog and platform entry point.
- `/text/case-converter` — deterministic local text transformation.
- `/data/json` — JSON validation, format, minify, and recursive object-key sort.
- `/data/csv-to-json` — strict quoted CSV parsing and JSON serialization.
- `/pdf/merge` — PDF signature inspection, ordering, merge, cancel, download, runtime reopen check, and measured receipt in a dedicated Web Worker.
- `/pdf/extract-pages` — page/range parsing, ordered extraction, cancellation, validation, and download through the shared PDF worker.
- `/image/optimize` — static JPEG/PNG/WebP resize, compress, and convert with output decode/dimension validation.
- `/support` — isolated support-flow preview. It receives no file, filename, job, receipt, or identity data and has no live payment provider.

## Commands

```text
npm run dev
npm run format
npm run lint
npm run typecheck
npm test
npm run build
```

## Privacy state

No analytics or payment SDK is installed. Local engine source is checked for common direct network primitives, and the production CSP declares `connect-src 'none'`. The interface does **not** claim formal `0 file bytes uploaded` release proof yet: ADR-005 still requires browser, proxy, CDN, log, error, cancel, batch, and cross-browser evidence.

## Architecture

- Versioned canary manifests live in `lib/tools/catalog.ts`.
- Pure text/data/image helpers live in `lib/tools/text-case.ts`, `lib/tools/structured.ts`, and `lib/tools/image.ts`.
- PDF merge/extract capability code lives in `lib/tools/pdf/engine.ts`, with selection parsing in `lib/tools/pdf/page-selection.ts`.
- The browser-facing host speaks the typed protocol in `lib/tools/pdf/protocol.ts` to `workers/pdf-merge.worker.ts`.
- The PDF engine loads only on the PDF task route.
- Inputs remain immutable `File` objects; worker buffers are transferred, outputs use temporary object URLs, and workers/object URLs are destroyed on cancel, clear, replacement, or unmount.
- Production headers are defined in `next.config.ts`.

## Candidate limits

This slice is not a public release. It lacks the dedicated cross-origin compute realm, complete egress report, producer-diverse PDF/image corpora, browser/device/performance matrix, offline cache/revocation layer, full SBOM/legal approval, and human accessibility study. See the root `implementation/RELEASE_READINESS.md` and `HANDOFF.md` for the next gate.
