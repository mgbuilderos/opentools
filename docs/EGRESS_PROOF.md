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

## Two traps worth keeping

**A blocked `sendBeacon` still returns `true`.** The spec returns true once the
beacon is *queued*; CSP refuses it afterwards. Any check that asserts on that
return value records a leak as a pass. Assert on observed network, never on a
return value.

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

## Open item for the owner

Cloudflare injects its analytics beacon (`static.cloudflareinsights.com/
beacon.min.js`, with a `data-cf-beacon` token) into the HTML at the edge. **The
site's own CSP blocks it** — `transferSize: 0`, `duration: 0`, and none of its
globals ever appear, so nothing is collected today. But the tag is in the DOM,
and the claim survives only because the CSP catches it. It should be switched
off at source: Cloudflare dashboard → the zone → **Speed → Optimization →
Browser Insights / Web Analytics**, turn off automatic beacon injection. Until
then this is a third-party tracker that one CSP relaxation away from being live.

---

*Re-run with `npx playwright test e2e/egress-proof.spec.ts`. Re-run it before
any release that repeats an egress claim; that is what rule 23 asks for.*
