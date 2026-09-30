# Security Policy

## Zero-Egress Policy

OpenTools is built on one non-negotiable rule: **user files, file names, text
inputs, and results never leave the browser.** Every tool runs in-memory using
JavaScript, WebAssembly, Canvas, WebCrypto, and Web Workers.

The following are treated as security vulnerabilities, not feature requests:

- Any network request that carries user file bytes, file names, pasted text,
  outputs, or data derived from them.
- Any third-party analytics, advertising, session replay, fingerprinting or
  tracking script. There are none, and there will be none.
- Any client-side signal beyond the nine fixed, content-free product counters
  documented under "Product signals" below — or any change that gives one of
  those nine a query string, a body, an identifier, or anything derived from a
  file, an input, an output or a tool.
- Any server-side logging beyond the visit log documented below, or a visit log
  that records more than documented.
- Any silent fallback from local processing to a remote service.
- A payment or support flow that receives file, job, or result data, or that
  blocks access to a local result.
- A Content Security Policy regression (for example, loosening
  `connect-src`) on a tool route.
- Classic web vulnerabilities: XSS, injection, unsafe `postMessage`, supply
  chain compromise, or malicious dependencies.

Model and asset downloads needed by some tools (for example, an AI model
fetched once before processing) are app assets, not user data. They must be
disclosed in the UI and must never include user content. Report any case where
they do.

## Product Signals

Since 2026-09-28 the site may request one of **nine fixed, same-origin image
assets** so that aggregate product questions have an answer. Owner decision;
`decisions/ADR-020-product-signals.md` **in the blueprint repository** records
the reasoning and the limits. (The path matters: an unmerged branch introduces a
`decisions/` directory in *this* repository carrying a different ADR-020, so the
bare path is ambiguous until one of the two is renumbered.)

```
/telemetry/v1/pwa-installed.svg          /telemetry/v1/install-prompt-shown.svg
/telemetry/v1/pwa-launch.svg             /telemetry/v1/install-prompt-accepted.svg
/telemetry/v1/completed-web.svg          /telemetry/v1/install-prompt-dismissed.svg
/telemetry/v1/completed-pwa.svg          /telemetry/v1/share-target-opened.svg
/telemetry/v1/file-handler-opened.svg
```

**What is sent:** a GET for one of those exact paths. Nothing else. No query
string, no fragment, no request body, no cookie (the site sets none), no
header we add, and no identifier of any kind. Two requests from the same
browser are indistinguishable from two different people.

**What is never sent:** file bytes, file names, extensions, MIME types, file
sizes exact or bucketed, page counts, dimensions, pasted text, inputs, outputs,
error text, recipe or Ask Link values or identifiers, tool or operation ids,
the current URL, query or fragment, the referrer, a job, session, device or
installation id, a stored identifier, a fingerprint, an IP-derived identifier,
a client timestamp, a duration, a performance value, or country, language or
device characteristics.

**Transport.** A same-origin `Image`, because `img-src 'self'` was already
permitted and `connect-src 'none'` therefore does not have to move. `fetch`,
`XMLHttpRequest`, `sendBeacon` and WebSocket are not used and remain blocked on
every tool route. An image request cannot carry a body at all.

**Opting out.** Global Privacy Control and Do Not Track are honoured, and
`/privacy` has a switch that stops them for that browser.

**Offline.** Nothing is queued, retried or replayed. The assets are excluded
from the service-worker precache, so an installed app with no network sends
nothing and the event is permanently uncounted.

**Self-hosting.** Every path is relative. A self-hosted instance requests them
from itself and never contacts getopentools.com.

Reports are welcome for any signal that carries content, gains an identifier,
acquires a query string, is retried or queued, becomes cacheable, or reaches a
host other than the one serving the page. Those are vulnerabilities.

## Server-Side Visit Log

Tools never send your data to the server, but the site does log page visits.
For each page request (not static assets), the edge handler in `proxy.ts` writes
one `tool_impression` event to Cloudflare Workers Logs containing:

- Country, from Cloudflare's `cf-ipcountry` header (coarse geographic level only; region and city are not logged).
- Device type (mobile, tablet, or desktop), derived from the user agent; the
  user agent itself is not stored.
- The referring site's category (`referer_source`, e.g. search engine, social platform, or direct; the raw referrer URL is not stored).
- The page path, and the `tool` query parameter if present.
- Primary browser language.
- A timestamp.

The event does not include IP addresses, cities, regions, raw referrers, cookies, files, file names, pasted
text, or results. Note that a page visit and a product signal are both ordinary
HTTP requests, so Cloudflare's own platform logs record the IP address and user
agent for each, exactly as they do for every script, font and image any website
serves. None of that is copied into an application database, and nothing joins
it to a person, a payment, a job or another request. Logs are retained under Cloudflare's Workers Logs retention,
and Cloudflare may also record standard request metadata for its platform logs.
Any change to what is logged must update this section and the README in the
same pull request.

## Supported Versions

Only the latest commit on `main` and the live deployment at
`getopentools.com` receive security fixes.

## Reporting a Vulnerability

**Do not open a public issue for security reports.**

1. Use GitHub's
   [private vulnerability reporting](https://github.com/mgbuilderos/opentools/security/advisories/new)
   ("Report a vulnerability" on the Security tab).
2. Include:
   - The affected route or tool (for example `/pdf/merge`).
   - Browser and version.
   - Steps to reproduce.
   - For egress reports: the request URL, method, and a redacted HAR export
     or DevTools Network screenshot showing the payload. Never attach real
     personal documents — use a synthetic test file.
3. You will receive an acknowledgement within **72 hours** and a triage
   decision within **7 days**.

Confirmed egress or undisclosed telemetry findings are treated as **critical**: the
affected tool is disabled or patched before any other work, a regression test
is added to the zero-egress suite, and the fix is disclosed in a published
security advisory with credit to the reporter (unless you prefer anonymity).

## Verifying the Promise Yourself

1. Open DevTools → Network, enable "Preserve log", and clear the list.
2. Load a tool, then disconnect from the network (DevTools → Offline).
3. Process a synthetic file. The tool should complete, and no request should
   contain your input.

Automated checks run in CI: the local-source policy tests reject direct
network primitives in local engine code, and production responses ship
`connect-src 'none'` on local routes.
