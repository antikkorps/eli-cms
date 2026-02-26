import type { Context, Next } from 'koa';
import jwt from 'jsonwebtoken';
import { env } from '../config/environment.js';
import { AppError } from '../utils/app-error.js';
import type { JwtPayload } from '@eli-cms/shared';

export async function authenticate(ctx: Context, next: Next) {
  const header = ctx.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError(401, 'Missing or invalid authorization header');
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    ctx.state.user = payload;
  } catch {
    throw new AppError(401, 'Invalid or expired token');
  }

  await next();
}
