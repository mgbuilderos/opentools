# Carrying a dropped file to the tool you picked

**Reported by the owner, 2026-09-18, from mobile testing:** drop a PDF into the
smart dropzone, pick a tool, and when the tool opens the PDF is gone — you have
to choose it again. On a phone, choosing a file again is most of the work.

This is the site's headline feature. The box says "drop a file and we will
point you at the right tool"; the file not coming with you empties most of that
promise.

## Why it happened

Two independent reasons, either of which alone was enough:

1. **The dropzone never kept the file.** `handleProcessFile` read `file.name`,
   `file.size` and `file.type` in order to *guess* a tool, then dropped the
   `File` on the floor. Nothing was ever holding it.
2. **Every link in this app is a plain `<a href>`**, so every navigation is a
   full page load. Even a file held in memory would not have survived, because
   the JavaScript context is torn down.

So the behaviour was not a regression or an edge case — the feature had never
carried the file, and could not have.

## How it works now

- The dropzone keeps the `File` in state, and clears it whenever the box is
  cleared or text is pasted instead, so a stale file never follows you.
- Clicking an action calls `offerFile(file)`, waits for the file to be stored,
  and then navigates. Modifier-clicks (open in a new tab) are left alone.
- `components/handed-over-file.tsx` is mounted once in `app/layout.tsx`, so it
  covers every tool page, including tools added later. On mount it collects the
  file and puts it into the page's file input as though the person had chosen
  it there, which means every tool's existing change handler runs unmodified
  and no tool component had to be touched.

**Storage, and why it is consistent with the promise:** the file goes into the
browser's own storage on the same device it already came from. Nothing is
uploaded, and `connect-src 'none'` means nothing could be. It is deleted the
moment it is collected, and anything older than five minutes is discarded on
read, so a file cannot be left behind by someone who changed their mind.

IndexedDB is used because it stores a Blob as-is; `sessionStorage` holds strings
only, so a file must be base64'd — a third larger, against a ~5 MB cap. A
`sessionStorage` fallback exists for engines that refuse IndexedDB, limited to
3 MB.

## RESOLVED 2026-09-19 — it was the `File`, not the open

**WebKit refuses to put a `Blob` or a `File` into IndexedDB on this site.** The
write transaction errors: `tx.error` is `null`, `put()` throws nothing, and the
write never lands. A string, an `ArrayBuffer` and a typed array all store fine,
in the same database, in the same kind of transaction.

Measured per value kind, each in its own transaction, against the production
build — `apps/claude-dropzone/e2e-audit/webkit-which-kind.spec.ts`:

| Value put into IndexedDB | WebKit | Chromium |
|---|---|---|
| `'plain string'` | **stored** | stored |
| `ArrayBuffer(5)` | **stored** | stored |
| `Uint8Array(5)` | **stored** | stored |
| `new Blob([bytes])` | **transaction error** | stored |
| `new File([bytes], 'x.pdf')` | **transaction error** | stored |

`offerFile` stored `{ file, storedAt }`. That is the whole bug.

**The fix:** `lib/file-handoff.ts` now stores `{ bytes, name, type, storedAt }`
and rebuilds the `File` on collection. The bytes are read *before* the
transaction opens, because an IndexedDB transaction commits as soon as it goes
idle and cannot span an `await`. An older record holding a `File` fails the
`instanceof ArrayBuffer` check and is discarded like any other unusable record,
so there is no migration.

The four e2e tests in `e2e/dropzone-handoff.spec.ts` **no longer skip WebKit**,
and pass in both engines.

### Corrections to what is written below

Everything below this section is the original write-up, kept because its
measurements are real and its reasoning is worth reading. Two of its
conclusions are wrong, and both are instructive:

1. **"`indexedDB.open` in WebKit on this site does not merely fail — it can
   hang… That is almost certainly the same reason the handoff itself does not
   work there."** The hang is real, but it is a *separate* problem, caused by
   mounting the collector in the root layout so every page opened IndexedDB on
   load — diagnosed and fixed here at the time. It is not why the handoff
   failed. `indexedDB.open` succeeds normally, measured on both the page that
   writes and the page that reads.

