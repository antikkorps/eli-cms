import Router from '@koa/router';
import { ContentController } from '../controllers/content.controller.js';
import { authenticate } from '../middleware/auth.js';

export const contentsRouter = new Router({ prefix: '/api/contents' });

contentsRouter.get('/', authenticate, ContentController.list);
contentsRouter.get('/:id', authenticate, ContentController.get);
contentsRouter.post('/', authenticate, ContentController.create);
contentsRouter.put('/:id', authenticate, ContentController.update);
contentsRouter.delete('/:id', authenticate, ContentController.delete);
