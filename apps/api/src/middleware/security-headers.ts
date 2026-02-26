import type { Context, Next } from 'koa';

export async function securityHeaders(ctx: Context, next: Next) {
  ctx.set('X-Content-Type-Options', 'nosniff');
  ctx.set('X-Frame-Options', 'DENY');
  ctx.set('X-XSS-Protection', '0');
  ctx.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  ctx.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  ctx.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  await next();
}
