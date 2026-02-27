import { eq, ilike, or, count as drizzleCount } from 'drizzle-orm';
import { db } from '../db/index.js';
import { roles, users } from '../db/schema/index.js';
import { AppError } from '../utils/app-error.js';
import { buildMeta } from '../utils/pagination.js';
import { ALL_PERMISSIONS } from '@eli-cms/shared';
import type { CreateRoleInput, UpdateRoleInput, RoleListQuery } from '@eli-cms/shared';
import { eventBus } from './event-bus.js';
import type { Actor } from './content.service.js';

export class RoleService {
  static async findAll(query: RoleListQuery) {
    const { page, limit, search } = query;
    const offset = (page - 1) * limit;

    const conditions = search
      ? or(ilike(roles.name, `%${search}%`), ilike(roles.slug, `%${search}%`))
      : undefined;

    const [{ total }] = await db
      .select({ total: drizzleCount() })
      .from(roles)
      .where(conditions);

    const data = await db
      .select()
      .from(roles)
      .where(conditions)
      .orderBy(roles.createdAt)
      .limit(limit)
      .offset(offset);

    return { data, meta: buildMeta(total, page, limit) };
  }

  static async findById(id: string) {
    const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
    if (!role) throw new AppError(404, 'Role not found');
    return role;
  }

  static async findBySlug(slug: string) {
    const [role] = await db.select().from(roles).where(eq(roles.slug, slug)).limit(1);
    return role ?? null;
  }

  static async create(input: CreateRoleInput, actor?: Actor) {
    // Validate permissions against known set
    const invalid = input.permissions.filter((p) => !ALL_PERMISSIONS.includes(p as (typeof ALL_PERMISSIONS)[number]));
    if (invalid.length > 0) {
      throw new AppError(400, `Invalid permissions: ${invalid.join(', ')}`);
    }

    const existing = await this.findBySlug(input.slug);
    if (existing) throw new AppError(409, `Slug "${input.slug}" already exists`);

    const [role] = await db
      .insert(roles)
      .values({
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        permissions: input.permissions,
        isSystem: false,
      })
      .returning();

    const actorData = actor ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent } : {};
    eventBus.emit('role.created', { role, ...actorData });
    return role;
  }

  static async update(id: string, input: UpdateRoleInput, actor?: Actor) {
    const existing = await this.findById(id);

    if (existing.isSystem) {
      if (input.slug && input.slug !== existing.slug) {
        throw new AppError(403, 'Cannot change slug of a system role');
      }
    }

    // Prevent users from modifying permissions of their own role (self-lock protection)
    if (input.permissions && actor?.id) {
      const [actorUser] = await db.select().from(users).where(eq(users.id, actor.id)).limit(1);
      if (actorUser && actorUser.roleId === id) {
        throw new AppError(403, 'Cannot modify permissions of your own role');
      }
    }

    if (input.permissions) {
      const invalid = input.permissions.filter((p) => !ALL_PERMISSIONS.includes(p as (typeof ALL_PERMISSIONS)[number]));
      if (invalid.length > 0) {
        throw new AppError(400, `Invalid permissions: ${invalid.join(', ')}`);
      }
    }

    if (input.slug && input.slug !== existing.slug) {
      const slugExists = await this.findBySlug(input.slug);
      if (slugExists) throw new AppError(409, `Slug "${input.slug}" already exists`);
    }

    const [role] = await db.update(roles).set(input).where(eq(roles.id, id)).returning();
    const actorData = actor ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent } : {};
    eventBus.emit('role.updated', { role, ...actorData });
    return role;
  }

  static async delete(id: string, actor?: Actor) {
    const existing = await this.findById(id);

    if (existing.isSystem) {
      throw new AppError(403, 'Cannot delete a system role');
    }

    // Check no users use this role
    const [{ total }] = await db
      .select({ total: drizzleCount() })
      .from(users)
      .where(eq(users.roleId, id));

    if (total > 0) {
      throw new AppError(409, `Cannot delete role — ${total} user(s) still assigned`);
    }

    await db.delete(roles).where(eq(roles.id, id));
    const actorData = actor ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent } : {};
    eventBus.emit('role.deleted', { role: existing, ...actorData });
  }
}
