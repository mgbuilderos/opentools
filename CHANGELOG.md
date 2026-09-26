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

## 0.2.0 — 2026-09-26

Everything merged since `v0.1.0`. The two that matter most if you run this
yourself are the access gate and the prerendering.

**The instance can be locked now.** 0.1.0 had no authentication of any kind;
anyone who could reach the port got the whole site. Set `OPENTOOLS_AUTH_USER`
and `OPENTOOLS_AUTH_PASSWORD` and the container asks for them before serving
anything. `docker/start.sh` forwards both to Wrangler as `--var`, and
`proxy.ts` checks them through `lib/security/self-host-auth.ts` before anything
else runs — so a refused request never reaches the visit log either. Still off
by default, and still no TLS: put it behind your reverse proxy.

**Pages are prerendered.** In 0.1.0 every page rendered in the Worker on every
request, which on the heaviest pages exceeded the CPU budget and returned 503.
The build now emits static HTML for the whole route set and ships edge caching
for HTML and immutable assets, so a cold request serves a file instead of
running a render. Responses also carry
`Strict-Transport-Security: max-age=31536000; includeSubDomains`.

**New work the tools can do.** Five format families that did not exist in
0.1.0 — finance, email, DICOM, geographic, and encrypted PDF. The
self-imposed file size and count caps are gone; what you can process is now
bounded by your own machine rather than by a number chosen in advance.

**New ways in.** `/batch` runs a whole folder through a pipeline. Paste works
on every page rather than only the home-page box. The manifest declares a share
target and a file handler, so an installed copy can receive files from the
share sheet and be opened from the file manager. Every result now prints what
left the page beside it — which for this site is nothing, and the point is that
you can see it rather than be told.

**New pages.** `/self-host` states the case for running it inside your own
building, and `/proof` shows the offline demonstration next to the devtools
one.

**Six more tools**, none of which existed in 0.1.0: an offline email reader for
EML, MSG and Mbox; File X-ray, which shows the hidden metadata in any file;
bank statement to Excel or CSV; OFX and QIF to CSV or Excel; a PDF AcroForm
filler; and PDF unlock and encryption. `/whats-new` lists what has shipped and
publishes it as a feed.

**It is packaged for the self-host app stores.** `packaging/` carries
submission-ready manifests for Umbrel, Unraid Community Applications, CasaOS,
Runtipi and Portainer — each naming the same image and port, with
`packaging/packaging.test.ts` failing the build when one of them drifts or pins
a release older than this changelog's newest section. They are prepared, not
yet submitted; `docs/APP_CATALOGUES.md` covers each store's rules. Umbrel
additionally requires the multi-arch manifest digest, which can only be filled
in once this release's image exists.

**Also.** `npm run portable` produces a copy of the site you can keep and open
without a server. `llms.txt` now says what each tool does rather than which
category it sits in.

**Fixed.** Canonical tags are checked in the prerendered HTML before the
deploy, rather than after. Four pages that attributed prices to companies this
project never measured no longer do. Bank statement imports report a missing
opening balance instead of silently assuming zero.

**Unchanged, and worth repeating.** No TLS. Single process, no clustering. The
page cache lives inside the container and starts empty after a restart unless
you mount a volume at `OPENTOOLS_STATE_DIR`. It still runs under
`--network none` with everything working, and the pages are still served
`connect-src 'none'`. The image grows as pages are added, so take its size from
`docs/SELF_HOSTING.md` rather than from a number quoted here.

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
`--network none` with everything still working. Full notes in
`docs/SELF_HOSTING.md`.

`linux/amd64` and `linux/arm64`. Roughly 681 MB, because workerd needs glibc and
Alpine is therefore not an option.

**What it deliberately does not include, and read this before you expose it.**
**No authentication of any kind in this release** — anyone who can reach the
port gets the whole site. No TLS either, so put it behind your own reverse
proxy and do the access control there. Single process, no clustering. The page
cache lives inside the container and starts empty after a restart unless you
mount a volume at `OPENTOOLS_STATE_DIR`.

(An optional username/password gate was added after this release was tagged. It
is **not** in this image: setting `OPENTOOLS_AUTH_USER` and
`OPENTOOLS_AUTH_PASSWORD` against `:0.1.0` does nothing, and would leave you
believing the instance was protected when it is not. It arrives in the next
release.)

**`latest` is the newest release, not the newest commit.** Pushes to `main` do
not publish, by design, so the image trails the branch between releases. Build
from source if you need something newer.

**Licence.** MIT, with third-party notices in `THIRD_PARTY_NOTICES.md` and a
CycloneDX SBOM in `release/sbom.cdx.json`.
