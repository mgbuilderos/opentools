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

### 9. One box on the home page reads a typed request, and says when it cannot

- **Date:** 2026-09-26. **Status:** implemented on a branch, not deployed.
- **The problem, measured.** 1,362 live tool routes in 21 categories. Somebody
  who knows what they want done and not what this site calls it has to guess a
  category first; the note in `home-workspace.tsx` records the same shape from
  the crawl side, where every tool outside `/pdf` sat four clicks from the front
  page until the category links were added.
- **What changed.** `components/command-bar.tsx`, above the dropzone on `/`. You
  type "make this under 2MB and strip my name out of it" and it answers with the
  steps, in order, each a link to the page that does it. Where the steps are
  operations the kernel can run, it offers to run the chain in one pass by
  handing a `lib/pipeline` pipeline to `/batch?pipeline=…`, which the pipeline
  editor already reads.
- **It is read on the device, and that is checkable rather than claimed.** Every
  page here ships `connect-src 'none'`, `e2e/egress-proof.spec.ts` fails if a
  page opens a connection, and `lib/tools/local-source-policy.test.ts` now
  guards `lib/command/` as well as `lib/tools`, so a `fetch(` or an `https://`
  literal in it fails the build. `e2e/command-bar.spec.ts` types a whole request
  and asserts nothing off-origin answered, no request carried a body, and none of
  the typed words reached any URL — including a same-origin one.
- **No model, and the refusals are the point.** A catalogue this size can look
  confident about anything: there are four translators here and not one of them
  is a language, so "translate this to Spanish" had four confident matches.
  `lib/command/limits.ts` holds what this site cannot do — anything needing a
  server, anything needing a language model, and plain gaps — and answers
  instead. A gap that is only a gap offers a prefilled `tool_request.yml` issue;
  a rule of the place does not, because asking somebody to file the point of the
  site as a bug is not a report.
- **Held to tests that found real defects.** 61 unit tests and 5 browser tests.
  The one worth naming ran every non-decisive refusal phrase through the matcher
  and failed if the catalogue already answered it: eight did, and every answer
  was wrong — "explain this" was being answered with the cron expression parser
  and "what does this mean" with the average calculator. Another fails if a
  decisive phrase is ever a tool's name, which is what caught "to pound" (a unit
  of mass) and "bitcoin" (a QR code generator here).
- **The index is generated, and small.** `lib/command/catalogue.generated.ts` is
  1,390 entries in 197 KB of JSON, about 35 KB of Brotli, in its own chunk that
  the home page does not load until somebody types. `catalogue.test.ts` fails if
  it drifts from the registries it was built from, and if any live tool route is
  missing from it.
- **Not verified:** anything on getopentools.com. This has not been deployed.
