# Build reproducibility: why `dist/` diffs used to lie, and what fixed it

The site's claim is that it never sees your file. The argument for believing it
is that anybody can build this source and compare the result with what
getopentools.com serves. That argument is only as good as the build: if two
builds of the same source disagree, there is nothing to compare against.

Until 2026-10-02 they disagreed whenever anything was uncommitted, and the way
they disagreed was loud enough to look like a finding. This page is the root
cause, the fix, and how to check either.

## The symptom

Changing one line of `package.json` — the `overrides.undici` pin, a dev-only
transitive package that ships nowhere — and rebuilding produced **111 of 257
renamed client chunks**, each with different bytes. On the 1 MB `catalog` chunk
the real difference was **8 bytes out of 1,004,022**, all of them inside the
embedded `app-shell-<hash>.js` filename. No code differed.

That was measured against base `9275422`. Re-measured against `ae95afb`, which
emits 259 chunks rather than 257, moving the build ID renames **111 of 259** —
the same number, which is the first hint that it was never about the dependency.

Two things followed from that, and both cost something:

- **Review.** Anyone measuring a dependency change by diffing `dist/` saw 111
  changed chunks and reasonably concluded the change was enormous.
- **Returning visitors.** `public/_headers` serves `/_next/static/*` with
  `max-age=31536000, immutable`, so a renamed chunk is a chunk every returning
  visitor downloads again. 111 of them renames most of what the service worker
  precaches, so every installed user re-fetched the whole 1.47 MB offline
  payload.

## The root cause, which was not the import cycle

`catalog` does import `app-shell`, and `app-shell` does list `catalog` in its
`__vite__mapDeps` array, so each one's content hash really does depend on the
other's filename. That cycle is real. It was not the cause, and rolldown
resolves it to one fixed point, deterministically.

The cause was one 32-character value. `lib/build/build-identity.ts` derived the
RSC compatibility id from the build ID, and the build ID was:

```
git rev-parse HEAD        # on a clean tree
null                      # on a dirty tree -> vinext mints randomUUID()
```

Vinext `define`-inlines that id into the client bundle. Measured against
`ae95afb`:

| Identity                 | Where it lands in `dist/`                              |
| ------------------------ | ------------------------------------------------------ |
| RSC compatibility id     | **1 client chunk** (`vinext-<hash>.js`), 1 server chunk |
| RSC build identity       | 3 files, all under `dist/server`                        |
| Build ID                 | `BUILD_ID`, 3 manifests, and `deploymentVersion` in the 1,052 prerendered HTML files and their RSC payloads — **no client chunk** |

So the build ID itself renames nothing. The compatibility id renames everything:
17 chunks name `vinext-<hash>.js` directly, rolldown folds each chunk's hash
into the hash of every chunk that imports it, and the cascade reaches 111.

And a dirty tree got a **random** compatibility id per build. Measuring a
dependency change means editing `package.json`, which means a dirty tree, which
means every build of it landed somewhere new. That is the whole of the
unexplained observation that `main` settled on one service-worker build id
across six builds while any lockfile change produced a fresh one on every build:
`main` was clean, and the modified tree never was.

### The proof that the cycle was innocent

Hold the identity still and change only the dependency —
`OPENTOOLS_BUILD_ID` is the supported way, and `vinext` honours
`__VINEXT_SHARED_PRERENDER_SECRET` and `__VINEXT_SHARED_REVALIDATE_SECRET` for
the two build secrets that are otherwise random:

| Compared, identity held fixed                       | Files differing            |
| --------------------------------------------------- | -------------------------- |
| Two builds of one tree                              | 1 (`dist/server/index.js`) |
| `undici@7.29.0` vs `undici@7.29.1`, nothing else     | 1 (`dist/server/index.js`) |

All **2,427 of 2,427** files under `dist/client` byte-identical in both rows,
chunk names included. The one differing file is the draft-mode bypass
credential, which is random by design and has no environment hook — see the long
note in `lib/build/build-identity.ts`. There was never a hashing cycle to break.

### The three "residual" chunks were an artefact of the measurement

An earlier hand-rolled comparison normalised every `-<8 chars>.js` to a
placeholder and reported three chunks (`pdf`, `vinext`, `qr-barcode`) as
differing "between two builds of the same tree", read as the build's own noise
floor. It was not noise. This build emits several chunks that share a stem:

| Stem         | Chunks emitted |
| ------------ | -------------- |
| `kernel`     | 5              |
| `metadata`   | 4              |
| `pdf`        | 3              |
| `image`      | 3              |
| `video`, `table`, `qr-barcode`, `life-admin` | 2 each |

