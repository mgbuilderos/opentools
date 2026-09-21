# Self-hosting OpenTools

OpenTools is MIT licensed. This describes how to run the whole site on your own
machine, from a container that needs no Cloudflare account and no network access
once it is built.

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
- No SSO, no user accounts, no per-user audit trail. The gate is one shared
  credential for the whole instance.
- One container, one process. There is no clustering and no shared cache
  between replicas.
- No published image. `.github/workflows/selfhost-image.yml` builds the image on
  every pull request without pushing it; only a `v*` tag publishes to GitHub
  Container Registry. Pushes to `main` never publish.
