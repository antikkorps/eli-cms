import type { Context, Next } from 'koa';
import jwt from 'jsonwebtoken';
import { env } from '../config/environment.js';
import { AppError } from '../utils/app-error.js';
import { ApiKeyService } from '../services/api-key.service.js';
import type { JwtPayload } from '@eli-cms/shared';

export async function authenticate(ctx: Context, next: Next) {
  // 1. Check X-API-Key header first
  const apiKeyHeader = ctx.headers['x-api-key'] as string | undefined;
  if (apiKeyHeader) {
    const result = await ApiKeyService.validateKey(apiKeyHeader);
    if (!result) {
      throw new AppError(401, 'Invalid or expired API key');
    }

    ctx.state.user = {
      userId: result.createdBy,
      email: '',
      roleId: '',
      permissions: result.permissions,
      apiKeyId: result.id,
    } satisfies JwtPayload;

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

  if (!token) {
    throw new AppError(401, 'Missing or invalid authorization header');
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    ctx.state.user = payload;
  } catch {
    throw new AppError(401, 'Invalid or expired token');
  }

  await next();
}
