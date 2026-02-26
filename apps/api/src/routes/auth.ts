import Router from '@koa/router';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';

export const authRouter = new Router({ prefix: '/api/auth' });

authRouter.post('/register', AuthController.register);
authRouter.post('/login', AuthController.login);
authRouter.post('/refresh', AuthController.refresh);
authRouter.get('/me', authenticate, AuthController.me);
