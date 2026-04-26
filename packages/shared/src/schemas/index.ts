import { z } from 'zod';
import type { FieldDefinition } from '../types/index.js';
import { sanitize, sanitizeHtml } from '../utils/sanitize.js';
import { ALL_PERMISSIONS } from '../constants/permissions.js';
import { DICEBEAR_STYLES } from '../constants/avatar.js';
import { SEO_FIELD_PREFIX } from '../constants/seo.js';

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
  firstName: z.string().max(100).nullable().optional(),
  lastName: z.string().max(100).nullable().optional(),
  avatarStyle: z.enum(DICEBEAR_STYLES).nullable().optional(),
  avatarSeed: z.string().max(255).nullable().optional(),
});

// Content Type schemas
const scalarFieldTypes = [
  'text',
  'textarea',
  'number',
  'boolean',
  'date',
  'email',
  'url',
  'select',
  'media',
  'richtext',
  'author',
  'component',
] as const;

const fieldValidationSchema = z
  .object({
    minLength: z.number().int().min(0).optional(),
    maxLength: z.number().int().min(1).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().max(500).optional(),
    patternMessage: z.string().max(255).optional(),
    unique: z.boolean().optional(),
  })
  .refine(
    (v) => {
      if (v.minLength !== undefined && v.maxLength !== undefined) return v.minLength <= v.maxLength;
      return true;
    },
    { message: 'minLength must be ≤ maxLength', path: ['minLength'] },
  )
  .refine(
    (v) => {
      if (v.min !== undefined && v.max !== undefined) return v.min <= v.max;
      return true;
    },
    { message: 'min must be ≤ max', path: ['min'] },
  )
  .refine(
    (v) => {
      if (!v.pattern) return true;
      if (v.pattern.length > 200) return false;
      // Reject patterns with common ReDoS constructs: nested quantifiers
      if (/(\+|\*|\{)\s*(\+|\*|\{)/.test(v.pattern)) return false;
      try {
        new RegExp(v.pattern);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Invalid or unsafe regex pattern (max 200 chars, no nested quantifiers)', path: ['pattern'] },
  )
  .optional();

const baseFieldDefinitionSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Field name must be a valid identifier')
    .refine((n) => !n.startsWith(SEO_FIELD_PREFIX), {
      message: `Field names starting with "${SEO_FIELD_PREFIX}" are reserved for SEO fields`,
    }),
  type: z.enum([...scalarFieldTypes, 'repeatable']),
  required: z.boolean(),
  label: safeString(255).pipe(z.string().min(1)),
  options: z.array(safeString(255)).optional(),
  multiple: z.boolean().optional(),
  accept: z.array(z.string()).optional(),
  defaultValue: z.unknown().optional(),
  group: z.string().max(255).optional(),
  componentSlugs: z.array(z.string().max(255)).optional(),
  validation: fieldValidationSchema,
  localizable: z.boolean().optional(),
  subFields: z
    .lazy(() =>
      z
        .array(
          z.object({
            name: z
              .string()
              .min(1)
              .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Field name must be a valid identifier'),
            type: z.enum(scalarFieldTypes),
            required: z.boolean(),
            label: safeString(255).pipe(z.string().min(1)),
            options: z.array(safeString(255)).optional(),
            multiple: z.boolean().optional(),
            accept: z.array(z.string()).optional(),
            defaultValue: z.unknown().optional(),
            validation: fieldValidationSchema,
          }),
        )
        .min(1),
    )
    .optional(),
});

const fieldDefinitionSchema = baseFieldDefinitionSchema.refine(
  (field) => field.type !== 'repeatable' || (field.subFields && field.subFields.length > 0),
  { message: 'Repeatable fields must have at least one sub-field', path: ['subFields'] },
);

/**
 * Strips SEO fields from incoming `fields` arrays. The API injects them at
 * read-time, so admin UIs round-trip them on save — we silently drop them
 * here so they don't trip the "_seo* is reserved" refine in fieldDefinitionSchema.
 */
const userFieldsArraySchema = z.preprocess((val) => {
  if (!Array.isArray(val)) return val;
  return val.filter(
    (f) =>
      !(
        f &&
        typeof f === 'object' &&
        typeof (f as { name?: unknown }).name === 'string' &&
        (f as { name: string }).name.startsWith(SEO_FIELD_PREFIX)
      ),
  );
}, z.array(fieldDefinitionSchema).min(1));

export const createContentTypeSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case'),
  name: safeString(255).pipe(z.string().min(1)),
  fields: userFieldsArraySchema,
  isSingleton: z.boolean().default(false),
  slugPattern: z.string().max(500).nullable().optional(),
});

