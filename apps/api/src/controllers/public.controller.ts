import type { Context } from 'koa';
import {
  contentTypeListQuerySchema,
  publicContentListQuerySchema,
} from '@eli-cms/shared';
import { ContentTypeService } from '../services/content-type.service.js';
import { ContentService } from '../services/content.service.js';
import { AppError } from '../utils/app-error.js';

export class PublicController {
  static async listContentTypes(ctx: Context) {
    const result = contentTypeListQuerySchema.safeParse(ctx.query);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map(i => i.message).join(', '));
    }
    const { data, meta } = await ContentTypeService.findAll(result.data);
    ctx.body = { success: true, data, meta };
  }

  static async getContentTypeBySlug(ctx: Context) {
    const data = await ContentTypeService.findBySlugOrFail(ctx.params.slug);
    ctx.body = { success: true, data };
  }

  static async listContents(ctx: Context) {
    const result = publicContentListQuerySchema.safeParse(ctx.query);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map(i => i.message).join(', '));
    }
    const { data, meta } = await ContentService.findAll({
      ...result.data,
      status: 'published',
      sortBy: result.data.sortBy,
      sortOrder: result.data.sortOrder,
    });
    ctx.body = { success: true, data, meta };
  }

  static async getContentById(ctx: Context) {
    const data = await ContentService.findPublishedById(ctx.params.id);
    ctx.body = { success: true, data };
  }

  static async listContentsByType(ctx: Context) {
    const contentType = await ContentTypeService.findBySlugOrFail(ctx.params.slug);

    const result = publicContentListQuerySchema.safeParse(ctx.query);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map(i => i.message).join(', '));
    }
    const { data, meta } = await ContentService.findAll({
      ...result.data,
      contentTypeId: contentType.id,
      status: 'published',
      sortBy: result.data.sortBy,
      sortOrder: result.data.sortOrder,
    });
    ctx.body = { success: true, data, meta };
  }

  static async getContentBySlug(ctx: Context) {
    const contentType = await ContentTypeService.findBySlugOrFail(ctx.params.slug);
    const data = await ContentService.findPublishedBySlug(ctx.params.contentSlug, contentType.id);
    ctx.body = { success: true, data };
  }
}
