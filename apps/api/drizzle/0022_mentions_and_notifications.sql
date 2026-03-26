ALTER TABLE "content_comments" ADD COLUMN "mentioned_user_ids" jsonb DEFAULT '[]';

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" varchar(50) NOT NULL,
  "title" varchar(255) NOT NULL,
  "body" text,
  "resource_type" varchar(50),
  "resource_id" varchar(255),
  "is_read" boolean NOT NULL DEFAULT false,
  "link" varchar(500),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_notifications_user" ON "notifications" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_is_read" ON "notifications" ("is_read");
CREATE INDEX IF NOT EXISTS "idx_notifications_created" ON "notifications" ("created_at");
