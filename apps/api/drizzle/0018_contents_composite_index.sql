CREATE INDEX IF NOT EXISTS "idx_contents_type_status_deleted" ON "contents" ("content_type_id","status","deleted_at");
