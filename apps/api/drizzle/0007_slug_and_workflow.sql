-- Add slug column to contents
ALTER TABLE "contents" ADD COLUMN "slug" varchar(255);--> statement-breakpoint

-- Add unique index on slug + content_type_id
CREATE UNIQUE INDEX "uq_contents_slug_type" ON "contents" USING btree ("slug","content_type_id");--> statement-breakpoint

-- Add index on status
CREATE INDEX "idx_contents_status" ON "contents" USING btree ("status");--> statement-breakpoint

-- Add published_at and edited_by columns for editorial workflow
ALTER TABLE "contents" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "contents" ADD COLUMN "edited_by" uuid;--> statement-breakpoint

-- Add index on published_at for scheduler queries
CREATE INDEX "idx_contents_published_at" ON "contents" USING btree ("published_at");--> statement-breakpoint

-- Add foreign key for edited_by
ALTER TABLE "contents" ADD CONSTRAINT "contents_edited_by_users_id_fk" FOREIGN KEY ("edited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
