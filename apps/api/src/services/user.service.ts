import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema/index.js';
import { AppError } from '../utils/app-error.js';

export class UserService {
  static async findAll() {
    return db
      .select({ id: users.id, email: users.email, role: users.role, createdAt: users.createdAt, updatedAt: users.updatedAt })
      .from(users)
      .orderBy(users.createdAt);
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
