import { eq, ilike, or, count as drizzleCount } from 'drizzle-orm';
import { db } from '../db/index.js';
import { contentTypes } from '../db/schema/index.js';
import { AppError } from '../utils/app-error.js';
import { buildMeta } from '../utils/pagination.js';
import type { CreateContentTypeInput, UpdateContentTypeInput, ContentTypeListQuery } from '@eli-cms/shared';
import { eventBus } from './event-bus.js';

export class ContentTypeService {
  static async findAll(query: ContentTypeListQuery) {
    const { page, limit, search } = query;
    const offset = (page - 1) * limit;

    const conditions = search
      ? or(ilike(contentTypes.name, `%${search}%`), ilike(contentTypes.slug, `%${search}%`))
      : undefined;

    const [{ total }] = await db
      .select({ total: drizzleCount() })
      .from(contentTypes)
      .where(conditions);

    const data = await db
      .select()
      .from(contentTypes)
      .where(conditions)
      .orderBy(contentTypes.createdAt)
      .limit(limit)
      .offset(offset);

    return { data, meta: buildMeta(total, page, limit) };
  }

  static async findById(id: string) {
    const [ct] = await db.select().from(contentTypes).where(eq(contentTypes.id, id)).limit(1);
    if (!ct) throw new AppError(404, 'Content type not found');
    return ct;
  }

  static async findBySlug(slug: string) {
    const [ct] = await db.select().from(contentTypes).where(eq(contentTypes.slug, slug)).limit(1);
    return ct ?? null;
  }

  static async findBySlugOrFail(slug: string) {
    const ct = await this.findBySlug(slug);
    if (!ct) throw new AppError(404, 'Content type not found');
    return ct;
  }

  static async create(input: CreateContentTypeInput) {
    const existing = await this.findBySlug(input.slug);
    if (existing) throw new AppError(409, `Slug "${input.slug}" already exists`);

    const [ct] = await db.insert(contentTypes).values(input).returning();
    eventBus.emit('content_type.created', { contentType: ct });
    return ct;
  }

  static async update(id: string, input: UpdateContentTypeInput) {
    await this.findById(id); // ensure exists

    if (input.slug) {
      const existing = await this.findBySlug(input.slug);
      if (existing && existing.id !== id) {
        throw new AppError(409, `Slug "${input.slug}" already exists`);
      }
    }

    const [ct] = await db.update(contentTypes).set(input).where(eq(contentTypes.id, id)).returning();
    eventBus.emit('content_type.updated', { contentType: ct });
    return ct;
  }

  static async delete(id: string) {
    const ct = await this.findById(id);
    await db.delete(contentTypes).where(eq(contentTypes.id, id));
    eventBus.emit('content_type.deleted', { contentType: ct });
  }
}
