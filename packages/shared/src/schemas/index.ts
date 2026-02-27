import { z } from 'zod';
import type { FieldDefinition } from '../types/index.js';

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'editor']).default('editor'),
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

// Content Type schemas
const fieldDefinitionSchema = z.object({
  name: z.string().min(1).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Field name must be a valid identifier'),
  type: z.enum(['text', 'textarea', 'number', 'boolean', 'date', 'email', 'url', 'select']),
  required: z.boolean(),
  label: z.string().min(1),
  options: z.array(z.string()).optional(),
});

export const createContentTypeSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case'),
  name: z.string().min(1),
  fields: z.array(fieldDefinitionSchema).min(1),
});

export const updateContentTypeSchema = createContentTypeSchema.partial();

// Content schemas
export const createContentSchema = z.object({
  contentTypeId: z.string().uuid(),
  status: z.enum(['draft', 'published']).default('draft'),
  data: z.record(z.unknown()),
});

export const updateContentSchema = z.object({
  status: z.enum(['draft', 'published']).optional(),
  data: z.record(z.unknown()).optional(),
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
      case 'textarea':
        fieldSchema = z.string();
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
      default:
        fieldSchema = z.unknown();
    }

    shape[field.name] = field.required ? fieldSchema : fieldSchema.optional();
  }

  return z.object(shape);
}

// ─── Pagination & Query schemas ────────────────────────
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const contentTypeListQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
});

export const contentListQuerySchema = paginationSchema.extend({
  contentTypeId: z.string().uuid().optional(),
  status: z.enum(['draft', 'published']).optional(),
  search: z.string().max(200).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'status', 'relevance']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const publicContentListQuerySchema = paginationSchema.extend({
  search: z.string().max(200).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'relevance']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const userListQuerySchema = paginationSchema.extend({
  role: z.enum(['admin', 'editor']).optional(),
  search: z.string().optional(),
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
});

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
export type PublicContentListQuery = z.infer<typeof publicContentListQuerySchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UserListQuery = z.infer<typeof userListQuerySchema>;
export type S3ConfigInput = z.infer<typeof s3ConfigSchema>;
export type StorageConfigInput = z.infer<typeof storageConfigSchema>;
export type UploadListQuery = z.infer<typeof uploadListQuerySchema>;
