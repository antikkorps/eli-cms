import type { Context } from 'koa';
import { setupSchema } from '@eli-cms/shared';
import { SetupService } from '../services/setup.service.js';
import { AppError } from '../utils/app-error.js';

export class SetupController {
  static async status(ctx: Context) {
    const data = await SetupService.getStatus();
    ctx.body = { success: true, data };
  }

  static async initialize(ctx: Context) {
    const result = setupSchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((i) => i.message).join(', '));
    }

    const { user, tokens } = await SetupService.initialize({
      email: result.data.email,
      password: result.data.password,
    });

    ctx.status = 201;
    ctx.body = { success: true, data: { user, tokens } };
  }
}
