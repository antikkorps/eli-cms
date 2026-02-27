import Router from '@koa/router';
import { ContentRelationController } from '../controllers/content-relation.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permission-guard.js';
import { CONTENT_READ, CONTENT_UPDATE } from '@eli-cms/shared';

export const contentRelationsRouter = new Router({ prefix: '/api/v1/contents' });

contentRelationsRouter.post('/:id/relations', authenticate, requirePermission(CONTENT_UPDATE), ContentRelationController.create);
contentRelationsRouter.get('/:id/relations', authenticate, requirePermission(CONTENT_READ), ContentRelationController.listBySource);
contentRelationsRouter.delete('/:id/relations/:relationId', authenticate, requirePermission(CONTENT_UPDATE), ContentRelationController.delete);
