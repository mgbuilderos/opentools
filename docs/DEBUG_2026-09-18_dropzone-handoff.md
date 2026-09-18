# Debug report — the smart dropzone lost your file, and four related bugs

**Date:** 2026-09-18
**Reported by:** owner (Maulik), from mobile testing
**Investigated and fixed by:** Claude Code
**Worktree:** `apps/claude-dropzone`, branch `claude/dropzone-handoff`, off `origin/main` `9a4242e`

> The original report, verbatim:
> *"when i drop pdf in the magic box and select a tool but when it actually
> works, then again the pdf is removed and need to reupload again.. that is a
> bug in our top feature."*

This file records what was wrong, why, what was changed, and the evidence. It
is written so somebody who was not in the session can check every claim.

---

## Summary

| # | Bug | Severity | Status |
|---|---|---|---|
| 1 | Smart dropzone never handed the file to the tool you chose | **Blocker** — the headline feature did nothing | **Fixed** |
| 2 | Pasted text was cut to 100 characters before it reached the tool | High | **Fixed** |
| 3 | After clearing, choosing the *same* file again did nothing | High | **Fixed** |
| 4 | `?tool=` deep links opened the default tool on 3 more pages | High | **Fixed** |
| 5 | Workbench file control kept showing a file the tool no longer held | Medium | **Fixed** |
| 6 | `/pdf/page-tools?tool=…` and `/image/editor?tool=…` promise tools those pages do not have | Medium | **Open — needs an owner decision** |
| 7 | Base UI logs an error on every page load | Low | **Open — shared/Antigravity files, request filed** |

Bugs 1–3 are one story: **nothing the visitor gave the dropzone survived the
trip to the tool page.** Bug 4 is the same production defect that was found and
fixed on 2026-09-18 for `SchemaWorkbenchTool` and the MP3 toolkit — three more
components still carried it.

---

## Bug 1 — The smart dropzone never handed the file over

### What you see

1. Open the home page on a phone.
2. Choose a PDF in the box at the top. It is recognised: *"PDF Document ·
   handoff-test.pdf (1.3 KB)"*, and six tool buttons appear.
3. Tap **Rotate PDF**.
4. The Organize PDF pages screen opens showing **"Choose a PDF · Up to 150 MB"**.
   The file is gone. You upload it again.

Reproduced before the fix at 375×812 with a real 3-page PDF. Screenshot
evidence: the destination page rendered its empty picker.

### Why it happened

`components/smart-dropzone.tsx` only ever *recognised* the file. Look at what
it did with it (before the fix):

```tsx
const handleProcessFile = useCallback((file: File) => {
  const detection = detectInput('', file);
  if (detection) {
    setResult(detection);
    setInputText(file.name);   // the name is kept
  }                            // the File itself is dropped on the floor
}, []);
```

The `File` object was never stored. And the action buttons were plain anchors:

```tsx
<a key={act.label} href={act.href}>{act.label}</a>
```

A plain anchor is a **full document navigation**. The browser tears down the
page and starts the tool page in a fresh JavaScript context, so even if the
file *had* been kept in React state, that state would not survive the click.

This is not an accident of style. `lib/tools/local-source-policy.test.ts`
contains a test named *"uses document navigation instead of client RSC
fetching"* that **fails the build if any file under `components/` or `app/`
imports `next/link`**, because client-side routing fetches an RSC payload and
this site makes a no-network-egress claim. So the navigation has to stay a full
page load, and the fix has to survive one.

### The fix

New file: **`lib/handoff.ts`** — a one-shot handover store.

- The dropzone puts the `File` (or the text) into **IndexedDB** and gets back an
  id.
- It then navigates to `…?handoff=<id>`.
- The tool page reads that id on mount, takes the payload, **deletes it in the
  same transaction**, and removes `handoff` from the address bar.

Why IndexedDB and not `sessionStorage`: a `File` goes into IndexedDB by
structured clone with no base64 inflation, and these tools accept files up to
150 MB. `sessionStorage` holds strings and caps out around 5 MB.

