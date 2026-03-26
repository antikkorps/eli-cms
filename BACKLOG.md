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
- [x] HTTP caching on public API (Cache-Control + ETag on all public endpoints — schema/content-types 24h, contents 1h, preview bypasses cache)
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

- [x] Full user CRUD — `POST /users` (create), `PUT /users/:id` (edit email/role/name), `users:create` + `users:update` permissions, firstName/lastName fields
- [x] Server-side self-delete/self-demote guard (prevent deleting own account, prevent changing own role)
- [x] Admin user management UI (create/edit user pages, role assignment, optional password reset, name display in list/sidebar/profile)
- [x] New "manager" system role — users CRUD, content, uploads, roles:read, audit logs
- [x] Seed "Company Identity" component (company_name, logo, tagline, description, email, phone, address, social_links repeatable)
- [x] Seed "Site Settings" singleton content type using Company Identity component — ready-to-use header/footer data
- [x] Onboarding wizard — 4-step post-setup flow (template picker, site info, options, summary), 4 templates (blog/corporate/portfolio/e-commerce), demo content, extra components (testimonial/FAQ/feature grid/gallery), relaunch from settings

## High Priority — Quality & Security

- [x] Frontend test suite — setup Vitest + Vue Test Utils, cover critical composables and components
- [x] Backend service unit tests — ContentService, UploadService, WebhookService (currently only controller-level tests)
- [x] CSRF protection — double-submit cookie pattern for cookie-based auth, `X-CSRF-Token` header
- [x] Error boundary — `error.vue` with custom 404, catch-all admin route, dark mode + i18n support
- [x] `process.on('unhandledRejection')` + `uncaughtException` handlers in API entrypoint — graceful shutdown with pino fatal logging
- [x] Rate limit forgot-password endpoint (5 req/hour per IP) — dedicated `forgotPasswordRateLimit`
- [x] CORS default hardened — changed from `*` to `http://localhost:3000`
- [x] CI/CD pipeline — GitHub Actions for lint + test + build on PR
- [ ] Deployment guide (`DEPLOYMENT.md` — Railway, Vercel, self-hosted examples)

## High Priority — Audit Fixes (March 2026)

- [x] Fix XSS in `VersionDiff.vue` — sanitize HTML with DOMPurify before `v-html` rendering (lines 64, 73, 82)
- [x] Batch media/author validation — replace N+1 `findById()` loops with `inArray()` batch query (`content.service.ts:268-275, 313-319`)
- [x] Fix `User` type — add `firstName`, `lastName` to shared `User` interface (`packages/shared/src/types/index.ts`)
- [~] Add missing permission constants — already covered: settings uses `SETTINGS_READ`/`SETTINGS_UPDATE`, media-folders reuses `UPLOADS_*`
- [x] Fix TOCTOU race condition — move `validateUniqueFields` inside transaction or add DB-level unique constraint (`content.service.ts:345-375`)
- [x] Dedicated API key salt — stop reusing `JWT_SECRET` as scrypt salt, add `API_KEY_SALT` env var (`api-key.service.ts:15`)

## Medium Priority — Audit Fixes (March 2026)

- [x] Fix debounce memory leaks — add `onBeforeUnmount` cleanup in `AuthorPicker`, `ContentPicker`, `MediaPicker`, `EditorImageButton`
- [x] Invalidate setup middleware cache — `resetSetupCheck()` called after setup completion
- [x] Replace `innerHTML` in `stripHtml()` with `DOMParser` (`contents/index.vue:139`)
- [x] Add composite DB index `(content_type_id, status, deleted_at)` on contents table
- [x] Escape LIKE wildcards in JSONB filter (`content.service.ts:184`)
- [x] Increase `JWT_SECRET` min length from 10 to 32 (`environment.ts:6`)
- [x] Enforce `editedBy` on content creation — set from actor.id
- [x] Add vitest coverage reporting config (`vitest.config.ts` in api + web)
- [x] Document all env vars in `.env.example` (`FRONTEND_URL`, SMTP vars, `NODE_ENV`, `CORS_ORIGINS`)
- [x] Add ReDoS protection — limit regex pattern complexity in field validation schemas
- [x] Cache component definitions within request scope during content create/update

