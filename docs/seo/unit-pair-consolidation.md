# Unit-pair consolidation runbook

Folds the unit half of `/convert` onto the converters and keeps the pairs that
search actually rewards. Owner decision, 2026-09-28.

## What the switch changes

`lib/seo/unit-pair-consolidation-config.ts` holds one boolean.

With `UNIT_PAIR_CONSOLIDATION_ENABLED = true`:

- `publishedUnitPairs()` returns only the pairs in
  `lib/seo/unit-pair-keep-list.ts` — 11 of 512.
- The other 501 leave `LIVE_TOOL_ROUTES`, and with it the sitemap, the internal
  link graph, the command catalogue and `generateStaticParams`. They are one
  filter in `lib/seo/live-tools.ts`, so they cannot leave one and stay in
  another.
- Each folded address answers `301 → /math/workbench?tool=<operationId>`,
  served by `siteRedirect` in `lib/seo/site-redirects.ts`.

With it `false`, the previous site is restored exactly: every pair renders
again, returns to the sitemap, and stops redirecting.

## Why, in one paragraph

Google answers `kg to lbs` with its own widget, so the page below it is never
opened. Measured 2026-09-23: 512 unit pages produced 15 page-opens. The first
Search Console export (7 days to 2026-09-25) put the rest of it beyond doubt —
90 of those pages earned 1,445 impressions and **zero** clicks, and
`kilograms-to-pounds` took 200 of them at average position 80.3. Meanwhile 914
pages sat in `Discovered – currently not indexed`: Google had seen the URL and
declined to fetch it. Crawl budget is the binding constraint, and 501 pages
that cannot earn a click are the cheapest 501 to stop asking for.

## The keep rule

```
keep a unit pair when it earned >= 5 impressions AND its average position < 30
```

Position is the signal that Google treats the page as a real answer rather than
filler under its own widget. Impressions are only a noise floor — at one or two
impressions an average position is one lucky listing.

Every pair the rule keeps is a conversion Google does **not** answer itself:
pressure in megapascals and kilopascals, binary data sizes, energy in
watt-hours, speed in knots, volume in teaspoons. That is the whole thesis, and
it is why the file-format and image pairs on the same route are untouched.

## Regenerating the keep list

The list is data, not architecture. Seven days is a thin window and it is
expected to move.

1. Search Console → Performance → Search results, set the date range, **Export
   → Download XLSX**.
2. Read the **Pages** sheet. Keep the rows whose URL is `/convert/<pair>`, where
   `<pair>` is an id in `CONVERSION_PAIRS` — the file-format and image pairs
   share the route and are not part of this.
3. Apply the rule above and write the survivors into
   `lib/seo/unit-pair-keep-list.ts`, recording each one's impressions and
   position beside it so the rule can be re-checked later.
4. `npx vitest run lib/seo/unit-pair-consolidation.test.ts` — it holds every id
   to a real pair, so a unit renamed out from under the list fails here rather
   than silently folding a page that was meant to stay.
5. `npm run build`, then `node scripts/build-sitemap-lastmod.mjs`.

There is no generator script for this yet. Writing one means adding to
`scripts/**`, which is a shared path needing a request on the board first.

## Rolling back

Set `UNIT_PAIR_CONSOLIDATION_ENABLED = false`, rebuild, deploy. Browsers hold a
301 for a while; search engines recrawl. Nothing was deleted — the pages are
still derived from the converters' own unit lists, exactly as before.

## What to watch

The number that should move is **`Discovered – currently not indexed`**, which
was 914 on 2026-09-21. If the fold works, crawl budget goes to the pages that
can win and that figure falls. Re-read Search Console around 2026-10-05.

The number that should **not** move is clicks — the folded pages produced none.
If total site clicks drop after this ships, the rule was wrong and the switch
comes back off.
