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

### 7. Removed pages return 404; one blog URL is an open follow-up

- Owner decision (2026-09-17): a page whose tool or article no longer exists
  returns **404**. A removed path redirects only when a live page does the same
  job (see `lib/seo/removed-tool-redirects.ts`). Redirecting removed pages to a
  generic index would be a soft 404 and is not done.
- Under this rule, deploying the clean-up takes roughly 430 URLs from 200 to
  404: the 427 guides whose tool is not live, `/video/compress`, `/image/ocr`
  and `/roadmap`. They were already dropped from the sitemap in commit
  `3581d71`, so this is a deliberate de-index, not a regression.
- **Open follow-up:** `/blog/compress-mp4-webm-video-in-browser` is live and
  indexed today and was in the submitted sitemap. Task A3 replaced that article
  with `/blog/optimize-images-browser-webp-converter`, a different slug, so the
  old URL will 404 after deploy. The owner accepted the 404 for now and wants it
  revisited — either a video-compression article that matches the old intent, or
  a redirect once there is a page worth sending that traffic to.
