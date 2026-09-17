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
ENV NODE_ENV=production \
    PORT=8796 \
    CI=true \
    WRANGLER_SEND_METRICS=false \
    WRANGLER_WRITE_LOGS=false \
    WRANGLER_LOG_PATH=/tmp/wrangler-logs \
    MINIFLARE_REGISTRY_PATH=/tmp/miniflare-registry \
    CLOUDFLARE_CF_FETCH_ENABLED=false \
    X_LOCAL_EXPLORER=false \
    X_LOCAL_OBSERVABILITY=false

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist/client ./dist/client
COPY --from=build /app/dist/server ./dist/server
COPY LICENSE THIRD_PARTY_NOTICES.md ./
COPY docker/start.sh /usr/local/bin/opentools-start

# Wrangler writes a temporary bundle next to the config file.
RUN chmod 0755 /usr/local/bin/opentools-start \
  && chown -R node:node /app/dist/server

USER node
EXPOSE 8796
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8796)+'/robots.txt').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

CMD ["opentools-start"]
