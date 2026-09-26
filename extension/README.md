# Can this page upload your file?

A browser extension that reads the page you are on and tells you whether it is
**capable** of transmitting what you give it — any file, on any site.

Not a PDF tool. Not an OpenTools advert. It answers one question about whatever
page you happen to be looking at.

## Why it exists

Every site that takes a file says it respects your privacy. None of them give
you a way to check. There is a way: a page served with `connect-src 'none'`
cannot open a network connection at all — the browser refuses, so the guarantee
is enforced rather than promised.

That is a header, and headers can be read. This surfaces it.

## What it reports

| Verdict | Means |
| :--- | :--- |
| **✓ Blocked** | `connect-src 'none'` — the browser refuses every request the page attempts |
| **~ Restricted** | A `connect-src` exists but permits some destinations |
| **! Capable** | No `connect-src` restriction, so the page may transmit |
| **? Unknown** | The policy could not be read. **Not a finding.** |

**Capable is not an accusation**, and the popup says so. Processing files on a
server is a normal, legitimate design and most sites that do it say so openly.
What you currently lack is any way to tell which kind of page you are on.

## What it does not do

- It reports **capability, never intent**. A page that *can* transmit may not.
- It says nothing about bugs, or about what a future version of the page does.
- It cannot inspect browser-internal or extension pages.
- A **report-only** policy is downgraded to Capable, because the browser does
  not enforce it. Treating it as protection would be the same error in reverse.

## Privacy

The extension makes **no network requests of its own**. It reads response
headers the browser was already receiving, keeps the verdict in memory keyed by
tab, and discards it when the tab closes. Nothing is stored, sent or shared. A
tool that lectured you about privacy while phoning home would be self-defeating.

## Install it locally

```
chrome://extensions → Developer mode → Load unpacked → select this folder
```

Then open any site with a file upload and click the icon.

## Notes for whoever maintains this

`verdict.js` used to be a copy of the logic in `scripts/measure-csp.mjs`, and
this section used to ask you to change both by hand. That instruction outlived
a bug both copies had: they read `connect-src` without its `default-src`
fallback, so a page serving `default-src 'none'` — refusing every connection —
was reported as **Capable**.

So it is no longer a copy. `scripts/measure-csp.mjs` now *imports* this file,
and `lib/egress/verdict-parity.test.ts` runs it against the site's own
implementation (`lib/egress/verdict.ts`) over a shared table of policies. Two
implementations still exist, because an unpacked extension cannot load a `.ts`
module and the site's build cannot import this `.js` one — but a disagreement
now fails the build instead of reaching a reader as two different answers about
somebody's site.

**If you change the verdict, change it here**, and let the parity test tell you
whether the site agrees.

## The same check, without installing anything

`getopentools.com/proof/check` publishes the same verdict as a page: paste an
address, run a snippet in your own console, read the result. It goes further
than this extension does — the extension reads the policy a page *declares*,
while the snippet also attempts five deliberate connections and reports which
the browser actually refused. Watching an idle page proves only that nothing
happened to fire; it never proves the control works.
