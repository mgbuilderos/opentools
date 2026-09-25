# Changelog

Releases are tagged `v<version>`, and pushing that tag is what publishes the
self-host image and creates the GitHub release — see `docs/RELEASE_RUNBOOK.md`.

Each heading below is the body of its release, verbatim:
`.github/workflows/selfhost-image.yml` reads the section for the tag it is
building out of this file via `scripts/release-notes.mjs`, and fails the release
when there is no section for it. So these notes are reviewed in the pull request
that ships the change rather than typed into a tag message at the keyboard — the
only place they can be checked before they are published under the project's
name.

The dates are release dates in UTC.

## 0.1.0 — 2026-09-18

The first tagged release, and the first version of OpenTools you can pin, pull
and run rather than only visit. Tagged at `9850a8e`.

**Everyday file and text utilities that run inside the browser tab.** Files are
read as in-memory `File` and `ArrayBuffer` objects and handed back as temporary
`blob:` URLs. Nothing is written to a server, and there is no account, no
upload, no watermark and no third-party tracking.

**The privacy guarantee is enforced rather than promised.** Pages are served
`Content-Security-Policy: connect-src 'none'`, so the browser itself refuses
every fetch, XHR, WebSocket, EventSource and `sendBeacon` the page attempts.
That is checkable from outside in about ten seconds:

```bash
curl -sI https://getopentools.com | grep -i content-security-policy
```

`e2e/egress-proof.spec.ts` attempts five exfiltration vectors on every release,
then pushes a real file through a real tool and asserts no off-origin response
and zero off-origin bytes, in Chromium and WebKit. `docs/EGRESS_PROOF.md` is
explicit about what that does and does not prove.

**Self-hosting.** One container, no Cloudflare account, no licence key, no
phone-home:

```bash
docker run --rm -p 8796:8796 ghcr.io/mgbuilderos/opentools:0.1.0
```

It serves the built Worker with `wrangler dev --local`, which runs workerd — the
same runtime the live site runs — so `_headers` and the KV page cache behave the
way they do in production rather than approximately. It runs under
`--network none` with everything still working. An optional access gate is off
by default; set `OPENTOOLS_AUTH_USER` and `OPENTOOLS_AUTH_PASSWORD` to turn it
on. Full notes in `docs/SELF_HOSTING.md`.

`linux/amd64` and `linux/arm64`. Roughly 692 MB, because workerd needs glibc and
Alpine is therefore not an option.

**What it deliberately does not include.** No TLS and no authentication unless
you enable the gate — put it behind your own reverse proxy. Single process, no
clustering. The page cache lives inside the container and starts empty after a
restart unless you mount a volume at `OPENTOOLS_STATE_DIR`.

**`latest` is the newest release, not the newest commit.** Pushes to `main` do
not publish, by design, so the image trails the branch between releases. Build
from source if you need something newer.

**Licence.** MIT, with third-party notices in `THIRD_PARTY_NOTICES.md` and a
CycloneDX SBOM in `release/sbom.cdx.json`.
