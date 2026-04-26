import Router from '@koa/router';
import { ContentTypeTemplateController } from '../controllers/content-type-template.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permission-guard.js';
import { CONTENT_TYPES_READ, CONTENT_TYPES_CREATE, CONTENT_TYPES_UPDATE, CONTENT_TYPES_DELETE } from '@eli-cms/shared';

export const contentTypeTemplatesRouter = new Router({ prefix: '/api/v1/content-type-templates' });

contentTypeTemplatesRouter.get(
  '/',
  authenticate,
  requirePermission(CONTENT_TYPES_READ),
  ContentTypeTemplateController.list,
);
contentTypeTemplatesRouter.get(
  '/:id',
  authenticate,
  requirePermission(CONTENT_TYPES_READ),
  ContentTypeTemplateController.get,
);
contentTypeTemplatesRouter.post(
  '/',
  authenticate,
  requirePermission(CONTENT_TYPES_CREATE),
  ContentTypeTemplateController.create,
);
contentTypeTemplatesRouter.put(
  '/:id',
  authenticate,
  requirePermission(CONTENT_TYPES_UPDATE),
  ContentTypeTemplateController.update,
);
contentTypeTemplatesRouter.delete(
  '/:id',
  authenticate,
  requirePermission(CONTENT_TYPES_DELETE),
  ContentTypeTemplateController.delete,
);
