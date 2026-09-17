# Owner decision log

Decisions made by the project owner. They override agent plans, catalog
entries and roadmap documents. Any AI agent or contributor must read this file
before adding or restoring tools, and must not reverse an entry without a new
owner decision recorded here.

## 2026-09-17 — Remove astrology; birthday numerology numbers only; no health advice; remove non-working tools

Decided by: project owner. Recorded by: Claude Code at the owner's request.

### 1. Astrology is removed completely — owner decision

- All astrology tools are removed from the app, tests, and search catalog:
  Lagna, Kundali, Panchang, Nakshatra, birth chart, Moon sign, Sun sign, Tithi,
  Pada, Vedic Yoga and Karana calculators, plus every catalogued astrology
  entry (planetary and house positions, dashas, transits, divisional charts,
  Kundali matching, Mangal Dosha, Sade Sati, Rahu Kaal, Choghadiya, Hora,
  muhurat and festival Panchang).
- Reason recorded for context: the removed calculators used linear
  approximations, not an ephemeris (the Moon position ignored the year and the
  ayanamsha was a fixed constant), so their output was wrong for most dates.
  The removal itself is the owner's decision, independent of any future
  accuracy fix.
- **Do not add astrology tools again** unless the owner records a new decision
  in this log.

### 2. Numerology is limited to birthday numbers, arithmetic only

- Kept: life path number, birth number, and personal year number
  (`life-path-number-calculator`, `birth-number-calculator`,
  `personal-year-number-calculator` in the life-admin workbench).
- They show numbers and the digit-reduction steps only. No meanings,
  personality traits, predictions, compatibility, lucky numbers or advice.
- Removed: name numerology, destiny, soul urge and personality numbers,
  numerology compatibility, and the Lo Shu grid.
- The "Astrology and Numerology" search category is removed. The three
  numerology tools are listed under "Date Time and Productivity", because a
  three-tool category would be a thin page.

### 3. Health calculators show formula results only — no health advice

- Kept: BMI, BMR, TDEE and ideal body weight calculators, showing formula
  results and formula names only, each with "not medical advice".
- Removed from their output: BMI classifications, "healthy weight" ranges,
  fat-loss and bulking calorie targets, and the word "clinical".
- Removed completely: the daily water intake calculator, because its output
  can only be a recommendation.

### 4. Non-working tools are removed

- Creator workbench: `audio-format-converter`, `video-to-audio-extractor` and
  `video-to-gif` (they produced a generated 440 Hz tone or synthetic frames
  instead of converting the input), and `exact-kb-image-compressor` (it only
  calculated a plan and did not compress).
- `/audio/transcribe` and `/image/upscaler`, which downloaded models from
  third-party servers that the site's own security policy blocks, so they
  failed in production. Their now-unused dependencies (`@xenova/transformers`,
  `@tensorflow/tfjs`, `upscaler`) are removed.
- A tool may be re-added only when it genuinely processes the user's input
  locally, loads every asset from this site, and has tests proving it.

### 5. No simulated "Network Audit Log"

- The "Network Audit Log" panel shown after a tool ran was removed
  (`components/audit-terminal.tsx`). It printed fixed text such as
  "[SUCCESS] Zero network egress detected." without measuring any network
  activity. Do not show egress results, logs or badges unless they come from a
  real measurement.

### 6. In-app privacy wording matches the server visit log

- The site logs one metadata event per page visit (see `.github/SECURITY.md`,
  "Server-Side Visit Log"). In-app copy therefore says "no third-party
  trackers" and "no client-side analytics", and "your files and inputs never
  touch a server", instead of "no trackers", "No analytics" or "zero telemetry".

### 7. Removed pages return 404; the video-article URL 404s by decision

- Owner decision (2026-09-17): a page whose tool or article no longer exists
  returns **404**. A removed path redirects only when a live page does the same
  job (see `lib/seo/removed-tool-redirects.ts`). Redirecting removed pages to a
  generic index would be a soft 404 and is not done.
- Under this rule, deploying the clean-up takes roughly 430 URLs from 200 to
  404: the 427 guides whose tool is not live, `/video/compress`, `/image/ocr`
  and `/roadmap`. They were already dropped from the sitemap in commit
  `3581d71`, so this is a deliberate de-index, not a regression.
