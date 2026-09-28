# OpenTools operation kernel

Phase 1 wraps the existing workbench modules without changing them. On the
2026-09-21 `origin/main` used for this branch, the generated manifest contains
**631 operations from 17 sources**. An operation is addressed by `(source, id)`;
an id alone is rejected when more than one source defines it.

## Measured headless result

The Node conformance run executes every registered operation with its declared
defaults and blocks `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource` and
`navigator.sendBeacon`. **631 of 631 are declared `pure`** on this tree. In the
measured default run, 593 returned a non-empty result and 38 refused the generic
fixture with a specific validation message. No operation reached a missing DOM
global or attempted network access.

That count is generated evidence, not a promise about future operations.
`manifest.test.ts` fails if an adapter and the static manifest drift;
`conformance.test.ts` fails if the measured result changes without review; and
`import-boundary.test.ts` walks the kernel's source import graph and rejects
React, Next, or application-page imports.

## Streaming operations

An operation that declares `streamable: true` is handed a `StreamingFileInput`
per file instead of a buffered `LocalFileInput`. `executePipeline` builds those
straight from the visitor's `File`, so the Blob is never read whole on the way
in, and `chunkSizeBytes` states the largest buffer the implementation keeps.

Seven file-workbench operations declare it today. They are not streaming
codecs: they are the operations whose answer never needed the whole file. A
signature check reads twelve bytes; a metadata listing reads none; both were
allocating a two-gigabyte video to do it. `adapters/file-stream-prefixes.ts`
records how many leading bytes each one reads, `adaptFileWorkbench` slices the
Blob down to that, and the operation body is untouched.

Declaring too few bytes would be a quietly wrong answer rather than a crash, so
`adapters/file-adapter.test.ts` runs every listed operation twice — once over
the prefix, once over the complete file — and fails unless the two outputs are
identical. It also asserts that no read starts past zero or ends past the
declared prefix, and that a zero-byte operation touches the Blob not at all.

`LocalFileInput.bytesArePrefix` marks the resulting bounded view. Without it
the workbench's own integrity check, which requires `bytes.length === size`,
could not tell a deliberate prefix from a read that went wrong; with it, the
strict check still runs on every buffered input and on any file short enough to
arrive complete.

## Regenerating the manifest

```sh
node lib/kernel/generate-manifest.mjs
```

Follow it with `npm run format`: the generator emits `JSON.stringify` output,
so without that step the committed file shows up as rewritten end to end rather
than as the few descriptors that actually changed.

The generator bundles the adapter index in a temporary directory, writes only
descriptors to `manifest.generated.ts`, and deletes the temporary bundle. The
browser can therefore search descriptors without loading the 17 implementation
modules; `registry.ts` dynamically imports only the selected source when
`run()` is called.

Text and textarea fields default to non-serialisable. Settings such as selects,
numbers, booleans and explicitly declared regex fields may be saved by a later
pipeline; caller-owned content may not.
