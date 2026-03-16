import { eq, ilike, or, count as drizzleCount } from 'drizzle-orm';
import { db } from '../db/index.js';
import { components } from '../db/schema/index.js';
import { AppError } from '../utils/app-error.js';
import { buildMeta } from '../utils/pagination.js';
import type { CreateComponentInput, UpdateComponentInput, ComponentListQuery } from '@eli-cms/shared';
import { eventBus } from './event-bus.js';
import type { Actor } from './content.service.js';

export class ComponentService {
  static async findAll(query: ComponentListQuery) {
    const { page, limit, search } = query;
    const offset = (page - 1) * limit;

    const conditions = search
      ? or(ilike(components.name, `%${search}%`), ilike(components.slug, `%${search}%`))
      : undefined;

    const [{ total }] = await db.select({ total: drizzleCount() }).from(components).where(conditions);

    const data = await db
      .select()
      .from(components)
      .where(conditions)
      .orderBy(components.createdAt)
      .limit(limit)
      .offset(offset);

    return { data, meta: buildMeta(total, page, limit) };
  }

  static async findAllRaw() {
    return db.select().from(components).orderBy(components.createdAt);
  }

  static async findById(id: string) {
    const [comp] = await db.select().from(components).where(eq(components.id, id)).limit(1);
    if (!comp) throw new AppError(404, 'Component not found');
    return comp;
  }

  static async findBySlug(slug: string) {
    const [comp] = await db.select().from(components).where(eq(components.slug, slug)).limit(1);
    return comp ?? null;
  }

  static async findBySlugs(slugs: string[]) {
    const result = [];
    for (const slug of slugs) {
      const comp = await this.findBySlug(slug);
      if (comp) result.push(comp);
    }
    return result;
  }

  static async create(input: CreateComponentInput, actor?: Actor) {
    const existing = await this.findBySlug(input.slug);
    if (existing) throw new AppError(409, `Slug "${input.slug}" already exists`);

    const [comp] = await db.insert(components).values(input).returning();
    const actorData = actor
      ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent }
      : {};
    eventBus.emit('component.created', { component: comp, ...actorData });
    return comp;
  }

  static async update(id: string, input: UpdateComponentInput, actor?: Actor) {
    await this.findById(id); // ensure exists

    if (input.slug) {
      const existing = await this.findBySlug(input.slug);
      if (existing && existing.id !== id) {
        throw new AppError(409, `Slug "${input.slug}" already exists`);
      }
    }

    const [comp] = await db.update(components).set(input).where(eq(components.id, id)).returning();
    const actorData = actor
      ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent }
      : {};
    eventBus.emit('component.updated', { component: comp, ...actorData });
    return comp;
  }

  static async delete(id: string, actor?: Actor) {
    const comp = await this.findById(id);
    await db.delete(components).where(eq(components.id, id));
    const actorData = actor
      ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent }
      : {};
    eventBus.emit('component.deleted', { component: comp, ...actorData });
  }
}
