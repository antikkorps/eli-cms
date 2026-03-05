import { z } from 'zod';
import type { FieldDefinition } from '../types/index.js';
import { sanitize } from '../utils/sanitize.js';
import { ALL_PERMISSIONS } from '../constants/permissions.js';
import { DICEBEAR_STYLES } from '../constants/avatar.js';

/** Zod string that strips all HTML tags and trims. */
const safeString = (max = 255) => z.string().max(max).transform(sanitize);

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  roleId: z.string().uuid().optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

export const updateProfileSchema = z.object({
  email: z.string().email().optional(),
  avatarStyle: z.enum(DICEBEAR_STYLES).nullable().optional(),
  avatarSeed: z.string().max(255).nullable().optional(),
});

// Content Type schemas
const scalarFieldTypes = ['text', 'textarea', 'number', 'boolean', 'date', 'email', 'url', 'select', 'media', 'richtext', 'author'] as const;

const baseFieldDefinitionSchema = z.object({
  name: z.string().min(1).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Field name must be a valid identifier'),
  type: z.enum([...scalarFieldTypes, 'repeatable']),
  required: z.boolean(),
  label: safeString(255).pipe(z.string().min(1)),
  options: z.array(safeString(255)).optional(),
  multiple: z.boolean().optional(),
  accept: z.array(z.string()).optional(),
  subFields: z.lazy(() =>
    z.array(
      z.object({
        name: z.string().min(1).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Field name must be a valid identifier'),
        type: z.enum(scalarFieldTypes),
        required: z.boolean(),
        label: safeString(255).pipe(z.string().min(1)),
        options: z.array(safeString(255)).optional(),
        multiple: z.boolean().optional(),
        accept: z.array(z.string()).optional(),
      }),
    ).min(1),
  ).optional(),
});

const fieldDefinitionSchema = baseFieldDefinitionSchema.refine(
  (field) => field.type !== 'repeatable' || (field.subFields && field.subFields.length > 0),
  { message: 'Repeatable fields must have at least one sub-field', path: ['subFields'] },
);

export const createContentTypeSchema = z.object({
  slug: z.string().min(1).max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case'),
  name: safeString(255).pipe(z.string().min(1)),
  fields: z.array(fieldDefinitionSchema).min(1),
  isSingleton: z.boolean().default(false),
});

export const updateContentTypeSchema = createContentTypeSchema.partial();

// Content schemas
export const CONTENT_STATUSES = ['draft', 'in-review', 'approved', 'scheduled', 'published'] as const;

export const createContentSchema = z.object({
  contentTypeId: z.string().uuid(),
  slug: z.string().max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case').optional(),
  status: z.enum(CONTENT_STATUSES).default('draft'),
  data: z.record(z.unknown()),
  publishedAt: z.string().datetime({ offset: true }).optional(),
});

export const updateContentSchema = z.object({
  slug: z.string().max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case').nullable().optional(),
  status: z.enum(CONTENT_STATUSES).optional(),
  data: z.record(z.unknown()).optional(),
  publishedAt: z.string().datetime({ offset: true }).nullable().optional(),
});

/**
 * Builds a Zod schema dynamically from field definitions.
 * This is the core of the CPT system — zero code, zero migration.
 */
export function buildContentDataSchema(fields: FieldDefinition[]): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    let fieldSchema: z.ZodTypeAny;

    switch (field.type) {
      case 'text':
        fieldSchema = z.string().max(1000).transform(sanitize);
        break;
      case 'textarea':
        fieldSchema = z.string().max(50000).transform(sanitize);
        break;
      case 'number':
        fieldSchema = z.number();
        break;
      case 'boolean':
        fieldSchema = z.boolean();
        break;
      case 'date':
        fieldSchema = z.string().datetime({ offset: true }).or(z.string().date());
        break;
      case 'email':
        fieldSchema = z.string().email();
        break;
      case 'url':
        fieldSchema = z.string().url();
        break;
      case 'select':
        if (field.options && field.options.length > 0) {
          fieldSchema = z.enum(field.options as [string, ...string[]]);
        } else {
          fieldSchema = z.string();
        }
        break;
      case 'media':
        fieldSchema = field.multiple ? z.array(z.string().uuid()) : z.string().uuid();
        break;
      case 'richtext':
        fieldSchema = z.string().max(200000).transform(sanitize);
        break;
      case 'author':
        fieldSchema = z.string().uuid();
        break;
      case 'repeatable':
        if (field.subFields && field.subFields.length > 0) {
          const itemSchema = buildContentDataSchema(field.subFields);
          fieldSchema = z.array(itemSchema);
        } else {
          fieldSchema = z.array(z.unknown());
        }
        break;
      default:
        fieldSchema = z.unknown();
    }

    shape[field.name] = field.required ? fieldSchema : fieldSchema.optional();
  }

  return z.object(shape);
}

