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

## Pre-Commit Checks

Before every commit:

1. Run `npx prettier --write` on all changed files
2. Run the full test suite (`pnpm --filter @eli-cms/api test`) — fix any failures before committing
3. Run `git status` to verify all modified/created files are staged

## Git Workflow

When implementing a feature across multiple files, ensure ALL modified/created files are staged and committed. Run `git status` before every commit to verify nothing is missing.

## Database

Always run database migrations after creating them. Check that `pnpm db:migrate` succeeds before moving on. Ensure drizzle config loads .env properly.

## Code Style & Approach

When fixing issues (especially security/CodeQL), prefer well-established patterns (whitelists, scrypt, built-in libraries) over clever custom solutions. Don't over-engineer — ask before building complex solutions for simple problems. This is a TypeScript monorepo (pnpm) with Nuxt frontend and a Node.js backend using Drizzle ORM and PostgreSQL. Always write TypeScript, not JavaScript. Respect existing project patterns.

## PR & Commit Guidelines

Do not add 'generated with Claude Code' or similar attribution to PRs, commits, or code comments unless explicitly asked.

# Token Optimization with GoTK

## Shell Commands

Always use gotk to execute shell commands that produce verbose output:

```bash
gotk grep -rn "pattern" .
gotk go test ./...
gotk git log --oneline -20
gotk find . -name "*.go"
gotk make build 2>&1
gotk docker build .
gotk npm test
gotk cargo build
```

Never run grep, find, git, go test, make, docker, npm, cargo, or other
verbose commands without the gotk prefix. This reduces token consumption
by ~80% while preserving all errors, warnings, and important information.

## Context Search

Prefer `gotk ctx` over grep for codebase search. It produces LLM-optimized
output (~15x fewer tokens than raw grep) with built-in exclusions
(node_modules, .git, vendor, lock files, binaries) and 5 output modes:

```bash
gotk ctx pattern                       # scan: file list + match counts
gotk ctx pattern -d 5                 # detail: context windows
gotk ctx pattern --def -t go          # def: function/type declarations
gotk ctx pattern --tree               # tree: structural skeleton
gotk ctx pattern --summary            # summary: directory breakdown
gotk ctx pattern -t go -m 10         # filter by type, limit results
```

Global flags like --stats go before the subcommand:
gotk --stats ctx pattern --summary

## When NOT to use gotk

- Simple commands with small output: `ls`, `pwd`, `cat small-file.txt`
- Commands where you need raw unfiltered output for debugging
- When explicitly told to bypass: `GOTK_PASSTHROUGH=1 command`

## Tuning

- Use `gotk --conservative cmd` when you need more detail
- Use `gotk --aggressive cmd` when you need maximum reduction
- Use `gotk --no-truncate cmd` when truncation removes needed context
