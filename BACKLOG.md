# Eli CMS — Backlog

## High Priority

- [x] Server-side validation of media UUIDs (verify the referenced media exists when saving content)
- [x] Multiple media field support (allow selecting more than one file per field)
- [x] MIME type filtering in MediaPicker (restrict by image/video/document per field config)
- [x] Media preview column in contents list pages
- [x] Drag-and-drop upload in MediaPicker and uploads page

## Medium Priority

- [x] Rich text editor field type (WYSIWYG)
- [ ] Public API improvements (preview mode, advanced filters, field selection, populate relations)
- [ ] Auto-generate slug from name in content types and contents
- [ ] Bulk actions on list pages (delete, publish, unpublish)
- [ ] Search result highlighting
- [ ] User profile page (change email, password)
- [ ] Content duplication (clone an existing content entry)
- [ ] Image crop/resize before upload
- [ ] i18n labels in FieldBuilder (translate field type names)
- [ ] Advanced form validation (min/max length, regex patterns per field)

## Low Priority

- [ ] Dark mode polish (ensure all custom components respect dark theme)
- [ ] Keyboard shortcuts (save, navigate, search focus)
- [ ] Column sorting on all list tables
- [ ] Content export/import (JSON/CSV)
- [ ] OpenAPI spec generation from routes
- [ ] E2E tests (Playwright or Cypress)
- [ ] Content scheduling (publish at a future date)
- [ ] Editorial workflow (draft → review → published)
- [ ] Multilingual content (per-locale fields)
- [ ] Dashboard charts (content created over time)
- [ ] Webhook delivery retry UI (manual retry button)
- [ ] Pre-signed URLs for S3 direct uploads

## Nice to Have

- [ ] SDK client (`@eli-cms/client`) — typed wrapper around the public API for easy integration in any JS framework
