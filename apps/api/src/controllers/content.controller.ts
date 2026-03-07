import type { Context } from 'koa';
import { createContentSchema, updateContentSchema, contentListQuerySchema, bulkContentActionSchema, trashListQuerySchema } from '@eli-cms/shared';
import { ContentService } from '../services/content.service.js';
import { AppError } from '../utils/app-error.js';
import { extractActor } from '../utils/extract-actor.js';

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
    const data = await ContentService.create(result.data, extractActor(ctx));
    ctx.status = 201;
    ctx.body = { success: true, data };
  }

  static async update(ctx: Context) {
    const result = updateContentSchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map(i => i.message).join(', '));
    }
    const userId = ctx.state.user.userId as string;
    const userPermissions = (ctx.state.user.permissions ?? []) as string[];
    const data = await ContentService.update(ctx.params.id, result.data, userId, extractActor(ctx), userPermissions);
    ctx.body = { success: true, data };
  }

  static async duplicate(ctx: Context) {
    const data = await ContentService.duplicate(ctx.params.id, extractActor(ctx));
    ctx.status = 201;
    ctx.body = { success: true, data };
  }

  static async delete(ctx: Context) {
    await ContentService.delete(ctx.params.id, extractActor(ctx));
    ctx.status = 204;
  }

  static async bulkAction(ctx: Context) {
    const result = bulkContentActionSchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map(i => i.message).join(', '));
    }
    const data = await ContentService.bulkAction(result.data.ids, result.data.action, extractActor(ctx));
    ctx.body = { success: true, data };
  }

  // ─── Trash ──────────────────────────────────────────────

  static async listTrash(ctx: Context) {
    const result = trashListQuerySchema.safeParse(ctx.query);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map(i => i.message).join(', '));
    }
    const { data, meta } = await ContentService.findTrashed(result.data);
    ctx.body = { success: true, data, meta };
  }

  static async trashCount(ctx: Context) {
    const count = await ContentService.trashCount();
    ctx.body = { success: true, data: { count } };
  }

  static async restore(ctx: Context) {
    const data = await ContentService.restore(ctx.params.id, extractActor(ctx));
    ctx.body = { success: true, data };
  }

  static async permanentDelete(ctx: Context) {
    await ContentService.permanentDelete(ctx.params.id, extractActor(ctx));
    ctx.status = 204;
  }
}
