import Router from '@koa/router';
import { SettingsController } from '../controllers/settings.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/role-guard.js';

export const settingsRouter = new Router({ prefix: '/api/v1/settings' });

settingsRouter.get('/storage', authenticate, requireRole('admin'), SettingsController.getStorage);
settingsRouter.put('/storage', authenticate, requireRole('admin'), SettingsController.updateStorage);
