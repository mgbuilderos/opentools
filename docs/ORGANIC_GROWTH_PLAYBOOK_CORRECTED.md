# Organic growth playbook — corrected

> **Status**: proposal for the owner. Nothing here is implemented, published or
> deployed.
> **Supersedes**: `docs/ORGANIC_GROWTH_PLAYBOOK.md` in
> `apps/web-ui-ux-worktree` (Antigravity, `98a6433`, 2026-09-17) — see §9 for
> what was removed and why.
> **Branch**: `claude/growth`, worktree `apps/claude-growth`, off `origin/main`.
> **Objective**: grow organic traffic to getopentools.com with no paid spend,
> using only tactics that survive the project's recorded rules and decisions.

---

## 1. Why this rewrite exists

The original playbook has the right instincts — product-led distribution,
high-intent long-tail search, developer channels — and four of its six pillars
reverse decisions the owner recorded on the same day. It was written without
reading `ai/BUSINESS_RULES.md`, `research/LEARNINGS.md`, or
`docs/DECISION_LOG.md`. Its own §4 forbids invented numbers; its §3 projects a
"+15% viral coefficient" and "3,000–8,000 immediate monthly referral visits".

That is the real failure mode, and it is not a one-off: **a growth plan
generated without the constraint set will keep proposing the things the
constraint set already rejected.** §2 exists so the next revision cannot repeat
it.

A second failure mode this rewrite fixes: the original proposes work that is
already in flight on other branches, and work the engine cannot currently do,
without checking either. Every pillar below states what exists today.

### Reading order — required before editing this document

Paths marked *(blueprint root)* live above the repository, beside `apps/`; the
rest are in this worktree.

1. `ai/BUSINESS_RULES.md` (blueprint root) — numbered, binding.
2. `docs/DECISION_LOG.md` on branch `claude/decisions` — owner decisions 1–15.
   **Decisions 8–15 are not on `origin/main` yet**; a worktree cut from
   `origin/main` will show only 1–7.
3. `research/LEARNINGS.md` (blueprint root) — items 24, 33, 35, 36 govern
   growth directly.
4. `docs/PRODUCT_AS_MARKETER_AND_GROWTH_LOOPS.md` (blueprint root) — seven
   loops already specified. Extend them; do not re-derive them under new names.
5. `AGENT_BOARD.md` §4 (blueprint root) — what is already in flight.

---

## 2. The constraint set

Every growth tactic must pass all eight. A tactic that fails one is not a
trade-off to be argued; it is out.

| # | Constraint | Source |
| :-- | :--- | :--- |
| C1 | Core outputs and filenames are never watermarked or branded. | Rule 33; Learning 36 |
| C2 | No "0 bytes", "zero egress" or measured-privacy claim without a formal egress proof for that release. | Rule 23; Decisions 5, 15 |
| C3 | No named portal preset carrying a number that can go stale. | Decision 9; ADR-017 |
| C4 | No new family of near-template pages; thin guides are being consolidated, not multiplied. | Decision 11; Learning 24 |
| C5 | Share objects carry the task, never the user's artifact, filename or private parameter. | Learning 35; Decision 12 ("set aside") |
| C6 | No tracking script, no third-party origin, no client-side analytics. | `connect-src 'none'`; Decision 6 |
| C7 | A tool link is live only if `isLiveToolUrl()` returns true; no page ships ahead of its tool. | Board protocol §1.7 |
| C8 | Outward actions — npm publish, GitHub release, a PR to another repo, a directory listing — need the owner's go-ahead at the time. | Decision 12; Board §1.6 |

---

## 3. Growth physics, corrected

The original frames growth as a flywheel with five inputs, all pushing at once.
That is the wrong shape for this product at this moment, for one measurable
reason: **the site currently has one GitHub star and a Search Console property
too new to report rows.** There is no flywheel to spin yet. There is a cold
start.

A cold start has a different sequence: earn the first credible surface, prove
it converts, and only then build the machine that scales it. Concretely —

