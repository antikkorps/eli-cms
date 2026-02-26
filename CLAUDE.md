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

## Database (3 tables)
- `users`: id (uuid), email, password (bcrypt), role, timestamps
- `content_types`: id, slug (unique), name, fields (jsonb), timestamps
- `contents`: id, content_type_id (FK), status (draft|published), data (jsonb), timestamps

## Commands
```bash
pnpm docker:up          # Start Postgres + pgAdmin
pnpm docker:down        # Stop containers
pnpm db:generate        # Generate Drizzle migrations
pnpm db:migrate         # Apply migrations
pnpm db:seed            # Create default admin (admin@eli-cms.local / admin123)
pnpm dev:api            # API on :8080
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
1. `POST /api/content-types` with `{ slug, name, fields: FieldDefinition[] }`
2. `POST /api/contents` with `{ contentTypeId, data: {...} }` — validated dynamically
