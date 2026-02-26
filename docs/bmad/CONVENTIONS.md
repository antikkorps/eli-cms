# Eli CMS — Conventions & Standards

## File Naming
- **Files**: `kebab-case.ts` (e.g., `content-type.service.ts`)
- **Classes**: `PascalCase` (e.g., `ContentTypeService`)
- **Functions/vars**: `camelCase` (e.g., `buildContentDataSchema`)
- **Constants**: `UPPER_SNAKE_CASE` for env-derived values only
- **DB columns**: `snake_case` (e.g., `content_type_id`)

## Project Structure Pattern
```
feature/
├── service.ts        # Business logic
├── controller.ts     # HTTP layer (validate + delegate)
└── route.ts          # Route definitions
```

## Import Rules
- Use `.js` extension for all local ESM imports
- Use `import type { ... }` for type-only imports (enforced by ESLint)
- Barrel exports (`index.ts`) for each module directory

## API Response Format
All endpoints return:
```ts
{
  success: boolean;
  data?: T;
  error?: string;
  meta?: { page?: number; limit?: number; total?: number };
}
```

## Error Handling
- Throw `AppError(statusCode, message)` for expected errors
- Global `errorHandler` middleware catches and formats all errors
- Never leak stack traces or internal details to the client

## Validation
- **Input**: Zod `.safeParse()` in controllers — never trust client data
- **Environment**: Zod validation at startup (`config/environment.ts`)
- **Content data**: Dynamic Zod schema from `buildContentDataSchema()`

## Authentication & Authorization
- `authenticate` middleware: Verifies JWT, sets `ctx.state.user`
- `requireRole(...roles)` middleware: Checks user role
- Public routes: `/health`, `/api/auth/login`, `/api/auth/register`, `/api/auth/refresh`
- Protected routes: Everything else

## Database
- Drizzle ORM for type-safe queries
- Migrations via `drizzle-kit generate` + `drizzle-kit migrate`
- JSONB for dynamic fields — validated at app layer, not DB layer
- UUIDs for all primary keys
- Timestamps with timezone on all tables

## Git
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- Pre-commit: lint-staged (ESLint + Prettier)
- Never commit `.env` — use `.env.example` as template

## DRY Principles
- Types defined in `packages/shared`, consumed by both API and Web
- Zod schemas in shared — single source of truth for validation
- `buildContentDataSchema` eliminates per-type validation code