```
   PROVE ONE SURFACE            THEN INSTRUMENT            THEN SCALE
   ─────────────────            ───────────────            ──────────
   A small number of      →     Read the visit log   →     Repeat only the
   complete tool pages          and Search Console         shapes that moved
   that fully solve one         for which shapes                 │
   bounced-upload job           actually earn                    ▼
          │                     impressions              Directory + developer
          ▼                            │                 channels, once there
   Each one is a front              (4 weeks)            is something to point
   door (Learning 33)                                    at (self-host, engine)
```

The three compounding assets that survive every constraint are: **complete tool
pages in exact task language**, **a downloadable processing record**, and
**a self-hostable edition**. Everything else in this document is downstream of
those three.

---

## 4. Pillars

### Pillar 1 — Bounced-upload intent pages (replaces "pSEO error-code matrix")

**Mechanism.** Someone is rejected by a portal with an explicit ceiling and
searches with high urgency and no brand loyalty. This is the strongest intent
the product can serve.

**What exists today.** More than the original assumed, and it needs review:

- On `main`, `compressPdf` (`lib/tools/pdf/engine.ts`) re-encodes
  recompressible JPEG streams and returns the original if the result grew. It
  has **no target-byte mode**. A page promising "under 2 MB" cannot be served
  by it.
- On branch `claude/exact-size` (commit `7483c6d`, **uncommitted work preserved
  unreviewed**, not written by the session that preserved it) there is a real
  one: `lib/tools/pdf/fit-to-size.ts` searches quality and a dimension ladder,
  decides on **measured bytes only** — its own header says "Nothing here
  estimates" — and returns an explicit `over-max` outcome when even floor
  quality at the smallest rung stays over the ceiling. That honest-failure path
  is exactly what C7 requires.
- That same branch also contains `lib/tools/pdf/size-targets.ts`, a
  `PORTAL_PRESETS` table naming USCIS, Schengen and Workday with byte limits.
  **This conflicts with decision 9** and must be resolved before the branch goes
  anywhere near `main`.

**The preset conflict, and the way through it.** Decision 9 bans named presets
with numbers because portal limits change without notice (ADR-017). The
in-flight code anticipated the objection — its header argues the numbers stay
editable and the UI says where each came from. That is a reasonable design and
it is still the owner's call, not an agent's. Note that the code itself
undercuts the original playbook's premise: it records **two** USCIS ceilings
(2 MiB for evidence, 6 MiB for a completed form), so the flat "2,048 KB" the
original hardcodes into a page title is already wrong.

Three options for the owner, in the order I'd rank them:

1. **Generic tool, descriptive guide** (decision 9 as written). Target box is
   user-entered. The guide names the use case — "exam and job portal uploads" —
   and tells the reader to check their portal's current notice. Nothing goes
   stale. Weakest search capture of the three.
2. **Presets as dated, sourced, editable hints.** Keep `PORTAL_PRESETS`, require
   every row to carry a source URL and a `checkedOn` date, show both in the UI,
   and add a test that fails when any row is older than 90 days. Page titles and
   `<h1>` stay generic; the number appears only in the app, never in metadata a
   search engine caches. This keeps the conversion benefit and makes staleness
   loud instead of silent. **Needs a new owner decision amending 9.**
3. **Drop the presets entirely**, ship fit-to-size generic. Cleanest, and it
   throws away working code.

**What must not happen** (either way): a page titled `Fix "File Exceeds
2048 KB"`. It bakes a number into a cached title, it is one of two USCIS
ceilings, and C4 makes a matrix of fifteen such pages a scaled-content risk on a
site mid-way through de-indexing ~430 thin URLs.

**Gate.** `claude/exact-size` reviewed and merged; preset question decided by
the owner; `isLiveToolUrl()` true for the route before any guide links to it.

---

### Pillar 2 — The processing record as the share object (replaces "forensic receipt" + output metadata)

**Mechanism.** The most credible marketing unit is a successful result
(Learning 34). The original's instinct was right and both of its implementations
were forbidden. Decision 15 already approved the legal version, and it is
stronger.

**What ships** (per decision 15, in flight at `apps/claude-attestation`): after a
successful job the user may download a processing record listing only measured
or build-time facts — tool and operation, duration, execution mode, the
Content-Security-Policy served for that page, and the network requests the page
itself observed during the job. It states its own limits: a page-level
measurement cannot see browser extensions, the operating system, or other
devices.

