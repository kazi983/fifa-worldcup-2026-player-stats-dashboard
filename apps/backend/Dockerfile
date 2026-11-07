# Build context: repository root (npm workspaces share one lockfile)

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000

# npm ci checks the lockfile against every workspace, so all manifests are copied.
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
# --ignore-scripts: skip the root `prepare: husky` hook (no git in the image)
RUN npm ci --ignore-scripts --omit=dev -w @player-stats-dashboard/backend

COPY apps/backend/src apps/backend/src
USER node
EXPOSE 3000
# Node 24 runs .ts files directly (type stripping), same as `npm run dev`
CMD ["node", "apps/backend/src/server.ts"]
