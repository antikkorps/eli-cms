import { eq, and, count as drizzleCount, asc, desc, sql, inArray, gte, lte, isNull, isNotNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { contents, contentLocks, contentTypes } from '../db/schema/index.js';
import { ContentTypeService } from './content-type.service.js';
import { AppError } from '../utils/app-error.js';
import { buildMeta } from '../utils/pagination.js';
import { buildContentDataSchema, type ComponentFieldsMap } from '@eli-cms/shared';
import { ComponentService } from './component.service.js';
import { ContentVersionService } from './content-version.service.js';
import { LockService } from './lock.service.js';
import type { CreateContentInput, UpdateContentInput, ContentListQuery, PublicContentListQuery, TrashListQuery, ActorType, FieldDefinition } from '@eli-cms/shared';
import { eventBus } from './event-bus.js';
import { UploadService } from './upload.service.js';
import { UserService } from './user.service.js';
import { WorkflowService } from './workflow.service.js';

export interface Actor {
  id: string;
  type: ActorType;
  ip?: string;
  userAgent?: string;
}

const sortColumns = {
  createdAt: contents.createdAt,
  updatedAt: contents.updatedAt,
  publishedAt: contents.publishedAt,
  deletedAt: contents.deletedAt,
  status: contents.status,
  slug: contents.slug,
} as const;

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 200);
}

