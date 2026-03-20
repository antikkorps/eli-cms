import Router from '@koa/router';
import { WebhookController } from '../controllers/webhook.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permission-guard.js';
import { WEBHOOKS_READ, WEBHOOKS_CREATE, WEBHOOKS_UPDATE, WEBHOOKS_DELETE } from '@eli-cms/shared';

export const webhooksRouter = new Router({ prefix: '/api/v1/webhooks' });

webhooksRouter.get('/', authenticate, requirePermission(WEBHOOKS_READ), WebhookController.list);
webhooksRouter.get('/:id', authenticate, requirePermission(WEBHOOKS_READ), WebhookController.get);
webhooksRouter.post('/', authenticate, requirePermission(WEBHOOKS_CREATE), WebhookController.create);
webhooksRouter.put('/:id', authenticate, requirePermission(WEBHOOKS_UPDATE), WebhookController.update);
webhooksRouter.delete('/:id', authenticate, requirePermission(WEBHOOKS_DELETE), WebhookController.delete);
webhooksRouter.post('/:id/test', authenticate, requirePermission(WEBHOOKS_UPDATE), WebhookController.testDelivery);
webhooksRouter.get('/:id/deliveries', authenticate, requirePermission(WEBHOOKS_READ), WebhookController.listDeliveries);
webhooksRouter.post(
  '/:id/deliveries/:deliveryId/retry',
  authenticate,
  requirePermission(WEBHOOKS_UPDATE),
  WebhookController.retryDelivery,
);
