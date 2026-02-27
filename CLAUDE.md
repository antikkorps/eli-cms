# Eli CMS — Project Instructions

## Overview
Eli CMS is a headless CMS with dynamic Custom Post Types (CPT) stored as JSON — zero migration per new content type. Monorepo with pnpm workspaces.

## Architecture
- **Monorepo**: pnpm workspaces (`apps/api`, `apps/web`, `packages/shared`)
- **Backend**: Koa.js + TypeScript (port 8080)
- **Frontend**: Nuxt 3 + Nuxt UI (port 3000) — scaffold only in Phase 1
- **Database**: PostgreSQL 16 via Docker, Drizzle ORM
- **Auth**: JWT (access 15min, refresh 7d), roles: admin | editor
- **Validation**: Zod — dynamic schemas via `buildContentDataSchema()`

## Key Innovation
`buildContentDataSchema()` in `packages/shared/src/schemas/index.ts` reads `FieldDefinition[]` from a content type and generates a Zod schema at runtime. Adding a new CPT = one INSERT, zero code, zero migration.

## Database (7 tables)
- `users`: id (uuid), email, password (bcrypt), role, timestamps
- `content_types`: id, slug (unique), name, fields (jsonb), timestamps
- `contents`: id, content_type_id (FK), status (draft|published), data (jsonb), search_vector (tsvector), timestamps
- `refresh_tokens`: id, user_id (FK), token_hash, family, expires_at, revoked_at, timestamps
- `content_relations`: id, source_id (FK→contents), target_id (FK→contents), relation_type (reference|parent|related), created_at — unique(source, target, type)
- `content_versions`: id, content_id (FK→contents), version_number, data (jsonb), status, edited_by (FK→users), created_at — unique(content, version_number), max 20 per content
- `media`: id, filename, original_name, mime_type, size, storage_key, storage_type (local|s3), created_by (FK), created_at
- `settings`: key (PK), value (jsonb), updated_at

## API Routes (all under `/api/v1/`)
- **Auth** (7): register, login, refresh, logout, logout-all, change-password, me
- **Users** (3): list, get, delete — admin only
- **Content Types** (5): CRUD + list — admin for write
- **Contents** (5): CRUD + list — auto-versions on update
- **Relations** (3): create, list, delete — between contents (reference|parent|related)
- **Versions** (3): list, get, restore — automatic snapshots, max 20 per content
- **Uploads** (5): upload (rate limited, MIME validated), list, get, serve, delete
- **Settings** (2): get/update storage config — admin only
- **Public** (5): read-only published contents — rate limited
- **Docs**: `/api/v1/docs` — Scalar UI, disabled in production (`NODE_ENV=production`)

## Commands
```bash
pnpm docker:up          # Start Postgres + pgAdmin
pnpm docker:down        # Stop containers
pnpm db:generate        # Generate Drizzle migrations
pnpm db:migrate         # Apply migrations
pnpm db:seed            # Create default admin (admin@eli-cms.local / admin123)
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
- **Route protection**: `authenticate` middleware for JWT, `requireRole('admin')` for admin-only
- **API responses**: Always `{ success: boolean, data?, error?, meta? }` (ApiResponse type)

## Code Style
- ESLint flat config + Prettier
- Consistent type imports (`import type { ... }`)
- Strict TypeScript

## Testing a new CPT
1. `POST /api/v1/content-types` with `{ slug, name, fields: FieldDefinition[] }`
2. `POST /api/v1/contents` with `{ contentTypeId, data: {...} }` — validated dynamically
