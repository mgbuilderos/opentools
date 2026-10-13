# Dependency advisories: what blocks a release and what only reports

The `qc:release` pass runs two advisory gates, straight after BUILD. Only one
of them can stop a release.

| Gate                                                   | Command                                                    | Blocks? | Covers                                                                                    |
| ------------------------------------------------------ | ---------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------- |
| `DEPENDENCY ADVISORIES (RUNTIME)`                      | `node scripts/audit-runtime.mjs` (wraps `npm audit --omit=dev --json`) | **Yes** | HIGH and CRITICAL advisories in code bundled into the Worker, the client and the Web Workers |
| `DEPENDENCY ADVISORIES (BUILD TOOLCHAIN, REPORT ONLY)` | `npm audit --audit-level=high`                             | No      | Everything, including the build toolchain                                                 |

Both are defined in `scripts/run-qc.mjs` and exist only under `--release`.
Their wiring is pinned by `scripts/audit-gate.test.ts`, which fails if either
half of the pairing is undone; the runtime gate's decision is tested on
fixtures in `scripts/audit-runtime.test.ts`.

Until 2026-10-13 the runtime gate was the bare
`npm audit --audit-level=high --omit=dev`. The next section says why it is not
any more. The sections after it are the 2026-09-30 history that narrowed it to
runtime in the first place, and still hold.

## Why the bare `npm audit --omit=dev` was replaced (2026-10-13)

From about 2026-10-12 the runtime gate failed every pull request with
`[QC] BLOCKED at DEPENDENCY ADVISORIES (RUNTIME)`: 9 vulnerabilities, 8 high
and 1 moderate, from three advisories. `package.json` and `package-lock.json`
were byte-identical to what was live, so, as on 2026-09-30, the gate was
reporting the advisory calendar and no pull request could clear it.

