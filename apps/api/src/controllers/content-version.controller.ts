import type { Context } from 'koa';
import { contentVersionListQuerySchema } from '@eli-cms/shared';
import { ContentVersionService } from '../services/content-version.service.js';
import { AppError } from '../utils/app-error.js';

export class ContentVersionController {
  static async list(ctx: Context) {
    const result = contentVersionListQuerySchema.safeParse(ctx.query);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((i) => i.message).join(', '));
    }
    const { data, meta } = await ContentVersionService.findAll(ctx.params.id, result.data);
    ctx.body = { success: true, data, meta };
  }

  static async get(ctx: Context) {
    const data = await ContentVersionService.findById(ctx.params.id, ctx.params.versionId);
    ctx.body = { success: true, data };
  }

  static async restore(ctx: Context) {
    const userId = ctx.state.user.userId as string;
    const versionNumber = Number(ctx.params.versionNumber);
    if (!Number.isInteger(versionNumber) || versionNumber < 1) {
      throw new AppError(400, 'Invalid version number');
    }
    const data = await ContentVersionService.restore(ctx.params.id, versionNumber, userId);
    ctx.body = { success: true, data };
  }
}
