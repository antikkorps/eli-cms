import Router from '@koa/router';
import { PublicController } from '../controllers/public.controller.js';
import { publicRateLimit } from '../middleware/rate-limiter.js';

export const publicRouter = new Router({ prefix: '/api/v1/public' });

publicRouter.use(publicRateLimit);

publicRouter.get('/content-types', PublicController.listContentTypes);
publicRouter.get('/content-types/:slug', PublicController.getContentTypeBySlug);
publicRouter.get('/contents', PublicController.listContents);
publicRouter.get('/contents/by-type/:slug', PublicController.listContentsByType);
publicRouter.get('/contents/:id', PublicController.getContentById);
