import type { Context } from 'koa';
import {
  createContentTypeTemplateSchema,
  updateContentTypeTemplateSchema,
  contentTypeTemplateListQuerySchema,
} from '@eli-cms/shared';
import { ContentTypeTemplateService } from '../services/content-type-template.service.js';
import { AppError } from '../utils/app-error.js';
import { extractActor } from '../utils/extract-actor.js';

export class ContentTypeTemplateController {
  static async list(ctx: Context) {
    const result = contentTypeTemplateListQuerySchema.safeParse(ctx.query);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((i) => i.message).join(', '));
    }
    const { data, meta } = await ContentTypeTemplateService.findAll(result.data);
    ctx.body = { success: true, data, meta };
  }

  static async get(ctx: Context) {
    const data = await ContentTypeTemplateService.findById(ctx.params.id);
    ctx.body = { success: true, data };
  }

  static async create(ctx: Context) {
    const result = createContentTypeTemplateSchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((i) => i.message).join(', '));
    }
    const data = await ContentTypeTemplateService.create(result.data, extractActor(ctx));
    ctx.status = 201;
    ctx.body = { success: true, data };
  }

  static async update(ctx: Context) {
    const result = updateContentTypeTemplateSchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((i) => i.message).join(', '));
    }
    const data = await ContentTypeTemplateService.update(ctx.params.id, result.data, extractActor(ctx));
    ctx.body = { success: true, data };
  }

  static async delete(ctx: Context) {
    await ContentTypeTemplateService.delete(ctx.params.id, extractActor(ctx));
    ctx.status = 204;
  }
}
