import type { Context } from 'koa';
import { auditLogListQuerySchema } from '@eli-cms/shared';
import { AuditService } from '../services/audit.service.js';
import { AppError } from '../utils/app-error.js';

export class AuditLogController {
  static async list(ctx: Context) {
    const result = auditLogListQuerySchema.safeParse(ctx.query);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((i) => i.message).join(', '));
    }
    const { data, meta } = await AuditService.findAll(result.data);
    ctx.body = { success: true, data, meta };
  }
}
