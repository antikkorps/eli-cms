import Router from '@koa/router';
import multer from '@koa/multer';
import { UploadController } from '../controllers/upload.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permission-guard.js';
import { uploadRateLimit, serveRateLimit } from '../middleware/rate-limiter.js';
import { ALLOWED_MIME_TYPES } from '../utils/mime-types.js';
import { UPLOADS_READ, UPLOADS_CREATE, UPLOADS_UPDATE, UPLOADS_DELETE } from '@eli-cms/shared';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    cb(null, ALLOWED_MIME_TYPES.has(file.mimetype));
  },
});

export const uploadsRouter = new Router({ prefix: '/api/v1/uploads' });

// Public — serve file (rate limited)
uploadsRouter.get('/:id/serve', serveRateLimit, UploadController.serve);

// Authenticated
uploadsRouter.get('/', authenticate, requirePermission(UPLOADS_READ), UploadController.list);
uploadsRouter.get('/:id', authenticate, requirePermission(UPLOADS_READ), UploadController.get);

// Upload (rate limited)
uploadsRouter.post(
  '/',
  authenticate,
  requirePermission(UPLOADS_CREATE),
  uploadRateLimit,
  upload.single('file'),
  UploadController.upload,
);

// Rename
uploadsRouter.patch('/:id', authenticate, requirePermission(UPLOADS_UPDATE), UploadController.update);

// Delete
uploadsRouter.delete('/:id', authenticate, requirePermission(UPLOADS_DELETE), UploadController.delete);