Why this keeps the privacy promise: the record is in the visitor's own browser,
same-origin, never transmitted. It is deleted the moment the tool page claims
it, and anything older than **5 minutes** (`HANDOFF_MAX_AGE_MS`) is purged on
the next read or write. Nothing is added to the network path — `lib/handoff.ts`
contains no `fetch`, no URL, no worker.

Behaviour when it cannot work, all of which degrade to exactly the old
behaviour (the tool page shows its own picker):

- IndexedDB unavailable (private mode, hardened profile) → `stashHandoff`
  returns `null` and the link navigates plainly.
- Storage quota refused → same.
- **Cmd/Ctrl/Shift/Alt-click and middle-click are deliberately left alone**, so
  "open in new tab" still works; that tab gets the tool with its own picker.

While the file is being parked, the tapped button reads **"Opening…"** — on a
phone with a large file the write is not instant, and a button that looks dead
is its own bug.

### Files changed

| File | Change |
|---|---|
| `lib/handoff.ts` | **new** — `stashHandoff`, `claimHandoff`, `withHandoffParam`, `useHandoff` / `useHandoffFile` / `useHandoffText` |
| `lib/handoff.test.ts` | **new** — 9 unit tests for the pure URL helpers |
| `components/smart-dropzone.tsx` | keeps the payload, parks it on click, navigates with `?handoff=` |
| `components/pdf-page-tools.tsx` | accepts a handed-over PDF |
| `components/pdf-merge-tool.tsx` | accepts a handed-over PDF |
| `components/pdf-extract-tool.tsx` | accepts a handed-over PDF |
| `components/pdf-to-word-tool.tsx` | accepts a handed-over PDF |
| `components/image-optimize-tool.tsx` | accepts a handed-over image |
| `components/image-editor-tool.tsx` | accepts a handed-over image (covers `/image/editor` and `/image/background-remover`) |
| `components/images-to-pdf-tool.tsx` | accepts a handed-over image |
| `components/file-workbench-tool.tsx` | accepts a handed-over file |
| `components/utility-tools.tsx` | hash calculator accepts a file; Base64 and timestamp tools accept text |
| `components/structured-tools.tsx` | JSON tool accepts text; CSV→JSON accepts **either** a CSV file or text |
| `components/schema-workbench-tool.tsx` | fills the open operation's first file field, else its first textarea — this one component covers `/developer/workbench`, `/developer/advanced`, `/web/workbench`, `/qr/workbench`, `/creator/workbench`, `/data/workbench` and `/text/writing` |
| `components/text-workbench-tool.tsx` | accepts handed-over text |

Every destination listed in `components/smart-dropzone-actions.ts` is now wired.

### Evidence it works

**File round trip, proved by hash.** A file of the exact bytes `01 02 03 04 05
06 07 08` was chosen in the dropzone and **Compute SHA-256 / Hashes** was
tapped. The hash calculator opened with `evidence.bin` already loaded — no
second upload — and computed:

```
66840dda154e8a113c31dd0ad32f7f3a366a80e8136979d8f5a101d3d29d6f72
```

Independently, on the machine:

```
$ printf '\x01\x02\x03\x04\x05\x06\x07\x08' | shasum -a 256
66840dda154e8a113c31dd0ad32f7f3a366a80e8136979d8f5a101d3d29d6f72
```

Identical. The file crosses the navigation byte-for-byte.

**The document request carries the id**, captured from the network log:

```
GET /pdf/page-tools?tool=rotate-pdf&handoff=c23ec88a-46ba-4f81-a65d-6d1e20468c31 → 200
```

**And the id is gone afterwards.** After the tool page claimed it, the address
bar read `/file/hash-calculator` and the IndexedDB store was empty — checked
directly:

```js
// pending records after the claim
[]
```

---

## Bug 2 — Pasted text was cut to 100 characters

`handlePaste` and the drop handler both did `setInputText(text.slice(0, 100))`.
That 100 was only meant to keep the preview field short, but it was the only
copy of the text the component held. Anything longer was gone.

