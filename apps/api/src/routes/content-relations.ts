import Router from '@koa/router';
import { ContentRelationController } from '../controllers/content-relation.controller.js';
import { authenticate } from '../middleware/auth.js';

export const contentRelationsRouter = new Router({ prefix: '/api/v1/contents' });

contentRelationsRouter.post('/:id/relations', authenticate, ContentRelationController.create);
contentRelationsRouter.get('/:id/relations', authenticate, ContentRelationController.listBySource);
contentRelationsRouter.delete('/:id/relations/:relationId', authenticate, ContentRelationController.delete);
