# Canonical Inter-Agent Handoff & System State

> **Notice to any AI Model, Agent, or Engineer**: Read this document before making any changes. This project is built as a **forever system** with strict cryptographic, architectural, and design invariants that must never be violated.

---

## 1. Current State & Verification Baseline

- **Active Worktree**: `apps/web-ui-ux-worktree`
- **Active Branch**: `codex/ui-ux-category-shell`
- **Catalog Size**: **585 local operations** across 16 workbenches, with a complete programmatic taxonomy of **1,000 tools** across 19 categories.
- **Automated Verification Status**: **All 8 Mandatory Quality Gates Passing** (`npm run qc`).
  - Unit Tests: **30 test files, 269 test cases passing (0 failures)**.
  - TypeScript: Zero errors (`tsc --noEmit`).
  - Linter: Zero errors, zero warnings across 141 files (`oxlint --deny-warnings`).
  - Design QC: Operator v1 monochrome token verification across all UI files.
  - Build: Full Next.js / Vinext build compiling 36 static routes, 19 category pillar hubs, and `/guides/:slug` dynamic SSR.
  - Supply Chain: CycloneDX 1.5 SBOM validated.
  - Blueprint: 104 required files, 1,000 catalog tools verified.

---

## 2. Non-Negotiable System Invariants

Every agent modifying this codebase must uphold these four cardinal invariants:

1. **Zero Network Egress (`connect-src \x27none\x27`)**:
   - The Content Security Policy in `next.config.ts` forbids network connections.
   - Guarded directories (`lib/tools`, `workers`, `components`, `app`) are protected by `lib/tools/local-source-policy.test.ts`.
   - Never use `fetch()`, `XMLHttpRequest`, `WebSocket`, or embed literal `https://` in guarded files.
   - Never import `"next/link"` in client components (use standard `<a href="...">` to prevent background RSC prefetching).
2. **100% Free Forever with Zero Paywalls**:
   - Tools must never require signups, email gates, credits, subscriptions, or forced delays.
   - Voluntary support is offered at the moment of value receipt (upon task completion), but the "Download Free" button must execute immediately without obstruction.
3. **Operator v1 Monochrome Design System**:
   - Only semantic tokens allowed (`bg-card`, `bg-muted`, `text-muted-foreground`, `text-success`, `border`).
   - Arbitrary color utilities (`bg-blue-500`, `text-red-600`) and decorative gradients (`bg-gradient-to-r`) are forbidden by `scripts/design-system-qc.mjs`.
   - Typography must follow display contracts (`h1` requires `text-3xl font-semibold`).
4. **Ponytail Fast-Path Architecture**:
   - In-memory compute over disk I/O; typed arrays (`Uint8Array`, `Float32Array`) over dynamic objects.
   - Zero-copy buffer transfer in Web Workers via `toTransferableBuffer()`.
   - Static candidate indexing in `catalog.ts` avoiding per-keystroke heap allocations.

---

## 3. Inventory of Implemented Systems

### A. Programmatic SEO, AEO & GEO Engine

- **1,000 Tool Taxonomy** (`lib/seo/tool-catalog-data.ts`): Typed static dataset derived from `registries/tool_catalog.csv`.
- **Internal Linking Graph** (`lib/seo/internal-linking-graph.ts`): Bidirectional topic cluster mesh linking 19 Category Pillar Hubs and 3–5 contextual workflow sibling guides per tool with zero orphan pages.
- **Answer Engine Optimization (AEO)**: 45-to-55 word direct declarative answer blocks (`.ds-direct-answer`) for Perplexity, ChatGPT Search, and Google AI Overviews.
- **Generative Engine Optimization (GEO)**: Semantic entity graphs (ISO 32000-1 for PDF, NIST SP 800-38D for AES-GCM, W3C WebAssembly) embedded in Schema.org JSON-LD.
- **Inline Architectural Flowcharts**: Monochrome SVG diagrams illustrating local WebAssembly RAM execution vs cloud uploads.
- **Category Pillar Hubs** (`app/guides/category/[category]/page.tsx`): Dedicated directory pages for all 19 categories.
- **Dynamic Sitemap** (`app/sitemap.ts`): 1,055 URLs programmatically indexed with priority tiers.
- **Robots Directives** (`app/robots.ts`): Permitted indexation of `/` and `/guides/*`.

### B. Cybersecurity & Client-Side Encryption

- **AES-GCM 256-bit Tool** (`file-workbench.ts`): Authenticated file encryption (`file-encrypt`) and decryption (`file-decrypt`) using PBKDF2 (100,000 iterations, 16-byte random salt, 12-byte IV, `ENC1` header).
- **Ephemeral Memory Hygiene**: Automatic Blob URL revocation via `URL.revokeObjectURL()` upon download trigger.

### C. Product-Led Growth & Value Receipt

- **Value Receipt Banner** (`schema-workbench-tool.tsx`): Sub-second speed badge + 1-click "Share Speed Receipt" to clipboard.
- **Support Hub** (`app/support/page.tsx`): Voluntary tiers ($3, $10, $25) and zero-middleman channels (GitHub Sponsors, Buy Me a Coffee, BTC, ETH, SOL).

---

## 4. Verification Commands

To verify the tree at any time, run:

```bash
# Full 8-stage automated quality control gate
npm run qc

# Run unit tests only
npx vitest run

# Run type check only
npm run typecheck

# Run linter only
npm run lint

# Format with oxfmt
npm run format
```

---

## 5. Machine-Readable Audit Ledger

Every modification made by any agent is recorded in `docs/agent_ledger.jsonl`. Always append a new JSON object to this ledger upon completing a task.