2. **"A `sessionStorage` fallback… added, did not change the result."** It
   could not have. The fallback is reached only when IndexedDB is
   *unavailable*; here IndexedDB opens perfectly well and it is the *write*
   that fails, so the fallback never ran.

### Why this was easy to miss

A single bad value aborts the whole transaction. A probe that writes a string
**and** a Blob together loses both — which reads as "IndexedDB does not persist
across a navigation in WebKit", and is not true.

**When narrowing storage behaviour: one value kind per transaction, and assert
on whether the value comes back, not on an error name.** `tx.error` is `null`
here, so anything keyed off the error name sees nothing wrong.

Full write-up: `apps/claude-dropzone/docs/WEBKIT_BLOB_INDEXEDDB.md`.

---

## What is fixed, and what is not

**Fixed and tested in Chromium** — so Chrome, Edge and Android Chrome. Four e2e
tests: a PDF dropped on the home page arrives at the PDF tool; the same at
375×812 phone width; a collected file is deleted rather than left to reappear on
the next tool; and nothing leaves the origin while the handoff happens. Verified
non-vacuous by removing the pickup component and watching three of the four go
red.

**Not working in WebKit — and that means iPhone Safari, which is most likely
where this was reported.** The tests are skipped there rather than deleted, so
the gap stays visible and they go green the moment it works.

### What has already been ruled out, so nobody repeats it

Measured inside WebKit on this site:

- `indexedDB` and `DataTransfer` both exist, and `input.files` **can** be set by
  script — so it is not a missing capability.
- A `sessionStorage` fallback for the case where IndexedDB is refused: added,
  did not change the result.
- Waiting up to five seconds for the tool's file input to hydrate, in case the
  pickup was running before the input existed: added, did not change the result.
- The failure is not the stale-dev-server trap. Every run above was against a
  freshly built server; that trap did produce one earlier false negative, so
  **kill any `wrangler dev` before trusting a WebKit result.**

### A regression this nearly shipped, and the design change it forced

Mounting the collector site-wide meant **every page load on the whole site
opened IndexedDB just to find nothing there**. In WebKit that stalled unrelated
pages: `e2e/pdf-sign.spec.ts` went from **14/14 in 13 seconds to two tests
timing out at three minutes each**, purely from mounting the collector. Proved
by removing it and watching them pass again.

So `indexedDB.open` in WebKit on this site does not merely fail — it can hang,
returning neither success nor error. That is almost certainly the same reason
the handoff itself does not work there.

Two changes came out of it, and both are worth keeping whatever happens next:

1. **`offerFile` leaves a cheap synchronous marker in `sessionStorage`, and the
   collector checks that before touching any storage.** On a normal page load —
   which is nearly all of them — nothing is opened at all.
2. **`openDatabase` is raced against a 2-second timeout**, so storage that never
   answers can never hold anything up.

**The lesson worth carrying:** a component mounted in the root layout runs on
every page, so its worst case is the whole site's worst case. Anything mounted
there must do nothing, cheaply, in the common case.

### Where to look next

1. Instrument the live page rather than inferring: have `HandedOverFile` write
   what it found onto a `data-` attribute (offered file yes/no, matching input
   found yes/no, fill succeeded yes/no) and read it from a WebKit test. That
   separates "nothing was stored", "nothing was collected" and "the input
   refused the file", which are three different bugs.
2. If nothing is collected, test `offerFile` → navigate → `takeOfferedFile` in
   isolation in WebKit, without the UI in the way.
3. If the file is collected but the input stays empty, the `change` event
   dispatch is the suspect — a React-controlled input may need
   `HTMLInputElement.prototype.files`' native setter, the way the value setter
   is usually patched for controlled text inputs.

## Files

| File | What it does |
|---|---|
| `lib/file-handoff.ts` | Store, collect, expire; `accept` matching; filling an input |
| `components/handed-over-file.tsx` | Mounted site-wide; collects and delivers |
| `app/layout.tsx` | Mounts the above. **Shared file** — changed on the owner's direct instruction |
| `components/smart-dropzone.tsx` | Keeps the file and hands it over. **Antigravity-owned** — changed on the owner's direct instruction |
| `e2e/dropzone-handoff.spec.ts` | The reported scenario, end to end |
