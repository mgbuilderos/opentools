# Forensic audit — 2026-09-19

**Asked for by:** owner (Maulik) — *"is there any other bug in the tool that
needs to be checked. can you do a forensic audit"*
**Run by:** Claude Code, worktree `apps/claude-dropzone`, branch
`claude/dropzone-handoff` (on top of the smart-dropzone fixes of 2026-09-18).

Companion to `DEBUG_2026-09-18_dropzone-handoff.md`. That file covers the
reported dropzone bug and what was found beside it. This one is the sweep that
followed: every tool page, measured rather than read.

---

## Method

Four passes. Everything below was **measured on the production build**, not
inferred from source.

1. **Mechanical classes, by source sweep** — object-URL lifetimes, worker
   lifetimes, `accept` attributes, file-input resets, declared-vs-enforced
   size limits.
2. **Every page at phone width (375×812)** — horizontal overflow, console
   errors, and the size of every interactive control. Harness:
   `e2e-audit/mobile-audit.spec.ts`.
3. **Every advertised route** — all **664** `href`s the catalog hands out,
   loaded and checked for an error banner the visitor never caused, and for
   where keyboard focus lands. Harness: `e2e-audit/error-on-load.spec.ts`.
4. **HTTP status** of all 39 distinct pages.

Both harnesses are kept in `e2e-audit/` and are audits, not release gates —
they are not in `playwright.config.ts` and do not run in `npm run qc`.

### What came back clean

Worth recording, so nobody re-runs these on a hunch:

| Check | Result |
|---|---|
| Horizontal overflow at 375px | **0 of 39 pages** |
| Console errors on the production build | **0 of 39 pages** |
| HTTP status of every page | **39 × 200** |
| Declared size limits vs enforced constants | **all match** |
| File-accepting tools with a size guard | **all of them** |
| Workers created vs terminated | all terminated on completion (one gap, F4 below) |
| File inputs missing `accept` | 3, all deliberately generic (hash, file workbench, dropzone) |

The earlier report noted a Base UI console error on every page load. This sweep
confirms it is **development-only** — zero console errors in the production
build. The finding stands as filed (it is still noise for anyone developing),
but it does not reach visitors.

---

## F1 — 34 advertised routes greeted the visitor with an error, and all 34 stole focus

**Severity: high.** The most-linked workbench on the site looked broken before
you touched it.

### What you saw

Open `/text/workbench` — or any of 31 `?tool=` deep links into it — and a red
box sits above the empty input:

> **Couldn't create a result**
> Enter some text first.

Nobody typed anything. The tool is reporting your failure to use it yet.

Worse, `document.activeElement` on load **was that error box**. Measured: 34 of
34. So a screen reader's first announcement on the page is an error message,
and a keyboard user starts inside it.

### Spread

| Page | Routes affected | Message |
|---|---|---|
| `/text/workbench` | **31** | Enter some text first. |
| `/subtitles/workbench?tool=subtitle-merge` | 1 | Choose or paste the second subtitle file. |
| `/creator/workbench?tool=audio-trimmer` | 1 | Choose a WAV audio file to trim. |
| `/qr/workbench?tool=qr-code-logo-embedder` | 1 | Enter a logo image first. |

### Why

Both workbench shells auto-run 250 ms after mount so results appear as you
type. On mount the inputs are empty, the operation throws, the catch writes the
message into a `role="alert"` box — and a second effect focuses that box
whenever an error appears. Pre-existing: identical on `origin/main`, confirmed
with `git show origin/main:components/text-workbench-tool.tsx`.

### Fixed

- `text-workbench-tool.tsx` — the auto-run returns early on empty input and
  clears the result instead of running an operation that can only fail.
- `schema-workbench-tool.tsx` — the auto-run is now **silent until the visitor
  changes something**: `execute({ silent })` shows an empty state instead of an
  error, `touched` is set by `update` and `updateFile` and reset when the
  operation changes. Pressing the action button is never silent, so a genuine
  empty-field error still appears when you ask for one. Operations with useful
  defaults still auto-run and show their result on load, as before.

**Measured after: 0 of 664.**

---

## F2 — Controls too small to hit on a phone, on the flagship image tools

**Severity: medium.** WCAG 2.2 SC 2.5.8 (Target Size (Minimum), AA) asks for
24×24 CSS pixels.

Measured before, at 375px:

