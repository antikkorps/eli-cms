import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import { authRouter } from './routes/auth.js';
import { contentTypesRouter } from './routes/content-types.js';
import { contentsRouter } from './routes/contents.js';
import { usersRouter } from './routes/users.js';

export function createApp() {
  const app = new Koa();

  // Global middleware
  app.use(errorHandler);
  app.use(requestLogger);
  app.use(cors());
  app.use(bodyParser());

  // Health check
  app.use(async (ctx, next) => {
    if (ctx.path === '/health' && ctx.method === 'GET') {
      ctx.body = { status: 'ok' };
      return;
    }
    await next();
  });

  // Routes
  app.use(authRouter.routes()).use(authRouter.allowedMethods());
  app.use(contentTypesRouter.routes()).use(contentTypesRouter.allowedMethods());
  app.use(contentsRouter.routes()).use(contentsRouter.allowedMethods());
  app.use(usersRouter.routes()).use(usersRouter.allowedMethods());

  return app;
}
