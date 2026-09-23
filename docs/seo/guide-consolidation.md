# Guide consolidation runbook

Owner decision (`docs/DECISION_LOG.md` §11): merge thin guide pages into their
tool page gradually, based on data. Keep full guides for roughly 30 to 50 tools
that earn search traffic or have something distinct to say. Every other live
guide redirects (301) to its tool page and leaves the sitemap.

**Status: ON since 2026-09-21, by owner decision.** Search Console still has no
rows — the property was new when the owner checked on 2026-09-17 — so every
kept guide was picked on the distinctness evidence below rather than on
traffic, and every entry carries `reason: 'distinct'`. The traffic path is
untouched and waits for the first export.

**8 guides keep a page since 2026-09-23**, down from 15. The seven that left
are the PDF and image guides whose substance moved onto their tool page in the
same commit (`lib/seo/tool-page-depth.ts`; `docs/DECISION_LOG.md` §8): with the
text on both, two URLs competed for one query and the guide is the page that
cannot do the job. They 301 through the ordinary consolidation path, so no
redirect table was touched. This applies the decision's own test — a guide is
kept while it says something its tool page does not — rather than changing it.
The eight that remain all belong to tools whose page is a workbench hosting
several operations, where the guide is about one operation rather than about
the page.

- Switch: `GUIDE_CONSOLIDATION_ENABLED` in `lib/seo/guide-consolidation-config.ts`
- Keep list: `GUIDE_KEEP_LIST` in `lib/seo/guide-keep-list.ts` (8 entries)
- Logic: `lib/seo/guide-consolidation.ts`; redirects resolved in
  `lib/seo/site-redirects.ts`, served by `proxy.ts`
- Sitemap body: `lib/seo/sitemap-entries.ts`; `llms.txt` bodies:
  `lib/seo/llms-text.ts`

Every function takes the state as an argument and defaults to the committed
switch, so `lib/seo/guide-consolidation.test.ts` exercises both states without
mutating anything global.

## What the switch changes

| | Kept guide | Other live guide | Guide of a tool that is not live |
| --- | --- | --- | --- |
| `/guides/<slug>` | 200, unchanged | 301 to the tool's `destinationUrl`, query string included | 404, unchanged (DECISION_LOG §7) |
| `sitemap.xml` | listed | removed | not listed |
| Prerendered into `dist/client/` | yes | no (that is what lets the 301 answer) | no |
| Category hubs, related links, `/guides` | linked | "Launch Tool" link only | not linked |
| `llms.txt` / `llms-full.txt` | guide URL | tool URL only (`none` in the guide column) | not listed |

`app/guides/[slug]/page.tsx` and `app/sitemap.ts` both read
`getPublishedGuideTools()`, so the pages built and the URLs submitted to Google
are the same set by construction. That is what keeps
`scripts/verify-static-coverage.mjs` (every build) and `scripts/predeploy.mjs`
green: a consolidated guide is in neither list, so nothing promises a URL
without a file behind it.

Removed-tool redirects keep their 308. When one of them points at a guide that
is now consolidated, `siteRedirect` resolves it straight to the tool page, so a
visitor never follows two hops.

## 1. Export from Search Console

1. Search Console > property `getopentools.com` > **Performance > Search results**.
2. Search type **Web**. Date **Last 3 months** (longer is fine; shorter
   understates both thresholds).
3. Leave other filters empty.
4. **Export > Download CSV**. This produces a ZIP with `Pages.csv`,
   `Queries.csv`, `Filters.csv` and others. Keep the whole ZIP.

Keep the export out of the repository. It is the owner's data.

## 2. Pick the `distinct` guides

```sh
npm run seo:guide-distinctness -- --top 40
```

The report reads the code and changes nothing. It first masks each tool's own
name, category and slug out of its guide and counts how many distinct bodies
remain — on 2026-09-21, 567 live guides produced 5 distinct bodies, 557 of them
identical, which is the evidence behind the decision. It then scores the
material each tool has for a guide of its own: its own route (+3), a blog
article about that exact tool URL (+3), a template linking to it (+2), an
end-to-end spec (+2), its own stated notice (+1), a local model (+1), release
wave P0 (+1), minus points where another guide points at the same URL (-2) or a
near-identical name exists in the category (-1). The weights are documented
choices, not fitted to data.

Add the owner-confirmed picks to `GUIDE_KEEP_LIST` by hand:

```ts
{ slug: 'pdf-merge-pdf', reason: 'distinct', evidence: 'owner: own page and two blog articles' },
```

## 3. Generate the traffic picks

