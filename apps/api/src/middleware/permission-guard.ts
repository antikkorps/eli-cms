import type { Context, Next } from 'koa';
import { AppError } from '../utils/app-error.js';

export function requirePermission(...requiredPermissions: string[]) {
  return async (ctx: Context, next: Next) => {
    const user = ctx.state.user;
    if (!user || !user.permissions) {
      throw new AppError(403, 'Insufficient permissions');
    }

    const hasAll = requiredPermissions.every((p) => user.permissions.includes(p));
    if (!hasAll) {
      throw new AppError(403, 'Insufficient permissions');
    }

    await next();
  };
}