// ─── Bulk action schema ────────────────────────────────
export const bulkContentActionSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(['delete', 'publish', 'unpublish', 'restore', 'permanent-delete']),
});

export type BulkContentActionInput = z.infer<typeof bulkContentActionSchema>;

// ─── Content Export/Import schemas ─────────────────────
export const exportContentQuerySchema = z.object({
  contentTypeId: z.string().uuid(),
  format: z.enum(['json', 'csv', 'xml']).default('json'),
  status: z.enum(CONTENT_STATUSES).optional(),
});

export type ExportContentQuery = z.infer<typeof exportContentQuerySchema>;

// ─── Pagination & Query schemas ────────────────────────
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const contentTypeListQuerySchema = paginationSchema.extend({
  search: z.string().max(200).optional(),
  includeCounts: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
});

export const contentListQuerySchema = paginationSchema.extend({
  contentTypeId: z.string().uuid().optional(),
  status: z.enum(CONTENT_STATUSES).optional(),
  search: z.string().max(200).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'status', 'slug', 'relevance']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const trashListQuerySchema = paginationSchema.extend({
  contentTypeId: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
  sortBy: z.enum(['deletedAt', 'createdAt', 'updatedAt']).default('deletedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const publicFilterSchema = z.object({
  contentTypeId: z.string().uuid().optional(),
  slug: z.string().max(255).optional(),
  createdAt: z.object({
    gte: z.string().datetime({ offset: true }).optional(),
    lte: z.string().datetime({ offset: true }).optional(),
  }).optional(),
  publishedAt: z.object({
    gte: z.string().datetime({ offset: true }).optional(),
    lte: z.string().datetime({ offset: true }).optional(),
  }).optional(),
  data: z.record(
    z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Invalid field name'),
    z.union([z.string(), z.object({ like: z.string().max(200) })]),
  ).optional(),
}).optional();

export const publicContentListQuerySchema = paginationSchema.extend({
  search: z.string().max(200).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'publishedAt', 'relevance']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  filter: publicFilterSchema,
  fields: z.string().max(500).optional(),
  populate: z.enum(['relations']).optional(),
  preview: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
});

export const userListQuerySchema = paginationSchema.extend({
  roleId: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
});

// ─── Storage / Upload schemas ───────────────────────────
export const s3ConfigSchema = z.object({
  bucket: z.string().min(1),
  region: z.string().min(1),
  accessKeyId: z.string().min(1),
  secretAccessKey: z.string().min(1),
  endpoint: z.string().url().optional(),
});

export const storageConfigSchema = z
  .object({
    activeStorage: z.enum(['local', 's3']),
    s3: s3ConfigSchema.optional(),
  })
  .refine(
    (data) => data.activeStorage !== 's3' || data.s3 !== undefined,
    { message: 'S3 configuration is required when activeStorage is "s3"', path: ['s3'] },
  );

export const uploadListQuerySchema = paginationSchema.extend({
  mimeType: z.string().optional(),
  createdBy: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
  folderId: z.string().uuid().optional(),
});

// ─── Media Folder schemas ───────────────────────────────
export const createMediaFolderSchema = z.object({
  name: safeString(255).pipe(z.string().min(1)),
  parentId: z.string().uuid().nullable().optional(),
});

export const updateMediaFolderSchema = z.object({
  name: safeString(255).pipe(z.string().min(1)).optional(),
  parentId: z.string().uuid().nullable().optional(),
});

export const mediaFolderListQuerySchema = paginationSchema.extend({
  parentId: z.string().uuid().optional(),
});

// ─── Image Transform schemas ────────────────────────────
export const imageTransformQuerySchema = z.object({
  w: z.coerce.number().int().min(1).max(4096).optional(),
  h: z.coerce.number().int().min(1).max(4096).optional(),
  format: z.enum(['webp', 'avif', 'jpeg', 'png']).optional(),
  fit: z.enum(['cover', 'contain', 'fill', 'inside', 'outside']).optional(),
  q: z.coerce.number().int().min(1).max(100).optional(),
});
export type ImageTransformQuery = z.infer<typeof imageTransformQuerySchema>;

export const updateMediaSchema = z.object({
  originalName: safeString(255).pipe(z.string().min(1)).optional(),
  alt: safeString(512).nullable().optional(),
  caption: z.string().max(5000).transform(sanitize).nullable().optional(),
  folderId: z.string().uuid().nullable().optional(),
});
export type UpdateMediaInput = z.infer<typeof updateMediaSchema>;

// ─── Content Relations schemas ──────────────────────────
export const createContentRelationSchema = z.object({
  targetId: z.string().uuid(),
  relationType: z.enum(['reference', 'parent', 'related']),
});

export const contentRelationListQuerySchema = paginationSchema.extend({
  relationType: z.enum(['reference', 'parent', 'related']).optional(),
});

// ─── Content Versions schemas ───────────────────────────
export const contentVersionListQuerySchema = paginationSchema;

// ─── Role schemas ───────────────────────────────────────
const permissionEnum = z.enum(ALL_PERMISSIONS as unknown as [string, ...string[]]);

export const createRoleSchema = z.object({
  name: safeString(255).pipe(z.string().min(1)),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case'),
  description: safeString(500).nullable().optional(),
  permissions: z.array(permissionEnum).min(1),
});

export const updateRoleSchema = z.object({
  name: safeString(255).pipe(z.string().min(1)).optional(),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case')
    .optional(),
  description: safeString(500).nullable().optional(),
  permissions: z.array(permissionEnum).min(1).optional(),
});

export const roleListQuerySchema = paginationSchema.extend({
  search: z.string().max(200).optional(),
});

// ─── Webhook schemas ────────────────────────────────────
const webhookEventEnum = z.enum([
  'content.created',
  'content.updated',
  'content.deleted',
  'content.published',
  'content.review-requested',
  'content.approved',
  'content.rejected',
  'content.scheduled',
  'content.trashed',
  'content.restored',
  'content.purged',
  'content_type.created',
  'content_type.updated',
  'content_type.deleted',
  'media.uploaded',
  'media.deleted',
]);

export const createWebhookSchema = z.object({
  name: safeString(255).pipe(z.string().min(1)),
  url: z.string().url().max(2048),
  secret: z.string().min(16).max(255),
  events: z.array(webhookEventEnum).min(1),
  isActive: z.boolean().default(true),
});

export const updateWebhookSchema = z.object({
  name: safeString(255).pipe(z.string().min(1)).optional(),
  url: z.string().url().max(2048).optional(),
  secret: z.string().min(16).max(255).optional(),
  events: z.array(webhookEventEnum).min(1).optional(),
  isActive: z.boolean().optional(),
});

export const webhookListQuerySchema = paginationSchema.extend({
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export const webhookDeliveryListQuerySchema = paginationSchema.extend({
  status: z.enum(['pending', 'success', 'failed']).optional(),
});

// ─── Audit Log schemas ──────────────────────────────────
export const auditLogListQuerySchema = paginationSchema.extend({
  actorId: z.string().max(255).optional(),
  action: z.string().max(255).optional(),
  resourceType: z.string().max(255).optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});

// ─── API Key schemas ────────────────────────────────────
export const createApiKeySchema = z.object({
  name: safeString(255).pipe(z.string().min(1)),
  permissions: z.array(permissionEnum).min(1),
  expiresAt: z.string().datetime({ offset: true }).optional(),
});

export const updateApiKeySchema = z.object({
  name: safeString(255).pipe(z.string().min(1)).optional(),
  permissions: z.array(permissionEnum).min(1).optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
});

export const apiKeyListQuerySchema = paginationSchema.extend({
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

// ─── Setup schema ───────────────────────────────────────
export const setupSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(6),
    confirmPassword: z.string().min(6),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// ─── Inferred types ─────────────────────────────────────
export type CreateContentRelationInput = z.infer<typeof createContentRelationSchema>;
export type ContentRelationListQuery = z.infer<typeof contentRelationListQuerySchema>;
export type ContentVersionListQuery = z.infer<typeof contentVersionListQuerySchema>;

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateContentTypeInput = z.infer<typeof createContentTypeSchema>;
export type UpdateContentTypeInput = z.infer<typeof updateContentTypeSchema>;
export type CreateContentInput = z.infer<typeof createContentSchema>;
export type UpdateContentInput = z.infer<typeof updateContentSchema>;
export type ContentTypeListQuery = z.infer<typeof contentTypeListQuerySchema>;
export type ContentListQuery = z.infer<typeof contentListQuerySchema>;
export type TrashListQuery = z.infer<typeof trashListQuerySchema>;
export type PublicContentListQuery = z.infer<typeof publicContentListQuerySchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UserListQuery = z.infer<typeof userListQuerySchema>;
export type S3ConfigInput = z.infer<typeof s3ConfigSchema>;
export type StorageConfigInput = z.infer<typeof storageConfigSchema>;
export type UploadListQuery = z.infer<typeof uploadListQuerySchema>;

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type RoleListQuery = z.infer<typeof roleListQuerySchema>;

export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>;
export type WebhookListQuery = z.infer<typeof webhookListQuerySchema>;
export type WebhookDeliveryListQuery = z.infer<typeof webhookDeliveryListQuerySchema>;

export type SetupInput = z.infer<typeof setupSchema>;

export type AuditLogListQuery = z.infer<typeof auditLogListQuerySchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>;
export type ApiKeyListQuery = z.infer<typeof apiKeyListQuerySchema>;

export type CreateMediaFolderInput = z.infer<typeof createMediaFolderSchema>;
export type UpdateMediaFolderInput = z.infer<typeof updateMediaFolderSchema>;
export type MediaFolderListQuery = z.infer<typeof mediaFolderListQuerySchema>;
