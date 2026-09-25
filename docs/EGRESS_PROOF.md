# Egress proof

**What this is:** the protocol business rule 23 refers to, and the result of
running it. Rule 23 says a measured-egress claim ships only for a build that
passed "the current egress proof protocol". Until 2026-09-18 that protocol
existed as a reference and not as anything executable —
`ai/KNOWN_ISSUES.md` recorded it as *"not empirically complete"* and
`implementation/ARCHITECTURE.md` said that because of it *"the UI says proof is
pending"*. The UI did not say pending. It shipped `zero cloud uploads`,
`zero data leaks` and `100% on your device`.

The protocol is now `e2e/egress-proof.spec.ts`. It runs with the rest of the
Playwright suite, against the production build, in both Chromium and WebKit.

---

## What the protocol checks

Three checks, ordered by how much each one proves.

**1 — The served policy forbids connections.** Asserted on the response header
of a real tool page, not on source:

```
connect-src 'none'      fetch, XHR, WebSocket, EventSource and sendBeacon, together
default-src 'self'      everything not named below stays same-origin
form-action 'none'      no form can post anywhere
object-src 'none'       no plugin surface
base-uri 'self'         <base> cannot be repointed to redirect relative URLs
```

**2 — Deliberate exfiltration is refused.** Five vectors are actively attempted
from the page's own context: cross-origin `fetch`, same-origin `fetch`,
cross-origin `XMLHttpRequest`, `WebSocket`, and `navigator.sendBeacon`. This is
the check that matters most, because watching an idle page proves only that
nothing happened to fire — it never proves the control works.

**3 — A real file, through a real tool.** A PNG is generated in-page, handed to
`/image/optimize` exactly as a file picker would, and optimised. The assertions:
no off-origin response, zero off-origin bytes, no request carrying a body, the
filename absent from every request URL, and no `fetch`/`xhr`/`beacon`/
`websocket` initiator recorded for the whole document.

## Result — 2026-09-20, against the deployed site

**6/6 passed, Chromium and WebKit, run directly against `getopentools.com`.**

This is the run ADR-014 asks for. Every earlier result was measured against a
build on a laptop; this one measures what a visitor actually receives.

| | |
| :--- | :--- |
| Target | `https://getopentools.com` |
| App chunk served | `index-_tTSc37h.js` |
| Edge | `cf-ray a3de6ac16cdd9998-SIN` |
| Third-party beacon tags in the HTML | `0` |

Re-verified independently by header inspection on `/`, `/pdf/compress`,
`/image/optimize` and `/support`: all four serve `connect-src 'none'`,
`form-action 'none'`, `object-src 'none'` and `base-uri 'self'`, and none
carries a `cloudflareinsights` tag when requested with a real browser
user-agent.

**How to re-run it.** `playwright.production.config.ts` points the same protocol
at a deployed origin. It starts no server, so it cannot accidentally measure a
stale build already listening on a port:

```bash
npx playwright test --config playwright.production.config.ts
EGRESS_BASE_URL=https://staging.example npx playwright test --config playwright.production.config.ts
```

Its global setup prints the app chunk and edge ray of whatever answered, and
fails outright if a third-party beacon tag has returned. Evidence that does not
name the build it measured is not evidence.

## Result — 2026-09-18

Run against the production build. **6/6 passed, Chromium and WebKit.**

Measured on the deployed site (`getopentools.com`, version `9d6e1af2`) as well:

| Vector attempted | Outcome |
| :--- | :--- |
| `fetch` → third party | Refused. `Refused to connect … violates … connect-src 'none'` |
| `fetch` → same origin | Refused, same directive |
| `XMLHttpRequest` → third party | Refused. Chromium reports failure reason `csp` |
| `WebSocket` | Refused. WebKit throws `SecurityError` at construction |
| `navigator.sendBeacon` | Refused by CSP — **see the trap below** |

Real operation, `/image/optimize`, 86,563-byte PNG → 3.1 KB:

- 17 same-origin requests, all `GET` for static JS/CSS. Two `blob:` URLs, which
  are in-memory and never leave the device.
- `0` requests with an initiator type capable of carrying a body.
- `0` bytes to any off-origin host.
- The probe filename appears in no request URL.

## Three traps worth keeping

**A blocked `sendBeacon` still returns `true`.** The spec returns true once the
beacon is *queued*; CSP refuses it afterwards. Any check that asserts on that
return value records a leak as a pass. Assert on observed network, never on a
return value.