- **Resolved (2026-09-17), previously an open follow-up:**
  `/blog/compress-mp4-webm-video-in-browser` returned 200 and was listed in the
  live `sitemap.xml` (both verified on 2026-09-17). Task A3 replaced that
  article with `/blog/optimize-images-browser-webp-converter`, a different
  slug, so the old URL 404s after deploy.

  The owner was offered three routes — write a genuine article at the original
  slug, keep the 404, or redirect to the nearest live page — and decided:
  **remove the article and let the URL 404.** No redirect is added.

  Reasons recorded with the decision:
  - No live page compresses video. `LIVE_TOOL_ROUTES` in
    `lib/seo/live-tools.ts` contains no `/video/*` route, and no operation id
    in `lib/tools/**` matches `video`. The gzip compressor
    (`/file/workbench?tool=file-compressor`) states in its own notice that it
    "is not ZIP or a media-specific optimizer", so it does not serve this
    intent either.
  - Redirecting to the image-compression article would be a soft 404: the
    topic does not match, which is the case the redirect rule above excludes.
  - The article was one day old (`publishedAt: 2026-09-16`) when it was
    removed, so little ranking had accumulated.
  - Writing a replacement article would have meant promising nothing and
    linking only to unrelated tools, which is the kind of page this clean-up
    is removing.

  `lib/seo/removed-tool-redirects.ts` documents the exclusion, and
  `lib/seo/removed-tool-redirects.test.ts` asserts that the path stays
  unredirected and that no blog post publishes that slug, so the redirect
  cannot be added back silently.

## 2026-09-17 — Offline use, exact-size images, Aadhaar/PAN masking, guide consolidation, self-host edition

Owner decisions, given in chat on 2026-09-17 after the growth and competitor
research. They override plans and catalog entries like every entry above.

### 8. Offline support through a service worker, with limits

- A service worker may cache **only this site's own files** and must never
  fetch from any other origin. Tool code keeps the no-network rule.
- The site may say "works offline" **only** once an automated test turns the
  network off and every cached tool still runs. Until that test exists and
  passes, no page, guide, manifest or README claims offline use.

### 9. Exact-size image tool: generic inputs, no named portal presets

- Build the tool with user-entered values: target size in KB, exact pixels
  and DPI. It must really produce a file that meets them, or say it could not.
- **No named presets with numbers** (for example "SSC: 20–50 KB"). Portal
  limits change with each notification, which breaks the evergreen-tools rule
  (ADR-017).
- Guide copy may describe the use case ("exam and job portal uploads") and
  must tell users to check their portal's current notice.

### 10. Aadhaar and PAN may be named as input formats only

- Pages may say the tool "detects and masks Aadhaar and PAN numbers".
- Aadhaar masking follows UIDAI's masked-Aadhaar convention: hide the first 8
  digits, show the last 4.
- No logos, and nothing that suggests government approval or affiliation.
- The tool must re-check its own output and fail loudly if any number that
  matches either format remains; a missed number is the serious failure.

### 11. Consolidate thin guide pages gradually, based on Search Console data

- Pull Search Console data before changing any guide URL.
- Keep full guides for roughly 30–50 tools that earn traffic or have something
  distinct to say. Redirect the rest to their tool page with a 301 and remove
  them from the sitemap.
- Reason: hundreds of near-template pages match Google's scaled-content abuse
  policy; the site is young, so consolidating now costs little.

### 12. New channels: self-host edition first

- Now: a self-host edition — a GitHub release that serves the built site with
  Docker. Publishing a release is an outward action and needs the owner's
  go-ahead at release time.
- Later: an npm CLI and an MCP server, once tool code is separable from the site.
- Not now: a Chrome extension, and paid support.
- Not decided (owner set aside): runtime `pdfjs-dist`, share links carrying
  user input, and turning off Cloudflare error reporting / the Web Analytics
  beacon.

## 2026-09-17 — Engine separation, redaction re-check, measured attestation

Owner decisions, given in chat on 2026-09-17 after rating growth and
monetisation ideas (`research/GROWTH_AND_MONETIZATION_PLAYBOOK_2026-09-17.md`
in the blueprint). The owner asked to implement the SDK, on-device AI,
self-host and attestation ideas, then chose the scope below for each.

### 13. Engine separation first; no SDK publish and no pricing

- Build the step decision 12 names as the prerequisite for an npm CLI or MCP
  server: a framework-free engine entry point with a test proving it imports
  nothing from React, Next/Vinext, `app/` or `components/`, and uses no
  network API.
