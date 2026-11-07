# Build context: repository root (npm workspaces share one lockfile)

FROM node:24-slim AS build
WORKDIR /app

# Install dependencies first so this layer is cached until a manifest changes.
# npm ci checks the lockfile against every workspace, so all manifests are copied.
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
# --ignore-scripts: skip the root `prepare: husky` hook (no git in the image)
RUN npm ci --ignore-scripts -w @player-stats-dashboard/frontend

COPY apps/frontend apps/frontend
# Public hostname, baked into security.allowedDomains at build time
ARG SITE_HOST
ENV SITE_HOST=${SITE_HOST}
RUN npm run build -w @player-stats-dashboard/frontend

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/apps/frontend/package.json apps/frontend/
COPY --from=build /app/apps/frontend/dist apps/frontend/dist
USER node
EXPOSE 4321
CMD ["node", "apps/frontend/dist/server/entry.mjs"]
