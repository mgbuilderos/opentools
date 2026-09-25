# Search Console baseline — 2026-09-23

**Why this file exists.** On 2026-09-23 the canonical self-exclusion bug was
fixed (`9646639`) and deployed (version
`f2557767-bfcb-4673-8e8f-026225121f04`, from `ebbe340`). Until that deploy,
**59 pages served `<link rel="canonical" href="<origin>">`** — every PDF tool,
every image tool, all 14 workbenches, plus base64, uuid, timestamp, hash,
csv-to-json and the calculators. They were asking Google to index the home
page instead of themselves.

This is the last measurement taken **before** Google could recrawl them. It is
the only thing a later reading can be compared against. Without it the
question "did the canonical fix work?" has no answer.

**Re-check date: 2026-10-21** (four weeks). Not sooner — Google needs about
that long to work through ~1,400 URLs, and a partial recrawl reads as noise
that is easy to mistake for either success or failure.

---

## Queries — 3 months to 2026-09-23

Read off the owner's Search Console export. **18 queries in total; the top ten
are listed here, which is what the export showed.** Rows 11–18 were not
captured — treat the totals below as "at least", not "exactly".

| Query                      | Clicks | Impressions |
| -------------------------- | ------ | ----------- |
| latex table generator      | 0      | 4           |
| opentools                  | 0      | 2           |
| open tools                 | 0      | 2           |
| create er diagram from sql | 0      | 1           |
| er diagram to sql          | 0      | 1           |
| text file maker            | 0      | 1           |
| opentools.fun              | 0      | 1           |
| er diagram from sql        | 0      | 1           |
| generate table in latex    | 0      | 1           |
| open tool                  | 0      | 1           |

**Clicks: 0 on every row shown.**

### The clusters, with brand stripped out

| Cluster              | Queries                                                            | Impressions |
| -------------------- | ------------------------------------------------------------------ | ----------- |
| **LaTeX**            | latex table generator, generate table in latex                     | 5           |
| **ER diagram ↔ SQL** | create er diagram from sql, er diagram to sql, er diagram from sql | 3           |
| Brand                | opentools, open tools, open tool, opentools.fun                    | 6           |
| Other                | text file maker                                                    | 1           |

Both non-brand clusters map to tools that already existed, so Google had
matched the site correctly. They are what ranked **while the commercial core
was excluding itself** — a signal, not a ceiling.

## Indexing — measured 2026-09-23

| Metric                                        | Value     |
| --------------------------------------------- | --------- |
| Indexed                                       | **134**   |
| Not indexed                                   | **552**   |
| Of which "Discovered – currently not indexed" | 534       |
| Average position                              | 65.8      |
| Sitemap URLs served live                      | **1,413** |

Source: the live sweep recorded in the canonical self-exclusion investigation
the same day. "Discovered – currently not indexed" means Google found the URL,
pattern-matched it, and never spent the crawl budget — which is the expected
shape when pages disclaim themselves.

## What changed on the same day, so a later reading can attribute movement

1. **Canonical self-exclusion fixed** (`9646639`) — 59 pages now self-canonical.
   This is the change most likely to move indexing.
2. **Pipeline 6 shipped** — `/latex` and `/schema` hubs with twelve sub-tools,
   plus `/pdf/drawing-register`, `/pdf/preflight`, `/pdf/burst`,
   `/audio/loudness`. New URLs, so new impressions are expected regardless of
   the canonical fix. **Do not read growth on these as evidence the fix
   worked** — separate the 59 previously-excluded pages from the new routes
   when reading the next export.
3. Guides were consolidated 567 → 15 in September, so guide-page impressions
   are expected to fall and that is intended.

## How to read this on 2026-10-21

- **Indexed count** is the direct test of the canonical fix. 134 is the
  number to beat.
- **Impressions on the 59 previously-excluded pages specifically** — filter to
  `/pdf/*`, `/image/*` and the workbench routes. That isolates the fix from
  the new tools.
- **Clicks.** Zero is the baseline. Any click at all is new information.
  Average position 65.8 means page ~7 of results, which earns nothing; a
  position that improves without clicks following is a title-and-snippet
  problem, not an indexing one.
- Sitemap was 1,413 URLs on this date. If it has grown, say by how much before
  comparing impression totals.
