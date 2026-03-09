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
- [x] Fix trash count badge not updating reactively in sidebar after delete/restore
- [x] Image lightbox preview (click thumbnail to enlarge) on uploads and contents list pages

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
- [x] Password reset flow (forgot password → email link → reset form, SMTP config with password/OAuth2/none auth)
- [x] Content duplication endpoint (`POST /contents/:id/duplicate`)
- [x] Repeatable fields / arrays (lists of structured sub-objects — FAQ items, feature lists, gallery)
- [x] Default values for fields (add `default` to FieldDefinition + schema builder + field builder UI)
- [x] Singleton content types (`isSingleton` column, enforce single entry 409, auto-redirect in contents list, sidebar icon)
- [x] Client-side form validation (reuse shared Zod schemas, show field-level errors instead of generic toasts)
- [~] HTTP caching on public API (Cache-Control + ETag on `/uploads/:id/serve` — remaining: content endpoints)
- [x] Brute-force login protection (progressive delays or lockout after N failed attempts)
- [ ] Background job queue — replace `setInterval` scheduler with BullMQ/Redis
- [x] Structured logging — replace `console.log` with pino (JSON, request IDs)
- [x] Advanced form validation (min/max length, regex patterns, unique constraints per field)
- [x] Content type field groups / tabs (organize fields into sections for complex content types)
- [x] Search result highlighting
- [x] Image crop/resize before upload (server-side Sharp transforms + client-side crop modal with vue-advanced-cropper, aspect ratio presets)
- [x] i18n labels in FieldBuilder (translate field type names)
- [x] Configurable slug patterns (e.g. `{year}/{slug}`, `{category}/{slug}`) — preset picker for non-technical users
- [x] Drag-and-drop field reordering in FieldBuilder
- [x] Rich text image insertion (insert images from media library into TipTap editor via toolbar button)
- [x] Sidebar quick actions (New content + Upload file entries at top of collapsible sections)
- [x] Version diff HTML rendering (richtext fields rendered as formatted HTML instead of raw markup)

## High Priority — User Management & Onboarding

- [ ] Full user CRUD — `POST /users` (create), `PUT /users/:id` (edit email/role), `users:create` + `users:update` permissions
- [ ] Server-side self-delete/self-demote guard (prevent super-admin from deleting or downgrading themselves)
- [ ] Admin user management UI (create user form, inline role editing, improved users page)
- [ ] New "manager" system role — can manage users + roles:read, content + uploads access, ideal for team leads
- [ ] Seed "Company Identity" component (company_name, logo, tagline, description, email, phone, address, social_links repeatable)
- [ ] Seed "Site Settings" singleton content type using Company Identity component — ready-to-use header/footer data
- [ ] Onboarding wizard — post-setup flow: "What kind of site?" (Blog, Corporate, Portfolio, E-commerce) → pre-seed content types, components, and demo content

## High Priority — Quality & Security

- [ ] Frontend test suite — setup Vitest + Vue Test Utils, cover critical composables and components
- [ ] Backend service unit tests — ContentService, UploadService, WebhookService (currently only controller-level tests)
- [ ] CSRF protection — add CSRF token middleware for cookie-based auth
- [ ] Error boundary — add `error.vue` layout to catch unhandled errors gracefully
- [ ] `process.on('unhandledRejection')` handler in API entrypoint
- [ ] Rate limit forgot-password endpoint (5 req/hour per email)
- [ ] CI/CD pipeline — GitHub Actions for lint + test + build on PR
- [ ] Deployment guide (`DEPLOYMENT.md` — Railway, Vercel, self-hosted examples)

## Medium Priority — Features

- [ ] Multilingual content (per-locale fields, locale switcher in content form, default locale config)
- [ ] Autosave drafts (periodic save while editing, every 30s if changes detected)
- [ ] Content calendar view (visual calendar of scheduled/published content)
- [ ] Per-content-type permissions (scope editor access to specific content types)
- [ ] Webhook test delivery (`POST /webhooks/:id/test` — verify endpoint before going live)
- [ ] Webhook delivery retry UI (manual retry button, delivery log detail view)
- [ ] Dashboard charts (content created over time, storage usage, API usage)
- [ ] Content type templates (blog, page, product — one-click presets)
- [ ] Two-factor authentication (TOTP / authenticator app)
- [ ] User invitation system (invite by email, set initial role)

## Low Priority

- [x] Component / block system (reusable field groups embeddable in any content type — hero, CTA, testimonials, icon picker, seed defaults, sidebar reorganization)
- [ ] JSON/object field type (arbitrary nested JSON with optional schema validation)
- [x] Dark mode polish (ensure all custom components respect dark theme)
- [ ] OpenAPI spec completion (add paths/endpoints, currently only schemas defined)
- [ ] E2E tests (Playwright or Cypress)
- [ ] Pre-signed URLs for S3 direct uploads
- [ ] Live preview / iframe preview (preview content as rendered on the frontend before publishing)
- [ ] Custom dashboard widgets (configurable per user)
- [ ] API playground (in-app sandbox to test API calls, beyond Scalar docs)
- [ ] Batch import from other CMS (WordPress, Strapi JSON export)
- [ ] Accessibility audit — add aria-label/aria-describedby to all custom form components
- [ ] Database indexes — GIN index on `contents.data` JSONB, trigram index on `media.original_name`

## Nice to Have

- [ ] SDK client (`@eli-cms/client`) — typed wrapper around the public API for easy integration in any JS framework
- [ ] Plugin system (hooks to extend content lifecycle, custom field types, installable extensions)
- [ ] Single Sign-On (SSO) — SAML / OIDC integration
- [ ] Content tree / nested pages (hierarchical content with parent-child relationships in navigation)
- [ ] Real-time collaboration (presence indicators, live cursors in rich text)
- [ ] Admin UI theming (custom logo, colors, branding)
- [ ] Auto-generated TypeScript types from content models (like Contentful's codegen)
- [ ] Multi-database support (MySQL, SQLite via Drizzle adapters)
