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

## Regenerating the manifest

```sh
node lib/kernel/generate-manifest.mjs
```

The generator bundles the adapter index in a temporary directory, writes only
descriptors to `manifest.generated.ts`, and deletes the temporary bundle. The
browser can therefore search descriptors without loading the 17 implementation
modules; `registry.ts` dynamically imports only the selected source when
`run()` is called.

Text and textarea fields default to non-serialisable. Settings such as selects,
numbers, booleans and explicitly declared regex fields may be saved by a later
pipeline; caller-owned content may not.
