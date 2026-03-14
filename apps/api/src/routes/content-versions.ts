import Router from '@koa/router';
import { ContentVersionController } from '../controllers/content-version.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permission-guard.js';
import { CONTENT_READ, CONTENT_UPDATE } from '@eli-cms/shared';

export const contentVersionsRouter = new Router({ prefix: '/api/v1/contents' });

contentVersionsRouter.get(
  '/:id/versions',
  authenticate,
  requirePermission(CONTENT_READ),
  ContentVersionController.list,
);
contentVersionsRouter.get(
  '/:id/versions/:versionId',
  authenticate,
  requirePermission(CONTENT_READ),
  ContentVersionController.get,
);
contentVersionsRouter.post(
  '/:id/versions/:versionNumber/restore',
  authenticate,
  requirePermission(CONTENT_UPDATE),
  ContentVersionController.restore,
);
