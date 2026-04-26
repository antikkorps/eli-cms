import { eq, ilike, or, count as drizzleCount } from 'drizzle-orm';
import { db } from '../db/index.js';
import { contentTypeTemplates } from '../db/schema/index.js';
import { AppError } from '../utils/app-error.js';
import { buildMeta } from '../utils/pagination.js';
import type {
  CreateContentTypeTemplateInput,
  UpdateContentTypeTemplateInput,
  ContentTypeTemplateListQuery,
} from '@eli-cms/shared';
import { eventBus } from './event-bus.js';
import type { Actor } from './content.service.js';

export class ContentTypeTemplateService {
  static async findAll(query: ContentTypeTemplateListQuery) {
    const { page, limit, search } = query;
    const offset = (page - 1) * limit;

    const conditions = search
      ? or(ilike(contentTypeTemplates.name, `%${search}%`), ilike(contentTypeTemplates.slug, `%${search}%`))
      : undefined;

    const [{ total }] = await db.select({ total: drizzleCount() }).from(contentTypeTemplates).where(conditions);

    const data = await db
      .select()
      .from(contentTypeTemplates)
      .where(conditions)
      .orderBy(contentTypeTemplates.createdAt)
      .limit(limit)
      .offset(offset);

    return { data, meta: buildMeta(total, page, limit) };
  }

  static async findById(id: string) {
    const [tpl] = await db.select().from(contentTypeTemplates).where(eq(contentTypeTemplates.id, id)).limit(1);
    if (!tpl) throw new AppError(404, 'Content type template not found');
    return tpl;
  }

  static async findBySlug(slug: string) {
    const [tpl] = await db.select().from(contentTypeTemplates).where(eq(contentTypeTemplates.slug, slug)).limit(1);
    return tpl ?? null;
  }

  static async create(input: CreateContentTypeTemplateInput, actor?: Actor) {
    const existing = await this.findBySlug(input.slug);
    if (existing) throw new AppError(409, `Slug "${input.slug}" already exists`);

    const [tpl] = await db
      .insert(contentTypeTemplates)
      .values({ ...input, isSystem: false })
      .returning();
    const actorData = actor
      ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent }
      : {};
    eventBus.emit('content_type_template.created', { template: tpl, ...actorData });
    return tpl;
  }

  static async update(id: string, input: UpdateContentTypeTemplateInput, actor?: Actor) {
    const existing = await this.findById(id);
    if (existing.isSystem) {
      throw new AppError(403, 'System templates cannot be modified — clone it first');
    }

    if (input.slug && input.slug !== existing.slug) {
      const collision = await this.findBySlug(input.slug);
      if (collision && collision.id !== id) {
        throw new AppError(409, `Slug "${input.slug}" already exists`);
      }
    }

    const [tpl] = await db.update(contentTypeTemplates).set(input).where(eq(contentTypeTemplates.id, id)).returning();
    const actorData = actor
      ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent }
      : {};
    eventBus.emit('content_type_template.updated', { template: tpl, ...actorData });
    return tpl;
  }

  static async delete(id: string, actor?: Actor) {
    const tpl = await this.findById(id);
    if (tpl.isSystem) {
      throw new AppError(403, 'System templates cannot be deleted');
    }
    await db.delete(contentTypeTemplates).where(eq(contentTypeTemplates.id, id));
    const actorData = actor
      ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent }
      : {};
    eventBus.emit('content_type_template.deleted', { template: tpl, ...actorData });
  }
}
