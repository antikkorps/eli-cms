import Router from '@koa/router';
import multer from '@koa/multer';
import { UploadController } from '../controllers/upload.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/role-guard.js';
import { uploadRateLimit } from '../middleware/rate-limiter.js';
import { ALLOWED_MIME_TYPES } from '../utils/mime-types.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    cb(null, ALLOWED_MIME_TYPES.has(file.mimetype));
  },
});

export const uploadsRouter = new Router({ prefix: '/api/v1/uploads' });

// Public — serve file
uploadsRouter.get('/:id/file', UploadController.serve);

// Authenticated
uploadsRouter.get('/', authenticate, UploadController.list);
uploadsRouter.get('/:id', authenticate, UploadController.get);

// Editor+ — upload (rate limited)
uploadsRouter.post('/', authenticate, uploadRateLimit, upload.single('file'), UploadController.upload);

// Admin — delete
uploadsRouter.delete('/:id', authenticate, requireRole('admin'), UploadController.delete);
