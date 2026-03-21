import type { Context } from 'koa';
import { StatsService } from '../services/stats.service.js';

export class StatsController {
  static async dashboard(ctx: Context) {
    const [contentOverTime, contentByStatus, contentByType, storageUsage, activityOverTime] = await Promise.all([
      StatsService.contentOverTime(30),
      StatsService.contentByStatus(),
      StatsService.contentByType(),
      StatsService.storageUsage(),
      StatsService.activityOverTime(30),
    ]);

    ctx.body = {
      success: true,
      data: {
        contentOverTime,
        contentByStatus,
        contentByType,
        storageUsage,
        activityOverTime,
      },
    };
  }
}