**What it must never contain**: a content hash, filename, file size or any
content of the document (decision 15,
`docs/LOCAL_PROCESSING_ASSURANCE.md`); the strings "0 file bytes uploaded" or
"zero egress" absent a release egress proof (C2); any onward transmission — it
stays on the device unless the user downloads it, and never reaches checkout,
analytics or support (rule 38).

**Why this beats the original.** A watermark asserts; a record shows its work.
The CSP served for the page is a fact a sceptical reader can verify themselves
in DevTools. That is a defensible artifact for a privacy audience, and it is the
only one of the two that is legal here.

**Output file metadata is rejected outright.** See §9.

**Gate.** `claude/attestation` verified; mounting its button in
`components/completion-value-dialog.tsx` is Antigravity's file and goes through
a board §7 request.

---

### Pillar 3 — Recipe links (replaces state-serialized artifact URLs)

**Mechanism.** A shared link that reproduces someone's *setup* — tool,
operation, options — so a colleague lands in a configured workbench. This is the
task-link and recipe loop already specified in
the blueprint's `docs/PRODUCT_AS_MARKETER_AND_GROWTH_LOOPS.md` ("Task-link loop",
"Recipe loop"), not a new invention.

**Scope.** Query parameters describing the operation only:
`/developer/advanced?tool=sql-to-er-diagram&layout=...`. Content-free by
construction (Learning 35).

**Explicitly out of scope**: the user's schema, JSON, CSV or PDF in a URL
fragment. Three independent reasons, any one sufficient —

1. Decision 12 lists "share links carrying user input" under **not decided,
   owner set aside**.
2. It is self-defeating. A 500 KB PDF encrypted and base64'd is roughly 680 KB
   of URL. Pasting that into Slack puts the document on Slack's servers — the
   exact behaviour the product tells people to stop. A product whose pitch is
   "stop uploading private documents to cloud servers" cannot ship a share
   button that uploads the document to a cloud server.
3. It needs `pako`, a new dependency, and ADR-004 requires licence review before
   dependencies.

**Gate.** None beyond normal review — this is small and sits inside an existing
approved loop.

---

### Pillar 4 — Developer and directory channels, correctly sequenced

The original's channel list is good. Its sequencing is not: it schedules the
outreach before the thing being pointed at exists.

| Channel | Real prerequisite | Status |
| :--- | :--- | :--- |
| `awesome-selfhosted` | The list defines self-hosting as running the software on your own server. A static client-side site qualifies only with a **published self-host path**. | Blocked on `claude/selfhost` (decision 12: Docker release, owner go-ahead at release time). |
| `free-for-dev`, `awesome-privacy` | No self-host requirement; both want a real, working, free thing. Reachable sooner. | Ready after a traction check. |
| AlternativeTo profile | None. Lowest-cost, highest-certainty item in the whole plan. | **Do this first.** |
| npm CLI / MCP server | Decision 12: *later*. Decision 13: engine separation first, **no npm package published**. | Blocked on `claude/engine`. |
| Chrome extension, paid support | Decision 12: **not now**. | Out. |

**On the numbers.** The original cites 180,000 / 15,000 / 85,000 stars for three
lists. Checked on 2026-09-17: awesome-selfhosted **319,860**, awesome-privacy
**19,779**, free-for-dev **137,677**. Wrong in a harmless direction, but they
were generated rather than looked up, in a repository that keeps a
`SOURCE_LEDGER.md`. Any number that enters a growth document gets a source and a
date or it does not go in.

**Cold-start reality.** `mgbuilderos/opentools` has one star. "Developers star
the repo and it compounds" needs a first push that this plan does not yet
contain; the self-host release is the most plausible candidate for it.

**Gate.** C8 — every item here is an outward action needing the owner at the
time, not a standing approval.

---

### Pillar 5 — Comparison pages, hand-written and few

**Mechanism.** People search for an escape from a free tier that just tightened.
The intent is real and the original is right to want it.