```sh
npm run seo:guide-keep-list -- ~/Downloads/getopentools.com-Performance-on-Search.zip --dry-run
npm run seo:guide-keep-list -- ~/Downloads/getopentools.com-Performance-on-Search.zip
```

A plain `Pages.csv` works too; add `--queries Queries.csv` for query evidence.

- A guide is kept for `traffic` with at least **3 clicks or 100 impressions**
  over the export (`MIN_CLICKS`, `MIN_IMPRESSIONS` in
  `scripts/guide-keep-list/selection.ts`, with the reasoning next to them).
- At most **50** guides are kept in total (`MAX_KEPT_GUIDES`). `distinct` picks
  count first; traffic picks fill the rest, busiest first. Guides that qualify
  but miss the cap are printed so the cap is raised on purpose or not at all.
- URL variants (http/https, `www`, trailing slash, query, fragment, upper case)
  are merged into one slug. Guides of tools that are no longer live are ignored;
  they already 404.
- `distinct` entries are preserved; `traffic` entries are rewritten. Where a
  hand-picked guide also has traffic, its numbers are appended to the owner's
  own reason.
- The Queries tab is evidence for the reviewer only. Search Console does not
  break queries down by page, so nothing in it can select a guide.
- Override thresholds for one run with `--min-clicks`, `--min-impressions`,
  `--max-kept`, and say why in the commit message.

## 4. Review

- Read the printed summary and the diff of `lib/seo/guide-keep-list.ts`.
- Check the count: 30 to 50 kept is the target.
- Check that nothing you expect to keep is in the "would redirect" group.
- `npx vitest run lib/seo/guide-consolidation.test.ts scripts/guide-keep-list`

## 5. Flip the switch

1. The cached guide list takes care of itself: `lib/seo/cached-guides.ts` is
   derived from `GUIDE_KEEP_LIST` (the only other file in `lib/seo/` with no
   imports, so `next.config.ts` can still read it without pulling the tool
   catalogue into config evaluation). It used to be 50 literal slugs. A rewrite
   answers 200, not 301, so a cached guide that stopped being kept would have
   out-answered its own redirect; deriving the list makes that impossible to
   express. Changing the keep list changes the rewrites and the KV cost with
   it — re-read `FULL_REWARM` in `scripts/predeploy.mjs` and
   `docs/CACHE_BUDGET.md`.
2. Set `GUIDE_CONSOLIDATION_ENABLED = true` in
   `lib/seo/guide-consolidation-config.ts`. A test refuses an empty keep list.
3. Record the decision and the export it was based on in `docs/DECISION_LOG.md`
   (§11).
4. `npm run qc` — the build's own `verify-static-coverage` step will confirm
   every remaining sitemap URL still has a file. Then `node scripts/predeploy.mjs`
   (report only), then deploy by the normal release process with the board's
   deploy lock held.
5. After deploy, check a handful of URLs by hand — **not a crawl**, a bulk crawl
   caused 503s before:
   - one kept guide: 200;
   - one consolidated guide: 301, `Location` is the tool page, and for a
     workbench tool the `?tool=` query survives;
   - follow that `Location` once: it must answer 200, not another redirect;
   - `/sitemap.xml`: the guide count has dropped to the kept list.
6. In Search Console, resubmit the sitemap. Over the following weeks, expect
   "Page with redirect" to rise in the Pages report and clicks to move to the
   tool pages.

## Rolling back

Set the switch back to `false` and deploy. Guides render again and return to the
sitemap. Browsers may have cached the 301s for a while; search engines recrawl.

## Doing it gradually

The owner asked for gradual. One way: start with a larger keep list (for example
`--max-kept 150`), enable, watch for a few weeks, then regenerate from a later
export with a lower cap. Each step is one keep-list commit plus a deploy.

## What was verified, and where

Checked on a production build served by `wrangler dev` on 2026-09-21, in
Chromium, against this commit:

- a kept guide (`/guides/pdf-merge-pdf`) answers 200 and renders its own
  content;
- a consolidated guide (`/guides/developer-and-data-jwt-decoder`) answers 301
  with `Location: /developer/jwt-decoder`, and that URL answers 200;
- a consolidated guide whose tool carries a query string keeps it;
- following a `Location` once never produces a second redirect;
- `sitemap.xml` lists the 15 kept guides and none of the 552 consolidated ones;
- `/llms.txt` and `/guides` link tool pages where the guide is gone.

Unit tests cover the rest, including the off state reproducing the previous
sitemap, links and `llms.txt` exactly, so the switch can be turned back.

**Not verified:** anything on getopentools.com itself. This has not been
deployed, and the post-deploy checks in step 5 above have not been run.
