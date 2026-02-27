import type { Context } from 'koa';
import { createContentRelationSchema, contentRelationListQuerySchema } from '@eli-cms/shared';
import { ContentRelationService } from '../services/content-relation.service.js';
import { AppError } from '../utils/app-error.js';

export class ContentRelationController {
  static async create(ctx: Context) {
    const result = createContentRelationSchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((i) => i.message).join(', '));
    }
    const data = await ContentRelationService.create(ctx.params.id, result.data);
    ctx.status = 201;
    ctx.body = { success: true, data };
  }

  static async listBySource(ctx: Context) {
    const result = contentRelationListQuerySchema.safeParse(ctx.query);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((i) => i.message).join(', '));
    }
    const { data, meta } = await ContentRelationService.findBySource(ctx.params.id, result.data);
    ctx.body = { success: true, data, meta };
  }

  static async delete(ctx: Context) {
    await ContentRelationService.delete(ctx.params.id, ctx.params.relationId);
    ctx.status = 204;
  }
}
