CREATE TABLE IF NOT EXISTS "content_type_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" varchar(255) NOT NULL UNIQUE,
  "name" varchar(255) NOT NULL,
  "description" text,
  "icon" varchar(255),
  "fields" jsonb NOT NULL,
  "is_system" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
