# ---- Stage 1: Build ----
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config + lockfile first (cache layer)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared/ packages/shared/
COPY apps/web/ apps/web/

# Build shared then web
ARG NUXT_PUBLIC_API_URL=http://localhost:8080
ENV NUXT_PUBLIC_API_URL=${NUXT_PUBLIC_API_URL}

RUN pnpm build:shared && pnpm build:web

# ---- Stage 2: Runtime ----
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/apps/web/.output .output

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
