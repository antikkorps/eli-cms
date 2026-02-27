-- ─── Audit Logs ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_id" varchar(255) NOT NULL,
  "actor_type" varchar(20) NOT NULL,
  "action" varchar(255) NOT NULL,
  "resource_type" varchar(255) NOT NULL,
  "resource_id" varchar(255),
  "metadata" jsonb,
  "ip_address" varchar(45),
  "user_agent" varchar(500),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_audit_logs_actor_id" ON "audit_logs" USING btree ("actor_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_action" ON "audit_logs" USING btree ("action");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_resource_type" ON "audit_logs" USING btree ("resource_type");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at" ON "audit_logs" USING btree ("created_at");

-- ─── API Keys ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "api_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "key_hash" varchar(64) NOT NULL,
  "key_prefix" varchar(12) NOT NULL,
  "permissions" jsonb NOT NULL,
  "created_by" uuid NOT NULL,
  "expires_at" timestamp with time zone,
  "last_used_at" timestamp with time zone,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_api_keys_key_hash" ON "api_keys" USING btree ("key_hash");
CREATE INDEX IF NOT EXISTS "idx_api_keys_created_by" ON "api_keys" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "idx_api_keys_is_active" ON "api_keys" USING btree ("is_active");

ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
