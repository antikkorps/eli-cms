# Eli CMS — Backlog

## High Priority

- [x] Server-side validation of media UUIDs (verify the referenced media exists when saving content)
- [x] Multiple media field support (allow selecting more than one file per field)
- [x] MIME type filtering in MediaPicker (restrict by image/video/document per field config)
- [x] Media preview column in contents list pages
- [x] Drag-and-drop upload in MediaPicker and uploads page
- [x] Media field type dropdown in FieldBuilder (replace free-text input with a dropdown of accepted media types: image, video, document, etc.)
- [x] Webhook URL field UX (add placeholder, helper text, and tooltip explaining what URL to provide — the endpoint that will receive POST events)
- [x] API key permissions overflow (when many permissions are selected, badges overflow the container — use a wrapping grid or collapsible chip list instead)
- [x] Trash / soft delete with restore (deleted content goes to trash for 30 days before permanent removal)
- [x] Content locking (prevent simultaneous editing — show "being edited by X" banner, auto-lock with TTL)
- [x] Media folders / organization (allow grouping uploads into folders for better asset management)
- [x] Image transforms — resize, crop, WebP/AVIF conversion via Sharp (`GET /uploads/:id/serve?w=400&h=300&format=webp`), disk cache, ETag/304, AVIF upload support
- [x] Media rename (PATCH endpoint, inline rename UI with pencil button, `uploads:update` permission)
- [x] MediaPicker search (server-side search on filename, debounced input in picker modal)
- [x] Optimized thumbnails in frontend (MediaPicker + uploads page use `?w=…&format=webp` transforms)
- [x] Serve endpoint rate limiting (60 req/min/IP) + CORS PATCH support
- [x] Media metadata (alt text, caption, width, height — extract dimensions on upload via Sharp, edit UI)
- [x] Fix SQL injection in public JSONB filter (parameterized `fieldName` in `->>` operator)
- [x] Fix race condition in lock acquisition (`db.transaction()` + `SELECT … FOR UPDATE`)
- [x] Wrap content update in DB transaction (snapshot + update + lock release atomic)
- [x] Cap pagination limit in shared schemas (`.max(100)` on `paginationSchema.limit`)

## Medium Priority

- [x] Author/User field type (dropdown to select a user as author — new `author` field type in FieldBuilder, user picker in content form, API validation)
- [x] Rich text editor field type (WYSIWYG)
- [x] Public API improvements (preview mode, advanced filters, field selection, populate relations)
- [x] Auto-generate slug from name in content types and contents
- [x] Bulk actions on list pages (delete, publish, unpublish)
- [x] Content duplication (clone an existing content entry)
- [x] Column sorting on all list tables
- [x] Content scheduling (publish at a future date)
- [x] Editorial workflow (draft → review → approved → published)
- [x] Content export/import (JSON/CSV/XML)
- [x] Content types in sidebar (Strapi/Directus pattern — collapsible section, per-type navigation, badge counts)
- [x] Command palette with content type navigation (Cmd+K)
- [x] Keyboard shortcuts (Cmd+S save, Cmd+N new content, Cmd+K command palette)
- [x] User profile page (card-based layout, email/password change, DiceBear avatar picker with 12 styles + seed variations, persisted in DB)
- [ ] Password reset flow (forgot password → email link → reset form)
- [ ] Content duplication endpoint (`POST /contents/:id/duplicate`)
- [ ] Repeatable fields / arrays (lists of structured sub-objects — FAQ items, feature lists, gallery)
- [ ] Default values for fields (add `default` to FieldDefinition + schema builder + field builder UI)
- [x] Singleton content types (`isSingleton` column, enforce single entry 409, auto-redirect in contents list, sidebar icon)
- [ ] Client-side form validation (reuse shared Zod schemas, show field-level errors instead of generic toasts)
- [~] HTTP caching on public API (Cache-Control + ETag on `/uploads/:id/serve` — remaining: content endpoints)
- [x] Brute-force login protection (progressive delays or lockout after N failed attempts)
- [ ] Background job queue — replace `setInterval` scheduler with BullMQ/Redis
- [ ] Structured logging — replace `console.log` with pino (JSON, request IDs)
- [ ] Advanced form validation (min/max length, regex patterns, unique constraints per field)
- [ ] Content type field groups / tabs (organize fields into sections for complex content types)
- [ ] Search result highlighting
- [~] Image crop/resize before upload (server-side transforms done — remaining: client-side crop UI before upload)
- [ ] i18n labels in FieldBuilder (translate field type names)
- [ ] Configurable slug patterns (e.g. `{year}/{slug}`, `{category}/{slug}`)
- [ ] Drag-and-drop field reordering in FieldBuilder

## Low Priority

- [ ] Component / block system (reusable field groups embeddable in any content type — hero, CTA, testimonials)
- [ ] JSON/object field type (arbitrary nested JSON with optional schema validation)
- [ ] Dark mode polish (ensure all custom components respect dark theme)
- [ ] OpenAPI spec completion (add paths/endpoints, currently only schemas defined)
- [ ] E2E tests (Playwright or Cypress)
- [ ] Multilingual content (per-locale fields, locale switcher in content form)
- [ ] Dashboard charts (content created over time, storage usage, API usage)
- [ ] Webhook delivery retry UI (manual retry button, delivery log detail view)
- [ ] Webhook test delivery (`POST /webhooks/:id/test` — verify endpoint before going live)
- [ ] Pre-signed URLs for S3 direct uploads
- [ ] GraphQL API endpoint (alternative to REST for frontend devs)
- [ ] Live preview / iframe preview (preview content as rendered on the frontend before publishing)
- [ ] Two-factor authentication (TOTP / authenticator app)
- [ ] User invitation system (invite by email, set initial role)
- [ ] Content type templates (blog, page, product — one-click presets)
- [ ] Custom dashboard widgets (configurable per user)
- [ ] API playground (in-app sandbox to test API calls, beyond Scalar docs)
- [ ] Batch import from other CMS (WordPress, Strapi JSON export)
- [ ] Per-content-type permissions (scope editor access to specific content types)
- [ ] Content calendar view (visual calendar of scheduled/published content)
- [ ] Autosave drafts (periodic save while editing, every 30s if changes detected)

## Nice to Have

- [ ] SDK client (`@eli-cms/client`) — typed wrapper around the public API for easy integration in any JS framework
- [ ] Plugin system (hooks to extend content lifecycle, custom field types, installable extensions)
- [ ] Single Sign-On (SSO) — SAML / OIDC integration
- [ ] Content tree / nested pages (hierarchical content with parent-child relationships in navigation)
- [ ] Real-time collaboration (presence indicators, live cursors in rich text)
- [ ] Admin UI theming (custom logo, colors, branding)
- [ ] Auto-generated TypeScript types from content models (like Contentful's codegen)
