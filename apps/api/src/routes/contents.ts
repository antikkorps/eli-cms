import Router from '@koa/router';
import multer from '@koa/multer';
import { ContentController } from '../controllers/content.controller.js';
import { ContentExportController } from '../controllers/content-export.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permission-guard.js';
import { CONTENT_CREATE, CONTENT_READ, CONTENT_UPDATE, CONTENT_DELETE } from '@eli-cms/shared';

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

export const contentsRouter = new Router({ prefix: '/api/v1/contents' });

contentsRouter.get('/', authenticate, requirePermission(CONTENT_READ), ContentController.list);
contentsRouter.post('/bulk-action', authenticate, requirePermission(CONTENT_UPDATE), ContentController.bulkAction);
contentsRouter.get('/export', authenticate, requirePermission(CONTENT_READ), ContentExportController.exportContents);
contentsRouter.post('/import', authenticate, requirePermission(CONTENT_CREATE), importUpload.single('file'), ContentExportController.importContents);
contentsRouter.get('/:id', authenticate, requirePermission(CONTENT_READ), ContentController.get);
contentsRouter.post('/', authenticate, requirePermission(CONTENT_CREATE), ContentController.create);
contentsRouter.put('/:id', authenticate, requirePermission(CONTENT_UPDATE), ContentController.update);
contentsRouter.delete('/:id', authenticate, requirePermission(CONTENT_DELETE), ContentController.delete);