| Control | Page | Size |
|---|---|---|
| 4 × adjustment sliders | `/image/editor`, `/image/background-remover` | 309×**16** |
| Quality slider | `/image/optimize` | 309×**16** |
| Tolerance / edge-softness sliders | `/image/background-remover` | 309×**16** |
| "Remove background" checkbox | `/image/editor` | 14×**16** |
| AI / Solid mode radios | `/image/background-remover` | **13×13** |
| "Choose files" — the tool's primary control | `/file/workbench` | 257×**16** |

A slider is the case that matters most: a checkbox or radio can be operated by
tapping its label, **a slider cannot** — you have to land on the track.

### Fixed

Sliders given a 24px-tall hit area; checkbox and radios raised to 20px inside
labels that are themselves large; the file workbench's primary control given a
44px row.

Measured after, on `/image/background-remover`:

| Control | Input box | Effective target (its label) |
|---|---|---|
| 4 × slider | 309×**24** | 309×52 |
| slider | 149×**24** | 149×64 |
| checkbox | 20×20 | **275×64** |
| radio | 20×20 | **147×44** |
| radio | 20×20 | **99×44** |

Every interactive control now meets 24×24 or exceeds it through its label.

---

## F3 — Two download helpers revoked the blob URL in the same tick as the click

**Severity: low. Not observed failing — filed as an inconsistency.**

Six places build a blob, click a hidden anchor and revoke. **Four** defer the
revoke by a tick; **two did not**:

- `components/schema-workbench-tool.tsx` — backs seven routes
- `components/file-workbench-tool.tsx`

The deferred form is deliberate elsewhere in this codebase, and is the
documented-safe ordering: a URL revoked in the same tick can be gone before the
browser fetches it. Honesty note: the WebKit path through
`schema-workbench-tool` **is** covered by `subtitle-workbench.spec.ts` and
passes, so this is not a proven failure in the browsers tested — it is two
sites that missed a fix the rest of the file set already has.

**Fixed** — both deferred, with the reason in a comment.

---

## F4 — Background removal kept running after you left the page

**Severity: medium on a phone.**

`removeBackgroundLocally` terminates its worker in `.finally()`, so a completed
run cleans up. But navigating away **mid-inference** left a worker holding the
~16 MB U²-Net model and burning a core until it finished work nobody was
waiting for. On a phone that is the difference between a warm device and a hot
one.

**Fixed** — the worker is handed back to the component, which terminates it on
unmount.

---

## F5 — An unknown `?tool=` stayed in the address bar

**Severity: low, but it is a truth rule.**

`SchemaWorkbenchTool` rewrites the URL to the default operation when `?tool=`
names something that does not exist — `tool-deep-links.spec.ts` asserts it for
`/date/workbench`. The three components fixed on 2026-09-18 (`text-`, `file-`
and `math-workbench-tool`) did not: they fell back to the default operation but
**left the false value in the URL**, so the address bar advertised a tool the
page was not showing.

**Fixed** — all three now match the shipped behaviour.

---

## F6 — The new handoff could hang on "Opening…"

**Severity: low. This one is mine, from 2026-09-18.**

`stashHandoff` and `claimHandoff` awaited IndexedDB with no time limit.
IndexedDB can block indefinitely — another tab holding an upgrade, a device
under storage pressure — and the tool button would have sat on "Opening…"
forever.

**Fixed** — both are bounded by `HANDOFF_TIMEOUT_MS` (5 s) and fall back to the
behaviour that existed before the handoff: navigate, and let the tool show its
own picker.

---

## Still open — not mine to decide

Carried forward from the 2026-09-18 report, all filed under §7 of
`AGENT_BOARD.md`:

1. **`/pdf/page-tools?tool=…` and `/image/editor?tool=…` advertise tools those
   pages do not have.** Neither page has an operation concept; "Rotate PDF" and
   "Delete Pages" land on the identical screen. Owner decision.
2. **Base UI logs an error on every page load in development** — shared and
   Antigravity-owned files.
3. **The e2e suite can attach to another worktree's build**, and
   `egress-proof.spec.ts` hardcodes `localhost:8788` so the privacy proof only
   works on one port. `e2e/**` is assigned to neither agent.

---

## Gate

- `npm run qc` — **PASS, 8/8**
- `vitest` — **906 passed**
- `oxlint` / `oxfmt` / `tsc` — clean
- `npm run build` — exit 0
- Playwright — see the commit message for the recorded run
- Audit harnesses re-run after the fixes: **uncaused errors 34 → 0**,
  overflow 0, console errors 0, undersized sliders 5 → 0

### Re-running the audit yourself

```bash
cd apps/claude-dropzone
npm run build
npx playwright test --config=playwright.audit.config.ts
cat audit-out/error-on-load.json     # should be []
cat audit-out/mobile-audit.json
```
