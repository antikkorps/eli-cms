import type { Context, Next } from 'koa';
import jwt from 'jsonwebtoken';
import { env } from '../config/environment.js';
import { ApiKeyService } from '../services/api-key.service.js';
import type { JwtPayload } from '@eli-cms/shared';

/**
 * Like `authenticate` but never rejects — silently ignores invalid/missing credentials.
 * Populates `ctx.state.user` when valid credentials are present.
 */
export async function optionalAuth(ctx: Context, next: Next) {
  // 1. Check X-API-Key header
  const apiKeyHeader = ctx.headers['x-api-key'] as string | undefined;
  if (apiKeyHeader) {
    const result = await ApiKeyService.validateKey(apiKeyHeader);
    if (result) {
      ctx.state.user = {
        userId: result.createdBy,
        email: '',
        roleId: '',
        permissions: result.permissions,
        apiKeyId: result.id,
      } satisfies JwtPayload;
    }
    return next();
  }

  // 2. JWT flow (Bearer token or cookie)
  const header = ctx.headers.authorization;
  let token: string | undefined;

  if (header?.startsWith('Bearer ')) {
    token = header.slice(7);
  } else {
    token = ctx.cookies.get('eli_access') || undefined;
  }

  if (token) {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      ctx.state.user = payload;
    } catch {
      // Invalid token — silently ignore
    }
  }

  await next();
}
