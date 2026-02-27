import type { Context, Next } from 'koa';
import { AppError } from '../utils/app-error.js';

/**
 * @deprecated Use requirePermission() from permission-guard.ts instead.
 * Kept for backwards compatibility during migration.
 */
export function requireRole(...roleSlugs: string[]) {
  return async (ctx: Context, next: Next) => {
    const user = ctx.state.user;
    if (!user) {
      throw new AppError(403, 'Insufficient permissions');
    }
    // No longer functional — use requirePermission instead
    throw new AppError(403, 'Insufficient permissions');
  };
}
