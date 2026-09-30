#!/bin/sh
# Serves the built Worker with workerd through `wrangler dev --local`, the same
# runtime Cloudflare uses, so `_headers` and the KV page cache behave as they
# do in production. No Cloudflare account or network access is needed.
set -eu

set -- \
  --config /app/dist/server/wrangler.json \
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