export const updateContentTypeSchema = createContentTypeSchema.partial();

// Content schemas
export const CONTENT_STATUSES = ['draft', 'in-review', 'approved', 'scheduled', 'published'] as const;

export const createContentSchema = z.object({
  contentTypeId: z.string().uuid(),
  slug: z
    .string()
    .max(255)
    .regex(/^[a-z0-9]+(?:[-/][a-z0-9]+)*$/, 'Slug must be lowercase with hyphens or slashes')
    .optional(),
  status: z.enum(CONTENT_STATUSES).default('draft'),
  data: z.record(z.unknown()),
  featured: z.boolean().default(false),
  publishedAt: z.string().datetime({ offset: true }).optional(),
});

export const updateContentSchema = z.object({
  slug: z
    .string()
    .max(255)
    .regex(/^[a-z0-9]+(?:[-/][a-z0-9]+)*$/, 'Slug must be lowercase with hyphens or slashes')
    .nullable()
    .optional(),
  status: z.enum(CONTENT_STATUSES).optional(),
  data: z.record(z.unknown()).optional(),
  featured: z.boolean().optional(),
  publishedAt: z.string().datetime({ offset: true }).nullable().optional(),
});

/**
 * Component definitions map, keyed by slug → fields.
 * Pass this to buildContentDataSchema when content types reference components.
 */
export type ComponentFieldsMap = Map<string, FieldDefinition[]>;

export interface BuildSchemaI18n {
  defaultLocale: string;
  locales: string[];
}

/**
 * Builds a Zod schema dynamically from field definitions.
 * This is the core of the CPT system — zero code, zero migration.
 *
 * When `i18n` is provided, fields with `localizable: true` are wrapped in a
 * locale-keyed object (`{ en: ..., fr: ... }`). The default locale is required
 * when the field itself is required; other locales are always optional.
 */
