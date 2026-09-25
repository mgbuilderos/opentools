# Why 552 pages are not indexed — measured 2026-09-25

**Short answer: nothing is broken. The site is 12 days old and has no inbound
links.** The technical SEO is in unusually good shape. The bottleneck is crawl
budget, and crawl budget is bought with external links, not with more pages or
more on-page work.

This file exists so the next person asked "what is blocking indexing?" does not
re-run the investigation or invent work that cannot help.

## The numbers, and where each comes from

| Measure                                           | Value                 | Source                                                            |
| ------------------------------------------------- | --------------------- | ----------------------------------------------------------------- |
| Site age                                          | **12 days**           | first zone-analytics row, `docs/traffic-log.csv` (2026-09-13)     |
| Indexed                                           | 134                   | `docs/SEARCH_CONSOLE_BASELINE_2026-09-23.md`                      |
| Not indexed                                       | 552                   | same                                                              |
| **Of which "Discovered – currently not indexed"** | **534 (97%)**         | same                                                              |
| Clicks, 3 months                                  | **0**                 | same                                                              |
| Impressions, 3 months                             | ~18 across 18 queries | same                                                              |
| Average position                                  | 65.8 (page ~7)        | same                                                              |
| URLs in sitemap                                   | **1,464**             | `buildSitemap().length`, counted 2026-09-25                       |
| GitHub stars                                      | 1                     | `docs/ORGANIC_GROWTH_PLAYBOOK_CORRECTED.md` §"Cold-start reality" |

## What "Discovered – currently not indexed" means, and why it is the whole story

It means Google **found the URL and chose not to crawl it**. Not crawled and
rejected — never fetched. So no on-page property of those 534 pages is
implicated: not their titles, not their descriptions, not their word count, not
their structured data, not their canonicals. Google has not read them.

That is the expected state for a 12-day-old domain that has submitted 1,464
URLs and has no external links pointing at it. Google rations crawl for unknown
domains and raises the ration as the domain earns signals of being worth it.

## What was already fixed, and is therefore not the cause

- **Canonical self-exclusion** (`9646639`, 2026-09-23): 59 pages — every PDF
  tool, every image tool, all 14 workbenches — had been serving
  `<link rel="canonical" href="<origin>">`, telling Google to index the home
  page instead of themselves. Fixed 2 days ago.
- **Orphan pages**: a sweep found 12 URLs with no inbound internal link;
  `scripts/verify-no-orphans.mjs` now fails the build on any, and reports zero.
- **`lastmod` coverage**: 31 of 1,392 entries carried one on 2026-09-23; all
  1,464 do now, from commit dates via `scripts/build-sitemap-lastmod.mjs`.
  Verified 2026-09-25: the dates span six real commit days, and no entry is
  stamped with build time.
- **Page depth**: all 19 live PDF and 13 live image tool pages carry 800+ words
  of their own content and a self-canonical (decision 8).

## Two sitemap fields that look wrong and are not worth changing

1,406 of 1,464 URLs carry `priority: 0.9`, and 1,463 carry
`changeFrequency: weekly` — which is not true of, say, a centimetre-to-inches
page. Both look like an obvious fix and neither is: **Google has stated it
ignores `<priority>` and `<changefreq>` entirely**, and uses only `<lastmod>`,
and only while it stays accurate. Changing them would produce a commit, a
diff, and no effect. Recorded here so the observation is not rediscovered and
acted on.

## What would actually move the number

In order of effect:

1. **External links.** The single lever that raises crawl budget for a new
   domain. The site currently has approximately none. This is what
   `ORGANIC_GROWTH_PLAYBOOK_CORRECTED.md` Pillar 4 is for, and it is right for
   a reason the playbook does not state: a directory listing is worth having
   **because it is a link that unlocks crawling**, not because directories send
   visitors. AlternativeTo is named there as "Lowest-cost, highest-certainty
   item in the whole plan. **Do this first.**" That still holds.
2. **Time.** The canonical fix landed 2 days ago against a scheduled re-check
   of **2026-10-21**, chosen because Google needs about four weeks to work
   through ~1,400 URLs. Reading indexing before then is noise. 26 days remain.
3. **Fewer URLs, if links do not come.** 632 of 1,464 sitemap entries (43%) are
   `/convert/*` pairs. They are defensible individually — the page content is a
   working converter with computed numbers, not prose about one — but they are
   43% of a crawl ration the domain has not yet earned. If the 2026-10-21 read
   still shows mass "Discovered", concentrating the sitemap is the next lever.
   It is a strategic reversal of recent work and needs an owner decision, so it
   is named here and not done.

## What will not move it

More pages. More on-page SEO. Better meta descriptions. Sitemap priority
fields. An MCP server, a CLI or an npm package **as a traffic channel** — those
reach developers in the thousands, not consumers in the millions, and
`mcp/README.md` records the separate measurement behind that. An npm publish
would contribute one thing relevant to this file: a link from npmjs.com.

## Re-read this on 2026-10-21

The number to beat is **134 indexed**. If it has not moved and no external
links were earned in between, that is not a new fault to investigate — it is
this file's prediction coming true, and item 1 above is still the answer.
