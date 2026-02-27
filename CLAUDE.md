# Eli CMS — Project Instructions

## Overview
Eli CMS is a headless CMS with dynamic Custom Post Types (CPT) stored as JSON — zero migration per new content type. Monorepo with pnpm workspaces.

## Architecture
- **Monorepo**: pnpm workspaces (`apps/api`, `apps/web`, `packages/shared`)
- **Backend**: Koa.js + TypeScript (port 8080)
- **Frontend**: Nuxt 3 + Nuxt UI (port 3000) — setup page + global middleware
- **Database**: PostgreSQL 16 via Docker, Drizzle ORM
- **Auth**: JWT (access 15min, refresh 7d), granular permissions via roles
- **Permissions**: `resource:action` pattern (e.g. `content:create`, `users:manage`), checked by `requirePermission()` middleware
- **Validation**: Zod — dynamic schemas via `buildContentDataSchema()`
- **Webhooks**: Event-driven (Node EventEmitter) → HTTP POST with HMAC-SHA256 signature, retry with exponential backoff

## Key Innovation
`buildContentDataSchema()` in `packages/shared/src/schemas/index.ts` reads `FieldDefinition[]` from a content type and generates a Zod schema at runtime. Adding a new CPT = one INSERT, zero code, zero migration.

## Database (10 tables)
- `roles`: id (uuid), name, slug (unique), description, permissions (jsonb string[]), is_system (bool), timestamps
- `users`: id (uuid), email, password (bcrypt), role_id (FK→roles), timestamps
- `content_types`: id, slug (unique), name, fields (jsonb), timestamps
- `contents`: id, content_type_id (FK), status (draft|published), data (jsonb), search_vector (tsvector), timestamps
- `refresh_tokens`: id, user_id (FK), token_hash, family, expires_at, revoked_at, timestamps
- `content_relations`: id, source_id (FK→contents), target_id (FK→contents), relation_type (reference|parent|related), created_at — unique(source, target, type)
- `content_versions`: id, content_id (FK→contents), version_number, data (jsonb), status, edited_by (FK→users), created_at — unique(content, version_number), max 20 per content
- `media`: id, filename, original_name, mime_type, size, storage_key, storage_type (local|s3), created_by (FK), created_at
- `settings`: key (PK), value (jsonb), updated_at
- `webhooks`: id, name, url, secret, events (jsonb), is_active, created_by (FK), timestamps
- `webhook_deliveries`: id, webhook_id (FK cascade), event, payload (jsonb), status (pending|success|failed), response_status, attempts, next_retry_at, created_at

## API Routes (all under `/api/v1/`)
- **Setup** (2): status, initialize — public, no auth (guarded: fails if users exist)
- **Auth** (7): register, login, refresh, logout, logout-all, change-password, me
- **Roles** (5): CRUD + list — `roles:read` / `roles:manage`
- **Users** (3): list, get, delete — `users:read` / `users:manage`
- **Content Types** (5): CRUD + list — `content-types:read` / `content-types:manage`
- **Contents** (5): CRUD + list — `content:create/read/update/delete`
- **Relations** (3): create, list, delete — `content:read` / `content:update`
- **Versions** (3): list, get, restore — `content:read` / `content:update`
- **Uploads** (5): upload (rate limited, MIME validated), list, get, serve, delete — `uploads:create/read/delete`
- **Settings** (2): get/update storage config — `settings:manage`
- **Webhooks** (6): CRUD + list + deliveries — `webhooks:manage`
- **Public** (5): read-only published contents — rate limited
- **Docs**: `/api/v1/docs` — Scalar UI, disabled in production (`NODE_ENV=production`)

## Permissions System
Permission constants in `packages/shared/src/constants/permissions.ts`. Format: `resource:action`.
Default system roles:
- **super-admin**: all permissions
- **editor**: content CRUD + content-types:read + uploads create/read

## Commands
```bash
pnpm docker:up          # Start Postgres + pgAdmin
pnpm docker:down        # Stop containers
pnpm db:generate        # Generate Drizzle migrations
pnpm db:migrate         # Apply migrations
pnpm db:seed            # Create default roles + admin (admin@eli-cms.local / admin123)
pnpm dev:api            # API on :8080 (auto-builds shared)
pnpm dev:web            # Nuxt on :3000
pnpm build:shared       # Build shared package (must run before API if types changed)
```

## Conventions
- **DRY**: All shared types and Zod schemas live in `packages/shared`
- **Barrel exports**: Each module folder has an `index.ts` re-exporting
- **Naming**: kebab-case files, PascalCase classes, camelCase functions/vars
- **Imports**: Use `.js` extension for local ESM imports
- **Error handling**: Throw `AppError(statusCode, message)` — caught by error-handler middleware
- **Route protection**: `authenticate` middleware for JWT, `requirePermission('resource:action')` for permission checks
- **API responses**: Always `{ success: boolean, data?, error?, meta? }` (ApiResponse type)

## Code Style
- ESLint flat config + Prettier
- Consistent type imports (`import type { ... }`)
- Strict TypeScript

## Testing a new CPT
1. `POST /api/v1/content-types` with `{ slug, name, fields: FieldDefinition[] }`
2. `POST /api/v1/contents` with `{ contentTypeId, data: {...} }` — validated dynamically
