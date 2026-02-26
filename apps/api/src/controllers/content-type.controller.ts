import type { Context } from 'koa';
import { createContentTypeSchema, updateContentTypeSchema, contentTypeListQuerySchema } from '@eli-cms/shared';
import { ContentTypeService } from '../services/content-type.service.js';
import { AppError } from '../utils/app-error.js';

export class ContentTypeController {
  static async list(ctx: Context) {
    const result = contentTypeListQuerySchema.safeParse(ctx.query);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map(i => i.message).join(', '));
    }
    const { data, meta } = await ContentTypeService.findAll(result.data);
    ctx.body = { success: true, data, meta };
  }

  static async get(ctx: Context) {
    const data = await ContentTypeService.findById(ctx.params.id);
    ctx.body = { success: true, data };
  }

  static async create(ctx: Context) {
    const result = createContentTypeSchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map(i => i.message).join(', '));
    }
    const data = await ContentTypeService.create(result.data);
    ctx.status = 201;
    ctx.body = { success: true, data };
  }

  static async update(ctx: Context) {
    const result = updateContentTypeSchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map(i => i.message).join(', '));
    }
    const data = await ContentTypeService.update(ctx.params.id, result.data);
    ctx.body = { success: true, data };
  }

  static async delete(ctx: Context) {
    await ContentTypeService.delete(ctx.params.id);
    ctx.status = 204;
  }
}
