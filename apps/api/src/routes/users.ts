import Router from '@koa/router';
import { UserController } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permission-guard.js';
import { USERS_READ, USERS_DELETE } from '@eli-cms/shared';

export const usersRouter = new Router({ prefix: '/api/v1/users' });

usersRouter.get('/', authenticate, requirePermission(USERS_READ), UserController.list);
usersRouter.get('/:id', authenticate, requirePermission(USERS_READ), UserController.get);
usersRouter.delete('/:id', authenticate, requirePermission(USERS_DELETE), UserController.delete);
