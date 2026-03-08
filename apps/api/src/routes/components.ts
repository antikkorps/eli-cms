import Router from '@koa/router';
import { ComponentController } from '../controllers/component.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permission-guard.js';
import { COMPONENTS_READ, COMPONENTS_CREATE, COMPONENTS_UPDATE, COMPONENTS_DELETE } from '@eli-cms/shared';

export const componentsRouter = new Router({ prefix: '/api/v1/components' });

componentsRouter.get('/', authenticate, requirePermission(COMPONENTS_READ), ComponentController.list);
componentsRouter.get('/:id', authenticate, requirePermission(COMPONENTS_READ), ComponentController.get);
componentsRouter.post('/', authenticate, requirePermission(COMPONENTS_CREATE), ComponentController.create);
componentsRouter.put('/:id', authenticate, requirePermission(COMPONENTS_UPDATE), ComponentController.update);
componentsRouter.delete('/:id', authenticate, requirePermission(COMPONENTS_DELETE), ComponentController.delete);
