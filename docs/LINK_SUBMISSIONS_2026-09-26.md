# Link submissions — drafted 2026-09-26, none submitted

**Why these exist.** `docs/INDEXING_DIAGNOSIS_2026-09-25.md` establishes that
914 URLs sit in "Discovered – currently not indexed" while Google indexes 88%
of the pages it *does* open, and that inbound links are approximately zero
(1 GitHub star, no third-party page found linking here). Links are the lever.
These are drafted to be posted **as-is by the owner** — submitting is an
outward action under C8.

**Every claim below is checked against the tree and against
`docs/DECISION_LOG.md` item 6**, which fixes the privacy wording: "no
third-party trackers", "no client-side analytics", "your files and inputs never
touch a server". Not "no tracking", not "zero telemetry" — the site logs one
metadata event per page visit (`.github/SECURITY.md`). Overclaiming to a
curated list is worse than overclaiming on your own site: it gets the entry
pulled and the domain remembered.

**Counted 2026-09-26, not typed:** 102 live tool routes (`LIVE_TOOL_ROUTES`),
643 kernel operations, 1,464 sitemap URLs, MIT licence.

---

## 1. AlternativeTo — already drafted, one correction

`docs/LAUNCH_KIT.md` §1 holds the submission and it stands. Register, then
**user icon → "Suggest new application"**. List as an alternative to
**Smallpdf**, **iLovePDF**, **PDF24**, **TinyPNG**.

Expectation setting from that file, still true: the free queue is **months**
long. Submit because the clock starts when you submit, not because it brings
traffic this month.

**The correction.** `LAUNCH_KIT.md` opens by holding back the bigger channels
because "the site currently serves every request from the Worker with no cache
(`cf-cache-status: BYPASS` on every page)". **Measured 2026-09-26: that is no
longer true.**

```
/                            cf-cache-status: HIT   age: 320
/pdf/merge                   cf-cache-status: HIT   age: 311
/convert/kilograms-to-pounds cf-cache-status: HIT   age: 310
```

A cached page is served by Cloudflare's edge without invoking the Worker, so
the 100,000 Worker-requests/day ceiling that ordering was built around is far
less binding than when it was written. **This does not automatically clear
Show HN** — that decision belongs to whoever re-reads
`REVENUE_OPERATIONS.md` §3 against fresh numbers — but the stated reason for
the hold has changed and the file should not be followed as if it had not.

---

## 2. awesome-privacy (`pluja/awesome-privacy`) — best fit of the three

A curated list of privacy-respecting services. This is the closest match to
what the site actually is.

**Before submitting**, read `misc/Contributing.md` in that repo and match the
section format exactly — it moves, and a wrongly-formatted entry gets closed
rather than corrected. Place under the file-tools / utilities section.

Draft entry:

```markdown
- [OpenTools](https://getopentools.com/) - PDF, image, document and text
  utilities that run entirely in the browser. No upload, no account, no ads.
  The page's Content-Security-Policy sets `connect-src 'none'`, so a tool
  cannot make a network request even if it tried. Open source (MIT).
```

**The defensible line, if a maintainer asks "how is this different from every
other browser tool site":** the no-network claim is enforced by the browser
through CSP rather than promised in a privacy policy, and it is in the page
source anyone can view. Point at
[`lib/security/content-security-policy.ts`](https://github.com/mgbuilderos/opentools/blob/main/lib/security/content-security-policy.ts).

**If asked about logging, answer plainly:** the server records one metadata
event per page visit; it contains no IP address, no cookie, no file, no
filename, no pasted text and no result. Volunteering this is better than
being caught by it — these lists check.

---

## 3. free-for-dev (`ripienaar/free-for-dev`) — draft supplied, but expect a decline

**Read this before spending time on it.** That list states its scope as
as-a-Service offerings useful to *"System Administrators, DevOps
Practitioners"*, explicitly excludes self-hosted software, and its maintainer
says the line is opinionated and contributions are often declined. OpenTools is
a website of end-user utilities, not infrastructure. **This is a likely no**,
and the draft below leans on the developer subset because that is the only
angle with a real chance.

Under the **Tools for Teams and Collaboration** or **Miscellaneous** heading:

```markdown
* [OpenTools](https://getopentools.com/) — Browser-based developer utilities:
  JSON/CSV conversion, base64, UUID, hashing, JWT and SQL-to-ER diagram, plus
  PDF and image tools. No account and no upload — files are processed in the
  page, enforced by `connect-src 'none'`. Free with no paid tier. MIT.
```

**Do not argue if it is declined.** A rejected PR you accept gracefully costs
nothing; one you argue costs the domain a reputation with a maintainer whose
list has 1,600 contributors.

---

## 3b. A better third target than free-for-dev

Since the free-for-dev fit is poor, the stronger third link is
**[Privacy Guides](https://www.privacyguides.org/)** (`privacyguides/privacyguides.org`)
or the **`awesome-selfhosted`** entry that `LAUNCH_KIT.md` §5 already scopes —
the latter is blocked on a published release and is the single highest-value
list of the three, so it is worth knowing it is four months of work away rather
than substituting something weaker and calling it done.

Also genuinely available today, and not in `LAUNCH_KIT.md`:

- **GitHub topics.** The repo already carries `privacy-tools`, `pdf-tools`,
  `local-first`, `zero-egress` and eight more. Topic pages are crawled. Nothing
  to submit; it is already working.
- **Publishing the MCP server** (`mcp/`, built and tested on this branch) gives
  a link from **npmjs.com**, a high-authority domain. As a traffic channel it
  is worth close to nothing and `mcp/README.md` says so. As a *link* into a
  domain with none, it earns its place. Still an owner decision under C8, and
  still needs an npm token this environment does not have.

---

## What to expect, honestly

None of this moves traffic this month. AlternativeTo is a months-long queue;
a merged awesome-list PR is one link. The mechanism is slower and less
satisfying than it sounds: links raise the crawl frontier, the frontier
reaches the 914 pages Google has never opened, and those pages — which Google
indexes 88% of the time when it does open them — start earning impressions.

The number to watch is not clicks. It is **914**, on the 2026-10-21 re-check.
