# Eli CMS — Architecture Document

## System Overview

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│  Nuxt 3 Web │────▶│  Koa API    │────▶│ PostgreSQL   │
│  (port 3000)│     │ (port 8080) │     │ (port 5432)  │
└─────────────┘     └─────────────┘     └──────────────┘
                           │
                    ┌──────┴──────┐
                    │   shared    │
                    │ (types+zod) │
                    └─────────────┘
```

## Monorepo Structure

- `apps/api` — Koa backend, Drizzle ORM, business logic
- `apps/web` — Nuxt 3 frontend (Phase 1: scaffold only)
- `packages/shared` — TypeScript types + Zod schemas shared between API and Web

## Design Principles

1. **DRY via shared package**: Types defined once, used everywhere
2. **Convention over configuration**: Consistent file naming, barrel exports, predictable paths
3. **Thin controllers**: Controllers validate input + call services. Business logic lives in services.
4. **Schema-driven validation**: Zod schemas are the single source of truth for data shapes
5. **Fail fast**: Environment variables validated at startup. Invalid requests rejected at the controller layer.

## Data Flow — Content Creation

```
Client POST /api/contents { contentTypeId, data }
  → authenticate middleware (JWT)
  → ContentController.create (Zod validates shape)
  → ContentService.create
    → Fetch ContentType from DB
    → buildContentDataSchema(fields) → dynamic Zod schema
    → Validate data against dynamic schema
    → INSERT into contents table
  → 201 { success: true, data: content }
```

## Database Design

- 3 tables: `users`, `content_types`, `contents`
- `content_types.fields` is JSONB holding `FieldDefinition[]`
- `contents.data` is JSONB holding the actual content, validated at the application layer
- Foreign key: `contents.content_type_id → content_types.id` (cascade delete)

## Security

- Passwords hashed with bcrypt (12 rounds)
- JWT access tokens (15min) + refresh tokens (7 days)
- Role-based access: admin can manage content types/users, editor can manage content
- CORS enabled via @koa/cors
- Input validation on every mutation endpoint via Zod

## Technology Decisions

| Decision   | Choice     | Rationale                                                     |
| ---------- | ---------- | ------------------------------------------------------------- |
| ORM        | Drizzle    | Type-safe, lightweight, SQL-first, great DX                   |
| Validation | Zod        | Runtime + compile-time, composable, dynamic schema generation |
| Framework  | Koa        | Minimal, middleware-centric, async/await native               |
| Frontend   | Nuxt 3     | Vue ecosystem, SSR/SSG, Nuxt UI for rapid admin UI            |
| DB         | PostgreSQL | JSONB support for dynamic fields, rock-solid, battle-tested   |
