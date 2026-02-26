import type { Context } from 'koa';
import { loginSchema, registerSchema, refreshTokenSchema } from '@eli-cms/shared';
import { AuthService } from '../services/auth.service.js';
import { AppError } from '../utils/app-error.js';

export class AuthController {
  static async register(ctx: Context) {
    const result = registerSchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map(i => i.message).join(', '));
    }

    const user = await AuthService.register(result.data);
    ctx.status = 201;
    ctx.body = { success: true, data: user };
  }

  static async login(ctx: Context) {
    const result = loginSchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map(i => i.message).join(', '));
    }

    const tokens = await AuthService.login(result.data);
    ctx.body = { success: true, data: tokens };
  }

  static async refresh(ctx: Context) {
    const result = refreshTokenSchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, 'refreshToken is required');
    }

    const tokens = await AuthService.refresh(result.data.refreshToken);
    ctx.body = { success: true, data: tokens };
  }

  static async me(ctx: Context) {
    const user = await AuthService.getUserFromToken(ctx.state.user);
    ctx.body = { success: true, data: user };
  }
}
