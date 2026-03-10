import Router from '@koa/router';
import { SetupController } from '../controllers/setup.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permission-guard.js';
import { SETTINGS_UPDATE } from '@eli-cms/shared';

export const setupRouter = new Router({ prefix: '/api/v1/setup' });

setupRouter.get('/status', SetupController.status);
setupRouter.post('/', SetupController.initialize);
setupRouter.post('/onboarding', authenticate, SetupController.onboarding);
setupRouter.delete('/onboarding', authenticate, requirePermission(SETTINGS_UPDATE), SetupController.resetOnboarding);
