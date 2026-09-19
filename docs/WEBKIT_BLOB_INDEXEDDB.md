# Why the file handoff never worked on iPhone

**Date:** 2026-09-19
**Found by:** Claude Code, session `48ab224e`, worktree `apps/claude-dropzone`
**Status:** root cause identified, fixed on this branch, proved in WebKit

## The short version

**WebKit refuses to put a `Blob` or a `File` into IndexedDB on this site.** The
write transaction errors. A string, an `ArrayBuffer` and a typed array all
store fine, in the same database, in the same kind of transaction.

Both attempts at the dropzone handoff stored a `File`. That is why the feature
works in Chrome and not on an iPhone.

## The measurement

Each value kind written in **its own transaction**, so one failure cannot mask
another. `e2e-audit/webkit-which-kind.spec.ts`, against the production build:

| Value put into IndexedDB | WebKit | Chromium |
|---|---|---|
| `'plain string'` | **stored** | stored |
| `ArrayBuffer(5)` | **stored** | stored |
| `Uint8Array(5)` | **stored** | stored |
| `new Blob([bytes])` | **transaction error** | stored |
| `new File([bytes], 'x.pdf')` | **transaction error** | stored |

The transaction's `error` is `null`, which is why this is easy to miss: there
is no exception at the `put()` call and no named error to log. The write
simply never lands, and a later read returns `undefined`.

This also explains a confusing earlier result. A probe that wrote **a string
and a Blob in one transaction** lost *both* — the Blob took the whole
transaction down with it. Reading that back looks like "IndexedDB does not
persist across navigation in WebKit", which is not true.

## What this corrects

`docs/DROPZONE_FILE_HANDOFF.md` (on `main`, from the parallel attempt at this
feature) concluded:

> `indexedDB.open` in WebKit on this site does not merely fail — it can hang,
> returning neither success nor error. That is almost certainly the same reason
> the handoff itself does not work there.

The hang it describes is real, but it was a **second, separate problem**, caused
by mounting the collector in the root layout so that every page on the site
opened IndexedDB on load. That was diagnosed correctly and fixed there.

It is not why the handoff failed. `indexedDB.open` succeeds normally — measured
here on both the writing page and the reading page. The handoff failed because
the thing being stored was a `File`.

Its "where to look next" list has three items. This is none of them: the file
was never stored, so there was nothing to collect and nothing for an input to
refuse.

## The fix

`lib/handoff.ts` takes the file apart before storing it and rebuilds it after:

```ts
// write
record.bytes = await payload.file.arrayBuffer();
record.name  = payload.file.name;
record.type  = payload.file.type;

// read
new File([record.bytes], record.name, { type: record.type })
```

An `ArrayBuffer` crosses both engines. Nothing else about the design changes:
still one-shot, still deleted in the same transaction it is read in, still
purged after five minutes, still never leaving the device.

**Cost:** the bytes exist twice for a moment — once as the `File` the dropzone
holds, once as the `ArrayBuffer` being written. The tools already read the whole
file into memory to work on it, so this is not a new order of magnitude, and it
buys a feature that otherwise does not exist on half the phones in the world.

## Proof

`e2e/dropzone-handoff-engines.spec.ts`, in the release suite, Chromium **and**
WebKit:

1. An `ArrayBuffer` written on one page is read back after a full document
   navigation — the mechanism the fix depends on.
2. A PDF chosen in the dropzone on the home page, then **Merge PDFs** tapped,
   arrives at `/pdf/merge` already loaded.

Both green in both engines. Before the fix, test 2 failed in WebKit and passed
in Chromium, which is exactly the shape of the owner's report.

## If you are debugging storage in WebKit

- Put **one kind of value per transaction** while narrowing. A single bad value
  aborts the whole transaction and makes good values look broken.
- Do not trust `tx.error` — it is `null` here. Assert on whether the value
  comes back, not on an error name.
- Kill any stale `wrangler dev` first. `docs/DROPZONE_FILE_HANDOFF.md` records
  a false negative from that, and it is still good advice.
