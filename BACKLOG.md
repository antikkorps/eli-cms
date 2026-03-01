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
- [ ] Trash / soft delete with restore (deleted content goes to trash for 30 days before permanent removal)
- [ ] Content locking (prevent simultaneous editing — show "being edited by X" banner, auto-lock with TTL)
- [ ] Media folders / organization (allow grouping uploads into folders for better asset management)

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
- [ ] Search result highlighting
- [ ] User profile page (change email, password, avatar)
- [ ] Image crop/resize before upload
- [ ] i18n labels in FieldBuilder (translate field type names)
- [ ] Advanced form validation (min/max length, regex patterns, unique constraints per field)
- [ ] Content type field groups / tabs (organize fields into sections for complex content types)
- [ ] Configurable slug patterns (e.g. `{year}/{slug}`, `{category}/{slug}`)
- [ ] Drag-and-drop field reordering in FieldBuilder

## Low Priority

- [ ] Dark mode polish (ensure all custom components respect dark theme)
- [ ] OpenAPI spec generation from routes (auto-generate docs including dynamic content type endpoints)
- [ ] E2E tests (Playwright or Cypress)
- [ ] Multilingual content (per-locale fields, locale switcher in content form)
- [ ] Dashboard charts (content created over time, storage usage, API usage)
- [ ] Webhook delivery retry UI (manual retry button, delivery log detail view)
- [ ] Pre-signed URLs for S3 direct uploads
- [ ] GraphQL API endpoint (alternative to REST for frontend devs)
- [ ] Live preview / iframe preview (preview content as rendered on the frontend before publishing)
- [ ] Two-factor authentication (TOTP / authenticator app)
- [ ] User invitation system (invite by email, set initial role)
- [ ] Content type templates (blog, page, product — one-click presets)
- [ ] Custom dashboard widgets (configurable per user)
- [ ] API playground (in-app sandbox to test API calls, beyond Scalar docs)
- [ ] Batch import from other CMS (WordPress, Strapi JSON export)

## Nice to Have

- [ ] SDK client (`@eli-cms/client`) — typed wrapper around the public API for easy integration in any JS framework
- [ ] Plugin system (hooks to extend content lifecycle, custom field types)
- [ ] Single Sign-On (SSO) — SAML / OIDC integration
- [ ] Content tree / nested pages (hierarchical content with parent-child relationships in navigation)
- [ ] Real-time collaboration (presence indicators, live cursors in rich text)
