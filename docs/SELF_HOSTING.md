# Self-hosting OpenTools

OpenTools is MIT licensed. This describes how to run the whole site on your own
machine, from a container that needs no Cloudflare account and no network access
once it is built.

## Pull

Every release tag publishes a multi-arch image (`linux/amd64`, `linux/arm64`)
with build provenance attestations to GitHub Container Registry, so the shortest
path needs no clone and no toolchain:

```bash
docker run --rm -p 8796:8796 ghcr.io/mgbuilderos/opentools:latest
```

`latest` follows the most recent release tag and therefore moves. Where an
approval is granted against a fixed artefact, pin the digest instead:

```bash
docker image inspect ghcr.io/mgbuilderos/opentools:latest --format '{{index .RepoDigests 0}}'
```

Pushes to `main` do not publish, so the image trails the branch by design.
Build from source if you need something newer than the last release.

## Build

```bash
docker build -t opentools-selfhost:local .
```

Two stages. The build stage installs from `package-lock.json`, runs
`npm run build`, then rewrites `package.json` down to Wrangler alone and prunes
everything else, so the runtime stage carries the Worker runtime and the built
site and nothing from the toolchain. The base image is pinned by digest
(`node:22.23.2-bookworm-slim`); workerd needs glibc, so Alpine is not an option.

The resulting image is about 692 MB (measured 2026-09-18; it grows as pages are added, so re-check rather than trust this).

## Run

```bash
docker run --rm -p 8796:8796 opentools-selfhost:local
```

Then open `http://localhost:8796`.

`docker/start.sh` serves the built Worker with `wrangler dev --local`, which
runs workerd — the same runtime Cloudflare runs in production — so `_headers`
and the KV page cache behave the way they do on the live site. Nothing contacts
Cloudflare: Wrangler's metrics, log files, remote `cf` lookups, explorer and
observability are all switched off in the image.

### Settings

| Variable | Default | What it does |
| --- | --- | --- |
| `PORT` | `8796` | Port inside the container |
| `OPENTOOLS_STATE_DIR` | `/tmp/opentools-state` | Where the KV page cache is persisted |
| `WRANGLER_LOG_LEVEL` | `info` | Wrangler log verbosity |
| `OPENTOOLS_AUTH_USER` | unset | Username for the optional access gate |
| `OPENTOOLS_AUTH_PASSWORD` | unset | Password for the optional access gate |
| `OPENTOOLS_AUTH_TRUSTED_HEADER` | unset | Header your proxy puts the signed-in name in, e.g. `x-forwarded-user` |
| `OPENTOOLS_AUTH_PROXY_SECRET` | unset | Shared secret proving a request came through your proxy. Required with the line above |
| `OPENTOOLS_AUTH_PROXY_SECRET_HEADER` | `x-opentools-proxy-secret` | Header carrying that secret |
| `OPENTOOLS_AUDIT_IDENTITY` | unset | `true` to put the signed-in name in this container's own log lines |

The state directory is inside the container, so the page cache starts empty
after every restart. Mount a volume there if you would rather it survive.

The container runs as the unprivileged `node` user and has a healthcheck that
fetches `/robots.txt` from inside itself. It counts `401` as healthy: with the
access gate on, a refusal is the correct answer and still proves the server is
up.

### The access gate

Off by default. Set both variables and the instance asks for a username and
password before serving anything:

```bash
docker run --rm -p 8796:8796 \
  -e OPENTOOLS_AUTH_USER=ops \
  -e OPENTOOLS_AUTH_PASSWORD='choose something long' \
  opentools-selfhost:local
```

`docker/start.sh` forwards both to Wrangler as `--var`, which `nodejs_compat`
exposes as `process.env` inside workerd — measured with a throwaway Worker that
printed the two values back, not assumed. `proxy.ts` reads them through
`lib/security/self-host-auth.ts` before anything else runs, so a refused request
is never written to the visit log either.

This exists for one deployment only: an organisation running the container on
its own network, where "anyone who can reach the port gets the site" is what
stops a security reviewer from signing it off. **The public site never has it
on** — no account, no signup, is the product there.

What it is: HTTP Basic, compared in constant time, failing closed if only one of
the two variables is set. What it is not: TLS, SSO, user accounts, or any record
of who anyone is. It answers "is this person allowed to reach this instance at
all" and nothing else, because anything more would mean storing people, which
this product does not do. Terminate TLS in front of it — Basic credentials over
plain HTTP are readable in transit.

### Single sign-on, through your own proxy

The access gate above is one shared password for the whole instance. That is
enough for a team and not enough for a review that asks who signed in. The
second mode answers that without this container learning anything about your
people.

Put your existing identity-aware proxy in front — oauth2-proxy, Authelia, an
identity-aware gateway, any reverse proxy already bound to your directory. It
authenticates against your identity provider, which stays the only system that
knows who anyone is, and forwards the authenticated name in a header:

