import Router from '@koa/router';
import { SettingsController } from '../controllers/settings.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permission-guard.js';
import { SETTINGS_READ, SETTINGS_UPDATE } from '@eli-cms/shared';

export const settingsRouter = new Router({ prefix: '/api/v1/settings' });

settingsRouter.get('/storage', authenticate, requirePermission(SETTINGS_READ), SettingsController.getStorage);
settingsRouter.put('/storage', authenticate, requirePermission(SETTINGS_UPDATE), SettingsController.updateStorage);

settingsRouter.get('/smtp', authenticate, requirePermission(SETTINGS_READ), SettingsController.getSmtp);
settingsRouter.put('/smtp', authenticate, requirePermission(SETTINGS_UPDATE), SettingsController.updateSmtp);
settingsRouter.post('/smtp/test', authenticate, requirePermission(SETTINGS_UPDATE), SettingsController.testSmtp);

settingsRouter.get('/seo', authenticate, requirePermission(SETTINGS_READ), SettingsController.getSeo);
settingsRouter.put('/seo', authenticate, requirePermission(SETTINGS_UPDATE), SettingsController.updateSeo);
