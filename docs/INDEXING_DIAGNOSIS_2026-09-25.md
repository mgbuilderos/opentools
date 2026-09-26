# Why pages are not indexed — measured 2026-09-25/26

**Short answer: when Google crawls a page on this site, it indexes it 88% of
the time. It simply will not crawl most of the site.** 380 pages have ever been
fetched; 914 have been discovered and never fetched once. The content is not
the problem and the on-page SEO is not the problem. Crawl **breadth** is.

This file exists so the next person asked "what is blocking indexing?" does not
re-run the investigation or invent work that cannot help.

> **This file was wrong twice before it was right, and both corrections are
> kept below, because the way it was wrong is the useful part.**
>
> 1. First version: "crawl-budget starvation, wait until 2026-10-21." The Crawl
>    stats export killed that — 9,250 requests, host status "No problems".
> 2. Second version: "not crawl-constrained at all, it is a ranking problem."
>    The Page indexing report killed that too — 914 pages have never been
>    fetched.
>
> Both were drawn from `SEARCH_CONSOLE_BASELINE_2026-09-23.md`, whose "134
> indexed" is **a live sweep, not a Google number**. Google says 335. Do not
> diagnose Search Console from anything but Search Console.

## The numbers

### Page indexing (Search Console, last updated 21/09/2026)

| Reason | Pages | Source |
| --- | --- | --- |
| **Indexed** | **335** | GSC Page indexing |
| Discovered – currently not indexed | **914** | Google systems |
| Crawled – currently not indexed | 43 | Google systems |
| Alternative page with proper canonical tag | 2 | Website |
| **Not indexed, total** | **957** | |

### Crawl stats (Search Console, exported 2026-09-25)

| Measure | Value |
| --- | --- |
| Crawl requests, ~12 days | **9,250** |
| Host status | **"No problems"** |
| Per day | ~771 |
| HTML | 4,252 (46.0%) |
| JavaScript | 3,966 (42.9%) |
| Failed | 709 (7.7%) |
| Responses 200 / 404 / 301 / 5xx | 91.6% / 7.6% / 0.7% / 0.02% |
| Purpose: refresh / discovery | 55.8% / 44.2% |

### Performance (Search Console, 3 months, exported 2026-09-25)

791 impressions, 2 clicks, 171 pages earning impressions, 67 countries,
average position ~66 (desktop 66.6, mobile 60.2).

The 2026-09-23 baseline recorded 18 impressions across 18 queries. Two days
later it is 791 across 171 pages — **44×**. The baseline is not wrong for its
date; it is wrong to reason from.

### Links

**Unknown.** The Links report reads "Processing data, please check again in a
day or so" as of 2026-09-25. The claim that this site has no inbound links is
**unverified** and was asserted too confidently in earlier versions of this
file. Re-check.

## The finding

Reconcile the two exports and the contradiction dissolves:

```
Pages Google has ever crawled   380   (335 indexed + 43 crawled-not-indexed + 2 alt)
Pages Google has never crawled  914
HTML crawl requests           4,252
HTML fetches per crawled page   11.2
```

Google spent ~4,252 HTML fetches on **380 pages — eleven times each** — while
never fetching the other 914. That is heavy crawl **volume** and narrow crawl
**breadth**, which is why "9,250 requests" and "914 never crawled" are both
true at once. 55.8% of crawl purpose being *Refresh* says the same thing.

And of the pages it did crawl, **it indexed 88%**. There is no content quality
problem in evidence. Pages that get fetched get indexed.

So the whole question is: why will Google not widen its crawl frontier past
~380 URLs on a 1,464-URL site? For a 12-day-old domain the usual answer is
authority — which is exactly the number the Links report has not produced yet.
**Do not treat that as settled until the Links report loads.**

## Confirmed faults, in priority order

### 1. Plain HTTP is served and indexed — duplicate content

Nine `http://` URLs earn impressions separately from their `https://` twins:

| URL | Impressions | Position |
| --- | --- | --- |
| `http://getopentools.com/security` | 4 | **6.75** |
| `http://getopentools.com/guides/spreadsheet-and-data-csv-editor` | 2 | 86 |
| `http://getopentools.com/file/file-chunk-splitter` | 1 | 7 |
| `http://getopentools.com/guides/text-and-writing-caesar-cipher` | 1 | 7 |
| `http://getopentools.com/` | 1 | 9 |
| `http://getopentools.com/guides/spreadsheet-and-data-csv-splitter` | 1 | 10 |
| `http://getopentools.com/life-admin/notice-period-calculator` | 1 | 33 |
| `http://getopentools.com/text/braille-translator` | 1 | 62 |
| `http://getopentools.com/text/paragraph-counter` | 1 | 77 |

Each splits its ranking signal with the `https://` version. The top row ranks
at **6.75**, better than almost anything else on the site.

