# Contributing to OpenTools

Thanks for helping build private, local-first browser tools. Every contribution
must keep the core promise: **user data never leaves the browser.**

## Ground rules

1. **No network egress from tools.** No `fetch`, `XMLHttpRequest`,
   `WebSocket`, `sendBeacon`, remote scripts, or remote images in tool code.
   The local-source policy tests and the production CSP (`connect-src 'none'`)
   enforce this.
2. **No client-side analytics, telemetry, ads, session replay, or third-party
   embeds** — anywhere in the app. The only server-side log is the visit log in
   `proxy.ts`, documented in [`.github/SECURITY.md`](.github/SECURITY.md#server-side-visit-log).
   A PR that changes what it records must update that section and the README.
3. **No silent remote fallback.** If a browser cannot run a tool, show a clear
   error.
4. **Never gate a result** behind signup, payment, delay, or watermark. Support
   prompts stay optional and non-blocking.
5. **MIT-compatible dependencies only.** Check the license before adding a
   package; copyleft (GPL/AGPL) code cannot be bundled. Record it in
   `THIRD_PARTY_NOTICES.md` and run `npm run sbom`.
6. **Semantic design tokens only.** Use `bg-background`, `text-foreground`,
   `bg-success`, `border-border`, `text-muted-foreground`, etc. — no raw hex or
   arbitrary palette colors. `npm run design:qc` enforces this.

## Development

```bash
npm install
npm run dev        # local dev server
npm run test       # Vitest suite
npm run qc         # full quality gate — must pass before opening a PR
```

Requires Node.js >= 22.13.0.

## Good first contributions (genuinely open)

All core tool engines are pure functions over bytes: no framework glue, no
database, and no network mocking. **The tests are the specification.** A change
that keeps them green is a change that works.

Here are 4 open starter tasks:

1. **ZIP64 archives** (`lib/tools/archive/zip-reader.ts:214`): Parse ZIP64 end of
   central directory and extra field `0x0001` to unpack archives > 4 GB or >
   65,535 files.
2. **TTML / DFXP subtitles** (`lib/tools/subtitles/core.ts:11`): Add TTML XML
   parsing to `SubtitleFormat` so all 14 subtitle operations work with broadcast
   subtitles at once.
3. **SCC closed captions** (`lib/tools/subtitles/core.ts:11`): Scenarist Closed
   Caption CEA-608 parsing with drop-frame timecode arithmetic (stretch item).
4. **iPhone Safari dropzone file handoff** (`docs/DROPZONE_FILE_HANDOFF.md`):
   Failing tests are already written and skipped in WebKit. Make them pass so
   files dropped on mobile follow the user into the tool.

## Adding a tool

1. Add or extend a manifest in `lib/tools/catalog.ts`.
2. Put pure logic in `lib/tools/` and heavy work in a Web Worker under
   `workers/`.
3. Add tests for valid, empty, malformed, oversized, and cancelled inputs.
4. Reuse the shared workbench components in `components/` and emit the
   completion receipt via `lib/completion.ts`.
5. Run `npm run qc`.

## Pull requests

- Keep PRs focused; one tool or fix per PR.
- Fill in the PR template's zero-egress checklist.
- Use [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat(pdf): …`, `fix(image): …`).
- CI must be green.

### If your PR goes red and you did not break anything

Check whether `main` is red first. When it is, there will be an open issue
titled **"main is red"**, opened automatically the moment CI fails on `main`
and closed automatically when it passes again. A failure on `main` shows up on
every open pull request, and it is not yours to fix.

This happens for a reason that is worth knowing, because no amount of care in
your own branch prevents it: two pull requests can each be correct and still
break `main` together. One adds a page, the other adds a rule that governs
pages. They touch no common file, so git reports no conflict, both run CI
against a `main` that lacks the other, and both are genuinely green. The
breakage only exists once both are merged — and "both merged" first happens on
`main`.

So the last commit is where such a failure *surfaced*, not necessarily where it
came *from*. Read the failing test before assuming the most recent merge is at
fault.

### Green is not the same as safe to merge

A `pull_request` run tests your branch merged with the base **as it stood when
the run started**. GitHub does not recompute it when the base moves on, so a
green tick can be an answer to a question nobody is asking any more.

That is not theoretical here. On 2026-09-26 one pull request added a guard
requiring every live tool page to render `<ToolJsonLd`, another added
`/file/xray` without one. Neither could see the other, both were green, and
`main` went red on the second merge. The same shape had already happened when
`/bench` was renamed `/batch` under a branch that still listed the old route.

Until the merge queue below is switched on, the practical defence is: if your
branch has been open while several things landed, merge `main` in and let CI
run again before merging — particularly if your change **adds a route, adds a
page, or adds a guard that every page must satisfy**, which is the combination
that has broken it twice.

### Enabling the merge queue

A merge queue re-runs the checks against the tree that will actually exist
after the merge, which is the only place these interactions are visible. Both
workflows already listen on `merge_group`, so the repository side is done and
`scripts/merge-queue-guards.test.ts` keeps it that way. What remains is one
setting, and **the order matters**:

1. Confirm `merge_group` is still in `.github/workflows/ci.yml` and
   `.github/workflows/selfhost-image.yml`. It is, and the test above fails if
   it stops being — but check, because step 3 is what goes wrong if it is not.
2. In **Settings → Branches → branch protection for `main`**, require status
   checks and name exactly the checks that run on `merge_group`:
   `Quality control (Node 22.x)` and `Build image (pull request)`.
   Those names are strings; the second one keeps its slightly wrong name
   deliberately, because renaming a required check stops the requirement
   matching anything.
3. Turn on **Require merge queue** on the same rule.

The failure to avoid is naming a required check that never runs on
`merge_group`: the queue then waits on a report that will never arrive, and
every merge in the repository stops. That is why step 1 comes first.

Two costs worth knowing before you turn it on. Merges become serial, which at
this repository's current rate is a real slowdown; and every change is tested
twice, once on the pull request and once in the queue. Both are cheaper than
the third red `main`.


## Security

Report privacy or security issues privately — see
[`.github/SECURITY.md`](.github/SECURITY.md). Do not open public issues for
them.

By contributing, you agree your contributions are licensed under the
[MIT License](LICENSE).
