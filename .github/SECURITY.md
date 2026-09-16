# Security Policy

## Zero-Egress Policy

OpenTools is built on one non-negotiable rule: **user files, file names, text
inputs, and results never leave the browser.** Every tool runs in-memory using
JavaScript, WebAssembly, Canvas, WebCrypto, and Web Workers.

The following are treated as security vulnerabilities, not feature requests:

- Any network request that carries user file bytes, file names, pasted text,
  outputs, or data derived from them.
- Any client-side analytics, telemetry, session replay, advertising,
  fingerprinting, or third-party tracking script.
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
text, or results. Logs are retained under Cloudflare's Workers Logs retention,
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
