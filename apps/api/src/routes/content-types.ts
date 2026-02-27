import Router from '@koa/router';
import { ContentTypeController } from '../controllers/content-type.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/role-guard.js';

export const contentTypesRouter = new Router({ prefix: '/api/v1/content-types' });

contentTypesRouter.get('/', authenticate, ContentTypeController.list);
contentTypesRouter.get('/:id', authenticate, ContentTypeController.get);
contentTypesRouter.post('/', authenticate, requireRole('admin'), ContentTypeController.create);
contentTypesRouter.put('/:id', authenticate, requireRole('admin'), ContentTypeController.update);
contentTypesRouter.delete('/:id', authenticate, requireRole('admin'), ContentTypeController.delete);
