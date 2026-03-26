import type { Context } from 'koa';
import { notificationListQuerySchema } from '@eli-cms/shared';
import { NotificationService } from '../services/notification.service.js';
import { AppError } from '../utils/app-error.js';

export class NotificationController {
  static async list(ctx: Context) {
    const result = notificationListQuerySchema.safeParse(ctx.query);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((i) => i.message).join(', '));
    }
    const { data, meta } = await NotificationService.findByUser(ctx.state.user.userId, result.data);
    ctx.body = { success: true, data, meta };
  }

  static async unreadCount(ctx: Context) {
    const count = await NotificationService.unreadCount(ctx.state.user.userId);
    ctx.body = { success: true, data: { count } };
  }

  static async markRead(ctx: Context) {
    const data = await NotificationService.markRead(ctx.params.id, ctx.state.user.userId);
    ctx.body = { success: true, data };
  }

  static async markAllRead(ctx: Context) {
    await NotificationService.markAllRead(ctx.state.user.userId);
    ctx.body = { success: true };
  }
}
