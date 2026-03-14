# ---- Stage 1: Build ----
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config + lockfile first (cache layer)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared/ packages/shared/
COPY apps/api/ apps/api/

# Build shared then API
RUN pnpm build:shared && pnpm build:api

# ---- Stage 2: Runtime ----
FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apk add --no-cache postgresql-client

WORKDIR /app

# Copy everything needed at runtime:
# - node_modules (includes tsx, drizzle-kit for migrate/seed)
# - built dist
# - drizzle migrations
# - package.json / workspace config (for pnpm scripts)
# - source seed script (tsx runs it from source)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/apps/api/package.json apps/api/
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/apps/api/drizzle apps/api/drizzle
COPY --from=builder /app/apps/api/drizzle.config.ts apps/api/
COPY --from=builder /app/apps/api/src/db apps/api/src/db
COPY --from=builder /app/apps/api/src/config apps/api/src/config
COPY --from=builder /app/apps/api/tsconfig.json apps/api/
COPY --from=builder /app/tsconfig.base.json ./
COPY --from=builder /app/apps/api/node_modules apps/api/node_modules
COPY --from=builder /app/packages/shared/package.json packages/shared/
COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/packages/shared/node_modules packages/shared/node_modules

# Copy entrypoint
COPY docker/api/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]
