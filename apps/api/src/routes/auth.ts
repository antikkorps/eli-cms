import Router from '@koa/router';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authRateLimit, forgotPasswordRateLimit } from '../middleware/rate-limiter.js';

export const authRouter = new Router({ prefix: '/api/v1/auth' });

authRouter.post('/register', authRateLimit, AuthController.register);
authRouter.post('/login', authRateLimit, AuthController.login);
authRouter.post('/refresh', authRateLimit, AuthController.refresh);
authRouter.post('/logout', authenticate, AuthController.logout);
authRouter.post('/logout-all', authenticate, AuthController.logoutAll);
authRouter.put('/change-password', authenticate, AuthController.changePassword);
authRouter.put('/profile', authenticate, AuthController.updateProfile);
authRouter.get('/me', authenticate, AuthController.me);
authRouter.post('/forgot-password', forgotPasswordRateLimit, AuthController.forgotPassword);
authRouter.post('/reset-password', authRateLimit, AuthController.resetPassword);
