import type { Context } from 'koa';
import { createContentSchema, updateContentSchema, contentListQuerySchema } from '@eli-cms/shared';
import { ContentService } from '../services/content.service.js';
import { AppError } from '../utils/app-error.js';

export class ContentController {
  static async list(ctx: Context) {
    const result = contentListQuerySchema.safeParse(ctx.query);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map(i => i.message).join(', '));
    }
    const { data, meta } = await ContentService.findAll(result.data);
    ctx.body = { success: true, data, meta };
  }

  static async get(ctx: Context) {
    const data = await ContentService.findById(ctx.params.id);
    ctx.body = { success: true, data };
  }

  static async create(ctx: Context) {
    const result = createContentSchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map(i => i.message).join(', '));
    }
    const data = await ContentService.create(result.data);
    ctx.status = 201;
    ctx.body = { success: true, data };
  }

  static async update(ctx: Context) {
    const result = updateContentSchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map(i => i.message).join(', '));
    }
    const data = await ContentService.update(ctx.params.id, result.data);
    ctx.body = { success: true, data };
  }

  static async delete(ctx: Context) {
    await ContentService.delete(ctx.params.id);
    ctx.status = 204;
  }
}
