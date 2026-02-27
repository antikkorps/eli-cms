import Router from '@koa/router';
import { ApiKeyController } from '../controllers/api-key.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permission-guard.js';
import { API_KEYS_MANAGE } from '@eli-cms/shared';

export const apiKeysRouter = new Router({ prefix: '/api/v1/api-keys' });

apiKeysRouter.get('/', authenticate, requirePermission(API_KEYS_MANAGE), ApiKeyController.list);
apiKeysRouter.get('/:id', authenticate, requirePermission(API_KEYS_MANAGE), ApiKeyController.get);
apiKeysRouter.post('/', authenticate, requirePermission(API_KEYS_MANAGE), ApiKeyController.create);
apiKeysRouter.put('/:id', authenticate, requirePermission(API_KEYS_MANAGE), ApiKeyController.update);
apiKeysRouter.delete('/:id', authenticate, requirePermission(API_KEYS_MANAGE), ApiKeyController.delete);
