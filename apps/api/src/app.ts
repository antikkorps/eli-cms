import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import { env } from './config/environment.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import { securityHeaders } from './middleware/security-headers.js';
import { authRouter } from './routes/auth.js';
import { publicRouter } from './routes/public.js';
import { contentTypesRouter } from './routes/content-types.js';
import { contentsRouter } from './routes/contents.js';
import { usersRouter } from './routes/users.js';
import { uploadsRouter } from './routes/uploads.js';
import { settingsRouter } from './routes/settings.js';

export function createApp() {
  const app = new Koa();

  // Global middleware
  app.use(errorHandler);
  app.use(requestLogger);
  app.use(securityHeaders);
  app.use(
    cors({
      origin: (ctx) => {
        const origin = ctx.get('Origin');
        if (env.CORS_ORIGINS === '*') {
          return origin || '*';
        }
        const allowed = env.CORS_ORIGINS.split(',').map(s => s.trim());
        return allowed.includes(origin) ? origin : '';
      },
      credentials: true,
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    }),
  );
  app.use(bodyParser({ jsonLimit: '1mb' }));

  // Health check
  app.use(async (ctx, next) => {
    if (ctx.path === '/health' && ctx.method === 'GET') {
      ctx.body = { status: 'ok' };
      return;
    }
    await next();
  });

  // Public routes (no auth)
  app.use(publicRouter.routes()).use(publicRouter.allowedMethods());

  // Auth routes
  app.use(authRouter.routes()).use(authRouter.allowedMethods());

  // Protected routes
  app.use(contentTypesRouter.routes()).use(contentTypesRouter.allowedMethods());
  app.use(contentsRouter.routes()).use(contentsRouter.allowedMethods());
  app.use(usersRouter.routes()).use(usersRouter.allowedMethods());
  app.use(uploadsRouter.routes()).use(uploadsRouter.allowedMethods());
  app.use(settingsRouter.routes()).use(settingsRouter.allowedMethods());

  return app;
}
