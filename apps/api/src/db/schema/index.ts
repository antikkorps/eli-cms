import { pgTable, uuid, varchar, jsonb, timestamp, index, integer, uniqueIndex, boolean } from 'drizzle-orm/pg-core';
import type { FieldDefinition, RelationType, WebhookEvent, WebhookDeliveryStatus } from '@eli-cms/shared';

// ─── Roles ─────────────────────────────────────────────
export const roles = pgTable('roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: varchar('description', { length: 500 }),
  permissions: jsonb('permissions').notNull().$type<string[]>(),
  isSystem: boolean('is_system').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// ─── Users ──────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  roleId: uuid('role_id').notNull().references(() => roles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index('idx_users_role_id').on(table.roleId),
]);

// ─── Content Types ──────────────────────────────────────
export const contentTypes = pgTable('content_types', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  fields: jsonb('fields').notNull().$type<FieldDefinition[]>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// ─── Refresh Tokens ────────────────────────────────────
export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 64 }).notNull(),
  family: uuid('family').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_refresh_tokens_user_id').on(table.userId),
  index('idx_refresh_tokens_token_hash').on(table.tokenHash),
  index('idx_refresh_tokens_family').on(table.family),
]);

// ─── Contents ───────────────────────────────────────────
export const contents = pgTable('contents', {
  id: uuid('id').defaultRandom().primaryKey(),
  contentTypeId: uuid('content_type_id').notNull().references(() => contentTypes.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).notNull().default('draft').$type<'draft' | 'published'>(),
  data: jsonb('data').notNull().$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// ─── Content Relations ──────────────────────────────────
export const contentRelations = pgTable('content_relations', {
  id: uuid('id').defaultRandom().primaryKey(),
  sourceId: uuid('source_id').notNull().references(() => contents.id, { onDelete: 'cascade' }),
  targetId: uuid('target_id').notNull().references(() => contents.id, { onDelete: 'cascade' }),
  relationType: varchar('relation_type', { length: 50 }).notNull().$type<RelationType>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_content_relations_source').on(table.sourceId),
  index('idx_content_relations_target').on(table.targetId),
  index('idx_content_relations_type').on(table.relationType),
  uniqueIndex('uq_content_relations').on(table.sourceId, table.targetId, table.relationType),
]);

// ─── Content Versions ───────────────────────────────────
export const contentVersions = pgTable('content_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  contentId: uuid('content_id').notNull().references(() => contents.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  data: jsonb('data').notNull().$type<Record<string, unknown>>(),
  status: varchar('status', { length: 20 }).notNull(),
  editedBy: uuid('edited_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_content_versions_content').on(table.contentId),
  uniqueIndex('uq_content_versions').on(table.contentId, table.versionNumber),
]);

// ─── Settings ───────────────────────────────────────────
export const settings = pgTable('settings', {
  key: varchar('key', { length: 255 }).primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Media ──────────────────────────────────────────────
export const media = pgTable('media', {
  id: uuid('id').defaultRandom().primaryKey(),
  filename: varchar('filename', { length: 512 }).notNull(),
  originalName: varchar('original_name', { length: 512 }).notNull(),
  mimeType: varchar('mime_type', { length: 255 }).notNull(),
  size: integer('size').notNull(),
  storageKey: varchar('storage_key', { length: 1024 }).notNull(),
  storageType: varchar('storage_type', { length: 20 }).notNull().default('local').$type<'local' | 's3'>(),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_media_created_by').on(table.createdBy),
  index('idx_media_mime_type').on(table.mimeType),
  index('idx_media_storage_type').on(table.storageType),
]);

// ─── Webhooks ───────────────────────────────────────────
export const webhooks = pgTable('webhooks', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  url: varchar('url', { length: 2048 }).notNull(),
  secret: varchar('secret', { length: 255 }).notNull(),
  events: jsonb('events').notNull().$type<WebhookEvent[]>(),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index('idx_webhooks_created_by').on(table.createdBy),
  index('idx_webhooks_is_active').on(table.isActive),
]);

// ─── Webhook Deliveries ─────────────────────────────────
export const webhookDeliveries = pgTable('webhook_deliveries', {
  id: uuid('id').defaultRandom().primaryKey(),
  webhookId: uuid('webhook_id').notNull().references(() => webhooks.id, { onDelete: 'cascade' }),
  event: varchar('event', { length: 255 }).notNull(),
  payload: jsonb('payload').notNull().$type<Record<string, unknown>>(),
  status: varchar('status', { length: 20 }).notNull().default('pending').$type<WebhookDeliveryStatus>(),
  responseStatus: integer('response_status'),
  attempts: integer('attempts').notNull().default(0),
  nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_webhook_deliveries_webhook').on(table.webhookId),
  index('idx_webhook_deliveries_status').on(table.status),
  index('idx_webhook_deliveries_next_retry').on(table.nextRetryAt),
]);
