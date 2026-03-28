import { eq, ilike, or, and, count as drizzleCount, sql, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { contentTypes, contents } from '../db/schema/index.js';
import { AppError } from '../utils/app-error.js';
import { buildMeta } from '../utils/pagination.js';
import type { CreateContentTypeInput, UpdateContentTypeInput, ContentTypeListQuery } from '@eli-cms/shared';
import { getSeoFields, SEO_FIELD_PREFIX } from '@eli-cms/shared';
import { eventBus } from './event-bus.js';
import type { Actor } from './content.service.js';

/** Append SEO fields to a content type's fields array (read-time only). */
function injectSeoFields<T extends { fields: unknown }>(ct: T): T {
  const existing = ct.fields as Array<{ name: string }>;
  // Filter out any user fields that would collide with reserved _seo* names
  const userFields = existing.filter((f) => !f.name.startsWith(SEO_FIELD_PREFIX));
  return { ...ct, fields: [...userFields, ...getSeoFields()] };
}

export class ContentTypeService {
  static async findAll(query: ContentTypeListQuery) {
    const { page, limit, search, includeCounts } = query;
    const offset = (page - 1) * limit;

    const conditions = search
      ? or(ilike(contentTypes.name, `%${search}%`), ilike(contentTypes.slug, `%${search}%`))
      : undefined;

    const [{ total }] = await db.select({ total: drizzleCount() }).from(contentTypes).where(conditions);

    if (includeCounts) {
      const countSubquery = db
        .select({
          contentTypeId: contents.contentTypeId,
          contentCount: drizzleCount().as('content_count'),
        })
        .from(contents)
        .where(isNull(contents.deletedAt))
        .groupBy(contents.contentTypeId)
        .as('counts');

      const data = await db
        .select({
          id: contentTypes.id,
          slug: contentTypes.slug,
          name: contentTypes.name,
          fields: contentTypes.fields,
          isSingleton: contentTypes.isSingleton,
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

      return { data: data.map(injectSeoFields), meta: buildMeta(total, page, limit) };
    }

    const data = await db
      .select()
      .from(contentTypes)
      .where(conditions)
      .orderBy(contentTypes.createdAt)
      .limit(limit)
      .offset(offset);

    return { data: data.map(injectSeoFields), meta: buildMeta(total, page, limit) };
  }

  static async findAllRaw() {
    const data = await db.select().from(contentTypes).orderBy(contentTypes.createdAt);
    return data.map(injectSeoFields);
  }

  static async findById(id: string) {
    const [ct] = await db.select().from(contentTypes).where(eq(contentTypes.id, id)).limit(1);
    if (!ct) throw new AppError(404, 'Content type not found');
    return injectSeoFields(ct);
  }

  static async findBySlug(slug: string) {
    const [ct] = await db.select().from(contentTypes).where(eq(contentTypes.slug, slug)).limit(1);
    return ct ? injectSeoFields(ct) : null;
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
    const actorData = actor
      ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent }
      : {};
    eventBus.emit('content_type.created', { contentType: ct, ...actorData });
    return ct;
  }

  static async update(id: string, input: UpdateContentTypeInput, actor?: Actor) {
    const current = await this.findById(id); // ensure exists

    // Prevent enabling singleton if >1 content already exists
    if (input.isSingleton === true && !current.isSingleton) {
      const [{ total }] = await db
        .select({ total: drizzleCount() })
        .from(contents)
        .where(and(eq(contents.contentTypeId, id), isNull(contents.deletedAt)));
      if (total > 1) {
        throw new AppError(409, `Cannot enable singleton: ${total} contents already exist (max 1)`);
      }
    }

    if (input.slug) {
      const existing = await this.findBySlug(input.slug);
      if (existing && existing.id !== id) {
        throw new AppError(409, `Slug "${input.slug}" already exists`);
      }
    }

    const [ct] = await db.update(contentTypes).set(input).where(eq(contentTypes.id, id)).returning();
    const actorData = actor
      ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent }
      : {};
    eventBus.emit('content_type.updated', { contentType: ct, ...actorData });
    return ct;
  }

  static async delete(id: string, actor?: Actor) {
    const ct = await this.findById(id);

    const [{ total }] = await db
      .select({ total: drizzleCount() })
      .from(contents)
      .where(and(eq(contents.contentTypeId, id), isNull(contents.deletedAt)));
    if (total > 0) {
      throw new AppError(409, `Cannot delete: ${total} content(s) still exist. Delete them first.`);
    }

    await db.delete(contentTypes).where(eq(contentTypes.id, id));
    const actorData = actor
      ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent }
      : {};
    eventBus.emit('content_type.deleted', { contentType: ct, ...actorData });
  }
}
