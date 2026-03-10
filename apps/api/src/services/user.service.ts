import { eq, ilike, and, count as drizzleCount } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { users, roles } from '../db/schema/index.js';
import { AppError } from '../utils/app-error.js';
import { buildMeta } from '../utils/pagination.js';
import type { UserListQuery, CreateUserInput, UpdateUserInput } from '@eli-cms/shared';
import { eventBus } from './event-bus.js';
import type { Actor } from './content.service.js';

export class UserService {
  static async findAll(query: UserListQuery) {
    const { page, limit, roleId, search } = query;
    const offset = (page - 1) * limit;

    const filters = [];
    if (roleId) filters.push(eq(users.roleId, roleId));
    if (search) filters.push(ilike(users.email, `%${search}%`));

    const where = filters.length > 0 ? and(...filters) : undefined;

    const [{ total }] = await db
      .select({ total: drizzleCount() })
      .from(users)
      .where(where);

    const data = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        roleId: users.roleId,
        roleName: roles.name,
        roleSlug: roles.slug,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(where)
      .orderBy(users.createdAt)
      .limit(limit)
      .offset(offset);

    return { data, meta: buildMeta(total, page, limit) };
  }

  static async findById(id: string) {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        roleId: users.roleId,
        roleName: roles.name,
        roleSlug: roles.slug,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, id))
      .limit(1);
    if (!user) throw new AppError(404, 'User not found');
    return user;
  }

  static async create(input: CreateUserInput, actor?: Actor) {
    // Check email uniqueness
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
    if (existing) throw new AppError(409, 'Email already registered');

    // Verify role exists
    const [role] = await db.select({ id: roles.id }).from(roles).where(eq(roles.id, input.roleId)).limit(1);
    if (!role) throw new AppError(400, 'Role not found');

    const hashedPassword = await bcrypt.hash(input.password, 12);
    const [user] = await db
      .insert(users)
      .values({
        email: input.email,
        password: hashedPassword,
        firstName: input.firstName || null,
        lastName: input.lastName || null,
        roleId: input.roleId,
      })
      .returning({ id: users.id, email: users.email, roleId: users.roleId, createdAt: users.createdAt });

    const actorData = actor ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent } : {};
    eventBus.emit('user.created', { userId: user.id, email: user.email, ...actorData });

    return this.findById(user.id);
  }

  static async update(id: string, input: UpdateUserInput, currentUserId: string, actor?: Actor) {
    const existing = await this.findById(id);

    const updates: Record<string, unknown> = {};

    if (input.email !== undefined && input.email !== existing.email) {
      const [dup] = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
      if (dup && dup.id !== id) throw new AppError(409, 'Email already in use');
      updates.email = input.email;
    }

    if (input.firstName !== undefined) updates.firstName = input.firstName;
    if (input.lastName !== undefined) updates.lastName = input.lastName;

    if (input.roleId !== undefined && input.roleId !== existing.roleId) {
      if (id === currentUserId) {
        throw new AppError(403, 'You cannot change your own role');
      }

      const [role] = await db.select({ id: roles.id }).from(roles).where(eq(roles.id, input.roleId)).limit(1);
      if (!role) throw new AppError(400, 'Role not found');
      updates.roleId = input.roleId;
    }

    if (input.password) {
      updates.password = await bcrypt.hash(input.password, 12);
    }

    if (Object.keys(updates).length > 0) {
      await db.update(users).set(updates).where(eq(users.id, id));
    }

    const actorData = actor ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent } : {};
    eventBus.emit('user.updated', { userId: id, ...actorData });

    return this.findById(id);
  }

  static async delete(id: string, actor?: Actor) {
    await this.findById(id);
    await db.delete(users).where(eq(users.id, id));
    const actorData = actor ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent } : {};
    eventBus.emit('user.deleted', { userId: id, ...actorData });
  }
}
