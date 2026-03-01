import { eq, ilike, or, count as drizzleCount, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { contentTypes, contents } from '../db/schema/index.js';
import { AppError } from '../utils/app-error.js';
import { buildMeta } from '../utils/pagination.js';
import type { CreateContentTypeInput, UpdateContentTypeInput, ContentTypeListQuery } from '@eli-cms/shared';
import { eventBus } from './event-bus.js';
import type { Actor } from './content.service.js';

export class ContentTypeService {
  static async findAll(query: ContentTypeListQuery) {
    const { page, limit, search, includeCounts } = query;
    const offset = (page - 1) * limit;

    const conditions = search
      ? or(ilike(contentTypes.name, `%${search}%`), ilike(contentTypes.slug, `%${search}%`))
      : undefined;

    const [{ total }] = await db
      .select({ total: drizzleCount() })
      .from(contentTypes)
      .where(conditions);

    if (includeCounts) {
      const countSubquery = db
        .select({
          contentTypeId: contents.contentTypeId,
          contentCount: drizzleCount().as('content_count'),
        })
        .from(contents)
        .groupBy(contents.contentTypeId)
        .as('counts');

      const data = await db
        .select({
          id: contentTypes.id,
          slug: contentTypes.slug,
          name: contentTypes.name,
          fields: contentTypes.fields,
          createdAt: contentTypes.createdAt,
          updatedAt: contentTypes.updatedAt,
          contentCount: sql<number>`coalesce(${countSubquery.contentCount}, 0)`.mapWith(Number),
        })
        .from(contentTypes)
        .leftJoin(countSubquery, eq(contentTypes.id, countSubquery.contentTypeId))
        .where(conditions)
        .orderBy(contentTypes.createdAt)
        .limit(limit)
        .offset(offset);

      return { data, meta: buildMeta(total, page, limit) };
    }

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

  static async create(input: CreateContentTypeInput, actor?: Actor) {
    const existing = await this.findBySlug(input.slug);
    if (existing) throw new AppError(409, `Slug "${input.slug}" already exists`);

    const [ct] = await db.insert(contentTypes).values(input).returning();
    const actorData = actor ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent } : {};
    eventBus.emit('content_type.created', { contentType: ct, ...actorData });
    return ct;
  }

  static async update(id: string, input: UpdateContentTypeInput, actor?: Actor) {
    await this.findById(id); // ensure exists

    if (input.slug) {
      const existing = await this.findBySlug(input.slug);
      if (existing && existing.id !== id) {
        throw new AppError(409, `Slug "${input.slug}" already exists`);
      }
    }

    const [ct] = await db.update(contentTypes).set(input).where(eq(contentTypes.id, id)).returning();
    const actorData = actor ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent } : {};
    eventBus.emit('content_type.updated', { contentType: ct, ...actorData });
    return ct;
  }

  static async delete(id: string, actor?: Actor) {
    const ct = await this.findById(id);
    await db.delete(contentTypes).where(eq(contentTypes.id, id));
    const actorData = actor ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent } : {};
    eventBus.emit('content_type.deleted', { contentType: ct, ...actorData });
  }
}
