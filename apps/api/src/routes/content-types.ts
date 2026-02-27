import Router from '@koa/router';
import { ContentTypeController } from '../controllers/content-type.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permission-guard.js';
import { CONTENT_TYPES_READ, CONTENT_TYPES_CREATE, CONTENT_TYPES_UPDATE, CONTENT_TYPES_DELETE } from '@eli-cms/shared';

export const contentTypesRouter = new Router({ prefix: '/api/v1/content-types' });

contentTypesRouter.get('/', authenticate, requirePermission(CONTENT_TYPES_READ), ContentTypeController.list);
contentTypesRouter.get('/:id', authenticate, requirePermission(CONTENT_TYPES_READ), ContentTypeController.get);
contentTypesRouter.post('/', authenticate, requirePermission(CONTENT_TYPES_CREATE), ContentTypeController.create);
contentTypesRouter.put('/:id', authenticate, requirePermission(CONTENT_TYPES_UPDATE), ContentTypeController.update);
contentTypesRouter.delete('/:id', authenticate, requirePermission(CONTENT_TYPES_DELETE), ContentTypeController.delete);
