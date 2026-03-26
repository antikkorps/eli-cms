import type { Context } from 'koa';
import { userListQuerySchema, createUserSchema, updateUserSchema } from '@eli-cms/shared';
import { or, ilike } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema/index.js';
import { UserService } from '../services/user.service.js';
import { AppError } from '../utils/app-error.js';
import { extractActor } from '../utils/extract-actor.js';

export class UserController {
  static async mentionSearch(ctx: Context) {
    const q = ((ctx.query.q as string) ?? '').trim();
    if (!q || q.length < 1) {
      ctx.body = { success: true, data: [] };
      return;
    }
    const pattern = `%${q}%`;
    const data = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        avatarStyle: users.avatarStyle,
        avatarSeed: users.avatarSeed,
      })
      .from(users)
      .where(or(ilike(users.email, pattern), ilike(users.firstName, pattern), ilike(users.lastName, pattern)))
      .limit(10);
    ctx.body = { success: true, data };
  }

  static async list(ctx: Context) {
    const result = userListQuerySchema.safeParse(ctx.query);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((i) => i.message).join(', '));
    }
    const { data, meta } = await UserService.findAll(result.data);
    ctx.body = { success: true, data, meta };
  }

  static async get(ctx: Context) {
    const data = await UserService.findById(ctx.params.id);
    ctx.body = { success: true, data };
  }

  static async create(ctx: Context) {
    const result = createUserSchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((i) => i.message).join(', '));
    }
    const data = await UserService.create(result.data, extractActor(ctx));
    ctx.status = 201;
    ctx.body = { success: true, data };
  }

  static async update(ctx: Context) {
    const result = updateUserSchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((i) => i.message).join(', '));
    }
    const currentUserId = ctx.state.user.userId;
    const data = await UserService.update(ctx.params.id, result.data, currentUserId, extractActor(ctx));
    ctx.body = { success: true, data };
  }

  static async delete(ctx: Context) {
    const currentUserId = ctx.state.user.userId;
    if (ctx.params.id === currentUserId) {
      throw new AppError(403, 'You cannot delete your own account');
    }
    await UserService.delete(ctx.params.id, extractActor(ctx));
    ctx.status = 204;
  }
}
