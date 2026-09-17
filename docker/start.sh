#!/bin/sh
# Serves the built Worker with workerd through `wrangler dev --local`, the same
# runtime Cloudflare uses, so `_headers` and the KV page cache behave as they
# do in production. No Cloudflare account or network access is needed.
set -eu

exec /app/node_modules/.bin/wrangler dev \
  --config /app/dist/server/wrangler.json \
  --local \
  --ip 0.0.0.0 \
  --port "${PORT:-8796}" \
  --persist-to "${OPENTOOLS_STATE_DIR:-/tmp/opentools-state}" \
  --show-interactive-dev-session=false \
  --log-level "${WRANGLER_LOG_LEVEL:-info}"