| Advisory                                                                    | Package and installed version | How npm's runtime graph reached it                                                                                | Fix in range? |
| --------------------------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------- |
| [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), high | `braces` 3.0.3                | `vinext` → `vite-plugin-commonjs` → `vite-plugin-dynamic-import` → `fast-glob` → `micromatch` → `braces`          | **No**        |
| [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q), high | `source-map-js` 1.2.1         | `vinext` → `vite` (peer) → `postcss` → `source-map-js`                                                           | Yes, 1.2.2    |
| [GHSA-hrr3-gc8f-f4qj](https://github.com/advisories/GHSA-hrr3-gc8f-f4qj), moderate | `fast-uri` 3.1.7          | `react-server-dom-webpack` → `webpack` (peer) → `schema-utils` → `ajv` → `fast-uri`                               | Yes, 3.1.8    |

The one advisory counted seven times: npm lists every package on the braces
path, up to `vinext` and `@vinext/cloudflare`, as "depends on vulnerable
versions".

### Option 1 — `npm audit fix`, without `--force`: done

It changes exactly two packages, `source-map-js` 1.2.1 → 1.2.2 and `fast-uri`
3.1.7 → 3.1.8: 6 lockfile lines, nothing in `package.json`. That leaves only
braces.

### Option 2 — a patched braces, or a newer path around it: none exists

Every link was checked against the registry on 2026-10-13:

| Package                      | Latest release        | What it still requires          |
| ---------------------------- | --------------------- | ------------------------------- |
| `braces`                     | 3.0.3 (2024-05-21)    | — the advisory covers `<=3.0.3` |
| `micromatch`                 | 4.0.8                 | `braces ^3.0.3`                 |
| `fast-glob`                  | 3.3.3                 | `micromatch ^4.0.8`             |
| `vite-plugin-dynamic-import` | 1.6.0                 | `fast-glob ^3.3.2`              |
| `vite-plugin-commonjs`       | 0.10.4                | `vite-plugin-dynamic-import ^1.6.0` |
| `vinext`                     | 1.1.0 (2026-10-08)    | `vite-plugin-commonjs ^0.10.4`  |

So an `overrides` entry has no version to point at, upgrading vinext changes
nothing, and `npm audit fix --force` proposes **downgrading** vinext to 0.0.15.
None of that was done.

### Option 3 — move vinext to `devDependencies`: measured and refused

This was the right move only if vinext were build-only, so it was measured.
It is not. The build now records, per output, every installed package the
bundler put into it (`lib/build/shipped-packages.ts`, below), and **453 of
vinext's modules** are bundled: 110 into the client, 268 into the Worker's
`rsc` environment and 75 into `ssr`. By folder that is vinext's server runtime,
its `next/*` shims, its router and its client entry. `@vinext/cloudflare`
(4 modules in the Worker) depends on vinext, so it would have had to move
too.

Moving them would have stopped the blocking gate from auditing 457 bundled
modules, including code that runs on every page. A future advisory in vinext's own request
handling would then have printed in the report and shipped. That is weaker,
which the owner ruled out.

What the measurement also showed is that only **two** of vinext's files use
the glob plugin, `vinext/dist/index.js` and `vinext/dist/config/next-config.js`,
and both build the Vite plugin. Neither is among the 453.

### What the measurement found going the other way: pdf.js was never audited

The same build record showed a package the gate could not see at all.
`pdfjs-dist` 6.3.289 was a **devDependency**, while the build bundles it into
the client (3 modules) and `ssr` (4) and serves its worker as
`/_next/static/media/pdf.worker.*.mjs`. pdf.js parses the PDF the visitor
drops in, which is the most exposed code on the site, and `--omit=dev` meant no
blocking audit had ever looked at it.

Proved on this repository's own files rather than argued. `pdfjs-dist` was
rolled back to 4.1.392 — the version line covered by
[GHSA-wgrm-67xf-hhpq](https://github.com/advisories/GHSA-wgrm-67xf-hhpq),
"arbitrary JavaScript execution upon opening a malicious PDF" — in a scratch
copy of `package.json`, `package-lock.json` and the build record:

| Layout                                    | Old gate (`npm audit --omit=dev --audit-level=high`)     | New gate                                                                    |
| ----------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------- |
| `pdfjs-dist` in `devDependencies` (`main`) | red, but only for braces; **mentions pdfjs-dist 0 times** | **refused**: `node_modules/pdfjs-dist ships in client (3), ssr (4) but npm files it as dev-only` |
| `pdfjs-dist` in `dependencies` (this change) | —                                                        | **blocked**: `pdfjs-dist (high) … GHSA-wgrm-67xf-hhpq`                       |

`pdfjs-dist` is now in `dependencies` at the same version. Its lockfile entry
and its optional Node-only canvas binding (`@napi-rs/canvas` and 11 platform
builds) lose `"dev": true`; no version changes. `THIRD_PARTY_NOTICES.md` called
it "development-only" and now lists it with the shipped packages.

## What the runtime gate does now

`scripts/audit-runtime.mjs` starts from npm's own answer and corrects it with
what the build measured. Everything in npm's runtime graph still blocks unless
one of the rules below says otherwise, and all three checks must pass:

1. **Its graph must be npm's.** It re-derives the runtime graph from
   `package-lock.json` (dependencies, optional and peer edges, Node's lookup
   rules) and compares it, package by package, with the `dev` flags npm wrote.
   On this lockfile both say **292 packages**. If they ever differ, the gate
   refuses rather than narrow a graph it cannot trust.
2. **Nothing that ships may be filed as dev-only.** Every package in the build
   record must be in that graph. This is the check that found pdf.js.
3. **A package is exempt only if a declared build-only edge is the only way
   to reach it, and the build just proved nothing behind that edge shipped.**
   There is one declaration:

   ```js
   { from: 'vinext', to: 'vite-plugin-commonjs', why: '…Measured 2026-10-13…' }
   ```

   It puts exactly 21 packages out of the blocking set: `vite-plugin-commonjs`,
   `vite-plugin-dynamic-import` and its nested `es-module-lexer`, `fast-glob`,
   `micromatch` and its nested `picomatch`, `braces`, `fill-range`,
   `to-regex-range`, `is-number`, `glob-parent`, `is-glob`, `is-extglob`,
   `merge2`, `@nodelib/fs.scandir`, `@nodelib/fs.stat`, `@nodelib/fs.walk`,
   `fastq`, `reusify`, `run-parallel` and `queue-microtask`. `acorn` and
   `magic-string`, which the plugin also uses, stay in, because the runtime
   graph reaches them by other paths (`react-server-dom-webpack` → `acorn-loose`
   → `acorn`; vinext depends on `magic-string` itself). If one module from behind the edge ever reaches an
   output, the gate fails until the declaration is removed. A declaration for
   an edge the lockfile no longer has also fails.

An advisory then blocks if it is HIGH or CRITICAL and **any** installed copy
of the package is outside the exempt set. An advisory on a copy the gate cannot
place, or on no copy at all, blocks too. Only direct advisories count; npm's
"depends on vulnerable versions" rows point at a fault elsewhere rather than
being one.

**Why this is not an allowlist.** An allowlist names advisories and waives
them. A build-only edge names no advisory, no version and no date. It says
where code goes, which is the statement `devDependencies` already makes, for
the one case npm cannot express: a package that ships whose own dependency
does not. `scripts/audit-runtime.test.ts` fails if a declaration grows any
field beyond `from`, `to` and a measured `why`, or if it ever hides a package
this project depends on directly.

**What the build record cannot see, and why that is safe.** Files copied
verbatim from `public/` (the Tesseract core and language data, the ONNX
Runtime and libheif binaries) never pass through the bundler. Their packages
are in npm's runtime graph and are not behind the edge, so an advisory in any
of them blocks exactly as before. The record narrows nothing on its own; it
only ever **adds** a refusal or **checks** a declaration.

**Where the record comes from.** `lib/build/shipped-packages.ts` is a Vite
plugin. Every chunk lists the modules it was built from and every emitted
asset the files it came from, and anything under `node_modules/` is attributed
to the package directory holding it, keyed the way the lockfile keys it. It
writes `dist/shipped-packages/{client,rsc,ssr,worker}.json`, which sits beside
`dist/client` and `dist/server` and is never deployed. The `worker` record
matters: Vite bundles Web Workers in a separate pass that runs only
`worker.plugins`, and before it was added `onnxruntime-web`, `libheif-js` and
the PDF engine's `pdf-lib` were missing from the record. The Worker needs no
separate check, because `dist/server/wrangler.json` sets `no_bundle: true`:
Wrangler uploads what Vite wrote and resolves nothing from `node_modules`.

The gate runs **after** BUILD, because it reads what BUILD wrote; before it, it
could pass on the record of an earlier build. It refuses if any of the four
records is missing or empty.

## Measured on 2026-10-13

Branch `claude/runtime-advisories-build-only`, off `main` `98f78f9`.

**The build record.** 38 installed packages ship: 29 in `client`, 13 in `rsc`,
34 in `ssr` and 9 in the Web Workers. None of the 21 exempt packages is among
them.

**The shipped bytes,** a text sweep of the 3,024 deployable files in
`dist/client` and `dist/server` (the local simulator state in
`dist/server/.wrangler` excluded):

| Searched for                                             | Files matching |
| -------------------------------------------------------- | -------------- |
| `micromatch`, `fast-glob`                                | 0              |
| `vite-plugin-commonjs`, `vite-plugin-dynamic-import`     | 0              |
| `fill-range`, `to-regex-range`                           | 0              |
| `source-map-js`, `SourceMapConsumer`, `SourceMapGenerator` | 0            |
| `fast-uri`                                               | 0              |
| `rangeLimit`, `keepEscaping`, `exceeds max characters` (strings unique to the braces source) | 0 |
| `braces`                                                 | 1,004: the `lucide-braces` icon class and icon definition, English prose in guides ("curly braces"), and a LaTeX "Set braces" symbol label. No package code. |

**The deploy dry run.** `wrangler deploy --dry-run --config
dist/server/wrangler.json` packaged 587 modules, 15,506.92 KiB (4,000.08 KiB
gzipped). Every search in the table above except `braces` was repeated on its
output and matched 0 files, and `dist/shipped-packages` is not in it.

**The change itself ships nothing.** `main` and this branch were built with
the build ID, vinext's prerender secret and its revalidate secret all pinned
to the same values. `dist/client`, every file a visitor downloads, is
**byte-identical**. In `dist/server` only `index.js` differs, by two values:
vinext's draft-mode secret, which it draws with `randomUUID()` on every build
and offers no way to pin, and the absolute path of the checkout. Without the
pins, five Worker chunks are also renamed, because they embed secrets vinext
draws with `randomBytes(32)` on every build (`vinext/dist/cli.js`), so any two
builds of the same tree differ that way.

**The gate against the real registry, on fixtures.** Each fixture is a
`package.json` with a real lockfile from `npm install --package-lock-only`
and a four-file build record, run through `node scripts/audit-runtime.mjs
--root <fixture> --inventory <fixture>/inventory`. Every fixture
includes `vinext@1.0.0-beta.9`, as this repository does:

| Fixture                                                        | Old gate | New gate | Why                                                                 |
| -------------------------------------------------------------- | -------- | -------- | ------------------------------------------------------------------- |
| vinext alone, as here                                          | exit 1   | **exit 0** | braces is behind the edge and nothing behind it shipped          |
| vinext, plus `micromatch` as a direct dependency               | exit 1   | exit 1   | braces is now reachable outside the edge                            |
| vinext, plus `braces` as a direct dependency                   | exit 1   | exit 1   | same                                                                |
| vinext, plus `undici@7.29.0` in `devDependencies`              | exit 1   | exit 0   | toolchain only, as on 2026-09-30                                    |
| vinext, plus `undici@7.29.0` in `dependencies`                 | exit 1   | exit 1   | runtime HIGH, blocks                                                |
| vinext, plus `pdfjs-dist` in `devDependencies` and in the build record | exit 1 | exit 1 | refused: ships but filed as dev-only                          |
| vinext, with `braces` in the build record                      | exit 1   | exit 1   | refused, and braces blocks: the edge no longer holds                |

The old gate was red on every row with vinext in it, which is the failure this
change exists to end. Every case where flagged code could reach a visitor is
still red.

**Unit and mutation checks.** `npm run qc` passes 8 of 8 gates, with 256 test
files and 3,829 tests against `main`'s 254 and 3,798, so both new test files
ran inside the gate. Sixteen one-line mutations were each made to the gate,
the build plugin, the Vite config or the runner, and every one was caught:
dropping the npm self-check, exempting a build-only package the build shipped,
no longer refusing shipped dev-only packages, blocking only on CRITICAL,
ignoring peer edges, exempting an advisory with no nodes, accepting a stale
declaration, dropping `--omit=dev`, counting "depends on" rows, not recording
Web Workers, attributing a nested copy to its parent, running the gates before
BUILD, making the runtime gate non-blocking, letting the report block, and
giving a declaration an expiry date. The first version of the ordering test
missed the move before BUILD, because its slice fell back to the rest of the
file when the splice line went missing. It was rewritten and re-checked.

## Why the blocking gate was narrowed (2026-09-30)

The gate used to be the unnarrowed `npm audit --audit-level=high`, and on
2026-09-30 it stopped every lane in the repository.

**The advisory.** Five vulnerabilities, four moderate and one high. The high
was `undici@7.29.0` — ten advisories covering WebSocket `permessage-deflate`
decompression, the `RetryHandler` response body, response splitting in the
retry interceptor, `Set-Cookie` caching in shared caches, and TLS certificate
validation in `BalancedPool`.

**It was reachable from exactly one place, and that place is a build tool.**

```
@cloudflare/vite-plugin@1.54.11  (devDependency)
  └─ miniflare@5.20260916.0-alpha
       └─ undici@7.29.0
```

`wrangler@4.133.0` reaches the same `miniflare`. Both are devDependencies;
`miniflare` and `undici` are transitive only. `miniflare` is the local
Cloudflare simulator — the thing `npm run start` runs. Its HTTP client is not
part of the deployed site.

**Measured, not assumed.** A built `dist/` of 4,007 files contains:

| Searched for         | Files matching                                                                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `undici`             | 0                                                                                                                                         |
| `miniflare`          | 0                                                                                                                                         |
| `permessage-deflate` | 0                                                                                                                                         |
| `RetryHandler`       | 0                                                                                                                                         |
| `BalancedPool`       | 0                                                                                                                                         |
| `wrangler`           | 3 — an error-message string in `dist/server/index.js`, a filename in `dist/client/.assetsignore`, and a comment in `dist/client/_headers` |

No package code from the toolchain reaches the deployed bytes. And
`npm audit --omit=dev --audit-level=high` exits **0** on that same lockfile:
the only advisory in the shipped graph is `fast-uri`, which is moderate.

**It was nobody's change, which is what made it the wrong shape of gate.** A
branch whose `package-lock.json` was byte-identical to `main`'s failed the gate
locally, while `main`'s own last green CI run (#89) had completed before the
advisory was published. Re-running a job could not clear it. The gate was
reporting the advisory calendar rather than the change under test, and it was
doing so on the one command a release has to pass.

## Why the toolchain was not simply upgraded instead

Upgrading was the other defensible option and it was rejected on measurement.

`@cloudflare/vite-plugin@1.62.2` is the current release and the version
`npm audit fix --force` proposes. It brings:

|                           | Now                | After                     |
| ------------------------- | ------------------ | ------------------------- |
| `@cloudflare/vite-plugin` | 1.54.11            | 1.62.2 (8 minor versions) |
| `wrangler`                | 4.133.0            | 4.144.0                   |
| `miniflare`               | 5.20260916.0-alpha | 5.20260926.1-alpha        |
| `workerd`                 | 1.20260916.1       | 1.20260926.1              |
| `undici`                  | 7.29.0             | **7.29.1**                |

The last row is the reason. `miniflare` exact-pins `undici`, and the new pin is
**one patch above the vulnerable ceiling**, on the 7.x line that has already
taken ten advisories. The eleventh re-blocks every lane, and clearing it would
again wait on Cloudflare's alpha release cadence rather than on anything this
repository controls.

So the upgrade buys an unknown and probably short amount of time, and it pays
for it by moving `workerd` — the runtime that executes the Worker — and eight
minor versions of the plugin that produces the deployed bundle. Changing
production bytes to reset a clock is the worse trade. The upgrade remains
available on its own merits, as a toolchain decision made deliberately rather
than one forced by a red gate on an unrelated branch.

## What this gives up

`.github/SECURITY.md` lists supply chain compromise as a vulnerability class,
and it is right to: a compromised build dependency can write anything it likes
into `dist/`, and the narrowed gate would not see it. That risk is real and it
is not mitigated by narrowing.

What the narrowing actually removes is **blocking**, not **detection**. The
full audit still runs on every release pass and prints every advisory in the
toolchain; it simply cannot set the exit code. The failure mode worth
preventing was a toolchain advisory nobody could see. Stopping everybody from
merging was never what made it visible — and for eight days of a blocked
`main` it would have made it less visible, because the gate people cannot pass
is the gate people learn to route around.

A toolchain advisory therefore needs a human to act on it. It appears on every
`qc:release`, under a line reading `FOUND ADVISORIES … Not a release blocker;
read the report above`.

## The one line `.github/SECURITY.md` is missing

That file is owned by another lane under §2 of `AGENT_BOARD.md`, so this change
did not edit it, and a request was filed on the board instead. The request
lives in an uncommitted coordination file in a repository with no remote, so
the wording is recorded here as well — a reader of the policy should not have
to grep `scripts/` to learn that one class of advisory no longer blocks.

Proposed, after the `supply chain` bullet in the vulnerability-class list:

> Advisories in build-time dependencies are reported by `qc:release` but do not
> block a release; the reasoning and the evidence are in
> `docs/DEPENDENCY_ADVISORIES.md`. Advisories in dependencies that ship to a
> visitor do block.

It attaches after the `Classic web vulnerabilities: XSS, injection, unsafe
`postMessage`, supply chain compromise, or malicious dependencies` bullet.
Checked on 2026-09-30 against the other open branch that edits this file
(`claude/product-telemetry`, +60/-3): that bullet is **byte-identical on both
refs** and only its line number moves, so the wording above needs no rework
once that branch lands. The two lines it removes are elsewhere in the list.

If that bullet is already there, this section has done its job and can go.

## How much the blocking gate stopped seeing

Narrowing sounds broader than it is, so it was counted rather than described.

|                                                   | Packages |
| ------------------------------------------------- | -------- |
| Audited by the old, unnarrowed gate               | 314      |
| Still audited by the blocking gate (`--omit=dev`) | **291**  |
| Dropped from blocking, moved to the report        | 23       |

All 16 declared runtime dependencies and their entire transitive closure
remain in the blocking gate's scope — checked by walking
`npm ls --omit=dev --all` and looking for any declared runtime dependency that
had fallen out of it. None had. There are no `optionalDependencies`, which
`--omit=dev` would not have pruned anyway.

So the blocking gate gave up 23 packages out of 314, all of them build-time
only, and those 23 are exactly what the report prints.

## Why there is no allowlist

An allowlist of accepted advisories with expiry dates was considered and
deliberately not built.

It would only ever have been needed to work around a gate that blocked
releases over advisories nobody could act on. Now that the blocking gate covers
only shipped code, every advisory it raises is one that must actually be fixed
— and a mechanism for waving those through is a mechanism for shipping
known-vulnerable runtime code, gated on an expiry date nobody would be
watching. The advisories such a list would have held are the dev ones, and
those are now printed instead of suppressed.

## How the narrowed gate was proved to still work

`--omit=dev` changes _whose_ code is audited. It does not change how severe a
fault must be, and it does not stop a runtime advisory from blocking. That was
proved against the very advisory in question, by moving it between sections of
a fixture manifest and changing nothing else:

| Fixture                                                                                                     | `npm audit --omit=dev --audit-level=high` |
| ----------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `undici@7.29.0` in `dependencies`                                                                           | **exit 1**                                |
| `undici@7.29.0` in `devDependencies`                                                                        | exit 0 (full audit: exit 1)               |
| `@cloudflare/vite-plugin@1.54.11` in `dependencies`, reaching `undici` transitively exactly as it does here | **exit 1**                                |

The third row is the one that matters most: a high-severity advisory reached
_transitively_ through a runtime dependency still blocks. The flag
discriminates on position in the dependency graph and on nothing else.

This proof is not in the unit suite, because deciding it requires the npm
registry and no test here shells out. `scripts/audit-gate.test.ts` pins the
wiring instead — that `--omit=dev` is present on the blocking gate and absent
from the report, that the blocking gate stays at `--audit-level=high` and stays
blocking, that the report stays non-blocking, and that the runner still honours
`blocking: false` rather than merely accepting it. All nine of those
assertions were mutation-checked: each was made to fail by a one-line change
to `scripts/run-qc.mjs`, and each caught it.

## If you are here because the runtime gate is red

Read which line it printed.

- **`BLOCKING: <package> (high|critical) …`** — a visitor can execute code
  with a known high-severity fault. Fix or replace the dependency. `npm audit
  fix` without `--force` first; if the fix is out of range, an `overrides`
  entry pinned to the patched version, as was done for `undici`.
- **`REFUSED: … ships … but npm files it as dev-only`** — move that package to
  `dependencies`. Do not argue with the record; it is what the bundler did.
- **`REFUSED: … is behind a BUILD_ONLY_EDGES declaration, and the build put
  it into …`** — that code now ships. Remove the declaration and treat the
  advisory as a runtime one.
- **`REFUSED: … has no such edge`** — the dependency it described is gone.
  Delete the declaration.
- **`REFUSED: This script and npm disagree about the runtime graph`** — the
  lockfile has something the walk does not model (a workspace, an alias, a new
  npm behaviour). Teach the walk, with a fixture in
  `scripts/audit-runtime.test.ts`; do not loosen the comparison.
- **`No usable record of what the build shipped`** — run `npm run build`.

Do not raise the threshold to `critical`, do not delete the gate, and do not
add a build-only edge to turn a red gate green unless the build record proves
nothing behind it ships and the `why` says what was measured.
`scripts/audit-gate.test.ts` and `scripts/audit-runtime.test.ts` fail on the
first two, and the reason they fail is this page.
