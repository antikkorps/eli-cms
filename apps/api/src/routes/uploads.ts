import Router from '@koa/router';
import multer from '@koa/multer';
import { UploadController } from '../controllers/upload.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/role-guard.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

export const uploadsRouter = new Router({ prefix: '/api/uploads' });

// Public — serve file
uploadsRouter.get('/:id/file', UploadController.serve);

// Authenticated
uploadsRouter.get('/', authenticate, UploadController.list);
uploadsRouter.get('/:id', authenticate, UploadController.get);

// Editor+ — upload
uploadsRouter.post('/', authenticate, upload.single('file'), UploadController.upload);

// Admin — delete
uploadsRouter.delete('/:id', authenticate, requireRole('admin'), UploadController.delete);
