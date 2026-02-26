import type { Context } from 'koa';
import { userListQuerySchema } from '@eli-cms/shared';
import { UserService } from '../services/user.service.js';
import { AppError } from '../utils/app-error.js';

export class UserController {
  static async list(ctx: Context) {
    const result = userListQuerySchema.safeParse(ctx.query);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map(i => i.message).join(', '));
    }
    const { data, meta } = await UserService.findAll(result.data);
    ctx.body = { success: true, data, meta };
  }

  static async get(ctx: Context) {
    const data = await UserService.findById(ctx.params.id);
    ctx.body = { success: true, data };
  }

  static async delete(ctx: Context) {
    await UserService.delete(ctx.params.id);
    ctx.status = 204;
  }
}
