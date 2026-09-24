# syntax=docker/dockerfile:1
# Multi-stage build สำหรับ catalog-service (port 43117)
# Build จาก root ของ monorepo เพราะต้องใช้ lockfile:
#   docker build -f apps/catalog-service/Dockerfile -t catalog-service .

FROM node:24-alpine AS base
RUN npm install -g pnpm@11.9.0
WORKDIR /app

# ---- deps: install workspace dependencies using the lockfile ----
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/catalog-service/package.json apps/catalog-service/
COPY apps/availability-service/package.json apps/availability-service/
RUN pnpm install --frozen-lockfile

# ---- build: compile catalog-service ----
FROM base AS build
COPY --from=deps /app ./
COPY apps/catalog-service apps/catalog-service
RUN pnpm --filter catalog-service... build

# ---- bundle: pruned, production-only deployable output ----
FROM base AS bundle
COPY --from=build /app ./
RUN pnpm --filter catalog-service deploy --prod /out

# ---- runtime: minimal, non-root ----
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=bundle --chown=app:app /out ./
USER app
EXPOSE 43117
CMD ["node", "dist/main.js"]
