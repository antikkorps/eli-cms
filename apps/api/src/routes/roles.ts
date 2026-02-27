import Router from '@koa/router';
import { RoleController } from '../controllers/role.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permission-guard.js';
import { ROLES_READ, ROLES_CREATE, ROLES_UPDATE, ROLES_DELETE } from '@eli-cms/shared';

export const rolesRouter = new Router({ prefix: '/api/v1/roles' });

rolesRouter.get('/', authenticate, requirePermission(ROLES_READ), RoleController.list);
rolesRouter.get('/:id', authenticate, requirePermission(ROLES_READ), RoleController.get);
rolesRouter.post('/', authenticate, requirePermission(ROLES_CREATE), RoleController.create);
rolesRouter.put('/:id', authenticate, requirePermission(ROLES_UPDATE), RoleController.update);
rolesRouter.delete('/:id', authenticate, requirePermission(ROLES_DELETE), RoleController.delete);
