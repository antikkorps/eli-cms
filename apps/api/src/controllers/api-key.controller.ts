import type { Context } from 'koa';
import { createApiKeySchema, updateApiKeySchema, apiKeyListQuerySchema } from '@eli-cms/shared';
import { ApiKeyService } from '../services/api-key.service.js';
import { AppError } from '../utils/app-error.js';

export class ApiKeyController {
  static async list(ctx: Context) {
    const result = apiKeyListQuerySchema.safeParse(ctx.query);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((i) => i.message).join(', '));
    }
    const { data, meta } = await ApiKeyService.findAll(result.data);
    ctx.body = { success: true, data, meta };
  }

  static async get(ctx: Context) {
    const data = await ApiKeyService.findById(ctx.params.id);
    ctx.body = { success: true, data };
  }

  static async create(ctx: Context) {
    const result = createApiKeySchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((i) => i.message).join(', '));
    }
    const data = await ApiKeyService.create(result.data, ctx.state.user.userId);
    ctx.status = 201;
    ctx.body = { success: true, data };
  }

  static async update(ctx: Context) {
    const result = updateApiKeySchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((i) => i.message).join(', '));
    }
    const data = await ApiKeyService.update(ctx.params.id, result.data);
    ctx.body = { success: true, data };
  }

  static async delete(ctx: Context) {
    await ApiKeyService.delete(ctx.params.id);
    ctx.status = 204;
  }
}
