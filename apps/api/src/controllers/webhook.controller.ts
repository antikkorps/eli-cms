import type { Context } from 'koa';
import {
  createWebhookSchema,
  updateWebhookSchema,
  webhookListQuerySchema,
  webhookDeliveryListQuerySchema,
} from '@eli-cms/shared';
import { WebhookService } from '../services/webhook.service.js';
import { AppError } from '../utils/app-error.js';
import { extractActor } from '../utils/extract-actor.js';

export class WebhookController {
  static async list(ctx: Context) {
    const result = webhookListQuerySchema.safeParse(ctx.query);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((i) => i.message).join(', '));
    }
    const { data, meta } = await WebhookService.findAll(result.data);
    ctx.body = { success: true, data, meta };
  }

  static async get(ctx: Context) {
    const webhook = await WebhookService.findById(ctx.params.id);
    ctx.body = { success: true, data: webhook };
  }

  static async create(ctx: Context) {
    const result = createWebhookSchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((i) => i.message).join(', '));
    }
    const webhook = await WebhookService.create(result.data, ctx.state.user.userId, extractActor(ctx));
    ctx.status = 201;
    ctx.body = { success: true, data: webhook };
  }

  static async update(ctx: Context) {
    const result = updateWebhookSchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((i) => i.message).join(', '));
    }
    const webhook = await WebhookService.update(ctx.params.id, result.data, extractActor(ctx));
    ctx.body = { success: true, data: webhook };
  }

  static async delete(ctx: Context) {
    await WebhookService.delete(ctx.params.id, extractActor(ctx));
    ctx.body = { success: true };
  }

  static async listDeliveries(ctx: Context) {
    const result = webhookDeliveryListQuerySchema.safeParse(ctx.query);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((i) => i.message).join(', '));
    }
    // Ensure webhook exists
    await WebhookService.findById(ctx.params.id);
    const { data, meta } = await WebhookService.findDeliveries(ctx.params.id, result.data);
    ctx.body = { success: true, data, meta };
  }
}
