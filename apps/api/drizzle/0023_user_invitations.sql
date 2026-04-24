CREATE TABLE IF NOT EXISTS "user_invitations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar(255) NOT NULL,
  "role_id" uuid NOT NULL REFERENCES "roles"("id") ON DELETE RESTRICT,
  "token_hash" varchar(64) NOT NULL,
  "invited_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "expires_at" timestamp with time zone NOT NULL,
  "accepted_at" timestamp with time zone,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_user_invitations_email" ON "user_invitations" ("email");
CREATE INDEX IF NOT EXISTS "idx_user_invitations_token_hash" ON "user_invitations" ("token_hash");
CREATE INDEX IF NOT EXISTS "idx_user_invitations_invited_by" ON "user_invitations" ("invited_by");
