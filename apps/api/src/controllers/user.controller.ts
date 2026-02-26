import type { Context } from 'koa';
import { UserService } from '../services/user.service.js';

export class UserController {
  static async list(ctx: Context) {
    const data = await UserService.findAll();
    ctx.body = { success: true, data };
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
