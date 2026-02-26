import Router from '@koa/router';
import { UserController } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/role-guard.js';

export const usersRouter = new Router({ prefix: '/api/users' });

usersRouter.get('/', authenticate, requireRole('admin'), UserController.list);
usersRouter.get('/:id', authenticate, requireRole('admin'), UserController.get);
usersRouter.delete('/:id', authenticate, requireRole('admin'), UserController.delete);
