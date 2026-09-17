# Engine entry

`engine/index.ts` re-exports the tool logic that runs without React, Next/Vinext,
`app/`, `components/`, `workers/` or any network API. It exists so the same code
can later back a CLI or an MCP server without the site coming with it.

It is unpublished and unstable. Names follow the source modules and change with
them. Nothing outside this repository should import it yet.

## What the boundary is, and what proves it

`engine/boundary.test.ts` walks the real import graph from `engine/index.ts` with
the TypeScript parser, following static imports, type-only imports,
`export … from`, `import('…')` expressions and types, `require`, and
triple-slash path references. Third-party packages reached from the closure are
checked through their dependency manifests, and their shipped JavaScript is
scanned for network APIs.

A walk that finds nothing proves nothing on its own, so the suite also contains:

- four self-tests that feed the walker synthetic files containing React,
  a `fetch` call, site paths, remote imports, `'use client'` directives and
  import-time DOM globals, and assert it reports each one;
- a coverage assertion that fails if the walk did not actually reach the tool
  modules and their packages.

`engine/engine.test.ts` then loads the entry in Node with no DOM globals present
and runs text, structured, workbench and pdf-lib operations through it.

Together: 12 tests. They prove the closure is free of framework and network
imports. They do not prove the engine is complete, and they say nothing about
what happens at call time in a runtime that lacks a browser API.

## Reach

28 of the 31 modules under `lib/tools/` are reachable from the entry. The three
that are not are site metadata rather than tool logic:

| Module | Why it is out |
| --- | --- |
| `lib/tools/catalog.ts` | Route hrefs and page manifests — the site's own map |
| `lib/tools/search-navigation.ts` | Site navigation |
| `lib/tools/workbench-helpers.ts` | Reached transitively through the workbenches; not part of the public surface |

## What still blocks a CLI or an MCP server

Measured against the current tree, not planned work:

1. **There is no package entry.** No `package.json`, no `exports` field, no
   build step. The entry is importable inside this repository and nowhere else,
   so neither a CLI nor an MCP server can depend on it today.
2. **There is no process boundary.** No argument parsing, no stdio protocol, no
   server. `index.ts` is a library surface, not a program.
3. **Background removal has no inference.** Only `rgbaToTensor`,
   `saliencyToMatte` and the `U2NETP` constants are exported. `onnxruntime-web`
   fetches its own WebAssembly assets, so the boundary rule excludes it. A CLI
   built on this gets the pre- and post-processing maths, not a cutout.
4. **JPEG re-encoding needs a browser.** `reencodeJpegWithCanvas` requires
   `OffscreenCanvas` and `createImageBitmap`. In Node, `compressPdf` falls back
   to the lossless pass and says so in its result. A CLI would have to supply
   its own encoder through the exported `JpegReencoder` type.
5. **Canvas drawing stays in the site.** `lib/tools/image.ts` exports geometry
   and a CSS filter string; the drawing that consumes them lives in components.

Nothing on this list is a defect in the boundary. Items 3 to 5 are the places
where a tool genuinely needs a browser, and the engine reports the limit rather
than hiding it.

## Shape of the data

File operations pass plain structs — `{ name, type, bytes: Uint8Array }` in and
out — not `File` or `Blob`. That part is already portable.
