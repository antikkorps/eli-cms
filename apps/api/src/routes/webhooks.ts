import Router from '@koa/router';
import { WebhookController } from '../controllers/webhook.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permission-guard.js';
import { WEBHOOKS_MANAGE } from '@eli-cms/shared';

export const webhooksRouter = new Router({ prefix: '/api/v1/webhooks' });

webhooksRouter.get('/', authenticate, requirePermission(WEBHOOKS_MANAGE), WebhookController.list);
webhooksRouter.get('/:id', authenticate, requirePermission(WEBHOOKS_MANAGE), WebhookController.get);
webhooksRouter.post('/', authenticate, requirePermission(WEBHOOKS_MANAGE), WebhookController.create);
webhooksRouter.put('/:id', authenticate, requirePermission(WEBHOOKS_MANAGE), WebhookController.update);
webhooksRouter.delete('/:id', authenticate, requirePermission(WEBHOOKS_MANAGE), WebhookController.delete);
webhooksRouter.get('/:id/deliveries', authenticate, requirePermission(WEBHOOKS_MANAGE), WebhookController.listDeliveries);
