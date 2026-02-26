import Router from '@koa/router';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authRateLimit } from '../middleware/rate-limiter.js';

export const authRouter = new Router({ prefix: '/api/auth' });

authRouter.post('/register', authRateLimit, AuthController.register);
authRouter.post('/login', authRateLimit, AuthController.login);
authRouter.post('/refresh', authRateLimit, AuthController.refresh);
authRouter.get('/me', authenticate, AuthController.me);