**Correction.** Not programmatic, and not a `/compare/*` family. C4 forbids
spawning a new near-template page family while decision 11 is consolidating the
last one. Instead: **at most three hand-written pages**, each a genuine
comparison with a working tool on it, each making the architectural point
(server-side upload vs. in-tab execution) with specifics that are true on the
day of writing and dated.

Claims about a competitor's limits are claims: each one gets a source URL and a
`checkedOn` date, same rule as Pillar 1's presets.

**Gate.** Decision 11's Search Console re-check (owner noted the property is new
and "Processing data"; re-check in about four weeks). If consolidation is still
running, these wait.

---

### Pillar 6 — Embeds: a security decision, not a marketing one

**Mechanism.** Free embeddable widgets earn contextual backlinks. The "Embed
loop" is already specified in the blueprint's
`docs/PRODUCT_AS_MARKETER_AND_GROWTH_LOOPS.md`.

**The blocker the original missed.** `lib/security/content-security-policy.ts`
sets `frame-ancestors 'none'` on every route. The site cannot currently be
embedded anywhere. Shipping the original's iframe snippet requires relaxing
that.

**What would have to be true.** A scoped relaxation on `/embed/*` only, never
site-wide; embed routes that carry no file input and no support prompt; an
explicit clickjacking assessment written down; a test asserting that every
non-embed route still sends `frame-ancestors 'none'`.

**Recommendation: defer.** This is a security-posture change on a product whose
entire proposition is security, in exchange for backlinks that only matter once
there is ranking to compound. It is the lowest ratio of benefit to risk in the
document. Revisit after Pillar 1 has proven the site can rank at all.

**Gate.** A security ADR, approved by the owner. Not a growth task.

---

## 5. The gate the original has no section for: can the site take the traffic?

The stated goal is 100,000 monthly organic visitors. On 2026-09-16 the Worker
`local-tools-canary` returned **1,316 `exceededResources` 503s in one hour** —
15.2% of 8,666 invocations at 21:00Z — because it re-rendered every page per
request under `Cache-Control: no-store`. Every other hour that day saw 10–200
invocations and zero failures. The failure is load-dependent, and a successful
growth plan produces exactly that load.

The fix (commit `c51e20e`, 2026-09-17 05:52Z) is deployed and still in place —
verified on this branch: `export const revalidate = 86400` in `app/layout.tsx`,
and `VINEXT_KV_CACHE` bound in `vite.config.ts` with vinext's KV data-cache
adapter. **It has never been tested above about 110 invocations per hour.** Zero
failures at 110 establishes nothing about 8,666.

**Required before any traffic push:**

1. Cache proof — request a guide route twice, expect `x-vinext-cache: HIT` with
   `s-maxage=86400` on the second.
2. A synthetic burst at or above the volume that broke it, against a canary, not
   production.
3. Restore the daily 503 watcher. The deleted task's prompt and registry entry
   are preserved at
   `~/.claude/backups/scheduled-tasks-deleted/opentools-crawl-503-check-20260917/`.
   Cloudflare's `workersInvocationsAdaptive` dataset retains roughly three days,
   so an unwatched crawl event is unrecoverable.

Nothing in §4 ships before item 1 passes. Pillars 1 and 5 — the search-facing
ones — do not ship before items 2 and 3.

---

## 6. Measurement, within the rules

The original proposes no measurement, which is convenient, because C6 removes
every instrument a growth plan normally assumes. There is no client analytics
and there never will be. What exists:

**The server visit log** (`proxy.ts`, documented in `.github/SECURITY.md`): one
`tool_impression` event per page request, carrying country, device type,
`referer_source` **category**, the page path and `tool` query parameter,
primary browser language, and a timestamp. Not the raw referrer, not the user
agent, not an identifier.

**What that can answer**: which paths get requested, roughly where from, and
whether a referral category moved after a channel went live. That is enough to
rank shapes of page against each other, which is the only question §3 asks.

**What it cannot answer**: conversion rate, whether a task completed, K-factor,
or anything joining a visit to an outcome. Rule 38 forbids the join key that
would make those measurable, deliberately. **Do not propose a metric the
instrument cannot produce** — that is how "+15% viral coefficient" got into the
last draft.