function extractFirstTextField(fields: FieldDefinition[], data: Record<string, unknown>): string | null {
  const textField = fields.find((f) => f.type === 'text');
  if (!textField) return null;
  const value = data[textField.name];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function resolveSlugPattern(pattern: string, data: Record<string, unknown>): string {
  const now = new Date();
  const resolved = pattern.replace(/\{(\w+)\}/g, (_, token: string) => {
    switch (token) {
      case 'year': return String(now.getFullYear());
      case 'month': return String(now.getMonth() + 1).padStart(2, '0');
      case 'day': return String(now.getDate()).padStart(2, '0');
      default: {
        const val = data[token];
        return typeof val === 'string' && val.length > 0 ? toSlug(val) : '';
      }
    }
  });
  // Clean up double separators and trim
  return resolved.replace(/\/+/g, '/').replace(/^\/|\/$/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function sanitizeSearchTerms(raw: string): string | null {
  const terms = raw
    .split(/\s+/)
    .map(t => t.replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, ''))
    .filter(t => t.length > 0);
  return terms.length > 0 ? terms.join(' & ') : null;
}

export class ContentService {
  private static async ensureUniqueSlug(baseSlug: string, contentTypeId: string, excludeId?: string): Promise<string> {
    let slug = baseSlug;
    let suffix = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const filters = [eq(contents.slug, slug), eq(contents.contentTypeId, contentTypeId), isNull(contents.deletedAt)];
      if (excludeId) filters.push(sql`${contents.id} != ${excludeId}`);
      const [existing] = await db.select({ id: contents.id }).from(contents).where(and(...filters)).limit(1);
      if (!existing) return slug;
      suffix++;
      slug = `${baseSlug}-${suffix}`;
    }
  }

  static async findAll(query: ContentListQuery) {
    const { page, limit, contentTypeId, status, search, sortBy, sortOrder } = query;
    const offset = (page - 1) * limit;

    const filters = [isNull(contents.deletedAt)];
    if (contentTypeId) filters.push(eq(contents.contentTypeId, contentTypeId));
    if (status) filters.push(eq(contents.status, status));

    const tsquery = search ? sanitizeSearchTerms(search) : null;
    if (tsquery) {
      filters.push(sql`search_vector @@ to_tsquery('simple', ${tsquery})`);
    }

    const where = filters.length > 0 ? and(...filters) : undefined;

    const [{ total }] = await db
      .select({ total: drizzleCount() })
      .from(contents)
      .where(where);

    // Determine ordering
    let orderByClause;
    if (sortBy === 'relevance' && tsquery) {
      orderByClause = sql`ts_rank(search_vector, to_tsquery('simple', ${tsquery})) DESC`;
    } else {
      const orderFn = sortOrder === 'asc' ? asc : desc;
      const orderCol = sortBy === 'relevance' ? contents.createdAt : sortColumns[sortBy];
      orderByClause = orderFn(orderCol);
    }

    const rows = await db
      .select({
        id: contents.id,
        contentTypeId: contents.contentTypeId,
        slug: contents.slug,
        status: contents.status,
        data: contents.data,
        publishedAt: contents.publishedAt,
        editedBy: contents.editedBy,
        deletedAt: contents.deletedAt,
        createdAt: contents.createdAt,
        updatedAt: contents.updatedAt,
        ctName: contentTypes.name,
        ctSlug: contentTypes.slug,
      })
      .from(contents)
      .innerJoin(contentTypes, eq(contents.contentTypeId, contentTypes.id))
      .where(where)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    const data = rows.map(({ ctName, ctSlug, ...rest }) => ({
      ...rest,
      contentType: { name: ctName, slug: ctSlug },
    }));

    return { data, meta: buildMeta(total, page, limit) };
  }

  static async findPublic(query: PublicContentListQuery, options?: { isPreview?: boolean; contentTypeId?: string }) {
    const { page, limit, search, sortBy, sortOrder, filter } = query;
    const offset = (page - 1) * limit;
    const isPreview = options?.isPreview ?? false;

    const filters = [isNull(contents.deletedAt)];

    // Status filter — only published unless preview mode
    if (!isPreview) {
      filters.push(eq(contents.status, 'published'));
    }

    // Content type — from route param or filter
    const ctId = options?.contentTypeId ?? filter?.contentTypeId;
    if (ctId) filters.push(eq(contents.contentTypeId, ctId));

    // Slug exact match
    if (filter?.slug) filters.push(eq(contents.slug, filter.slug));

    // Date range filters
    if (filter?.createdAt?.gte) filters.push(gte(contents.createdAt, new Date(filter.createdAt.gte)));
    if (filter?.createdAt?.lte) filters.push(lte(contents.createdAt, new Date(filter.createdAt.lte)));
    if (filter?.publishedAt?.gte) filters.push(gte(contents.publishedAt, new Date(filter.publishedAt.gte)));
    if (filter?.publishedAt?.lte) filters.push(lte(contents.publishedAt, new Date(filter.publishedAt.lte)));

    // JSONB data filters (max 5)
    if (filter?.data) {
      const dataEntries = Object.entries(filter.data).slice(0, 5);
      for (const [fieldName, value] of dataEntries) {
        if (typeof value === 'string') {
          // Exact match via containment operator
          filters.push(sql`${contents.data} @> ${JSON.stringify({ [fieldName]: value })}::jsonb`);
        } else if (typeof value === 'object' && value !== null && 'like' in value) {
          // ILIKE on extracted text value — escape LIKE wildcards in user input
          const escaped = String(value.like).replace(/[%_\\]/g, '\\$&');
          filters.push(sql`${contents.data} ->> ${fieldName} ILIKE ${'%' + escaped + '%'}`);
        }
      }
    }

    // Full-text search
    const tsquery = search ? sanitizeSearchTerms(search) : null;
    if (tsquery) {
      filters.push(sql`search_vector @@ to_tsquery('simple', ${tsquery})`);
    }

    const where = filters.length > 0 ? and(...filters) : undefined;

    const [{ total }] = await db
      .select({ total: drizzleCount() })
      .from(contents)
      .where(where);

    // Determine ordering
    let orderByClause;
    if (sortBy === 'relevance' && tsquery) {
      orderByClause = sql`ts_rank(search_vector, to_tsquery('simple', ${tsquery})) DESC`;
    } else {
      const orderFn = sortOrder === 'asc' ? asc : desc;
      const orderCol = sortBy === 'relevance' ? contents.createdAt : sortColumns[sortBy];
      orderByClause = orderFn(orderCol);
    }

    const data = await db
      .select()
      .from(contents)
      .where(where)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    return { data, meta: buildMeta(total, page, limit) };
  }

  static async findById(id: string) {
    const [content] = await db.select().from(contents).where(and(eq(contents.id, id), isNull(contents.deletedAt))).limit(1);
    if (!content) throw new AppError(404, 'Content not found');
    const contentType = await ContentTypeService.findById(content.contentTypeId);
    return { ...content, contentType: { id: contentType.id, slug: contentType.slug, name: contentType.name, fields: contentType.fields } };
  }

  static async findPublishedById(id: string) {
    const [content] = await db
      .select()
      .from(contents)
      .where(and(eq(contents.id, id), eq(contents.status, 'published'), isNull(contents.deletedAt)))
      .limit(1);
    if (!content) throw new AppError(404, 'Content not found');
    return content;
  }

  private static collectMediaIds(fields: FieldDefinition[], data: Record<string, unknown>, componentMap?: ComponentFieldsMap): Set<string> {
    const ids = new Set<string>();
    for (const field of fields) {
      if (field.type === 'repeatable' && field.subFields) {
        const items = data[field.name];
        if (Array.isArray(items)) {
          for (const item of items) {
            for (const id of this.collectMediaIds(field.subFields, item as Record<string, unknown>, componentMap)) ids.add(id);
          }
        }
        continue;
      }
      if (field.type === 'component' && componentMap) {
        const blocks = data[field.name];
        if (Array.isArray(blocks)) {
          for (const block of blocks) {
            const b = block as Record<string, unknown>;
            const compFields = componentMap.get(b._component as string);
            if (compFields) {
              for (const id of this.collectMediaIds(compFields, b, componentMap)) ids.add(id);
            }
          }
        }
        continue;
      }
      if (field.type !== 'media') continue;
      const value = data[field.name];
      if (value === undefined || value === null) continue;
      if (field.multiple && Array.isArray(value)) {
        for (const uuid of value) if (typeof uuid === 'string') ids.add(uuid);
      } else if (typeof value === 'string') {
        ids.add(value);
      }
    }
    return ids;
  }

  private static collectAuthorIds(fields: FieldDefinition[], data: Record<string, unknown>, componentMap?: ComponentFieldsMap): Set<string> {
    const ids = new Set<string>();
    for (const field of fields) {
      if (field.type === 'repeatable' && field.subFields) {
        const items = data[field.name];
        if (Array.isArray(items)) {
          for (const item of items) {
            for (const id of this.collectAuthorIds(field.subFields, item as Record<string, unknown>, componentMap)) ids.add(id);
          }
        }
        continue;
      }
      if (field.type === 'component' && componentMap) {
        const blocks = data[field.name];
        if (Array.isArray(blocks)) {
          for (const block of blocks) {
            const b = block as Record<string, unknown>;
            const compFields = componentMap.get(b._component as string);
            if (compFields) {
              for (const id of this.collectAuthorIds(compFields, b, componentMap)) ids.add(id);
            }
          }
        }
        continue;
      }
      if (field.type !== 'author') continue;
      const value = data[field.name];
      if (typeof value === 'string') ids.add(value);
    }
    return ids;
  }

  private static async validateMediaFields(fields: FieldDefinition[], data: Record<string, unknown>, componentMap?: ComponentFieldsMap) {
    const ids = [...this.collectMediaIds(fields, data, componentMap)];
    if (ids.length === 0) return;
    const found = await UploadService.findByIds(ids);
    const foundIds = new Set(found.map(m => m.id));
    for (const id of ids) {
      if (!foundIds.has(id)) throw new AppError(400, `Media not found: ${id}`);
    }
  }

  private static async validateAuthorFields(fields: FieldDefinition[], data: Record<string, unknown>, componentMap?: ComponentFieldsMap) {
    const ids = [...this.collectAuthorIds(fields, data, componentMap)];
    if (ids.length === 0) return;
    const found = await UserService.findByIds(ids);
    const foundIds = new Set(found.map(u => u.id));
    for (const id of ids) {
      if (!foundIds.has(id)) throw new AppError(400, `User not found: ${id}`);
    }
  }

  private static async buildComponentMap(fields: FieldDefinition[]): Promise<ComponentFieldsMap> {
    const slugs = new Set<string>();
    const collectSlugs = (defs: FieldDefinition[]) => {
      for (const f of defs) {
        if (f.type === 'component' && f.componentSlugs) {
          for (const s of f.componentSlugs) slugs.add(s);
        }
        if (f.type === 'repeatable' && f.subFields) collectSlugs(f.subFields);
      }
    };
    collectSlugs(fields);

    const map: ComponentFieldsMap = new Map();
    if (slugs.size === 0) return map;

    const comps = await ComponentService.findBySlugs([...slugs]);
    for (const c of comps) {
      map.set(c.slug, c.fields);
    }
    return map;
  }

  private static async validateUniqueFields(
    fields: FieldDefinition[],
    data: Record<string, unknown>,
    contentTypeId: string,
    excludeContentId?: string,
  ) {
    for (const field of fields) {
      if (!field.validation?.unique) continue;
      const value = data[field.name];
      if (value === undefined || value === null || value === '') continue;

      const conditions = [
        eq(contents.contentTypeId, contentTypeId),
        isNull(contents.deletedAt),
        sql`${contents.data} ->> ${field.name} = ${String(value)}`,
      ];
      if (excludeContentId) {
        conditions.push(sql`${contents.id} != ${excludeContentId}`);
      }

      const [existing] = await db
        .select({ id: contents.id })
        .from(contents)
        .where(and(...conditions))
        .limit(1);

      if (existing) {
        throw new AppError(409, `Field "${field.label}" must be unique: value "${value}" already exists`);
      }
    }
  }

  static async findBySlug(slug: string, contentTypeId: string) {
    const [content] = await db
      .select()
      .from(contents)
      .where(and(eq(contents.slug, slug), eq(contents.contentTypeId, contentTypeId), isNull(contents.deletedAt)))
      .limit(1);
    if (!content) throw new AppError(404, 'Content not found');
    return content;
  }

  static async findPublishedBySlug(slug: string, contentTypeId: string) {
    const [content] = await db
      .select()
      .from(contents)
      .where(and(eq(contents.slug, slug), eq(contents.contentTypeId, contentTypeId), eq(contents.status, 'published'), isNull(contents.deletedAt)))
      .limit(1);
    if (!content) throw new AppError(404, 'Content not found');
    return content;
  }

  static async create(input: CreateContentInput, actor?: Actor) {
    const contentType = await ContentTypeService.findById(input.contentTypeId);

    // Singleton check: only one content allowed
    if (contentType.isSingleton) {
      const [{ total }] = await db
        .select({ total: drizzleCount() })
        .from(contents)
        .where(and(eq(contents.contentTypeId, input.contentTypeId), isNull(contents.deletedAt)));
      if (total > 0) {
        throw new AppError(409, `"${contentType.name}" is a singleton and already has an entry`);
      }
    }

    // Dynamic validation (with component resolution)
    const componentMap = await this.buildComponentMap(contentType.fields);
    const dataSchema = buildContentDataSchema(contentType.fields, componentMap);
    const dataResult = dataSchema.safeParse(input.data);
    if (!dataResult.success) {
      throw new AppError(400, `Data validation: ${dataResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')}`);
    }

    await this.validateMediaFields(contentType.fields, dataResult.data as Record<string, unknown>, componentMap);
    await this.validateAuthorFields(contentType.fields, dataResult.data as Record<string, unknown>, componentMap);
    await this.validateUniqueFields(contentType.fields, dataResult.data as Record<string, unknown>, input.contentTypeId);

    // Auto-generate slug from pattern or first text field if not provided
    let slug = (input as Record<string, unknown>).slug as string | undefined;
    if (!slug) {
      if (contentType.slugPattern) {
        const resolved = resolveSlugPattern(contentType.slugPattern, dataResult.data as Record<string, unknown>);
        if (resolved) slug = resolved;
      } else {
        const text = extractFirstTextField(contentType.fields, dataResult.data as Record<string, unknown>);
        if (text) slug = toSlug(text);
      }
    }
    if (slug) {
      slug = await this.ensureUniqueSlug(slug, input.contentTypeId);
    }

    const [content] = await db
      .insert(contents)
      .values({ contentTypeId: input.contentTypeId, slug: slug ?? null, status: input.status ?? 'draft', data: dataResult.data, editedBy: actor?.id ?? null })
      .returning();

    const actorData = actor ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent } : {};
    eventBus.emit('content.created', { content, ...actorData });
    if (content.status === 'published') {
      eventBus.emit('content.published', { content, ...actorData });
    }

    return content;
  }

  static async duplicate(id: string, actor?: Actor) {
    const existing = await this.findById(id);
    const contentType = await ContentTypeService.findById(existing.contentTypeId);

    // Singleton check
    if (contentType.isSingleton) {
      throw new AppError(409, `"${contentType.name}" is a singleton and cannot be duplicated`);
    }

    // Build slug from existing slug or first text field
    let slug = existing.slug ? `${existing.slug}-copy` : null;
    if (!slug) {
      const text = extractFirstTextField(contentType.fields, existing.data as Record<string, unknown>);
      if (text) slug = toSlug(`${text} copy`);
    }
    if (slug) {
      slug = await this.ensureUniqueSlug(slug, existing.contentTypeId);
    }

    const [content] = await db
      .insert(contents)
      .values({ contentTypeId: existing.contentTypeId, slug, status: 'draft', data: existing.data })
      .returning();

    const actorData = actor ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent } : {};
    eventBus.emit('content.created', { content, ...actorData });

    return content;
  }

  static async update(id: string, input: UpdateContentInput, userId?: string, actor?: Actor, userPermissions?: string[]) {
    const existing = await this.findById(id);

    // Check content lock — reject if locked by another user
    if (userId) {
      await LockService.checkLock(id, userId);
    }

    // Validate workflow transition if status is changing
    if (input.status && input.status !== existing.status && userPermissions) {
      WorkflowService.validateTransition(existing.status, input.status, userPermissions);
    }

    let validatedData: Record<string, unknown> | undefined;
    // Cache contentType for reuse in unique validation inside transaction
    let cachedContentType: Awaited<ReturnType<typeof ContentTypeService.findById>> | undefined;
    if (input.data) {
      cachedContentType = await ContentTypeService.findById(existing.contentTypeId);
      const componentMap = await this.buildComponentMap(cachedContentType.fields);
      const dataSchema = buildContentDataSchema(cachedContentType.fields, componentMap);
      const dataResult = dataSchema.safeParse(input.data);
      if (!dataResult.success) {
        throw new AppError(400, `Data validation: ${dataResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')}`);
      }
      await this.validateMediaFields(cachedContentType.fields, dataResult.data as Record<string, unknown>, componentMap);
      await this.validateAuthorFields(cachedContentType.fields, dataResult.data as Record<string, unknown>, componentMap);
      validatedData = dataResult.data as Record<string, unknown>;
    }

    // Handle slug update
    const updateData: Record<string, unknown> = { ...input };
    if (validatedData) updateData.data = validatedData;
    const slugInput = (input as Record<string, unknown>).slug;
    if (typeof slugInput === 'string') {
      updateData.slug = await this.ensureUniqueSlug(slugInput, existing.contentTypeId, id);
    }

    // Set editedBy
    if (userId) {
      updateData.editedBy = userId;
    }

    // Set publishedAt when transitioning to published
    if (input.status === 'published' && existing.status !== 'published') {
      updateData.publishedAt = new Date();
    }

    // Handle scheduled publishedAt
    const publishedAtInput = (input as Record<string, unknown>).publishedAt;
    if (input.status === 'scheduled' && typeof publishedAtInput === 'string') {
      updateData.publishedAt = new Date(publishedAtInput);
    }

    // Atomic transaction: unique check + snapshot + update + release lock
    const content = await db.transaction(async (tx) => {
      // Validate unique fields inside transaction to prevent TOCTOU
      if (validatedData && cachedContentType) {
        await this.validateUniqueFields(cachedContentType.fields, validatedData, existing.contentTypeId, id);
      }

      // Snapshot current state before updating (if userId provided)
      if (userId) {
        await ContentVersionService.snapshot(id, userId, tx);
      }

      const [updated] = await tx.update(contents).set(updateData).where(eq(contents.id, id)).returning();

      // Auto-release lock on successful save
      if (userId) {
        await tx.delete(contentLocks).where(and(eq(contentLocks.contentId, id), eq(contentLocks.lockedBy, userId)));
      }

      return updated;
    });

    const actorData = actor ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent } : {};
    eventBus.emit('content.updated', { content, ...actorData });

    // Emit workflow-specific events
    if (existing.status !== content.status) {
      if (content.status === 'published') {
        eventBus.emit('content.published', { content, ...actorData });
      } else if (content.status === 'in-review') {
        eventBus.emit('content.review-requested', { content, ...actorData });
      } else if (content.status === 'approved') {
        eventBus.emit('content.approved', { content, ...actorData });
      } else if (content.status === 'scheduled') {
        eventBus.emit('content.scheduled', { content, ...actorData });
      }
      // Rejection: in-review → draft
      if (existing.status === 'in-review' && content.status === 'draft') {
        eventBus.emit('content.rejected', { content, ...actorData });
      }
    }

    return content;
  }

  static async delete(id: string, actor?: Actor) {
    const content = await this.findById(id);
    await db.update(contents).set({ deletedAt: new Date() }).where(eq(contents.id, id));
    const actorData = actor ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent } : {};
    eventBus.emit('content.trashed', { content, ...actorData });
    eventBus.emit('content.deleted', { content, ...actorData }); // backward compat
  }

  static async bulkAction(ids: string[], action: string, actor?: Actor) {
    const actorData = actor ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent } : {};

    switch (action) {
      case 'delete': {
        const toDelete = await db.select().from(contents).where(and(inArray(contents.id, ids), isNull(contents.deletedAt)));
        if (toDelete.length > 0) {
          await db.update(contents).set({ deletedAt: new Date() }).where(inArray(contents.id, toDelete.map(c => c.id)));
          for (const content of toDelete) {
            eventBus.emit('content.trashed', { content, ...actorData });
            eventBus.emit('content.deleted', { content, ...actorData });
          }
        }
        return { affected: toDelete.length };
      }
      case 'restore': {
        const toRestore = await db.select().from(contents).where(and(inArray(contents.id, ids), isNotNull(contents.deletedAt)));
        if (toRestore.length > 0) {
          await db.update(contents).set({ deletedAt: null }).where(inArray(contents.id, toRestore.map(c => c.id)));
          for (const content of toRestore) {
            eventBus.emit('content.restored', { content, ...actorData });
          }
        }
        return { affected: toRestore.length };
      }
      case 'permanent-delete': {
        const toPurge = await db.select().from(contents).where(and(inArray(contents.id, ids), isNotNull(contents.deletedAt)));
        if (toPurge.length > 0) {
          await db.delete(contents).where(inArray(contents.id, toPurge.map(c => c.id)));
          for (const content of toPurge) {
            eventBus.emit('content.purged', { content, ...actorData });
          }
        }
        return { affected: toPurge.length };
      }
      case 'publish': {
        const result = await db
          .update(contents)
          .set({ status: 'published' })
          .where(inArray(contents.id, ids))
          .returning();
        for (const content of result) {
          eventBus.emit('content.published', { content, ...actorData });
        }
        return { affected: result.length };
      }
      case 'unpublish': {
        const result = await db
          .update(contents)
          .set({ status: 'draft' })
          .where(inArray(contents.id, ids))
          .returning();
        for (const content of result) {
          eventBus.emit('content.updated', { content, ...actorData });
        }
        return { affected: result.length };
      }
      default:
        throw new AppError(400, `Unknown bulk action: ${action}`);
    }
  }

  // ─── Trash methods ─────────────────────────────────────

  static async findTrashedById(id: string) {
    const [content] = await db.select().from(contents).where(and(eq(contents.id, id), isNotNull(contents.deletedAt))).limit(1);
    if (!content) throw new AppError(404, 'Trashed content not found');
    return content;
  }

  static async findTrashed(query: TrashListQuery) {
    const { page, limit, contentTypeId, search, sortBy, sortOrder } = query;
    const offset = (page - 1) * limit;

    const filters = [isNotNull(contents.deletedAt)];
    if (contentTypeId) filters.push(eq(contents.contentTypeId, contentTypeId));

    const tsquery = search ? sanitizeSearchTerms(search) : null;
    if (tsquery) {
      filters.push(sql`search_vector @@ to_tsquery('simple', ${tsquery})`);
    }

    const where = and(...filters);

    const [{ total }] = await db
      .select({ total: drizzleCount() })
      .from(contents)
      .where(where);

    const orderFn = sortOrder === 'asc' ? asc : desc;
    const orderByClause = sortBy === 'deletedAt'
      ? orderFn(contents.deletedAt)
      : orderFn(sortColumns[sortBy as keyof typeof sortColumns]);

    const data = await db
      .select()
      .from(contents)
      .where(where)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    return { data, meta: buildMeta(total, page, limit) };
  }

  static async restore(id: string, actor?: Actor) {
    await this.findTrashedById(id);
    const [restored] = await db.update(contents).set({ deletedAt: null }).where(eq(contents.id, id)).returning();
    const actorData = actor ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent } : {};
    eventBus.emit('content.restored', { content: restored, ...actorData });
    return restored;
  }

  static async permanentDelete(id: string, actor?: Actor) {
    const content = await this.findTrashedById(id);
    await db.delete(contents).where(eq(contents.id, id));
    const actorData = actor ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent } : {};
    eventBus.emit('content.purged', { content, ...actorData });
  }

  static async trashCount() {
    const [{ total }] = await db
      .select({ total: drizzleCount() })
      .from(contents)
      .where(isNotNull(contents.deletedAt));
    return total;
  }
}