export function buildContentDataSchema(
  fields: FieldDefinition[],
  componentMap?: ComponentFieldsMap,
  i18n?: BuildSchemaI18n,
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    let fieldSchema: z.ZodTypeAny;

    const v = field.validation;

    switch (field.type) {
      case 'text': {
        let s = z.string().max(v?.maxLength ? Math.min(v.maxLength, 1000) : 1000);
        if (v?.minLength) s = s.min(v.minLength);
        if (v?.pattern) {
          try {
            s = s.regex(new RegExp(v.pattern), v.patternMessage || 'Invalid format');
          } catch {
            /* skip invalid */
          }
        }
        fieldSchema = s.transform(sanitize);
        break;
      }
      case 'textarea': {
        let s = z.string().max(v?.maxLength ? Math.min(v.maxLength, 50000) : 50000);
        if (v?.minLength) s = s.min(v.minLength);
        if (v?.pattern) {
          try {
            s = s.regex(new RegExp(v.pattern), v.patternMessage || 'Invalid format');
          } catch {
            /* skip invalid */
          }
        }
        fieldSchema = s.transform(sanitize);
        break;
      }
      case 'number': {
        let n = z.number();
        if (v?.min !== undefined) n = n.min(v.min);
        if (v?.max !== undefined) n = n.max(v.max);
        fieldSchema = n;
        break;
      }
      case 'boolean':
        fieldSchema = z.boolean();
        break;
      case 'date':
        fieldSchema = z.string().datetime({ offset: true }).or(z.string().date());
        break;
      case 'email': {
        let s = z.string().email();
        if (v?.maxLength) s = s.max(v.maxLength);
        if (v?.minLength) s = s.min(v.minLength);
        if (v?.pattern) {
          try {
            s = s.regex(new RegExp(v.pattern), v.patternMessage || 'Invalid format');
          } catch {
            /* skip invalid */
          }
        }
        fieldSchema = s;
        break;
      }
      case 'url': {
        let s = z.string().url();
        if (v?.maxLength) s = s.max(v.maxLength);
        if (v?.minLength) s = s.min(v.minLength);
        if (v?.pattern) {
          try {
            s = s.regex(new RegExp(v.pattern), v.patternMessage || 'Invalid format');
          } catch {
            /* skip invalid */
          }
        }
        fieldSchema = s;
        break;
      }
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
      case 'richtext': {
        let s = z.string().max(v?.maxLength ? Math.min(v.maxLength, 200000) : 200000);
        if (v?.minLength) s = s.min(v.minLength);
        fieldSchema = s.transform(sanitizeHtml);
        break;
      }
      case 'author':
        fieldSchema = z.string().uuid();
        break;
      case 'repeatable':
        if (field.subFields && field.subFields.length > 0) {
          const itemSchema = buildContentDataSchema(field.subFields, componentMap, i18n);
          fieldSchema = z.array(itemSchema);
        } else {
          fieldSchema = z.array(z.unknown());
        }
        break;
      case 'component': {
        // Each block: { _component: slug, ...fieldData }
        const allowedSlugs = field.componentSlugs ?? [];
        if (componentMap && allowedSlugs.length > 0) {
          const blockSchemas = allowedSlugs
            .filter((slug) => componentMap.has(slug))
            .map((slug) => {
              const compFields = componentMap.get(slug)!;
              const dataSchema = buildContentDataSchema(compFields, componentMap, i18n);
              return dataSchema.extend({ _component: z.literal(slug) });
            });

          if (blockSchemas.length === 1) {
            fieldSchema = z.array(blockSchemas[0]!);
          } else if (blockSchemas.length > 1) {
            fieldSchema = z.array(
              z.discriminatedUnion(
                '_component',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                blockSchemas as [z.ZodObject<any>, z.ZodObject<any>, ...z.ZodObject<any>[]],
              ),
            );
          } else {
            fieldSchema = z.array(z.object({ _component: z.string() }).passthrough());
          }
        } else {
          fieldSchema = z.array(z.object({ _component: z.string() }).passthrough());
        }
        break;
      }
      default:
        fieldSchema = z.unknown();
    }

    // Wrap localizable fields in a locale-keyed object: { [locale]: value }.
    // Repeatable/component fields are not localizable as a whole — to translate
    // their inner content, mark sub-fields as localizable individually.
    const isLocalizable =
      field.localizable === true && field.type !== 'repeatable' && field.type !== 'component' && i18n !== undefined;

    if (isLocalizable) {
      const localeShape: Record<string, z.ZodTypeAny> = {};
      const innerSchema = fieldSchema;
      for (const locale of i18n!.locales) {
        const isDefault = locale === i18n!.defaultLocale;
        localeShape[locale] = field.required && isDefault ? innerSchema : innerSchema.optional();
      }
      fieldSchema = z.object(localeShape).strict({ message: 'Unknown locale key' });

      if (field.defaultValue !== undefined && field.defaultValue !== null) {
        fieldSchema = fieldSchema.default({ [i18n!.defaultLocale]: field.defaultValue });
      }
    } else if (field.defaultValue !== undefined && field.defaultValue !== null) {
      fieldSchema = fieldSchema.default(field.defaultValue);
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

// Component schemas
export const createComponentSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case'),
  name: safeString(255).pipe(z.string().min(1)),
  icon: z.string().max(255).nullable().optional(),
  fields: z.array(fieldDefinitionSchema).min(1),
});

export const updateComponentSchema = createComponentSchema.partial();

export const componentListQuerySchema = paginationSchema.extend({
  search: z.string().max(200).optional(),
});