Fixed by keeping the full text in the handoff payload and using the 100-character
slice for display only (`PREVIEW_LIMIT`).

**Evidence:** a 322-character JSON object was pasted into the box and **Format
& Validate JSON** was tapped. `/developer/workbench?tool=json-format` opened
with the JSON formatter selected and **all 322 characters** in the textarea,
and it auto-ran and produced formatted output.

---

## Bug 3 — After clearing, the same file could not be chosen again

A `<input type="file">` fires `change` only when its value *changes*. Clearing
the tool's React state without clearing the input leaves the old filename in
the control, so picking the same file again fires nothing and the page looks
frozen. This is the exact shape of the complaint *"need to reupload again"* —
and then the re-upload silently does nothing.

Two places had it:

- **`components/smart-dropzone.tsx`** — never reset the input at all. Fixed:
  the input is cleared as soon as the file is read (the `File` is held in state
  now), and the **✕** clear button resets it too.
- **`components/pdf-to-word-tool.tsx`** — *"Remove the chosen PDF"* and
  *"Convert another"* both called `setFile(null)` and left the control alone.
  Both now clear `fileRef.current.value`.

Every other file-accepting tool already did this correctly; they were checked
one by one.

---

## Bug 4 — `?tool=` deep links opened the default tool on three more pages

On 2026-09-18 a production bug was found and fixed: every `?tool=` link opened
the workbench's default operation instead of the named one. The cause is
recorded on the agent board — the selection was applied inside a
`requestAnimationFrame` scheduled from an effect whose cleanup cancels it, and
in production Cloudflare injects its analytics beacon into the HTML at the
edge, so React rebuilds the tree and the pending frame goes with it.

That fix landed in `schema-workbench-tool.tsx` and `mp3-toolkit-tool.tsx`.
**Three components still had the original racing code:**

- `components/text-workbench-tool.tsx` — `/text/workbench?tool=…`
- `components/file-workbench-tool.tsx` — `/file/workbench?tool=…`
- `components/math-workbench-tool.tsx` — `/math/workbench?tool=…`

All three now use the same converge-don't-race pattern: re-apply whenever the
URL and the state disagree, do nothing once they agree.

**Evidence:** `/text/workbench?tool=word-counter` now opens with the selector
reading **"Word counter"**.

---

## Bug 5 — A workbench file control kept showing a file the tool no longer held