## Medium Priority — DevOps Audit Fixes

- [x] Docker prod: add API healthcheck (`docker-compose.prod.yml`)
- [x] Docker prod: add web container for unified deployment (`docker-compose.prod.yml`)
- [x] Make `entrypoint.sh` resilient — exit on migration failure, don't seed if migrate fails
- [x] Remove unused `apps/web/package.json` copy from API Dockerfile

## High Priority — Developer Experience

- [x] SDK Client (`@eli-cms/client`) — typed JS/TS wrapper around the public API with caching, retry, pagination helpers. Package in `packages/client/`, works in Node + browser + any framework.
- [x] TypeScript Codegen — CLI `eli codegen` reads content types via API (`GET /api/v1/public/schema`), generates TS interfaces per content type. Output: `eli-cms.d.ts`. New schema export endpoint + CLI in `packages/cli/`.
- [x] MCP Server (`packages/mcp/`) — Model Context Protocol server exposing Eli CMS as tools for LLMs (Claude, Cursor, Copilot).
- [x] Autosave drafts (periodic save while editing, every 30s if changes detected, visual indicator)

## Medium Priority — Features

- [ ] Multilingual content (per-locale fields, locale switcher in content form, default locale config)
- [x] Content calendar view (visual calendar of scheduled/published content)
- [x] Per-content-type permissions (scope editor access to specific content types)
- [x] Webhook test delivery (`POST /webhooks/:id/test` — verify endpoint before going live)
- [x] Webhook delivery retry UI (manual retry button, delivery log detail view, status filter, payload modal)
- [x] Dashboard charts (content created over time, storage usage, API usage)
- [ ] Content type templates (blog, page, product — one-click presets)
- [ ] Two-factor authentication (TOTP / authenticator app)
- [ ] User invitation system (invite by email, set initial role)

## Medium Priority — Editorial & Collaboration

- [x] Content comments/notes (internal discussion thread per content — feedback between editors/reviewers, not exposed in public API)
- [x] In-app notification center (real-time notifications on workflow transitions — content submitted for review, approved, commented — bell icon in navbar)
- [ ] Shareable preview links (signed temporary URL to preview unpublished content — share with clients/external reviewers without admin access)
- [ ] SEO toolkit (auto-generated meta title/description/OG image fields per content type, XML sitemap endpoint, Google snippet preview)
- [ ] Saved filters/views (save filter+sort combinations as named views, per-user, quick access from sidebar or dropdown)
- [ ] Bulk edit (edit a single field across multiple contents at once — e.g. change category on 20 articles)
- [x] Content pinning/featuring (boolean `featured` flag, queryable in public API, toggle in contents list)

## Medium Priority — AI

- [ ] AI content assistant (generate/rewrite/translate text via Claude API from rich text editor toolbar button)
- [ ] Media AI (auto-generate alt text and auto-tag images via vision model on upload)

## Medium Priority — Infrastructure

- [ ] Multi-environment (staging/production content environments with promotion workflow between them)
- [ ] Backup & restore (full database export/import from admin UI — JSON dump, scheduled backups)
- [ ] API usage dashboard (metrics per API key — requests/day, latency, top endpoints, quota visualization)
- [ ] Field-level permissions (hide or make read-only specific fields based on user role, not just content-type level)

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
- [ ] Accessibility audit — add aria-label/aria-describedby to all custom form components, fix color contrast on search highlights, keyboard nav for modals/drag-drop
- [ ] Database indexes — GIN index on `contents.data` JSONB, trigram index on `media.original_name`, composite index `(content_type_id, status, deleted_at)`

## Nice to Have

- [ ] Plugin system (hooks to extend content lifecycle, custom field types, installable extensions)
- [ ] Single Sign-On (SSO) — SAML / OIDC integration
- [ ] Content tree / nested pages (hierarchical content with parent-child relationships in navigation)
- [ ] Real-time collaboration (presence indicators, live cursors in rich text)
- [ ] Admin UI theming (custom logo, colors, branding)
- [ ] Multi-database support (MySQL, SQLite via Drizzle adapters)
