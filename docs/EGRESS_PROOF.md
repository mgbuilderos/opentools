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

**Does not:** cover every tool, every browser, every device, or CDN and origin
logs. It says nothing about whether a vulnerability exists — egress evidence
reports where bytes went, never that no flaw remains. This is exactly why
`zero data leaks` was removed from the product rather than re-justified:
no egress proof can support a security guarantee.

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
