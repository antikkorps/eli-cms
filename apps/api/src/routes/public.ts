import Router from '@koa/router';
import { PublicController } from '../controllers/public.controller.js';
import { SitemapController } from '../controllers/sitemap.controller.js';
import { publicRateLimit } from '../middleware/rate-limiter.js';
import { optionalAuth } from '../middleware/optional-auth.js';

export const publicRouter = new Router({ prefix: '/api/v1/public' });

publicRouter.use(publicRateLimit);

publicRouter.get('/schema', PublicController.getSchema);
publicRouter.get('/content-types', PublicController.listContentTypes);
publicRouter.get('/content-types/:slug', PublicController.getContentTypeBySlug);
publicRouter.get('/contents', optionalAuth, PublicController.listContents);
publicRouter.get('/contents/by-type/:slug', optionalAuth, PublicController.listContentsByType);
publicRouter.get('/contents/:id', optionalAuth, PublicController.getContentById);
publicRouter.get('/content-types/:slug/contents/:contentSlug', optionalAuth, PublicController.getContentBySlug);

publicRouter.get('/sitemap.xml', SitemapController.getSitemap);
