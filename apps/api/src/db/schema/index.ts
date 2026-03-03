import { pgTable, uuid, varchar, jsonb, timestamp, index, integer, uniqueIndex, boolean, text, type AnyPgColumn } from 'drizzle-orm/pg-core';
import type { FieldDefinition, RelationType, WebhookEvent, WebhookDeliveryStatus, ActorType } from '@eli-cms/shared';

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
  slug: varchar('slug', { length: 255 }),
  status: varchar('status', { length: 20 }).notNull().default('draft').$type<'draft' | 'in-review' | 'approved' | 'scheduled' | 'published'>(),
  data: jsonb('data').notNull().$type<Record<string, unknown>>(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  editedBy: uuid('edited_by').references(() => users.id, { onDelete: 'set null' }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex('uq_contents_slug_type').on(table.slug, table.contentTypeId),
  index('idx_contents_status').on(table.status),
  index('idx_contents_published_at').on(table.publishedAt),
  index('idx_contents_deleted_at').on(table.deletedAt),
]);

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

// ─── Media Folders ──────────────────────────────────────
export const mediaFolders = pgTable('media_folders', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  parentId: uuid('parent_id').references((): AnyPgColumn => mediaFolders.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_media_folders_parent_id').on(table.parentId),
  uniqueIndex('uq_media_folders_slug_parent').on(table.slug, table.parentId),
]);

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
  alt: varchar('alt', { length: 512 }),
  caption: text('caption'),
  width: integer('width'),
  height: integer('height'),
  folderId: uuid('folder_id').references(() => mediaFolders.id, { onDelete: 'set null' }),
}, (table) => [
  index('idx_media_created_by').on(table.createdBy),
  index('idx_media_mime_type').on(table.mimeType),
  index('idx_media_storage_type').on(table.storageType),
  index('idx_media_folder_id').on(table.folderId),
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

// ─── Audit Logs ─────────────────────────────────────────
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorId: varchar('actor_id', { length: 255 }).notNull(),
  actorType: varchar('actor_type', { length: 20 }).notNull().$type<ActorType>(),
  action: varchar('action', { length: 255 }).notNull(),
  resourceType: varchar('resource_type', { length: 255 }).notNull(),
  resourceId: varchar('resource_id', { length: 255 }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_audit_logs_actor_id').on(table.actorId),
  index('idx_audit_logs_action').on(table.action),
  index('idx_audit_logs_resource_type').on(table.resourceType),
  index('idx_audit_logs_created_at').on(table.createdAt),
]);

// ─── Content Locks ─────────────────────────────────────
export const contentLocks = pgTable('content_locks', {
  id: uuid('id').defaultRandom().primaryKey(),
  contentId: uuid('content_id').notNull().references(() => contents.id, { onDelete: 'cascade' }).unique(),
  lockedBy: uuid('locked_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_content_locks_expires_at').on(table.expiresAt),
]);

// ─── API Keys ───────────────────────────────────────────
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  keyHash: varchar('key_hash', { length: 64 }).notNull(),
  keyPrefix: varchar('key_prefix', { length: 12 }).notNull(),
  permissions: jsonb('permissions').notNull().$type<string[]>(),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex('idx_api_keys_key_hash').on(table.keyHash),
  index('idx_api_keys_created_by').on(table.createdBy),
  index('idx_api_keys_is_active').on(table.isActive),
]);
