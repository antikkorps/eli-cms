import Router from '@koa/router';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authRateLimit } from '../middleware/rate-limiter.js';

export const authRouter = new Router({ prefix: '/api/auth' });

authRouter.post('/register', authRateLimit, AuthController.register);
authRouter.post('/login', authRateLimit, AuthController.login);
authRouter.post('/refresh', authRateLimit, AuthController.refresh);
authRouter.post('/logout', authenticate, AuthController.logout);
authRouter.post('/logout-all', authenticate, AuthController.logoutAll);
authRouter.put('/change-password', authenticate, AuthController.changePassword);
authRouter.get('/me', authenticate, AuthController.me);
