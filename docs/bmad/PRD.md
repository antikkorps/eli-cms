# Eli CMS — Product Requirements Document

## Vision

A modern, developer-friendly headless CMS that eliminates the WordPress pain points: no plugin hell, no migration headaches, no monolithic architecture. Content types are defined as JSON — adding a new type is an API call, not a deployment.

## Problem Statement

Traditional CMSs require code changes and database migrations for every new content type. This slows iteration, increases deployment risk, and couples content modeling to release cycles.

## Solution

Dynamic Custom Post Types (CPT) stored as JSON field definitions in PostgreSQL. A runtime Zod schema generator (`buildContentDataSchema`) validates content data against the type definition — zero code, zero migration.

## Target Users

- **Developers**: Building content-driven apps/sites who want API-first content management
- **Content teams**: Non-technical users managing structured content via an admin UI (Phase 2+)

## Core Features — Phase 1

1. **Authentication**: JWT-based with access/refresh tokens, role-based (admin/editor)
2. **Content Type Management**: CRUD for content types with JSON field definitions (admin only)
3. **Content Management**: CRUD for content entries with dynamic validation
4. **API-first**: RESTful API, consistent JSON responses

## Non-Goals (Phase 1)

- Admin UI (Nuxt scaffold only)
- Media/file uploads
- Content versioning
- Webhooks/events
- Multi-tenancy
- Search/full-text indexing

## Success Metrics

- API response time < 100ms (p95) for CRUD operations
- Zero downtime when adding new content types
- Type-safe end-to-end (TypeScript + Zod validation)

## Phases

| Phase | Scope                                                  |
| ----- | ------------------------------------------------------ |
| 1     | API + Auth + Dynamic CPT + Nuxt scaffold               |
| 2     | Admin UI (Nuxt) — content type builder, content editor |
| 3     | Media uploads, content versioning, webhooks            |
| 4     | Search, permissions granulaires, multi-tenancy         |
