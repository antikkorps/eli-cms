-- Settings key-value store
CREATE TABLE "settings" (
  "key" varchar(255) PRIMARY KEY NOT NULL,
  "value" jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Media metadata
CREATE TABLE "media" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "filename" varchar(512) NOT NULL,
  "original_name" varchar(512) NOT NULL,
  "mime_type" varchar(255) NOT NULL,
  "size" integer NOT NULL,
  "storage_key" varchar(1024) NOT NULL,
  "storage_type" varchar(20) NOT NULL DEFAULT 'local',
  "created_by" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_media_created_by" ON "media" USING btree ("created_by");
--> statement-breakpoint
CREATE INDEX "idx_media_mime_type" ON "media" USING btree ("mime_type");
--> statement-breakpoint
CREATE INDEX "idx_media_storage_type" ON "media" USING btree ("storage_type");
