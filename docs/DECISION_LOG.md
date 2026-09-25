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

### 8. PDF and image tool pages carry their own guide; seven guides now 301

- **Date:** 2026-09-23. **Status:** implemented on a branch, not deployed.
- **Measured first.** `/pdf/merge` carried 281 visible words and the title
  `Merge PDF · OpenTools`; `/guides/pdf-merge-pdf` carried 1,348 and
  `Merge PDF — free, in your browser, no upload · OpenTools`. Even
  `/convert/l100km-to-mpg-us`, a page with close to no search demand, carried
  579. The optimised page was the one that cannot merge anything, and the two
  were competing for the same query.
- **What changed.** All 19 live PDF and 13 live image tool pages now carry a
  search-intent title and description and at least 800 words of their own
  content — the steps, the engine, the limits, what the tool refuses, and the
  questions people ask — from `lib/seo/tool-page-depth.ts`, rendered by
  `components/page-depth-content.tsx` and emitted as `HowTo` and `FAQPage`
  structured data from the same strings a reader sees. Each of those pages also
  gained a self-canonical; they had been inheriting `alternates.canonical: '/'`
  from `app/layout.tsx`, which told Google that 32 tool pages were the home
  page.
- **Seven guides left the keep list**, so `/guides/pdf-merge-pdf`,
  `pdf-compress-pdf`, `pdf-pdf-to-word`, `pdf-pdf-to-excel`,
  `pdf-pdf-bates-numbering`, `image-background-remover` and
  `image-resize-image-to-exact-kb` now 301 to their tool page and leave the
  sitemap, through the ordinary consolidation path in
  `lib/seo/guide-consolidation.ts` — no new redirect table. This **extends**
  the consolidation decision rather than reversing it: the stated reason for
  keeping a guide is that it says something distinct from its tool page, and
  once the tool page carries that text the reason is gone. Eight guides remain,
  all of tools whose page is a workbench hosting several operations, where the
  guide is still about one of them rather than about the page.
- **The claims are held to tests.** `lib/seo/tool-page-depth.test.ts` enforces
  the 800-word floor, unique titles under the snippet length, a self-canonical
  per page, no remote URL literal, no competitor name, and — the one that
  matters — that `offlineReady`, the only thing that renders a badge about
  working with the network off, is set only for routes in the service worker's
  precache list in `scripts/build-service-worker-precache.mjs`. The mechanism
  itself is proved by `e2e/share-target.spec.ts`, which disconnects the browser
  and loads `/pdf/merge`.
- **Not verified:** anything on getopentools.com. This has not been deployed.

## 2026-09-25 — Indian exam photograph and signature specs are not built, in any form

Decided by: project owner. Recorded by: Claude Code at the owner's request.

### 17. Per-exam photograph and signature spec pages and presets — dropped

- **Date:** 2026-09-25. **Status:** dropped before anything shipped. No code,
  copy, route or preset row was ever added, so there is nothing to remove from
  the app; the working notes written while this was evaluated have been deleted
  from `docs/GROWTH_IDEAS.md` so that this entry is the only record.
- **What was proposed.** A page per Indian exam, per year — UPSC, SSC, NEET,
  JEE, IBPS and state boards — each carrying that exam's official photograph
  and signature specification baked in as a preset, so an applicant chooses
  nothing. When that was ruled out, a narrower version followed: no new pages,
  just two or three exam rows in `lib/portal-presets.ts` behind the existing
  `/image/exact-size`. **Both forms are dropped.**
- **Owner's reason, and it is sufficient on its own: these sizes change from
  time to time.** A preset is only worth having if it is right on the day it is
  clicked. A specification that moves between cycles — or between a notice and
  its corrigendum — cannot be held correct by a table re-read every 90 days.
  Decision 16's expiry rule sets a floor on how stale a row may be; it does not
  make a fresher row right. For a portal whose ceiling holds for years (USCIS,
  Gmail, the GST and Income Tax rows) that floor is enough. For a number
  republished each cycle it is not, and the cost of being wrong lands on an
  applicant inside a once-a-year window. **A preset is the wrong instrument for
  a number that moves faster than the mechanism that checks it.**
- **The wider form failed on its own terms too**, independently of the above. A
  page per exam per year is a near-template family by construction, which the
  guide consolidation forbids while thin URLs are being taken to 404; and baking
  a portal's number into a title, heading, meta description, structured data or
  the sitemap is already barred by decision 16, which permits the number in the
  app only. A page titled after last cycle's KB range is the ad-farm failure
  mode, not a fix for it.
- **What the evaluation established before the drop, recorded so it is not
  rediscovered.**
  - **The specification could not be sourced at all.** `ssc.gov.in`,
    `upsc.gov.in`, `upsconline.gov.in`, `neet.nta.nic.in` and `www.ibps.in` were
    all unreachable from the working environment, and every discoverable
    secondary source was a competitor resizer or a coaching site — which
    decision 16 bars as a `sourceUrl` by name. The niche is underserved by
    trustworthy pages for the same reason it is hard to source correctly.
  - **The figures in circulation disagree with each other.** The proposal gave a
    photograph of 200 × 230 px (aspect 0.870) and a signature of 140 × 60 px
    (2.33:1). The secondary sources gave 3.5 × 4.5 cm (0.778) and 6.0 × 2.0 cm
    (3.00:1) for SSC. At 200 DPI, 3.5 × 4.5 cm is 276 × 354 px. These are
    different shapes, so they were never one specification, and pairing the
    proposal's pixels with its KB range would have produced an invented row.
    This was caught **before** a row was written rather than after, which is the
    same check that killed four of the six original preset rows, working one
    step earlier.
- **What is unaffected.** `/image/exact-size` stays exactly as it is, and keeps
  serving this use without a preset: it already accepts a maximum size, a
  minimum size, exact pixels, a DPI and JPEG output, so an applicant who has
  read their own notice can meet any of these specifications on it today. Its
  own copy already states the correct posture — *"Portal limits change — check
  the current notice for the exact size, pixels and format."* No `PortalPreset`
  schema change ships, and the existing preset rows are untouched.
- **What this does not decide.** The separate error-message idea in
  `docs/GROWTH_IDEAS.md` §3 stands, and remains gated on Search Console rather
  than settled here. Its list of example error strings did carry one exam line —
  *"Photo size should be between 20kb and 50kb"* — and that line was removed on
  the owner's instruction the same day, leaving the other three, so no exam
  wording survives as a target anywhere. The line this entry draws is on
  **stating an exam's specification as fact**, in a page or in a preset — not on
  the broader question of meeting people at the wording of an upload failure.
- **Not to be reopened without a new entry in this file**, per the rule at the
  top. The reason above does not expire with a traffic measurement: it is about
  the specification moving, not about how many people search for it.
