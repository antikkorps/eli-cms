import { eq, ilike, and, count as drizzleCount } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema/index.js';
import { AppError } from '../utils/app-error.js';
import { buildMeta } from '../utils/pagination.js';
import type { UserListQuery } from '@eli-cms/shared';

export class UserService {
  static async findAll(query: UserListQuery) {
    const { page, limit, role, search } = query;
    const offset = (page - 1) * limit;

    const filters = [];
    if (role) filters.push(eq(users.role, role));
    if (search) filters.push(ilike(users.email, `%${search}%`));

    const where = filters.length > 0 ? and(...filters) : undefined;

    const [{ total }] = await db
      .select({ total: drizzleCount() })
      .from(users)
      .where(where);

    const data = await db
      .select({ id: users.id, email: users.email, role: users.role, createdAt: users.createdAt, updatedAt: users.updatedAt })
      .from(users)
      .where(where)
      .orderBy(users.createdAt)
      .limit(limit)
      .offset(offset);

    return { data, meta: buildMeta(total, page, limit) };
  }

  static async findById(id: string) {
    const [user] = await db
      .select({ id: users.id, email: users.email, role: users.role, createdAt: users.createdAt, updatedAt: users.updatedAt })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!user) throw new AppError(404, 'User not found');
    return user;
  }

  static async delete(id: string) {
    await this.findById(id);
    await db.delete(users).where(eq(users.id, id));
  }
}
