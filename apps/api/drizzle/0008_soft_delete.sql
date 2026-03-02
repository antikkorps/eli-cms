-- Add soft-delete column to contents
ALTER TABLE contents ADD COLUMN deleted_at timestamp with time zone;

-- Index for efficient trash queries
CREATE INDEX idx_contents_deleted_at ON contents (deleted_at);

-- Drop the old unique index on (slug, content_type_id)
DROP INDEX IF EXISTS uq_contents_slug_type;

-- Recreate as partial unique index: only enforce uniqueness for live (non-trashed) content
CREATE UNIQUE INDEX uq_contents_slug_type ON contents (slug, content_type_id) WHERE deleted_at IS NULL;