export const contentTypeListQuerySchema = paginationSchema.extend({
  search: z.string().max(200).optional(),
  includeCounts: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export const contentListQuerySchema = paginationSchema.extend({
  contentTypeId: z.string().uuid().optional(),
  status: z.enum(CONTENT_STATUSES).optional(),
  search: z.string().max(200).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'status', 'slug', 'relevance']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  publishedAtFrom: z.coerce.date().optional(),
  publishedAtTo: z.coerce.date().optional(),
  createdAtFrom: z.coerce.date().optional(),
  createdAtTo: z.coerce.date().optional(),
});

export const trashListQuerySchema = paginationSchema.extend({
  contentTypeId: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
  sortBy: z.enum(['deletedAt', 'createdAt', 'updatedAt']).default('deletedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const publicFilterSchema = z
  .object({
    contentTypeId: z.string().uuid().optional(),
    slug: z.string().max(255).optional(),
    featured: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    createdAt: z
      .object({
        gte: z.string().datetime({ offset: true }).optional(),
        lte: z.string().datetime({ offset: true }).optional(),
      })
      .optional(),
    publishedAt: z
      .object({
        gte: z.string().datetime({ offset: true }).optional(),
        lte: z.string().datetime({ offset: true }).optional(),
      })
      .optional(),
    data: z
      .record(
        z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Invalid field name'),
        z.union([z.string(), z.object({ like: z.string().max(200) })]),
      )
      .optional(),
  })
  .optional();

export const publicContentListQuerySchema = paginationSchema.extend({
  search: z.string().max(200).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'publishedAt', 'relevance']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  filter: publicFilterSchema,
  fields: z.string().max(500).optional(),
  populate: z.enum(['relations']).optional(),
  preview: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  locale: z
    .string()
    .min(2)
    .max(10)
    .regex(/^[a-z]{2,3}(-[A-Z]{2})?$/)
    .optional(),
});

export const userListQuerySchema = paginationSchema.extend({
  roleId: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  roleId: z.string().uuid(),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().max(100).nullable().optional(),
  lastName: z.string().max(100).nullable().optional(),
  roleId: z.string().uuid().optional(),
  password: z.string().min(6).optional(),
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
  .refine((data) => data.activeStorage !== 's3' || data.s3 !== undefined, {
    message: 'S3 configuration is required when activeStorage is "s3"',
    path: ['s3'],
  });

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

// ─── Content Comment schemas ────────────────────────────
export const createContentCommentSchema = z.object({
  body: z.string().min(1).max(10000).transform(sanitize),
  mentionedUserIds: z.array(z.string().uuid()).max(50).default([]),
});

export const updateContentCommentSchema = z.object({
  body: z.string().min(1).max(10000).transform(sanitize),
  mentionedUserIds: z.array(z.string().uuid()).max(50).optional(),
});

export const contentCommentListQuerySchema = paginationSchema;

export type CreateContentCommentInput = z.infer<typeof createContentCommentSchema>;
export type UpdateContentCommentInput = z.infer<typeof updateContentCommentSchema>;
export type ContentCommentListQuery = z.infer<typeof contentCommentListQuerySchema>;

// ─── Notification schemas ───────────────────────────────
export const notificationListQuerySchema = paginationSchema.extend({
  isRead: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;

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
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case'),
  description: safeString(500).nullable().optional(),
  permissions: z.array(permissionEnum).min(1),
  allowedContentTypes: z.array(z.string().uuid()).nullable().optional(),
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
  allowedContentTypes: z.array(z.string().uuid()).nullable().optional(),
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

/** Block SSRF: reject private IPs, localhost, and cloud metadata endpoints. */
function isSafeWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // Block localhost variants
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]')
      return false;

    // Block cloud metadata endpoints
    if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') return false;

    // Block private IP ranges (10.x, 172.16-31.x, 192.168.x)
    const ipMatch = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (ipMatch) {
      const [, a, b] = ipMatch.map(Number);
      if (a === 10) return false;
      if (a === 172 && b >= 16 && b <= 31) return false;
      if (a === 192 && b === 168) return false;
      if (a === 0) return false;
    }

    // Block non-HTTP(S) schemes
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;

    return true;
  } catch {
    return false;
  }
}

const safeWebhookUrl = z.string().url().max(2048).refine(isSafeWebhookUrl, {
  message: 'Webhook URL must be a public HTTP(S) endpoint (no localhost, private IPs, or metadata services)',
});

export const createWebhookSchema = z.object({
  name: safeString(255).pipe(z.string().min(1)),
  url: safeWebhookUrl,
  secret: z.string().min(16).max(255),
  events: z.array(webhookEventEnum).min(1),
  isActive: z.boolean().default(true),
});

export const updateWebhookSchema = z.object({
  name: safeString(255).pipe(z.string().min(1)).optional(),
  url: safeWebhookUrl.optional(),
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

// ─── SEO Config schema ──────────────────────────────────
export const seoConfigSchema = z.object({
  siteUrl: z.string().url(),
  defaultOgImage: z.string().uuid().optional(),
  excludedContentTypes: z.array(z.string().uuid()).optional(),
});

// ─── i18n Config schema ─────────────────────────────────
/** BCP 47 subset: language code (2 letters) optionally followed by a region (e.g. "en", "fr-CA", "pt-BR"). */
const localeCode = z
  .string()
  .min(2)
  .max(10)
  .regex(/^[a-z]{2,3}(-[A-Z]{2})?$/, 'Locale must be a BCP 47 code (e.g. "en", "fr-CA")');

export const i18nConfigSchema = z
  .object({
    defaultLocale: localeCode,
    locales: z.array(localeCode).min(1).max(50),
  })
  .refine((c) => c.locales.includes(c.defaultLocale), {
    message: 'defaultLocale must be present in locales',
    path: ['defaultLocale'],
  })
  .refine((c) => new Set(c.locales).size === c.locales.length, {
    message: 'locales must be unique',
    path: ['locales'],
  });

export type I18nConfigInput = z.infer<typeof i18nConfigSchema>;

// ─── SMTP Config schema ─────────────────────────────────
export const smtpConfigSchema = z
  .object({
    host: z.string().min(1),
    port: z.coerce.number().int().min(1).max(65535),
    secure: z.boolean().default(false),
    authType: z.enum(['password', 'oauth2', 'none']).default('password'),
    user: z.string().min(1).optional(),
    password: z.string().min(1).optional(),
    clientId: z.string().min(1).optional(),
    clientSecret: z.string().min(1).optional(),
    refreshToken: z.string().min(1).optional(),
    fromName: z.string().min(1).max(255),
    fromAddress: z.string().email(),
  })
  .refine((data) => data.authType !== 'password' || (data.user && data.password), {
    message: 'User and password are required for password authentication',
    path: ['password'],
  })
  .refine(
    (data) => data.authType !== 'oauth2' || (data.user && data.clientId && data.clientSecret && data.refreshToken),
    { message: 'User, Client ID, Client Secret and Refresh Token are required for OAuth2', path: ['refreshToken'] },
  );

// ─── Password Reset schemas ─────────────────────────────
export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().uuid(),
  newPassword: z.string().min(6),
});

// ─── User Invitation schemas ────────────────────────────
export const createInvitationSchema = z.object({
  email: z.string().email(),
  roleId: z.string().uuid(),
});

export const invitationListQuerySchema = paginationSchema.extend({
  status: z.enum(['pending', 'accepted', 'revoked', 'expired']).optional(),
});

export const acceptInvitationSchema = z.object({
  token: z.string().uuid(),
  password: z.string().min(6),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
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

export const onboardingSchema = z.object({
  template: z.enum(['blog', 'corporate', 'portfolio', 'ecommerce']),
  siteName: z.string().max(255).optional(),
  siteDescription: z.string().max(1000).optional(),
  demoContent: z.boolean().default(false),
  extraComponents: z.boolean().default(false),
});

// ─── Inferred types ─────────────────────────────────────
export type CreateContentRelationInput = z.infer<typeof createContentRelationSchema>;
export type ContentRelationListQuery = z.infer<typeof contentRelationListQuerySchema>;
export type ContentVersionListQuery = z.infer<typeof contentVersionListQuerySchema>;

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateContentTypeInput = z.infer<typeof createContentTypeSchema>;
export type UpdateContentTypeInput = z.infer<typeof updateContentTypeSchema>;
export type CreateContentInput = z.input<typeof createContentSchema>;
export type UpdateContentInput = z.infer<typeof updateContentSchema>;
export type ContentTypeListQuery = z.infer<typeof contentTypeListQuerySchema>;
export type ContentListQuery = z.infer<typeof contentListQuerySchema>;
export type TrashListQuery = z.infer<typeof trashListQuerySchema>;
export type PublicContentListQuery = z.infer<typeof publicContentListQuerySchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UserListQuery = z.infer<typeof userListQuerySchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
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
export type OnboardingInput = z.infer<typeof onboardingSchema>;

export type AuditLogListQuery = z.infer<typeof auditLogListQuerySchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>;
export type ApiKeyListQuery = z.infer<typeof apiKeyListQuerySchema>;

export type CreateMediaFolderInput = z.infer<typeof createMediaFolderSchema>;
export type UpdateMediaFolderInput = z.infer<typeof updateMediaFolderSchema>;
export type MediaFolderListQuery = z.infer<typeof mediaFolderListQuerySchema>;

export type CreateComponentInput = z.infer<typeof createComponentSchema>;
export type UpdateComponentInput = z.infer<typeof updateComponentSchema>;
export type ComponentListQuery = z.infer<typeof componentListQuerySchema>;

export type SmtpConfigInput = z.infer<typeof smtpConfigSchema>;
export type SeoConfigInput = z.infer<typeof seoConfigSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type InvitationListQuery = z.infer<typeof invitationListQuerySchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
