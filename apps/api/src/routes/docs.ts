import Router from '@koa/router';
import { openApiSpec } from '../docs/openapi.js';
import { env } from '../config/environment.js';

export const docsRouter = new Router({ prefix: '/api/v1/docs' });

// Block all doc routes in production
docsRouter.use((ctx, next) => {
  if (env.NODE_ENV === 'production') {
    ctx.status = 404;
    ctx.body = { success: false, error: 'Not found' };
    return;
  }
  return next();
});

docsRouter.get('/openapi.json', (ctx) => {
  ctx.body = openApiSpec;
});

docsRouter.get('/', (ctx) => {
  ctx.type = 'html';
  // Override CSP to allow Scalar CDN assets
  ctx.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data: blob:; frame-ancestors 'none'",
  );
  ctx.body = `<!doctype html>
<html>
<head>
  <title>Eli CMS — API Documentation</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
  <script id="api-reference" data-url="/api/v1/docs/openapi.json"></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>`;
});
