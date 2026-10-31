# English City Simulator API – Cloud Run image.
# Build from the repository root:  docker build -f apps/api/Dockerfile -t ecs-api .

ARG NODE_IMAGE=node:22-slim

# ---- build stage: bundle the API (+ shared package + mission content) ----
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace @ecs/api --include-workspace-root=false --ignore-scripts --no-audit --no-fund
COPY packages/shared packages/shared
COPY content content
COPY apps/api apps/api
RUN npm run build --workspace @ecs/api

# ---- runtime stage: production dependencies only ----
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --omit=dev --workspace @ecs/api --include-workspace-root=false --ignore-scripts --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/apps/api/dist apps/api/dist
WORKDIR /app/apps/api
USER node
ENV PORT=8080
EXPOSE 8080
CMD ["node", "dist/server.js"]
