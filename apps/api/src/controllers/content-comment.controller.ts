import type { Context } from 'koa';
import { createContentCommentSchema, updateContentCommentSchema, contentCommentListQuerySchema } from '@eli-cms/shared';
import { ContentCommentService } from '../services/content-comment.service.js';
import { AppError } from '../utils/app-error.js';

function isAdmin(ctx: Context): boolean {
  const perms: string[] = ctx.state.user?.permissions ?? [];
  return perms.includes('*');
}

export class ContentCommentController {
  static async list(ctx: Context) {
    const result = contentCommentListQuerySchema.safeParse(ctx.query);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((i) => i.message).join(', '));
    }
    const { data, meta } = await ContentCommentService.findByContent(ctx.params.id, result.data);
    ctx.body = { success: true, data, meta };
  }

  static async create(ctx: Context) {
    const result = createContentCommentSchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((i) => i.message).join(', '));
    }
    const data = await ContentCommentService.create(ctx.params.id, ctx.state.user.userId, result.data);
    ctx.status = 201;
    ctx.body = { success: true, data };
  }

  static async update(ctx: Context) {
    const result = updateContentCommentSchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((i) => i.message).join(', '));
    }
    const data = await ContentCommentService.update(
      ctx.params.commentId,
      ctx.state.user.userId,
      result.data,
      isAdmin(ctx),
    );
    ctx.body = { success: true, data };
  }

  static async delete(ctx: Context) {
    await ContentCommentService.delete(ctx.params.commentId, ctx.state.user.userId, isAdmin(ctx));
    ctx.status = 204;
  }
}
