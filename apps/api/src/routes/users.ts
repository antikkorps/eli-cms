import Router from '@koa/router';
import { UserController } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permission-guard.js';
import { USERS_CREATE, USERS_READ, USERS_UPDATE, USERS_DELETE, COMMENTS_CREATE } from '@eli-cms/shared';

export const usersRouter = new Router({ prefix: '/api/v1/users' });

usersRouter.get('/mention-search', authenticate, requirePermission(COMMENTS_CREATE), UserController.mentionSearch);
usersRouter.get('/', authenticate, requirePermission(USERS_READ), UserController.list);
usersRouter.get('/:id', authenticate, requirePermission(USERS_READ), UserController.get);
usersRouter.post('/', authenticate, requirePermission(USERS_CREATE), UserController.create);
usersRouter.put('/:id', authenticate, requirePermission(USERS_UPDATE), UserController.update);
usersRouter.delete('/:id', authenticate, requirePermission(USERS_DELETE), UserController.delete);
