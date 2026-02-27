import Router from '@koa/router';
import { ContentVersionController } from '../controllers/content-version.controller.js';
import { authenticate } from '../middleware/auth.js';

export const contentVersionsRouter = new Router({ prefix: '/api/v1/contents' });

contentVersionsRouter.get('/:id/versions', authenticate, ContentVersionController.list);
contentVersionsRouter.get('/:id/versions/:versionId', authenticate, ContentVersionController.get);
contentVersionsRouter.post('/:id/versions/:versionId/restore', authenticate, ContentVersionController.restore);
