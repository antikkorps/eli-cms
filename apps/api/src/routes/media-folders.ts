import Router from '@koa/router';
import { MediaFolderController } from '../controllers/media-folder.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permission-guard.js';
import { UPLOADS_READ, UPLOADS_CREATE, UPLOADS_DELETE } from '@eli-cms/shared';

export const mediaFoldersRouter = new Router({ prefix: '/api/v1/media-folders' });

// Read
mediaFoldersRouter.get('/', authenticate, requirePermission(UPLOADS_READ), MediaFolderController.list);
mediaFoldersRouter.get('/tree', authenticate, requirePermission(UPLOADS_READ), MediaFolderController.tree);
mediaFoldersRouter.get('/:id', authenticate, requirePermission(UPLOADS_READ), MediaFolderController.get);

// Create
mediaFoldersRouter.post('/', authenticate, requirePermission(UPLOADS_CREATE), MediaFolderController.create);

// Update
mediaFoldersRouter.put('/:id', authenticate, requirePermission(UPLOADS_CREATE), MediaFolderController.update);

// Delete
mediaFoldersRouter.delete('/:id', authenticate, requirePermission(UPLOADS_DELETE), MediaFolderController.delete);
