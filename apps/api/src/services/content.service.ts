import { eq, and, count as drizzleCount, asc, desc, sql, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { contents } from '../db/schema/index.js';
import { ContentTypeService } from './content-type.service.js';
import { AppError } from '../utils/app-error.js';
import { buildMeta } from '../utils/pagination.js';
import { buildContentDataSchema } from '@eli-cms/shared';
import { ContentVersionService } from './content-version.service.js';
import type { CreateContentInput, UpdateContentInput, ContentListQuery, ActorType, FieldDefinition } from '@eli-cms/shared';
import { eventBus } from './event-bus.js';
import { UploadService } from './upload.service.js';
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
      const filters = [eq(contents.slug, slug), eq(contents.contentTypeId, contentTypeId)];
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

    const filters = [];
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
    const [content] = await db.select().from(contents).where(eq(contents.id, id)).limit(1);
    if (!content) throw new AppError(404, 'Content not found');
    return content;
  }

  static async findPublishedById(id: string) {
    const [content] = await db
      .select()
      .from(contents)
      .where(and(eq(contents.id, id), eq(contents.status, 'published')))
      .limit(1);
    if (!content) throw new AppError(404, 'Content not found');
    return content;
  }

  private static async validateMediaFields(fields: FieldDefinition[], data: Record<string, unknown>) {
    const mediaFields = fields.filter((f) => f.type === 'media');
    for (const field of mediaFields) {
      const value = data[field.name];
      if (value === undefined || value === null) continue;

      if (field.multiple && Array.isArray(value)) {
        for (const uuid of value) {
          try {
            await UploadService.findById(uuid as string);
          } catch {
            throw new AppError(400, `Media not found for field "${field.name}"`);
          }
        }
      } else if (typeof value === 'string') {
        try {
          await UploadService.findById(value);
        } catch {
          throw new AppError(400, `Media not found for field "${field.name}"`);
        }
      }
    }
  }

  static async findBySlug(slug: string, contentTypeId: string) {
    const [content] = await db
      .select()
      .from(contents)
      .where(and(eq(contents.slug, slug), eq(contents.contentTypeId, contentTypeId)))
      .limit(1);
    if (!content) throw new AppError(404, 'Content not found');
    return content;
  }

  static async findPublishedBySlug(slug: string, contentTypeId: string) {
    const [content] = await db
      .select()
      .from(contents)
      .where(and(eq(contents.slug, slug), eq(contents.contentTypeId, contentTypeId), eq(contents.status, 'published')))
      .limit(1);
    if (!content) throw new AppError(404, 'Content not found');
    return content;
  }

  static async create(input: CreateContentInput, actor?: Actor) {
    const contentType = await ContentTypeService.findById(input.contentTypeId);

    // Dynamic validation
    const dataSchema = buildContentDataSchema(contentType.fields);
    const dataResult = dataSchema.safeParse(input.data);
    if (!dataResult.success) {
      throw new AppError(400, `Data validation: ${dataResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')}`);
    }

    await this.validateMediaFields(contentType.fields, dataResult.data as Record<string, unknown>);

    // Auto-generate slug from first text field if not provided
    let slug = (input as Record<string, unknown>).slug as string | undefined;
    if (!slug) {
      const text = extractFirstTextField(contentType.fields, dataResult.data as Record<string, unknown>);
      if (text) slug = toSlug(text);
    }
    if (slug) {
      slug = await this.ensureUniqueSlug(slug, input.contentTypeId);
    }

    const [content] = await db
      .insert(contents)
      .values({ contentTypeId: input.contentTypeId, slug: slug ?? null, status: input.status ?? 'draft', data: dataResult.data })
      .returning();

    const actorData = actor ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent } : {};
    eventBus.emit('content.created', { content, ...actorData });
    if (content.status === 'published') {
      eventBus.emit('content.published', { content, ...actorData });
    }

    return content;
  }

  static async update(id: string, input: UpdateContentInput, userId?: string, actor?: Actor, userPermissions?: string[]) {
    const existing = await this.findById(id);

    // Validate workflow transition if status is changing
    if (input.status && input.status !== existing.status && userPermissions) {
      WorkflowService.validateTransition(existing.status, input.status, userPermissions);
    }

    // Snapshot current state before updating (if userId provided)
    if (userId) {
      await ContentVersionService.snapshot(id, userId);
    }

    if (input.data) {
      const contentType = await ContentTypeService.findById(existing.contentTypeId);
      const dataSchema = buildContentDataSchema(contentType.fields);
      const dataResult = dataSchema.safeParse(input.data);
      if (!dataResult.success) {
        throw new AppError(400, `Data validation: ${dataResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')}`);
      }
      await this.validateMediaFields(contentType.fields, dataResult.data as Record<string, unknown>);
      input.data = dataResult.data as Record<string, unknown>;
    }

    // Handle slug update
    const updateData: Record<string, unknown> = { ...input };
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

    const [content] = await db.update(contents).set(updateData).where(eq(contents.id, id)).returning();

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
    await db.delete(contents).where(eq(contents.id, id));
    const actorData = actor ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent } : {};
    eventBus.emit('content.deleted', { content, ...actorData });
  }

  static async bulkAction(ids: string[], action: string, actor?: Actor) {
    const actorData = actor ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent } : {};

    switch (action) {
      case 'delete': {
        const toDelete = await db.select().from(contents).where(inArray(contents.id, ids));
        await db.delete(contents).where(inArray(contents.id, ids));
        for (const content of toDelete) {
          eventBus.emit('content.deleted', { content, ...actorData });
        }
        return { affected: toDelete.length };
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
}
