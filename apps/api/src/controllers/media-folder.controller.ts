import type { Context } from 'koa';
import { createMediaFolderSchema, updateMediaFolderSchema, mediaFolderListQuerySchema } from '@eli-cms/shared';
import { MediaFolderService } from '../services/media-folder.service.js';
import { AppError } from '../utils/app-error.js';

export class MediaFolderController {
  static async list(ctx: Context) {
    const result = mediaFolderListQuerySchema.safeParse(ctx.query);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((i) => i.message).join(', '));
    }
    const { data, meta } = await MediaFolderService.findAll(result.data);
    ctx.body = { success: true, data, meta };
  }

  static async tree(ctx: Context) {
    const data = await MediaFolderService.buildTree();
    ctx.body = { success: true, data };
  }

  static async get(ctx: Context) {
    const data = await MediaFolderService.findById(ctx.params.id);
    ctx.body = { success: true, data };
  }

  static async create(ctx: Context) {
    const result = createMediaFolderSchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((i) => i.message).join(', '));
    }
    const data = await MediaFolderService.create(result.data);
    ctx.status = 201;
    ctx.body = { success: true, data };
  }

  static async update(ctx: Context) {
    const result = updateMediaFolderSchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((i) => i.message).join(', '));
    }
    const data = await MediaFolderService.update(ctx.params.id, result.data);
    ctx.body = { success: true, data };
  }

  static async delete(ctx: Context) {
    await MediaFolderService.delete(ctx.params.id);
    ctx.status = 204;
  }
}
