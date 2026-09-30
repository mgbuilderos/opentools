# OpenTools self-host image. See docs/SELF_HOSTING.md.

# node:22.23.2-bookworm-slim (multi-arch index). workerd needs glibc, so not Alpine.
ARG NODE_IMAGE=node:22.23.2-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5

FROM ${NODE_IMAGE} AS build
WORKDIR /app
ENV CI=true \
    WRANGLER_SEND_METRICS=false \
    NEXT_TELEMETRY_DISABLED=1
# Matches .github/workflows/ci.yml.
RUN npm install --global npm@11.12.1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# The runtime only needs Wrangler (and workerd) from the lockfile: drop every
# other package and keep the locked versions of what remains.
RUN node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));const v=p.devDependencies.wrangler;p.dependencies={wrangler:v};p.devDependencies={};delete p.scripts;fs.writeFileSync('package.json',JSON.stringify(p,null,2));" \
  && npm prune --omit=dev --ignore-scripts \
  && rm -rf dist/.vite dist/client/.vite

FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
# XDG_CONFIG_HOME below is not cosmetic. Wrangler creates
# `$XDG_CONFIG_HOME/.wrangler` on startup, defaulting to the user's home, and under
# the `read_only: true` that docker-compose.yml ships that fails with
# `ENOENT: ... mkdir '/home/node/.config/.wrangler'` and the container crash-loops.
# /tmp is the one writable path the compose file guarantees.
ENV NODE_ENV=production \
    PORT=8796 \
    CI=true \
    WRANGLER_SEND_METRICS=false \
    WRANGLER_WRITE_LOGS=false \
    WRANGLER_LOG_PATH=/tmp/wrangler-logs \
    MINIFLARE_REGISTRY_PATH=/tmp/miniflare-registry \
    XDG_CONFIG_HOME=/tmp/xdg \
    CLOUDFLARE_CF_FETCH_ENABLED=false \
    X_LOCAL_EXPLORER=false \
    X_LOCAL_OBSERVABILITY=false

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist/client ./dist/client
COPY --from=build /app/dist/server ./dist/server
COPY LICENSE THIRD_PARTY_NOTICES.md ./
COPY docker/start.sh /usr/local/bin/opentools-start
# Read by start.sh when a gate variable is set. Without it in the runtime image a
# gated container would fall back to serving every page unauthenticated.
COPY docker/runtime-config.mjs ./docker/runtime-config.mjs

# `/var/lib/opentools` is the path `docker-compose.yml` mounts a named volume onto.
# Docker copies an image directory's contents AND its ownership into a fresh
# volume, so creating it here as `node` is what makes that volume writable by uid
# 1000. Without it the container ran as `node` against a root-owned volume and died
# on `EACCES: permission denied, mkdir '/var/lib/opentools/v3'`.
#
# Nothing needs to write under /app any more — `docker/start.sh` puts the config it
# starts from in /tmp, and Wrangler's temporary bundle follows it there — so the
# old `chown -R node:node /app/dist/server` is gone with it.
RUN chmod 0755 /usr/local/bin/opentools-start \
  && mkdir -p /var/lib/opentools \
  && chown node:node /var/lib/opentools

USER node
EXPOSE 8796
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8796)+'/robots.txt').then(r=>process.exit(r.ok||r.status===401?0:1),()=>process.exit(1))"

CMD ["opentools-start"]