Normalising their names collapses each group to one key, so a comparison keyed
on that name compares chunks that have nothing to do with each other. `pdf` and
`qr-barcode` were collisions; `vinext` was the compatibility id. The genuine
noise floor is **zero chunks**. `scripts/diff-dist.mjs` pairs by content for
exactly this reason, and its test suite pins the collision case.

## The fix: a build ID made of the build's own inputs

`lib/build/build-inputs.ts` replaces both halves of the old rule. The build ID
is now `sha256` over:

- the content of every **tracked file the build can read** — git's own blob IDs,
  so the 41 MB under `public/` costs nothing to account for — plus untracked
  files git is not ignoring, because a new module that nothing has committed yet
  is still a module the build reads;
- the resolved version and integrity of every **installed package that can
  change what the build writes**.

It is 64 hex characters, deliberately not the 40 of a commit, so nothing invites
`git show` on it. Provenance survives and gets stronger: the digest is a pure
function of the tree, so it can be recomputed from any checkout and checked
against `dist/server/BUILD_ID`. `scripts/predeploy.mjs` now does exactly that,
which catches a stale `dist/` built from uncommitted work — something a
comparison against `HEAD` could never see.

### What it buys

Measured against `ae95afb`, counting the 259 chunks under
`dist/client/_next/static/chunks/`:

| The build ID moves because…                  | Chunks renamed, before | After |
| -------------------------------------------- | ---------------------- | ----- |
| nothing — two builds of one clean tree       | 0                      | 0     |
| two builds of one tree with uncommitted work | 111                    | **0** |
| an edit under `docs/`                        | 111                    | **0** |
| `overrides.undici` moved `7.29.0` → `7.29.1` | 111                    | **0** |

The last three rows are the point. A prose commit, a test-only commit and a
dev-only dependency bump now leave `dist/client` byte-identical — same chunk
names, same bytes, same service-worker build id, so a returning visitor keeps
the 1.47 MB they already have.

The `docs/` row was measured on this page: a build, then this paragraph, then
another build. All 3,025 files came out as they were apart from the eight that
carry a random secret, listed below.

In full, with nothing pinned at all and `undici` moved between `7.29.0` and
`7.29.1` — the comparison the task of reviewing a dependency change actually
asks for:

| `find dist -type f \| sort \| xargs sha256sum`      | Files  |
| --------------------------------------------------- | ------ |
| Byte-identical                                      | 3,017  |
| Renamed, identical once hashed filenames normalised | 4      |
| Content differs                                     | 4      |
| Present on one side only                            | 0      |

All 2,427 files under `dist/client` are in the first group — every chunk name,
every byte, and the same service-worker build id `bb167c731d3b3520`. The eight
that moved are all under `dist/server` and all carry a random secret: the
prerender secret in `vinext-server.json`, the revalidate secret in
`isr-cache-<hash>.js`, the chunk that renames because of it, and the two
manifests that name it. Supply the two secrets vinext reads from the
environment and the same comparison reads **3,024 byte-identical of 3,025**,
with `dist/server/index.js` the only file left — 28 bytes inside the 32-character
draft-mode credential.

### And it changes nothing the site serves

Against `main`, built from the same lockfile:

| Compared with `main`'s build                          | Result                               |
| ----------------------------------------------------- | ------------------------------------ |
| Client chunks whose content differs                   | **1** of 259 — `vinext-<hash>.js`, 38 bytes, all inside the 32-character compatibility id |
| Client chunks renamed, identical once normalised      | 111 of 259                           |
| HTML and RSC payloads                                 | 1,052 each: `deploymentVersion` is a 64-character digest where it was a 40-character commit, plus the renamed chunk references |
| Files present on one side only                        | 4 each: `_next/static/<build id>/_buildManifest.js` and `_ssgManifest.js`, and the two `sw-precache-*-<id>.js` files, all of which carry an id in the name |

No chunk's code differs. The build ID is a different string, so everything that
embeds it says so, and nothing else moved.

### What is in the digest, and what is left out

Default is to include. A path or package wrongly **left in** costs a renamed
chunk; one wrongly **left out** would let two builds that really do differ share
one ID, one KV cache key and one year-long `immutable` filename. So the list of
exclusions is short, and each entry is a claim with evidence behind it.

**Paths left out** are documentation (`docs/`, `decisions/`, the root Markdown
files), test suites (`e2e*/`, every `*.test.ts`, the Playwright and vitest
configs), CI (`.github/`), the self-host image (`Dockerfile`, `docker/`,
`packaging/`), the browser extension, and release bookkeeping (`release/`,
`.predeploy-state.json`). Checked by grep over `app components lib engine
workers types` for every entry: where app code mentions one of these files —
`app/self-host/page.tsx` reproduces a table from `docs/SELF_HOSTING.md`,
`app/compare/open-source-pdf-tools/page.tsx` quotes `THIRD_PARTY_NOTICES.md` —
it copies the prose into the component by hand and never reads the file.

