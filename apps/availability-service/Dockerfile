# syntax=docker/dockerfile:1
# Multi-stage build สำหรับ availability-service (port 43118)
# Build จาก root ของ monorepo เพราะต้องใช้ lockfile:
#   docker build -f apps/availability-service/Dockerfile -t availability-service .

FROM node:24-alpine AS base
RUN npm install -g pnpm@11.9.0
WORKDIR /app

# ---- deps: install workspace dependencies using the lockfile ----
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/catalog-service/package.json apps/catalog-service/
COPY apps/availability-service/package.json apps/availability-service/
RUN pnpm install --frozen-lockfile

# ---- build: compile availability-service ----
FROM base AS build
COPY --from=deps /app ./
COPY apps/availability-service apps/availability-service
RUN pnpm --filter availability-service... build

# ---- bundle: pruned, production-only deployable output ----
FROM base AS bundle
COPY --from=build /app ./
RUN pnpm --filter availability-service deploy --prod /out

# ---- runtime: minimal, non-root ----
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=bundle --chown=app:app /out ./
USER app
EXPOSE 43118
CMD ["node", "dist/main.js"]
