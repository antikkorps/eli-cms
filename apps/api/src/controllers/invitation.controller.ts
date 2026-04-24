import type { Context } from 'koa';
import { createInvitationSchema, acceptInvitationSchema, invitationListQuerySchema } from '@eli-cms/shared';
import { InvitationService } from '../services/invitation.service.js';
import { AppError } from '../utils/app-error.js';
import { extractActor } from '../utils/extract-actor.js';
import { env } from '../config/environment.js';

export class InvitationController {
  static async list(ctx: Context) {
    const result = invitationListQuerySchema.safeParse(ctx.query);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((i) => i.message).join(', '));
    }
    const { data, meta } = await InvitationService.findAll(result.data);
    ctx.body = { success: true, data, meta };
  }

  static async create(ctx: Context) {
    const result = createInvitationSchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((i) => i.message).join(', '));
    }
    const data = await InvitationService.create(
      result.data,
      ctx.state.user.userId,
      env.FRONTEND_URL,
      extractActor(ctx),
    );
    ctx.status = 201;
    ctx.body = { success: true, data };
  }

  static async resend(ctx: Context) {
    const data = await InvitationService.resend(
      ctx.params.id,
      ctx.state.user.userId,
      env.FRONTEND_URL,
      extractActor(ctx),
    );
    ctx.body = { success: true, data };
  }

  static async revoke(ctx: Context) {
    await InvitationService.revoke(ctx.params.id, extractActor(ctx));
    ctx.status = 204;
  }

  static async verify(ctx: Context) {
    const token = (ctx.query.token as string | undefined) ?? '';
    if (!token || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
      throw new AppError(400, 'Invalid invitation token');
    }
    const data = await InvitationService.verify(token);
    ctx.body = { success: true, data };
  }

  static async accept(ctx: Context) {
    const result = acceptInvitationSchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((i) => i.message).join(', '));
    }
    const data = await InvitationService.accept(result.data);
    ctx.status = 201;
    ctx.body = { success: true, data };
  }
}