In `components/schema-workbench-tool.tsx` the field list was keyed by field id
alone. Switching operation resets every value, but two operations sharing a
field id kept the same DOM node, so a file input went on displaying the old
filename while the caption underneath correctly said *"No file selected"* —
and picking that same file again fired no `change` event (bug 3's mechanism).

Fixed by keying each field by `operation.id` **and** field id, so the controls
are rebuilt when the operation changes.

---

## Bug 6 — OPEN: two pages promise tools they do not have

`isLiveToolUrl('/pdf/page-tools?tool=rotate-pdf')` returns `true`
(`lib/seo/live-tools.test.ts:33` asserts it), and `lib/tools/catalog.ts:517`
publishes `/image/editor?tool=<operation.id>` for all six image-editor
operations. The smart dropzone offers four distinct `/pdf/page-tools?tool=…`
buttons.

**But neither page has an operation concept.** `PdfPageTools` is a single form
holding reorder, rotate, page numbers, watermark and metadata together;
`ImageEditorTool` is one canvas with every control on screen. Both ignore
`?tool=` entirely. Tapping **Rotate PDF** and tapping **Delete Pages** land on
the identical screen.

Nothing here is *false* — both pages really can do the advertised job — but the
site hands out distinct URLs for destinations that are not distinct. Under the
truth rules that is a product decision, not a bug fix, so it is **left open**.
The three options:

1. Honour the parameter: scroll to and focus the matching control group so the
   link lands where it promised.
2. Give those pages a real operation selector, like the workbenches have.
3. Stop publishing the parameter and let all of them point at the bare page.

Deliberately **not** decided here.

---

## Bug 7 — OPEN: Base UI logs an error on every page load

Every page load in development prints, several times:

```
Base UI: A component that acts as a button expected a native <button> because
the `nativeButton` prop is true. Rendering a non-<button> removes native button
semantics, which can impact forms and accessibility.
    at Button (components/ui/button.tsx:33)
    at AppShell (components/app-shell.tsx:874 / 895 / 916 / 937)
```

`components/ui/button.tsx` wraps Base UI's `ButtonPrimitive` and never passes
`nativeButton`, so it defaults to `true`; `components/app-shell.tsx` then
renders four of them as anchors via `render={<a href=… />}` (lines 570, 580,
588, 610). Links styled as buttons are the right markup here — the fix is to
pass `nativeButton={false}` at those four call sites, or in the wrapper.

**Not fixed here on purpose.** `components/ui/**` is *shared — request first*
and `components/app-shell.tsx` is Antigravity-owned, per §2 of `AGENT_BOARD.md`.
A request is filed on the board.

---

## Observations, not filed as bugs

- **The dropzone's heading says "Drop any file or paste text".** On a phone
  there is no drag-and-drop; the **Browse file** button is the only path. The
  copy is in an Antigravity-owned file and is not wrong, only desktop-shaped.
- **The PDF worker fails under `vinext dev`.** Choosing a PDF on
  `/pdf/page-tools` shows *"The PDF inspector stopped unexpectedly."* in the
  dev server — **with or without** the handoff, so it is not caused by this
  change. It does not reproduce in the production build, and the e2e suite
  exercises these tools against a build.

---

## Gate

Run from `apps/claude-dropzone`:

```bash
npm run typecheck && npx oxlint && npx vitest run && npm run qc
```

Result on this branch:

- `tsc --noEmit` — no errors
- `oxlint` — clean
- `vitest run` — **906 passed, 0 failed** (897 before, plus 9 new)
- `npm run qc` — **PASS, 8/8 mandatory gates**
- `npm run build` — exit 0

Manual checks done in a real browser at 375×812 (iPhone-sized), dark mode:

| Check | Result |
|---|---|
| PDF → Rotate PDF opens with the PDF loaded | pass |
| Binary file → hash calculator, SHA-256 matches `shasum` | pass |
| 322-char JSON → JSON formatter, all 322 chars arrive, auto-runs | pass |
| `handoff` parameter removed from the address bar afterwards | pass |
| IndexedDB store empty after the claim | pass |
| `/text/workbench?tool=word-counter` opens Word counter | pass |
| Re-choosing the same file after Clear works | pass |

### The reported bug, re-run against the production build

The `?tool=` defect fixed on 2026-09-18 only showed in production, so this fix
was re-checked there too — `npm run build` then `npm start` (Wrangler serving
`dist/`), at 375×812:

1. Chose a real 3-page PDF (`prod-check.pdf`) in the dropzone.
2. Tapped **Rotate PDF**.
3. `/pdf/page-tools?tool=rotate-pdf` opened showing
   **"prod-check.pdf · 3 pages · original remains unchanged"**. No empty
   picker, no second upload.
4. Tapped **Apply PDF changes**. It produced `edited-pages.pdf` as a blob
   download, and the receipt read **"Output check · Reopened · 1 ms"** and
   **"Privacy boundary · No file upload path"**.

Measured values on that run: `showsEmptyPicker: false`, `showsFileName: true`,
`pageCount: "3 pages"`, no error text on the page.

---

## How to check the handoff store yourself

In the browser console on any page of the site:

```js
const db = await new Promise(r => { const q = indexedDB.open('opentools-handoff'); q.onsuccess = () => r(q.result); });
const rows = await new Promise(r => { const g = db.transaction('pending').objectStore('pending').getAll(); g.onsuccess = () => r(g.result); });
rows; // [] unless a handoff is in flight right now
```

It should be empty. A record only exists between tapping a tool button and that
tool page finishing its first render.
