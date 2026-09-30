# ADR-020 — `Cross-Origin-Opener-Policy: unsafe-none` on `/fix/<path>`

- **Status:** accepted
- **Date:** 2026-09-28
- **Decided by:** project owner, in chat, on a written request recorded at
  `AGENT_BOARD.md` §7
- **Scope:** `/fix/:path+` only. Every other route on this site is unchanged.
- **Supersedes nothing. Narrows nothing. Widens one header on one route family.**

## The decision

The Fix My Upload working routes send `Cross-Origin-Opener-Policy: unsafe-none`.
Every other route continues to send `same-origin`, and every other security
header on `/fix/<path>` is unchanged — same Content-Security-Policy, including
`frame-ancestors 'none'` and `connect-src 'none'`, same COEP, same CORP, same
`X-Frame-Options: DENY`, same referrer and permissions policy.

`/fix` itself — the page that explains the integration to a site owner — is
**not** in scope and keeps `same-origin`. `/fix/:path+` requires at least one
segment after `/fix`, exactly the split ADR-019 makes between `/embed` and
`/embed/<tool>`, and for the same reason: the page describing an integration is
not part of it.

## Why it was necessary

Fix My Upload exists so that a site whose upload form rejected a file can hand
the visitor a link, have them correct the file **on their own machine**, and
receive the corrected file back — with nothing uploaded in either direction.
The return leg needs a window handle between the integrating page and this one.

`Cross-Origin-Opener-Policy: same-origin` makes that impossible. It places the
document in its own browsing context group, which severs the opener
relationship when the opener is cross-origin. This was **measured on the built
site**, in a real popup opened by a real second origin, rather than argued from
the specification:

```
popup:   window.opener === null
opener:  the handle exists and already reports closed === true
```

Both directions are cut by the browser before any script runs. There is no
client-side workaround: nothing can be sent in, and nothing can be sent out.

The only other transport for a file across origins is an `iframe`, and that is
closed by `frame-ancestors 'none'` — a guard `lib/security/embed-framing.test.ts`
already fails the build over. That route stays closed. Framing was never
considered as an alternative here: a top-level window is also the better answer
for the person, because they can see this site's real origin in their own
address bar and judge where their file is being handled. An iframe shows them
nothing.

## What it costs, stated plainly

1. **These routes leave cross-origin isolation.** `crossOriginIsolated` becomes
   false there, so `SharedArrayBuffer` is unavailable on `/fix/<path>`. Those
   pages use canvas only and need none. **If a tool placed on `/fix/*` ever
   needs isolation, this decision must be revisited rather than worked around.**
2. **A cross-origin page may hold a handle to these documents.** That is the
   point of the change, and it is the risk being accepted. What it does *not*
   get: it cannot read across the boundary — the same-origin policy is
   untouched — and it cannot frame the page, because `frame-ancestors 'none'`
   still applies. It can post messages and hold a `Window` reference.
3. **The mitigation is in the protocol, not in the header.** See
   `lib/tools/fix-my-upload.ts`. The destination origin is taken from
   `MessageEvent.origin`, which the browser supplies and a page cannot forge —
   never from a URL parameter, so a link cannot name where a file should go.
   `targetOrigin` is always that exact origin and never `'*'`. Nothing is
   returned until the person has been shown the host and pressed a button.

## What is not in scope

- No change to the Content-Security-Policy, on these or any routes.
- No change to `connect-src 'none'`. Nothing on these pages can open a network
  connection, which is what makes "the file does not leave the device" a
  structural statement rather than a promise.
- No change to framing. `/fix/*` cannot be embedded.
- No new route becomes framable, indexable, or isolated-exempt.

## How it is held

`lib/security/fix-opener-policy.test.ts` fails the build when:

- the two header files disagree about `/fix/*`, or either stops sending
  `unsafe-none`;
- the override block grows a **second** header — it must change exactly one;
- any other route, in either file, starts sending `unsafe-none`;
- `/fix` itself, or any non-`/fix` path, falls inside the pattern;
- `X-Frame-Options` or the sealed CSP stops applying to these routes;
- this document is missing or stops naming what it decided.

`e2e/fix-my-upload.spec.ts` drives the whole path in Chromium and WebKit from a
genuinely separate origin, including the adversarial cases: a wrong-origin
message, a forged origin in the payload, a hostile request id, and a second
window trying to claim a result destined elsewhere.

## Alternatives rejected

- **Iframe instead of a popup.** Closed by `frame-ancestors 'none'`; would have
  required relaxing ADR-019's invariant instead, which is a wider hole (any page
  could embed a tool surface) and shows the visitor nothing about who is
  handling their file.
- **`same-origin-allow-popups`.** Governs popups this document *opens*, not the
  relationship with a document that opened it. It does not restore the opener
  here and was verified to be the wrong value for this problem.
- **Download and re-upload.** Already shipped as mode A, and it is the honest
  fallback when an integration is absent. It does not remove the step this
  feature exists to remove.
- **Doing nothing.** Modes A and C work without this change. Mode B — the only
  capability in the feature that does not already exist elsewhere on the site —
  cannot.