**The fix is not in this repository.** `proxy.ts:27` sets HSTS and its own
comment states why that is insufficient: browsers must ignore HSTS over plain
HTTP (RFC 6797 §7.2), so the fix is *"the edge's 'Always Use HTTPS' redirect,
which is a zone setting and not in this repo."*

> **DONE — owner turned on Cloudflare "Always Use HTTPS" on 2026-09-26.**
> Not yet verified from this repository: the session's network policy denies
> `getopentools.com`, so no live request could confirm the 301. Verify with
> `curl -I http://getopentools.com/security` and expect `301` with a
> `location:` of the `https://` URL.
>
> **This is a confounder for the 2026-10-21 read and must be held separate**,
> exactly as the canonical fix was. The nine `http://` URLs should fall out of
> the index over the weeks after this date. If `http://` impressions go to zero
> by 2026-10-21, that is this change, not a ranking improvement. Search
> Console's **HTTPS** report (left nav) tracks it directly.

Same category as the WAF rule named in `app/robots.ts`.

Repo-side and secondary: `Strict-Transport-Security` is in `proxy.ts` but not
in `public/_headers`, which that file's own header calls *"the only header
source the Cloudflare deploy ships."* `lib/security/header-parity.test.ts`
compares `_headers` against `next.config.ts` only, so a header living in
`proxy.ts` alone sits outside the guard. Confirm against production response
headers before changing anything.

### 2. Query-string URLs indexed

`/file/workbench?tool=data-uri-file-extractor` and
`/text/workbench?tool=paragraph-counter` both earn impressions. Confirm each
carries a self-canonical to the bare workbench route.

### 3. 3,966 crawl requests spent on JavaScript (42.9%)

Nearly half the crawl allocation fetches JS on a site that prerenders every URL
to static HTML (`scripts/prerender-to-assets.mjs`). Some JS fetching is normal
for Googlebot rendering; 42.9% against a narrow crawl frontier is worth one
measurement. **Not investigated — do not act on this line until it is.**

### 4. 707 crawl requests spent on 404s (7.6%)

Expected decay from the ~430 URLs deliberately taken to 404 under decision 7.
Recorded so it is not mistaken for a fault.

## Where the impressions come from

`/convert/*` is **53% of all impressions** (421 of 791 across 57 pages).
`/convert/kilograms-to-pounds` alone earns 97. An earlier version of this file
proposed trimming that family to save crawl budget; that would have removed the
best-performing section of the site. **Withdrawn.**

`/pdf/redact` earns 94 impressions at position 81 — a commercially valuable
page on page 9.

## Two sitemap fields that look wrong and are not worth changing

1,406 of 1,464 URLs carry `priority: 0.9` and 1,463 carry
`changeFrequency: weekly`, untrue of a centimetre-to-inches page. Both look
like obvious fixes and neither is: **Google ignores `<priority>` and
`<changefreq>` entirely** and uses only `<lastmod>`. Changing them produces a
diff and no effect.

## One thing to watch, not yet a fault

`lib/seo/sitemap-lastmod.generated.ts` now gives all 1,464 URLs a `lastmod`
(it was 31 of 1,392 on 2026-09-23). **1,248 of them share 2026-09-24**, because
`scripts/build-sitemap-lastmod.mjs` takes the commit date of a page's source
plus one level of imports, so one shared-module change moves every dependent
page's date at once. That script argues, correctly, that this is *true* rather
than invented.

The risk is not truth, it is prioritisation: a deploy touching a shared module
tells Google that 1,248 pages changed the same day, on a site whose crawl
frontier is already only 380 pages wide. Full lastmod coverage postdates most
of the crawl window, so **it cannot be the cause of the 11.2×-per-page
re-crawling already observed** — but it could sustain it. Watch whether
refresh-purpose crawl falls after the next deploy that does not touch shared
modules.

## Re-read this on 2026-10-21

Numbers to beat, all from Google rather than a local sweep: **335 indexed,
914 discovered-not-crawled, 791 impressions, 171 ranking pages, position ~66,
2 clicks**, and **9 `http://` URLs earning 13 impressions**.

Changes made before this read, each of which must be attributed separately:

| Date | Change | Expected effect |
| --- | --- | --- |
| 2026-09-23 | Canonical self-exclusion fixed (`9646639`), 59 pages | indexed up |
| 2026-09-26 | Cloudflare "Always Use HTTPS" on | `http://` URLs leave the index |

The one that matters is **914**. If it falls, the frontier widened and the
site grows. If it holds while indexed and impressions creep up, the frontier
did not widen and authority is the constraint.

**Prediction this file will be judged on:** with no new inbound links, the
2026-10-21 read still shows "Discovered – currently not indexed" above 700,
and average position still worse than 40.
