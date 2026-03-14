# ADR-001: Dynamic Content Types via JSONB

## Status

Accepted

## Context

We need a CMS that supports arbitrary content types without code changes or database migrations.

## Decision

Store content type field definitions as JSONB (`FieldDefinition[]`) in the `content_types` table. Validate content data at runtime using dynamically generated Zod schemas (`buildContentDataSchema`).

## Consequences

### Positive

- Adding a content type = one API call (INSERT)
- Zero deployment, zero migration
- Full type safety maintained via runtime Zod validation
- Fields can be introspected for UI generation (Phase 2)

### Negative

- No database-level constraints on content data (validation is app-level only)
- JSONB queries are slower than native columns for filtering
- Schema evolution of existing content types needs careful handling (not in Phase 1)

## Alternatives Considered

- **EAV (Entity-Attribute-Value)**: Too many JOINs, poor DX
- **Code-generated migrations**: Requires deployment per type, defeats the purpose
- **Separate table per content type**: Requires DDL at runtime, dangerous
