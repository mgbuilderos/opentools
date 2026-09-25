# OpenTools MCP server

An MCP server that exposes the operation kernel (`lib/kernel/`) to an agent
over stdio. It runs in this repository. **Nothing here is published**, and
publishing it is an owner decision under constraint C8 that has not been made.

## What it is

```sh
node mcp/build.mjs                                    # → build/mcp/server.mjs
node build/mcp/server.mjs --root /path/to/files       # read-only
node build/mcp/server.mjs --root /path --allow-write  # may write output files
```

Three MCP tools, not one per operation:

| Tool                 | Does                                                                      |
| -------------------- | ------------------------------------------------------------------------- |
| `search_operations`  | Keyword search over the catalogue; every term must match                  |
| `describe_operation` | One operation's parameters, defaults, input and output shape              |
| `run_operation`      | Runs it locally; text comes back inline, files are written to `outputDir` |

**Why three and not one per operation.** A server that declares one MCP tool
per kernel operation puts a 637-entry tool list into the client's context on
every request, before the agent has asked for anything. The catalogue is data,
so it is searched, not declared.

## Measured, on this tree

Every number below is counted from `lib/kernel/manifest.generated.ts` by the
command shown, not typed. `lib/seo/stated-numbers.test.ts` exists because a
hand-written count on the support page went stale; `serverInstructions()` in
`mcp/protocol.ts` therefore assembles its counts at startup, and
`mcp/server.test.ts` asserts it.

| Measure                                  | Count |
| ---------------------------------------- | ----- |
| Operations in the manifest               | 637   |
| Declared `runtime: 'pure'`               | 637   |
| Sources                                  | 19    |
| Take a file as input (`file` or `files`) | 34    |
| Return files                             | 33    |
| Return text                              | 604   |
| Take text as input                       | 430   |
| Take no input at all                     | 173   |

```sh
node -e "const m=require('fs').readFileSync('lib/kernel/manifest.generated.ts','utf8');
const c=(re)=>[...m.matchAll(re)].length;
console.log('ops', c(/source: '/g), 'file-in', c(/input: 'files?'/g), 'file-out', c(/kind: 'files'/g));"
```

`lib/kernel/README.md` states 631 operations from 17 sources, measured on the
2026-09-21 `origin/main`; it was 637 from 19 when this branch opened and is 643
from 20 now that `pdf` is registered. The number moves three times in a week,
which is the argument for counting it rather than typing it.

## What it cannot do

This is the honest list, and it is the reason this is a branch and not a
release.

1. **~~No PDF merge, split, compress or convert.~~ Closed on this branch.**
   `lib/tools/pdf/engine` is now registered as the `pdf` source
   (`lib/kernel/adapters/pdf.ts`): merge, inspect, extract pages, rotate,
   lossless compress and form inspect. `lib/kernel/adapters/pdf.test.ts` runs
   real PDFs through each in Node with no DOM. What is still missing is
   image-to-PDF and the lossy compression path, because re-encoding embedded
   JPEGs needs `OffscreenCanvas`; `pdf-compress` therefore carries a notice
   saying it is a lossless rewrite instead of implying a reduction it did not
   make.
2. **No image operations at all.** Zero kernel operations match
   `image|resize|jpeg`. Resize, convert, compress and background removal are
   site-side.
3. **Only 40 of 643 operations touch a file.** The catalogue is overwhelmingly
   calculators and text transforms. Most of the file operations are
   `file-workbench`; the rest are `pdf`, `formats-finance` and
   `formats-pdfcrypt`.
4. **`engine/` and `lib/kernel/` are still two different abstractions.**
   Registering `pdf` narrows the gap but does not close it: the same engine is
   now reachable two ways, through `engine/index.ts` and through the kernel
   adapter. Which one is _the_ operation model is an open architectural
   question, and a published package API would freeze the answer early.
5. **Purity is declared and fixture-tested, not proven for real input.**
   `lib/kernel/conformance.test.ts` runs every operation against one generic
   CSV-ish fixture with declared defaults. That is a smoke test, not evidence
   that an operation handles a real 500-page statement.

## Security

In a browser tab these operations cannot see the disk. Over MCP they run in a
process an agent drives, so the sandbox that used to be free has to be built.

- Every agent-supplied path resolves through `realpath` and must sit inside
  `--root`. Symlinks are resolved _before_ the containment check.
- Writing is refused unless `--allow-write` was passed, and then only inside
  the root.
- Output filenames come from the operations, not the agent, and are still
  reduced to a bare filename (`safeFileName`) so a name carrying a separator
  cannot place a file the boundary check never saw.
- An ambiguous operation id is refused rather than guessed: `csv-to-json`
  exists in both `developer-data` and `spreadsheet`.
- Boundary refusals come back as tool content with `isError`, not as transport
  errors, so the agent can read and correct them.

`mcp/server.test.ts` covers each of these. 25 tests.

## No new dependency

The MCP wire format is JSON-RPC 2.0 over newline-delimited stdio, and this
server needs three methods. It implements them directly rather than taking the
SDK: ADR-004 requires licence review before a dependency, and `npm run sbom`
covers what ships. `mcp/build.mjs` bundles with esbuild, which
`lib/kernel/generate-manifest.mjs` already uses.

## Status

Branch work, answering the question "what would this actually be?" — not a
proposal to publish. Before any publication decision, the gaps above are the
list, and "1,464 file operations" is not a claim this tree supports: 1,464 is
the sitemap page count (`lib/seo/stated-numbers.test.ts`), and the file-operation
count is 40.
