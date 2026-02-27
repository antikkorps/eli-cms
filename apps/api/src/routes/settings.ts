import Router from '@koa/router';
import { SettingsController } from '../controllers/settings.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permission-guard.js';
import { SETTINGS_MANAGE } from '@eli-cms/shared';

export const settingsRouter = new Router({ prefix: '/api/v1/settings' });

settingsRouter.get('/storage', authenticate, requirePermission(SETTINGS_MANAGE), SettingsController.getStorage);
settingsRouter.put('/storage', authenticate, requirePermission(SETTINGS_MANAGE), SettingsController.updateStorage);