- No npm package is published and no paid tier or licence is offered. The code
  is MIT, so a licence fee is not enforceable; decision 12's "paid support:
  not now" stands.
- The self-host edition (decision 12) continues in `claude/selfhost`, taken
  over by the session that recorded this entry.

### 14. On-device AI: deterministic redaction first, no model yet

- Improve the existing redaction tools rather than adding a new one. Detection
  must re-check its own output and fail loudly if a secret it knows how to
  detect remains — the same rule as decision 10.
- Add the `local-model` execution contract and a model registry that records
  each model's same-origin path, SHA-256 and licence. **No model file is
  added.** A model may be added only after a licence and provenance review of
  the exact file (ADR-004) and the owner's approval.
- Summaries or extractions from a future model are not legal, medical or
  financial advice and must not be presented as such.

### 15. Processing attestation: measured facts only, no document hashes

- A user may download a processing record after a successful job. It lists
  only facts measured or known at build time: tool and operation, duration,
  execution mode, the Content-Security-Policy served for the page, and the
  network requests the page itself observed during the job.
- It contains **no content hash, filename, file size or content** of the
  user's document, as `docs/LOCAL_PROCESSING_ASSURANCE.md` requires.
- It states its limits: a page-level measurement cannot see browser
  extensions, the operating system or other devices. It never says
  "0 file bytes uploaded" or "zero egress" unless a formal egress proof for
  that release exists (business rule 23, decision 5).
- The record stays on the device unless the user downloads it; it is never
  sent to checkout, analytics or support (business rule 38).

## 2026-09-17 — Portal presets allowed when dated and sourced (amends decision 9)

Owner decision, given in chat on 2026-09-17 after the corrected organic growth
playbook (`docs/ORGANIC_GROWTH_PLAYBOOK_CORRECTED.md` on branch
`claude/growth`) showed that `claude/exact-size` already ships a
`PORTAL_PRESETS` table that decision 9 forbids.

### 16. Named portal presets are allowed, with a source, a date and an expiry

This **amends decision 9**, which banned named presets with numbers outright.
The ban existed because portal limits change without announcement and a stale
number breaks the evergreen-tools rule (ADR-017). The amendment keeps that
concern and answers it with expiry rather than absence: a preset that goes
stale must fail loudly, not sit there quietly being wrong.

**What is now allowed.** A preset may name a portal and carry a byte limit.

**What every preset must carry**, or it does not ship:

- `sourceUrl` — the page that states the limit, published by the portal itself.
  Not a blog, not a forum answer, not another tool's website.
- `checkedOn` — the ISO date a person last opened that URL and read the number
  off it.
- `field` — the specific form or upload the limit applies to. A portal usually
  has more than one ceiling; USCIS alone has two (2 MiB per evidence file,
  6 MiB for a completed form). A preset naming only the portal is ambiguous
  enough to be wrong.

**Where the number may appear.** In the app only: the preset fills the target
box, and the number stays editable afterwards. The UI shows the source link and
the `checkedOn` date next to it, so a user can check the figure themselves in
one click.

**Where it may not appear.** Never in a page `<title>`, `<h1>`, meta
description, structured data, sitemap entry, or any other text a search engine
caches. A title like `Fix "File Exceeds 2048 KB"` is banned: search engines keep
serving it long after the limit moves, and it names one of a portal's several
ceilings as though it were the only one. Page and guide copy stay generic and
describe the use case, as decision 9 already required.

**Expiry.** A test fails the build when any preset's `checkedOn` is more than
**90 days** old. The fix is to re-open the source and either update the date or
delete the row. A limit that cannot be re-verified from the portal's own page is
deleted, never guessed or carried forward.

**What survives from decision 9, unchanged:**

- The tool takes user-entered values — target size in KB, exact pixels, DPI —
  and a preset only fills them in. Presets are never the only way to set a
  target.
- It must really produce a file that meets the target, or say plainly that it
  could not.
- Guide copy tells users to check their portal's current notice.

**Applies to** `lib/tools/pdf/size-targets.ts` on `claude/exact-size`, which
today has `portal`, `field`, `limitBytes` and `note` but **no `sourceUrl` and no
`checkedOn`**, and no expiry test. It cannot merge until it has them. Its six
rows each need a real source or removal; the `email-attachment` row
("Providers stop between 20 and 25 MB") is a generalisation across several
providers rather than one authority's published figure, so it either names one
provider with one source or comes out.
