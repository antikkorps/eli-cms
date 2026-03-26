CREATE TABLE IF NOT EXISTS "content_comments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "content_id" uuid NOT NULL REFERENCES "contents"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "body" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_content_comments_content" ON "content_comments" ("content_id");
CREATE INDEX IF NOT EXISTS "idx_content_comments_user" ON "content_comments" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_content_comments_created" ON "content_comments" ("created_at");
