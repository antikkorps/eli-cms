CREATE TABLE "content_locks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "content_id" uuid NOT NULL UNIQUE REFERENCES "contents"("id") ON DELETE CASCADE,
  "locked_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "idx_content_locks_expires_at" ON "content_locks" USING btree ("expires_at");
