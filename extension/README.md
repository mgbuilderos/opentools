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

`verdict.js` is deliberately a copy of the logic in
`scripts/measure-csp.mjs` in the main repository. **If you change one, change
both** — the site and the extension disagreeing about the same page would be
worse than having neither.