**The test can lose a race with hydration and blame the product.** Found
2026-09-20, the first time this ran against a deployed origin rather than
localhost. The real-file check hands a file over by assigning `input.files` and
firing `change`. Do that before React has hydrated and the handover is
discarded when it does; the button stays disabled forever and the run reports
*"a real file goes through a real tool"* as failing. The tool was fine
throughout — verified separately by driving the live page's own file input,
which enabled the button with no console errors. Locally the race is invisible
because load is instant, so this failure mode cannot appear until the day the
protocol is pointed at the thing it is supposed to prove. The fix is to wait for
the page to settle and then assert the handover registered *before* clicking, so
a future failure says "the file never reached the tool" rather than "a click
timed out".

**Chromium raises a request event for a request it is about to block.** An XHR
the CSP kills still fires `page.on('request')`, with `transferSize: 0` and a
failure reason of `csp`. WebKit raises nothing at all. A check asserting
"nothing was attempted" therefore fails Chromium on a page behaving perfectly.
The protocol asserts that nothing *received a response* and that zero bytes were
transferred — which is both correct and stronger.

## What this does and does not establish

**Does:** for this build, in these two engines, the page cannot open a network
connection, five deliberate attempts to send data out are refused by policy, and
a real file through a real tool leaves no trace on the wire. The detector is not
vacuous — pointed at a page that genuinely loads a cross-origin resource it
fails, catching 1 response and 618 bytes.

**Does not:** cover every browser, every device, or CDN and origin logs.

### Coverage, as of 2026-09-26

"Does not cover every tool" was true of this document until `e2e/egress-sweep.spec.ts`
was added. The sweep visits **all 67 dedicated tool routes** in both engines and,
for each, asserts that no off-origin host answered, that nothing carrying a body
was sent anywhere **including to our own origin**, that zero bytes reached any
off-origin URL, and that the probe filename never appeared in a request URL.

**49 of the 67 routes are handed a real file** — a PNG from a canvas, a
structurally valid PDF with a correct xref table, a WAV, a CSV, and for the
twelve video routes a genuinely encoded clip from `MediaRecorder`. The files are
built in the page, so none is committed and none has a provenance question. The
remaining 18 routes have no file input at all — they take typed text — and the
set of routes that accept a file is pinned in `TAKES_A_FILE` so that a route
losing or gaining an intake fails the run rather than passing quietly.

**What the sweep does not do:** click each route's own action button. It proves
intake, not the full pipeline; 67 selectors would rot. The deep path stays in
`egress-proof.spec.ts`, which drives a real PNG all the way through
`/image/optimize`. Breadth and depth are separate specs on purpose.

**The detector was vacuous when first written, and that was caught by mutating
it.** The probe-name check scanned only off-origin and body-carrying requests,
so a same-origin `<img src="/og.png?name=…">` — which `default-src 'self'`
permits, and which is a real exfiltration shape — passed unseen. It now scans
every request URL. Re-run that mutation before trusting any change to
`e2e/egress-watch.ts`. It says nothing about whether a vulnerability exists — egress evidence
reports where bytes went, never that no flaw remains. This is exactly why
`zero data leaks` was removed from the product rather than re-justified:
no egress proof can support a security guarantee.

## The protocol, as a tool for pages we did not write

*Added 2026-09-25.* Everything above proves one thing about one site. The
reader it convinces still uses other file tools, those tools also say they
respect privacy, and nothing here helped them tell which ones enforce it.

`/proof/check` hands the protocol over. The visitor pastes the address of any
page that takes a file, runs a ten-second check in their own browser, and gets
a verdict about a page nobody here wrote.

**It does not fetch the URL, and the reason is the argument.** The literal
build -- paste a URL, we tell you -- is a server that receives every address
people are suspicious of. Three things rule it out:

1. Every route is served `connect-src 'none'`, asserted on the response header
   by the protocol above. A page here cannot open a connection. Relaxing that
   for this one tool would mean breaking the proof in order to ship the page
   that demonstrates it.
2. A browser cannot read a cross-origin response's headers without CORS
   permission from the target. The check is impossible from any page.
3. A box of ours doing it would hold a log of what strangers distrust.

