# Dependency advisories: what blocks a release and what only reports

The `qc:release` pass runs two `npm audit` gates. Only one of them can stop a
release.

| Gate                                                   | Command                                   | Blocks? | Covers                                                                |
| ------------------------------------------------------ | ----------------------------------------- | ------- | --------------------------------------------------------------------- |
| `DEPENDENCY ADVISORIES (RUNTIME)`                      | `npm audit --audit-level=high --omit=dev` | **Yes** | Code bundled into the Worker and the client — what a visitor executes |
| `DEPENDENCY ADVISORIES (BUILD TOOLCHAIN, REPORT ONLY)` | `npm audit --audit-level=high`            | No      | Everything, including the build toolchain                             |

Both are defined in `scripts/run-qc.mjs` and exist only under `--release`.
Their wiring is pinned by `scripts/audit-gate.test.ts`, which fails if either
half of the pairing is undone.

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

It is telling you a visitor can execute code with a known high-severity fault.
Fix or replace the dependency. Do not add `--omit=dev` twice, do not raise
`--audit-level` to `critical`, and do not delete the gate — `scripts/audit-gate.test.ts`
fails on all three, and the reason it fails is this page.

## Diffing `dist/` to check that a dependency change ships nothing

It works now, and it did not before 2026-10-02, which is worth knowing if you
read an older review of a dependency change.

A raw `dist/` diff used to report **111 of 257 renamed client chunks** for a
change to the `overrides.undici` pin — a dev-only transitive package that ships
nowhere. On the 1 MB `catalog` chunk the real difference was 8 bytes out of
1,004,022, all inside an embedded filename. The cause was the build ID: it was
the commit, and `null` on a dirty tree, and `null` made vinext mint a random id
that one client chunk carries and 111 inherit through their content hashes.
Measuring a dependency change means editing `package.json`, so every such
measurement was taken from a dirty tree and never agreed with itself.

The build ID is now a digest of the build's own inputs, and that digest leaves
out packages that cannot change what the build writes — `undici` among them,
because it was measured not to. So the dependency bump this file is about now
produces a byte-identical `dist/client`, and

```sh
node scripts/diff-dist.mjs /tmp/before /tmp/after
```

reports what really differs, pairing chunks by content rather than by name.
`docs/BUILD_REPRODUCIBILITY.md` has the root cause, the measurements, and what
is still deliberately random.
