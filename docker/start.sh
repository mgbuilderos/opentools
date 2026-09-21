#!/bin/sh
# Serves the built Worker with workerd through `wrangler dev --local`, the same
# runtime Cloudflare uses, so `_headers` and the KV page cache behave as they
# do in production. No Cloudflare account or network access is needed.
set -eu

# The optional access gate. Container environment is not visible inside
# workerd on its own, so the two values are forwarded as Worker vars, which
# `nodejs_compat` then exposes as `process.env` — where `lib/security/
# self-host-auth.ts` reads them. Unset means unset: with neither var passed the
# gate stays off, which is the public site's behaviour and the default here.
set -- \
  --config /app/dist/server/wrangler.json \
  --local \
  --ip 0.0.0.0 \
  --port "${PORT:-8796}" \
  --persist-to "${OPENTOOLS_STATE_DIR:-/tmp/opentools-state}" \
  --show-interactive-dev-session=false \
  --log-level "${WRANGLER_LOG_LEVEL:-info}"

if [ -n "${OPENTOOLS_AUTH_USER:-}" ]; then
  set -- "$@" --var "OPENTOOLS_AUTH_USER:${OPENTOOLS_AUTH_USER}"
fi
if [ -n "${OPENTOOLS_AUTH_PASSWORD:-}" ]; then
  set -- "$@" --var "OPENTOOLS_AUTH_PASSWORD:${OPENTOOLS_AUTH_PASSWORD}"
fi

exec /app/node_modules/.bin/wrangler dev "$@"
