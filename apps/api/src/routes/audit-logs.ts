import Router from '@koa/router';
import { AuditLogController } from '../controllers/audit-log.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permission-guard.js';
import { AUDIT_LOGS_READ } from '@eli-cms/shared';

export const auditLogsRouter = new Router({ prefix: '/api/v1/audit-logs' });

auditLogsRouter.get('/', authenticate, requirePermission(AUDIT_LOGS_READ), AuditLogController.list);
