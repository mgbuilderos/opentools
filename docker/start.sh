#!/bin/sh
# Serves the built Worker with workerd through `wrangler dev --local`, the same
# runtime Cloudflare uses, so `_headers` and the KV page cache behave as they
# do in production. No Cloudflare account or network access is needed.
set -eu

# The config the Worker starts from — always a rewritten copy in /tmp.
#
# Two reasons, and the second one is why this is unconditional.
#
# 1. `vinext build` emits `assets: {directory: "../client"}` and no
#    `run_worker_first`, and Wrangler's default with a `main` AND `assets` is to
#    serve a matching static file without ever reaching the Worker. Every route is
#    prerendered, so that is every real page — and the access gate lives in the
#    Worker. Measured before this existed: gate configured, no credentials sent,
#    `/`, `/self-host`, `/pdf/compress` and `/robots.txt` all 200, and 401 only
#    for a path with no file. So a gated instance runs the Worker first. An
#    ungated one does not, and keeps the asset-first path and its prerendering
#    speed.
# 2. Wrangler writes a temporary bundle beside its config, and the shipped compose
#    file is `read_only: true`. That was solved with `tmpfs: /app/dist/server`,
#    which hides what the image put there: the container crash-looped on
#    `ENOENT ... /app/dist/server/wrangler.json`, so `docker compose up -d` never
#    came up. Writing the config to /tmp means that directory is only ever read.
CONFIG="${TMPDIR:-/tmp}/opentools-wrangler.json"
if [ -n "${OPENTOOLS_AUTH_USER:-}${OPENTOOLS_AUTH_PASSWORD:-}${OPENTOOLS_AUTH_TRUSTED_HEADER:-}${OPENTOOLS_AUTH_PROXY_SECRET:-}" ]; then
  node /app/docker/runtime-config.mjs --run-worker-first \
    /app/dist/server/wrangler.json "$CONFIG"
  echo "opentools: access gate configured -- running the Worker ahead of static assets." >&2
else
  node /app/docker/runtime-config.mjs /app/dist/server/wrangler.json "$CONFIG"
fi

set -- \
  --config "$CONFIG" \
  --local \
  --ip 0.0.0.0 \
  --port "${PORT:-8796}" \
  --persist-to "${OPENTOOLS_STATE_DIR:-/tmp/opentools-state}" \
  --show-interactive-dev-session=false \
  --log-level "${WRANGLER_LOG_LEVEL:-info}"

# The optional access gate, and nothing else. Container environment is not
# visible inside workerd on its own, so each value is forwarded as a Worker var,
# which `nodejs_compat` then exposes as `process.env` — where `lib/security/
# self-host-auth.ts` reads it. Unset means unset: with none of these passed the
# gate stays off, which is the public site's behaviour and the default here.
#
# This list is deliberately explicit rather than a sweep of the environment. A
# loop over everything matching `OPENTOOLS_*` would forward whatever the host
# happens to have set into the Worker, which on somebody's orchestrator is how a
# secret intended for a sidecar ends up readable by page code.
#
# `--var NAME:VALUE` splits on the first colon, so a password or secret
# containing one arrives intact.
for name in \
  OPENTOOLS_AUTH_USER \
  OPENTOOLS_AUTH_PASSWORD \
  OPENTOOLS_AUTH_TRUSTED_HEADER \
  OPENTOOLS_AUTH_PROXY_SECRET \
  OPENTOOLS_AUTH_PROXY_SECRET_HEADER \
  OPENTOOLS_AUDIT_IDENTITY; do
  # POSIX sh has no indirect expansion; eval of a fixed literal list is safe.
  eval "value=\${$name:-}"
  if [ -n "${value:-}" ]; then
    set -- "$@" --var "$name:$value"
  fi
done

exec /app/node_modules/.bin/wrangler dev "$@"