So the check runs in the visitor's browser, on the page they chose. That is the
stronger test anyway: a server fetch sees what a page **declares** in a header,
while `lib/egress/live-check.ts` watches what it **does** once it is holding a
file. The snippet ports `e2e/egress-watch.ts` -- the five deliberate
exfiltration attempts, the off-origin byte count, and the rule that a request
carrying a body is watched even when it points at the page's own origin, which
CSP does not cover -- and carries the three traps above rather than
rediscovering them. It reads the enforced policy out of a
`securitypolicyviolation` event, because `originalPolicy` is the only way
script can see a policy that arrived in a header.

**Three copies of the verdict became one plus a gate.** The logic existed in
`extension/verdict.js`, `scripts/measure-csp.mjs` and again for the site, each
copy carrying a comment asking the next maintainer to keep it identical to the
others by hand. Two remain -- a `.ts` the site imports and a `.js` the
extension and the script share, because neither can load the other's format --
and `lib/egress/verdict-parity.test.ts` runs both over one table and fails the
build on disagreement.

**Three bugs that consolidating it exposed**, all in shipped code:

| Where | What it did |
| :--- | :--- |
| All three copies | Read `connect-src` without its `default-src` fallback, so a page serving `default-src 'none'` -- refusing every connection -- was reported CAPABLE. The strongest possible policy scored as the weakest. |
| `scripts/measure-csp.mjs` | Scored a refusal as a finding. Its own header says UNKNOWN exists because *"some sites refuse automated requests; that says nothing about their CSP"*, and it then read a 403 as no policy and no policy as no restriction -- so the outcome it was written to avoid was the one it produced against any site with a bot filter. |
| `extension/verdict.js` | Downgraded a report-only `'none'` to CAPABLE but left a report-only source list as RESTRICTED -- crediting an unenforced policy with restricting while refusing to credit it with blocking. Found by the parity test on its first run. |

**The checker is held to the standard it reports on.** The first question any
reader should ask about a page that says "paste an address and some headers" is
whether *that* page transmits what they paste. A tool measuring other people's
egress while leaking its own input would be worse than not shipping one, so the
answer is a test rather than a paragraph: `egress-proof.spec.ts` now types a
probe token into both inputs, asserts the verdict actually rendered, and then
runs the full detector over the result -- no off-origin response, zero
off-origin bytes, no request carrying a body anywhere including our own origin,
and the token absent from every request URL.

It also asserts the verdict rendered *before* checking for leaks, because a
page that failed to hydrate would pass every leak assertion by doing nothing at
all -- the vacuous detector this protocol keeps catching in itself.

**Verified by mutation, 2026-09-25.** Adding `<img src="/icon-32.png?h={host}">`
to the component -- a same-origin GET carrying what the visitor typed, permitted
by `default-src 'self'` and a real exfiltration shape -- fails the run with *"the
probe filename reached a request URL"*. Restoring it passes 5/5. Re-run that
mutation before trusting any change to this test.

One detail worth keeping: the probe token is lowercase because `new URL()`
lowercases a hostname. An uppercase token goes into the box in one case and
comes out of the page in another, which made the visible assertion fail and
would have made a case-sensitive scan of request URLs miss the normalised
form. The scans are case-insensitive now; a leak that arrived re-cased is still
a leak.

**What it still does not establish** is everything in the section above, which
applies unchanged: capability is not intent, and no egress measurement can
report that a page has no flaw. Every non-blocked verdict carries that line.

## Closed: the third-party beacon is gone at source

Cloudflare was injecting its Web Analytics beacon
(`static.cloudflareinsights.com/beacon.min.js`, with a `data-cf-beacon` token)
into the HTML at the edge. The site's own CSP blocked it — `transferSize: 0`,
no globals ever present, so nothing was ever collected — but the claim rested
on one directive catching it rather than on the tag being absent.

**Disabled at source 2026-09-19** via Web Analytics → Manage site → Real User
Measurements → **Disable**. Verified with browser-shaped requests (a bare
`User-Agent: Mozilla/5.0` is not enough — Cloudflare only injected for requests
that looked like a real browser asking for HTML, so a weaker check returns a
false all-clear):

```bash
curl -s "https://getopentools.com/?cb=$(date +%s)" \
  -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36' \
  -H 'Accept: text/html' | grep -c cloudflareinsights
```

`0` on `/`, `/pdf/compress` and `/support`. "No third-party trackers" no longer
depends on the CSP to be true.

---

*Re-run locally with `npx playwright test e2e/egress-proof.spec.ts`, and against
what is actually live with `npx playwright test --config
playwright.production.config.ts`. Re-run it before any release that repeats an
egress claim; that is what rule 23 asks for.*
