import type { Context } from 'koa';
import { LockService } from '../services/lock.service.js';

export class LockController {
  static async acquire(ctx: Context) {
    const userId = ctx.state.user.userId as string;
    const lock = await LockService.acquire(ctx.params.id, userId);
    ctx.body = { success: true, data: lock };
  }

  static async release(ctx: Context) {
    const userId = ctx.state.user.userId as string;
    await LockService.release(ctx.params.id, userId);
    ctx.status = 204;
  }

  static async heartbeat(ctx: Context) {
    const userId = ctx.state.user.userId as string;
    const lock = await LockService.heartbeat(ctx.params.id, userId);
    ctx.body = { success: true, data: lock };
  }

  static async getStatus(ctx: Context) {
    const lock = await LockService.getStatus(ctx.params.id);
    ctx.body = { success: true, data: lock };
  }
}
