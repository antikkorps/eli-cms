-- Media metadata columns
ALTER TABLE "media" ADD COLUMN "alt" varchar(512);
ALTER TABLE "media" ADD COLUMN "caption" text;
ALTER TABLE "media" ADD COLUMN "width" integer;
ALTER TABLE "media" ADD COLUMN "height" integer;

-- Media folders table
CREATE TABLE "media_folders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "slug" varchar(255) NOT NULL,
  "parent_id" uuid REFERENCES "media_folders"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "idx_media_folders_parent_id" ON "media_folders" USING btree ("parent_id");
CREATE UNIQUE INDEX "uq_media_folders_slug_parent" ON "media_folders" USING btree ("slug", "parent_id");

-- Add folder_id to media
ALTER TABLE "media" ADD COLUMN "folder_id" uuid REFERENCES "media_folders"("id") ON DELETE SET NULL;
CREATE INDEX "idx_media_folder_id" ON "media" USING btree ("folder_id");