**Search Console** is the other instrument. Decision 11 already gates guide
consolidation on it; the owner checked on 2026-09-17 and the property is too new
to report rows, re-check in about four weeks. That date gates Pillars 1 and 5
too.

**Caveat**: Workers Logs retention is short — confirm the current plan's window
before relying on a comparison older than it.

---

## 7. Sequence

Each phase gates the next. No phase starts before its gate passes.

| # | Work | Gate to start | Owner action needed |
| :-- | :--- | :--- | :--- |
| 0 | Cache proof + restore 503 watcher (§5.1, §5.3) | none | permission to re-create the scheduled task |
| 1 | AlternativeTo profile | phase 0 | C8 — outward action |
| 2 | Processing record (`claude/attestation`) ships; board §7 request to mount it | phase 0 | review |
| 3 | Recipe links (Pillar 3) | phase 0 | review |
| 4 | Resolve the preset question (Pillar 1); review and merge `claude/exact-size` | phase 0 | **decision amending or confirming 9** |
| 5 | Burst test (§5.2) | phase 4 merged | canary |
| 6 | First bounced-upload pages — small number, each with a live tool | phase 5 | review |
| 7 | Self-host release → `awesome-selfhosted`; `free-for-dev`, `awesome-privacy` | `claude/selfhost` ready | C8 — release + PRs |
| 8 | Comparison pages (Pillar 5) | Search Console has rows | review |
| 9 | Engine separation → CLI/MCP reconsidered | `claude/engine` | decision 13 revisited |
| — | Embeds (Pillar 6) | security ADR approved | owner decision |

Phase 0 through 3 are unblocked today and need no new owner decision except the
scheduled task. Phase 4 is the one that needs a ruling.

---

## 8. Open questions for the owner

1. **Presets** (Pillar 1) — confirm decision 9 as written, or amend it to allow
   dated-and-sourced editable presets? The code on `claude/exact-size` assumes
   the amendment; it cannot merge as-is under decision 9.
2. **`claude/exact-size` provenance** — the board records this branch as
   preserved-unreviewed work with no known author, and it also modifies
   `proxy.ts`, which is Antigravity's. Who reviews it?
3. **Scheduled 503 watcher** — re-create it? §5 treats it as required.
4. **Embeds** — worth a security ADR now, or closed until there is ranking to
   protect?

---

## 9. Rejected from the original, with reasons

| Original proposal | Why it is out |
| :--- | :--- |
| `setProducer('OpenTools … getopentools.com')` in every output PDF | Rule 33: core outputs are never branded. Beyond the rule: it stamps a third-party identifier into a user's immigration or court filing without asking, which is against the interest of the person the product exists to protect. |
| Receipt reading "0 Bytes Sent to Server" | Rule 23, decisions 5 and 15 — verbatim the string decision 15 forbids without a release egress proof. `components/audit-terminal.tsx` was deleted for precisely this. |
| Named portal presets in page titles and metadata (`Fix "File Exceeds 2048 KB"`) | Decision 9 / ADR-017. Also factually wrong: USCIS applies at least two ceilings. |
| A 15-page programmatic pSEO matrix, and programmatic `/compare/*` | Decision 11, Learning 24. ~430 thin URLs are being taken to 404 right now; a new generated family invites a scaled-content action. |
| PDF or schema encrypted into a URL fragment | Decision 12 ("set aside"), Learning 35, plus the Slack-upload contradiction in Pillar 3. |
| `npx opentools` now | Decisions 12 and 13: later, and no npm publish. |
| "conversion rates exceed 40%", "+15% viral coefficient", "3,000–8,000 immediate monthly referral visits" | Board §1.7 and the original's own §4: no invented numbers. §6 explains why two of the three are not even measurable here. |
| Star counts 180k / 15k / 85k | Wrong (319,860 / 19,779 / 137,677 on 2026-09-17) and unsourced. |
| Raycast store extension | Not in any decision; adjacent to the Chrome extension that decision 12 rules out for now. Needs its own decision before it appears in a plan. |

---

## 10. What this document does not claim

It has no traffic forecast. The instruments described in §6 cannot produce one
honestly before Search Console has rows, and a number invented to fill the gap
would repeat the error this rewrite exists to correct.
