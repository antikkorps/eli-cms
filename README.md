# Eli CMS

Headless CMS with dynamic Custom Post Types (CPT) stored as JSON — zero migration per new content type.

Built with **Koa.js + TypeScript**, **PostgreSQL** (Drizzle ORM), and **Nuxt 3** (coming soon).

## Key Concept

`buildContentDataSchema()` reads `FieldDefinition[]` from a content type and generates a Zod schema at runtime. Adding a new CPT = one INSERT, zero code, zero migration.

## Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9
- **Docker** & Docker Compose

## Quick Start (Development)

```bash
# 1. Install dependencies
pnpm install

# 2. Start Postgres + pgAdmin
pnpm docker:up

# 3. Copy env and adjust if needed
cp .env.example .env

# 4. Build shared package, run migrations, seed admin user
pnpm build:shared && pnpm db:migrate && pnpm db:seed

# 5. Start the API
pnpm dev:api
```

The API is now running at **http://localhost:8080**.

## Quick Start (Production — Docker)

```bash
# 1. Create your env file with required secrets
cp .env.prod.example .env.prod

# 2. Edit .env.prod with real values
# 3. Start everything
docker compose -f docker-compose.prod.yml --env-file .env.prod up --build
```

Postgres starts, migrations run, seed creates the default admin, and the API listens on port **8080**.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev:api` | Start API in dev mode (port 8080) |
| `pnpm dev:web` | Start Nuxt frontend (port 3000) |
| `pnpm build:shared` | Build the shared package |
| `pnpm build:api` | Build the API |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Apply database migrations |
| `pnpm db:seed` | Create default admin user |
| `pnpm docker:up` | Start Postgres + pgAdmin (dev) |
| `pnpm docker:down` | Stop dev containers |
| `pnpm test:api` | Run API tests |
| `pnpm lint` | Lint the codebase |
| `pnpm format` | Format with Prettier |

## Project Structure

```
eli-cms/
├── apps/
│   ├── api/             # Koa.js REST API
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── db/          # Schema, migrations, seed
│   │   │   ├── middleware/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   └── config/
│   │   └── drizzle/         # Generated SQL migrations
│   └── web/             # Nuxt 3 frontend (scaffold)
├── packages/
│   └── shared/          # Types, Zod schemas, shared utils
├── docker/
│   └── api/             # Dockerfile + entrypoint (prod)
├── docker-compose.yml          # Dev (Postgres + pgAdmin)
└── docker-compose.prod.yml     # Prod (Postgres + API)
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://eli:eli_secret@localhost:5432/eli_cms` | PostgreSQL connection string |
| `JWT_SECRET` | — | Secret for access tokens (min 10 chars) |
| `JWT_REFRESH_SECRET` | — | Secret for refresh tokens (min 10 chars) |
| `API_PORT` | `8080` | API listening port |
| `CORS_ORIGINS` | `*` | Allowed origins (comma-separated, or `*` for all) |

See `.env.example` for a complete template.

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | — | Register a new user |
| `POST` | `/api/auth/login` | — | Login, get tokens |
| `POST` | `/api/auth/refresh` | — | Refresh access token |
| `GET` | `/api/auth/me` | JWT | Current user info |
| `GET` | `/api/content-types` | JWT | List content types |
| `GET` | `/api/content-types/:id` | JWT | Get content type |
| `POST` | `/api/content-types` | Admin | Create content type |
| `PUT` | `/api/content-types/:id` | Admin | Update content type |
| `DELETE` | `/api/content-types/:id` | Admin | Delete content type |
| `GET` | `/api/contents` | JWT | List contents |
| `GET` | `/api/contents/:id` | JWT | Get content |
| `POST` | `/api/contents` | JWT | Create content |
| `PUT` | `/api/contents/:id` | JWT | Update content |
| `DELETE` | `/api/contents/:id` | JWT | Delete content |
| `GET` | `/api/users` | Admin | List users |
| `GET` | `/api/users/:id` | Admin | Get user |
| `DELETE` | `/api/users/:id` | Admin | Delete user |
| `GET` | `/health` | — | Health check |

### Public API (no auth, read-only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/public/content-types` | List content types (pagination, search) |
| `GET` | `/api/public/content-types/:slug` | Get content type by slug |
| `GET` | `/api/public/contents` | List published contents (pagination, sort) |
| `GET` | `/api/public/contents/:id` | Get published content by ID |
| `GET` | `/api/public/contents/by-type/:slug` | List published contents by content type slug |

Public endpoints only return `published` contents. Rate limited to 100 req/min per IP.

All list endpoints support **pagination** (`?page=&limit=`), **filtering** (`?filter[field]=value`), and **sorting** (`?sort=field&order=asc|desc`).

## Default Credentials

| Email | Password | Role |
|-------|----------|------|
| `admin@eli-cms.local` | `admin123` | admin |
