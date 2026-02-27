-- 1. Create roles table
CREATE TABLE IF NOT EXISTS "roles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "slug" varchar(255) NOT NULL UNIQUE,
  "description" varchar(500),
  "permissions" jsonb NOT NULL,
  "is_system" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- 2. Insert default roles
INSERT INTO "roles" ("name", "slug", "description", "permissions", "is_system") VALUES
  ('Super Admin', 'super-admin', 'Full access to all features', '["content:create","content:read","content:update","content:delete","content:publish","content-types:read","content-types:manage","users:read","users:manage","uploads:create","uploads:read","uploads:delete","settings:manage","webhooks:manage","roles:read","roles:manage"]', true),
  ('Editor', 'editor', 'Can manage content and uploads', '["content:create","content:read","content:update","content:delete","content:publish","content-types:read","uploads:create","uploads:read"]', true)
ON CONFLICT ("slug") DO NOTHING;

-- 3. Add role_id column (nullable initially for backfill)
ALTER TABLE "users" ADD COLUMN "role_id" uuid;

-- 4. Backfill: map admin → super-admin, editor → editor
UPDATE "users" SET "role_id" = (SELECT "id" FROM "roles" WHERE "slug" = 'super-admin') WHERE "role" = 'admin';
UPDATE "users" SET "role_id" = (SELECT "id" FROM "roles" WHERE "slug" = 'editor') WHERE "role" = 'editor';
-- Catch any unmapped users
UPDATE "users" SET "role_id" = (SELECT "id" FROM "roles" WHERE "slug" = 'editor') WHERE "role_id" IS NULL;

-- 5. Make role_id NOT NULL + add FK
ALTER TABLE "users" ALTER COLUMN "role_id" SET NOT NULL;
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
CREATE INDEX "idx_users_role_id" ON "users" ("role_id");

-- 6. Drop old role column
ALTER TABLE "users" DROP COLUMN "role";

-- 7. Create webhooks table
CREATE TABLE IF NOT EXISTS "webhooks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "url" varchar(2048) NOT NULL,
  "secret" varchar(255) NOT NULL,
  "events" jsonb NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "idx_webhooks_created_by" ON "webhooks" ("created_by");
CREATE INDEX "idx_webhooks_is_active" ON "webhooks" ("is_active");

-- 8. Create webhook_deliveries table
CREATE TABLE IF NOT EXISTS "webhook_deliveries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "webhook_id" uuid NOT NULL REFERENCES "webhooks"("id") ON DELETE CASCADE,
  "event" varchar(255) NOT NULL,
  "payload" jsonb NOT NULL,
  "status" varchar(20) NOT NULL DEFAULT 'pending',
  "response_status" integer,
  "attempts" integer NOT NULL DEFAULT 0,
  "next_retry_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "idx_webhook_deliveries_webhook" ON "webhook_deliveries" ("webhook_id");
CREATE INDEX "idx_webhook_deliveries_status" ON "webhook_deliveries" ("status");
CREATE INDEX "idx_webhook_deliveries_next_retry" ON "webhook_deliveries" ("next_retry_at");
