-- Content Relations
CREATE TABLE IF NOT EXISTS "content_relations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source_id" uuid NOT NULL REFERENCES "contents"("id") ON DELETE CASCADE,
  "target_id" uuid NOT NULL REFERENCES "contents"("id") ON DELETE CASCADE,
  "relation_type" varchar(50) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "idx_content_relations_source" ON "content_relations" ("source_id");
CREATE INDEX "idx_content_relations_target" ON "content_relations" ("target_id");
CREATE INDEX "idx_content_relations_type" ON "content_relations" ("relation_type");
CREATE UNIQUE INDEX "uq_content_relations" ON "content_relations" ("source_id", "target_id", "relation_type");

-- Content Versions
CREATE TABLE IF NOT EXISTS "content_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "content_id" uuid NOT NULL REFERENCES "contents"("id") ON DELETE CASCADE,
  "version_number" integer NOT NULL,
  "data" jsonb NOT NULL,
  "status" varchar(20) NOT NULL,
  "edited_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "idx_content_versions_content" ON "content_versions" ("content_id");
CREATE UNIQUE INDEX "uq_content_versions" ON "content_versions" ("content_id", "version_number");