**Packages left out** are cut from the dependency walk along with everything
only they reach, so the list stays short — cutting `vitest` cuts its subtree.
Two kinds of claim:

| Package                                                                      | Why it cannot change a byte                                                       |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `vitest`, `@playwright/test`, `oxlint`, `oxlint-tsgolint`, `oxfmt`, `typescript` | Never executed by `npm run build`, never bundled                                |
| `@types/*`, and `csstype`/`undici-types`, which only they reach               | No JavaScript at all: 0 `.js`/`.mjs`/`.cjs` against 125 `.d.ts`                   |
| `undici`                                                                     | Measured: moving it changes no byte of `dist/client` and no byte of `dist/server` except the random credential |

"Never executed" was measured, not assumed, and is re-measurable:

```sh
NODE_V8_COVERAGE=/tmp/cov npm run build   # V8 records every script Node runs
```

On 2026-10-02 that was 94 packages of the 465 installed, and none of the first
row was among them. `pdfjs-dist` is also a devDependency the build never
executes and is deliberately **not** on the list, because five modules under
`components/` and `lib/` import it, so it ships.

`undici` is the one entry that does execute: it is `miniflare`'s HTTP client,
and miniflare serves the prerender requests that turn routes into the HTML under
`dist/client`. So its exclusion rests on the measurement above rather than on a
structural argument — a transport does not rewrite the body it carries.
`miniflare`, `workerd` and `wrangler` themselves stay in the digest.

Two checks keep the list honest. `lib/build/build-inputs.test.ts` walks
everything the cut actually removes and fails if any of it is neither marked
`dev` by npm nor free of JavaScript on disk. `guardBuildInputs` in
`vite.config.ts` fails the build if a cut package turns up in the module graph —
the same claim from the other end, against what really got bundled.

## What is still not byte-identical, deliberately

`dist/client` reproduces exactly. `dist/server` does not, and should not:

| Random value                     | Pinnable?                                            |
| -------------------------------- | ---------------------------------------------------- |
| Prerender secret                 | Yes, `__VINEXT_SHARED_PRERENDER_SECRET`              |
| Revalidate secret                | Yes, `__VINEXT_SHARED_REVALIDATE_SECRET`             |
| Draft-mode bypass id             | **No** — `createPreviewBuildCredentials` has no hook |

These authenticate privileged access; deriving them from anything public would
let whoever holds this repository forge them. Supplying the first two takes two
builds of one tree from 8 differing files to 1; the last one keeps
`dist/server/index.js` differing by 32 hex characters forever. A build that
embeds credentials is reproducible *given the same credentials*, and that is as
far as this should go.

## How to check any of this yourself

Two builds of one tree, which is the verification the site's claim rests on:

```sh
npm run build && cp -a dist /tmp/before
npm run build && cp -a dist /tmp/after
node scripts/diff-dist.mjs /tmp/before /tmp/after
```

Expect `dist/client` identical and `dist/server/index.js` differing in the
draft-mode credential. Supply the two secrets above to both builds and that is
the only file left.

Two builds of **different** trees — the review question, "does this change ship
anything?" — need the identity held still, because a different tree is a
different build and is supposed to say so:

```sh
export OPENTOOLS_BUILD_ID=compare \
  __VINEXT_SHARED_PRERENDER_SECRET=compare \
  __VINEXT_SHARED_REVALIDATE_SECRET=compare
git stash && npm run build && cp -a dist /tmp/before
git stash pop && npm run build && cp -a dist /tmp/after
node scripts/diff-dist.mjs /tmp/before /tmp/after
```

`diff-dist.mjs` exits 0 when the two trees are the same build — nothing added,
nothing removed, and nothing differing once hashed filenames are normalised —
and 1 with a report of what really changed when they are not. Its last line
splits the count, because the halves mean different things:

```
[DIFF DIST] These are different builds: 0 differing under client/, 4 under server/.
```

`0 differing under client/` is the answer to "does this ship anything?": nothing
a visitor downloads moved. A `server/`-only difference is what two builds of one
tree look like, because three values in the Worker are random by design. That
line reads `0 differing under client/` for the `undici` pin and for the prose
edit above, and `0 … 1 under server/` with the two secrets supplied.

Do not read a raw `diff -r` of two `dist/` trees and expect it to mean anything:
one changed byte in a shared chunk renames it, which renames its importers, which
renames theirs. That cascade is how content-addressed output works, and it is not
going away.
