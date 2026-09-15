<div align="center">

# OpenTools

**Everyday browser tools. Your files never leave your device.**

[getopentools.com](https://getopentools.com) · [Report a bug](https://github.com/opentools/opentools/issues/new/choose) · [Security](.github/SECURITY.md) · [Sponsor](https://getopentools.com/support)

[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](LICENSE)
[![Zero Server Egress](https://img.shields.io/badge/Server%20Egress-0%20bytes-2ea44f.svg)](.github/SECURITY.md)
[![Tests](https://img.shields.io/badge/Tests-282%20passing-2ea44f.svg)](#local-development--quality-control)
[![Client-Side WebAssembly](https://img.shields.io/badge/Runtime-Client--Side%20WASM-654ff0.svg)](#the-zero-egress-privacy-promise)
[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-GitHub%20Sponsors-ea4aaa.svg?logo=githubsponsors&logoColor=white)](https://github.com/sponsors/opentools)

</div>

---

OpenTools is a free, open-source collection of PDF, image, developer, data,
text, math, and QR utilities that run **entirely inside your browser**. No
account, no upload, no watermark, no ads, no tracking.

## The Zero-Egress Privacy Promise

Most online converters upload your tax returns, invoices, photos, and source
code to someone else's server. OpenTools does the opposite: every computation
happens in-memory on your device.

| Layer | How it stays local |
| --- | --- |
| **Input** | Files are read as in-memory `File` / `ArrayBuffer` objects. Nothing is written to a server or to persistent storage. |
| **Compute** | PDF merge/extract runs `pdf-lib` in a dedicated **Web Worker**. Image work uses Canvas and `OffscreenCanvas`. AI tools (background removal, upscaling, transcription) run **WebAssembly / WebGL** inference in the tab. Hashing uses **WebCrypto**. |
| **Output** | Results are handed back as temporary `blob:` URLs and revoked on clear, cancel, or unmount. |
| **Enforcement** | Production responses ship `Content-Security-Policy: connect-src 'none'`, and the test suite rejects direct network primitives in local engine code. |
| **No telemetry** | No analytics, session replay, advertising, or payment SDK is loaded on any tool route. |

**Model downloads.** AI tools fetch their model weights once before first use.
These are app assets, like JavaScript or fonts — they never contain your data.
Background removal loads U²-Net (lite) and the ONNX Runtime WebAssembly binary
from this site only (`/models/`, `/ort/`).

You don't have to trust us: open DevTools → Network, go offline, and run a
tool. See [SECURITY.md](.github/SECURITY.md#verifying-the-promise-yourself).

## Core Tool Suite

| Suite | Tools | Routes |
| --- | --- | --- |
| 📄 **Document & PDF** | Merge, extract pages, rotate & page tools, images → PDF | `/pdf/merge`, `/pdf/extract-pages`, `/pdf/page-tools`, `/pdf/images-to-pdf` |
| 🖼️ **Image & Media** | Background removal, optimizer (resize/compress/convert), AI upscaler, editor, audio transcription · *OCR and video compression in development* | `/image/*`, `/audio/transcribe` |
| ⚡ **Developer Utilities** | JSON formatter, Base64 encoder/decoder, UNIX timestamp, UUID generator, file hash (SHA-256/384/512) · *SQL visualizer in development* | `/developer/*`, `/data/json`, `/file/hash-calculator` |
| 📊 **Data & Spreadsheets** | CSV ↔ JSON transformer, delimiter conversion | `/data/csv-to-json`, `/data/workbench` |
| 🔤 **Text & Writing** | Word count, case converter, regex find & replace | `/text/case-converter`, `/text/workbench` |
| 🧮 **Math & Science** | Unit converter, percentage calculator, date difference, age calculator | `/math/*`, `/science/workbench`, `/date/*` |
| 📱 **QR & Barcode** | Vector QR generator (URL, Wi-Fi, vCard, MeCard, social), barcode tools | `/qr/workbench` |

Every tool shows a completion receipt with measured duration, output facts,
and an explicit privacy boundary.

## Sponsorship & Patronage

OpenTools is free forever. There are no paid tiers and no result is ever gated.
The project is sustained entirely by voluntary support from people who find it
useful. Both channels charge **0% platform fees**, so the whole contribution
funds development, security audits, and hosting.

| Channel | For | Methods |
| --- | --- | --- |
| 🌍 **[GitHub Sponsors](https://github.com/sponsors/opentools)** | International supporters | Credit/debit card, Apple Pay, Google Pay, PayPal |
| 🇮🇳 **UPI** | Supporters in India | Any UPI app via QR code or `upi://pay` deep link on mobile |

The [`/support`](https://getopentools.com/support) page picks the right
channel automatically. Detection (`isLikelyIndiaVisitor()` in
[`lib/support-config.ts`](lib/support-config.ts)) runs locally using your
browser's timezone and language settings — no IP lookup or geolocation request
is made. You can always switch channels manually.

The support page is fully isolated from tools: it never receives file names,
job data, or results.

## Local Development & Quality Control

### Prerequisites

- **Node.js >= 22.13.0**
- npm 10+

### Commands

```bash
npm install        # install dependencies
npm run dev        # start the local development server
npm run qc         # full quality-control suite (must pass before a PR)
npm run build      # production build (Cloudflare Workers output in dist/)
```

`npm run qc` runs the fail-fast gates in order:

1. **Format** — `oxfmt --check`
2. **Unit + all-operation I/O** — 282 Vitest tests, including local-source zero-egress policy checks
3. **Type check** — `tsc --noEmit`
4. **Lint** — OxLint with warnings denied
5. **Design system contract** — semantic Tailwind tokens only
6. **Build** — production Vinext build
7. **SBOM inventory** — checked-in CycloneDX SBOM must match the lockfile
8. **Blueprint integrity** — runs only inside the private blueprint workspace

`npm run qc:release` additionally runs `npm audit --audit-level=high`.

### Tech stack

Vinext (Next.js API on Vite) · React 19 · Tailwind CSS v4 · Base UI ·
`pdf-lib` · ONNX Runtime Web · `@xenova/transformers` · TensorFlow.js · Web Workers ·
Cloudflare Workers.

### Project layout

```text
app/          routes (one folder per tool)
components/   shared workbench UI and tool components
lib/tools/    pure tool logic, manifests (catalog.ts), and tests
workers/      Web Workers for heavy processing
scripts/      QC, design-system, and SBOM scripts
release/      checked-in SBOM
```

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first. In
short:

- Tools must never make network requests with user data, and must never add
  analytics or tracking.
- Dependencies must be MIT-compatible and recorded in
  [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
- Use semantic design tokens (`bg-success`, `text-foreground`, `border-border`).
- `npm run qc` must pass.

## Security Policy

Unexpected network egress, telemetry, or tracking is treated as a
**critical vulnerability**. Report it privately via GitHub's
[private vulnerability reporting](https://github.com/opentools/opentools/security/advisories/new) — not a public
issue. Full policy: [`.github/SECURITY.md`](.github/SECURITY.md).

## License

[MIT](LICENSE) © 2026 OpenTools Contributors. Third-party components retain
their own licenses — see [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
