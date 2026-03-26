import Router from '@koa/router';
import { ContentCommentController } from '../controllers/content-comment.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permission-guard.js';
import { COMMENTS_READ, COMMENTS_CREATE, COMMENTS_UPDATE, COMMENTS_DELETE } from '@eli-cms/shared';

export const contentCommentsRouter = new Router({ prefix: '/api/v1/contents' });

contentCommentsRouter.get(
  '/:id/comments',
  authenticate,
  requirePermission(COMMENTS_READ),
  ContentCommentController.list,
);
contentCommentsRouter.post(
  '/:id/comments',
  authenticate,
  requirePermission(COMMENTS_CREATE),
  ContentCommentController.create,
);
contentCommentsRouter.put(
  '/:id/comments/:commentId',
  authenticate,
  requirePermission(COMMENTS_UPDATE),
  ContentCommentController.update,
);
contentCommentsRouter.delete(
  '/:id/comments/:commentId',
  authenticate,
  requirePermission(COMMENTS_DELETE),
  ContentCommentController.delete,
);
