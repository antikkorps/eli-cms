import type { Context } from 'koa';
import { createComponentSchema, updateComponentSchema, componentListQuerySchema } from '@eli-cms/shared';
import { ComponentService } from '../services/component.service.js';
import { AppError } from '../utils/app-error.js';
import { extractActor } from '../utils/extract-actor.js';

export class ComponentController {
  static async list(ctx: Context) {
    const result = componentListQuerySchema.safeParse(ctx.query);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map(i => i.message).join(', '));
    }
    const { data, meta } = await ComponentService.findAll(result.data);
    ctx.body = { success: true, data, meta };
  }

  static async get(ctx: Context) {
    const data = await ComponentService.findById(ctx.params.id);
    ctx.body = { success: true, data };
  }

  static async create(ctx: Context) {
    const result = createComponentSchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map(i => i.message).join(', '));
    }
    const data = await ComponentService.create(result.data, extractActor(ctx));
    ctx.status = 201;
    ctx.body = { success: true, data };
  }

  static async update(ctx: Context) {
    const result = updateComponentSchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map(i => i.message).join(', '));
    }
    const data = await ComponentService.update(ctx.params.id, result.data, extractActor(ctx));
    ctx.body = { success: true, data };
  }

  static async delete(ctx: Context) {
    await ComponentService.delete(ctx.params.id, extractActor(ctx));
    ctx.status = 204;
  }
}
