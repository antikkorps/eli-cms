import type { Context, Next } from 'koa';
import type { UserRole } from '@eli-cms/shared';
import { AppError } from '../utils/app-error.js';

export function requireRole(...roles: UserRole[]) {
  return async (ctx: Context, next: Next) => {
    const user = ctx.state.user;
    if (!user || !roles.includes(user.role)) {
      throw new AppError(403, 'Insufficient permissions');
    }
    await next();
  };
}