```bash
docker run --rm -p 8796:8796 \
  -e OPENTOOLS_AUTH_TRUSTED_HEADER=x-forwarded-user \
  -e OPENTOOLS_AUTH_PROXY_SECRET="$(openssl rand -hex 32)" \
  opentools-selfhost:local
```

Your proxy must send both headers: the name in
`OPENTOOLS_AUTH_TRUSTED_HEADER`, and that secret in
`x-opentools-proxy-secret` (rename it with
`OPENTOOLS_AUTH_PROXY_SECRET_HEADER`).

**Why a secret as well as a header.** A forwarded header is a claim, not proof.
Anything that can reach the port can invent one, so the header alone would make
the instance believe whatever a browser told it — and it would look gated the
whole time. The secret is what an ordinary client does not have. Setting the
header without the secret does not start this mode: it refuses every request,
loudly, on the day you configure it rather than quietly months later.

Four refusals, all `403` with the reason in the body, because the only person
who ever reads it is whoever is wiring the proxy up:

| Body says | What happened |
| --- | --- |
| `not-from-the-proxy` | No secret, or the wrong one. The request did not come through your proxy |
| `no-identity-forwarded` | Right secret, but your proxy forwarded no name — sign-on was bypassed |
| `incomplete-proxy-configuration` | You set the header or the secret, not both |
| `ambiguous-configuration` | Both this mode and the shared password are configured. Pick one |

`403` and not `401` on purpose: the credential belongs to your proxy, so
prompting the person at the screen for one could only ever fail.

This mode issues no session, sets no cookie and stores nothing. Each request is
judged on the headers it arrives with.

### The log this container keeps

One JSON object per request on stdout — your `docker logs`, your log collector,
nowhere else. Nothing is sent anywhere: the image sets
`WRANGLER_SEND_METRICS=false`, `NEXT_TELEMETRY_DISABLED=1` and
`CLOUDFLARE_CF_FETCH_ENABLED=false`, there is no analytics script in any page,
and you can prove all three by running it with `--network none` (below).

The fields are coarse by design: country, device class (`mobile` / `tablet` /
`desktop`), which kind of site referred the visit, the path, the tool, the
browser's primary language, and a timestamp. No IP address, no stored user
agent, no cookie, no identifier, and never a file, a filename or a result.
Static assets are not logged at all.

Set `OPENTOOLS_AUDIT_IDENTITY=true` on a trusted-proxy instance and each line
also carries the name your proxy forwarded. Off by default, and it does nothing
without that mode. This is the access record a reviewer usually asks for, and it
is a decision about your own employees, in your own logs — which is why it is
yours to switch on rather than ours to switch on for you.

## Running with no network at all

The image is built to need nothing at runtime, and that is checkable:

```bash
docker run --rm -d --network none --name opentools opentools-selfhost:local
docker exec opentools node -e "fetch('http://127.0.0.1:8796/').then(r=>console.log(r.status))"
```

Measured on this image with `--network none`, the container serving and the
probe both running inside it:

| Path | Status | `connect-src` in the response CSP |
| --- | --- | --- |
| `/` | 200 | `'none'` |
| `/robots.txt` | 200 | `'none'` |
| `/pdf/sign` | 200 | `'none'` |
| `/pdf/compress` | 200 | `'none'` |
| `/guides/pdf-sign-pdf` | 200 | `'none'` |
| `/sitemap.xml` | 200 | `'none'` |
| `/image/background-remover` | 200 | `'self'` |
| `/video/compress` | 404 | `'none'` |

`/image/background-remover` is the one route that gets `connect-src 'self'`,
because it loads its ONNX model and runtime from the same origin. An outbound
request from inside that container fails to resolve, as it should.

This says the site serves correctly with no network available to the container.
It is not a claim about what a browser does with the pages it is given.

## What this does not include

- No TLS. Put it behind a reverse proxy if you expose it beyond localhost.
- No TLS for the access gate. It is HTTP Basic; without a reverse proxy
  terminating TLS the credentials travel in clear text.
- No user accounts, and no identity system in the container. The shared-password
  gate is one credential for the whole instance. For per-person sign-in, run your
  own identity-aware proxy in front — see *Single sign-on, through your own
  proxy*. This container never holds a directory, an account or a password for
  anybody.
- No access record unless you ask for one. The container logs coarse, non-identifying
  request data to its own stdout; `OPENTOOLS_AUDIT_IDENTITY=true` adds the name
  your proxy forwarded. There is no retention, rotation or search — that is your
  log collector's job, not this container's.
- One container, one process. There is no clustering and no shared cache
  between replicas.
- No image of the latest commit. `.github/workflows/selfhost-image.yml` builds
  the image on every pull request without pushing it; only a `v*` tag publishes
  to GitHub Container Registry, and pushes to `main` never publish. The
  published image is therefore always a release, never the branch head.
