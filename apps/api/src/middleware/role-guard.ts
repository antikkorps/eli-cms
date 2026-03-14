import type { Context, Next } from 'koa';
import { AppError } from '../utils/app-error.js';

/**
 * @deprecated Use requirePermission() from permission-guard.ts instead.
 * Kept for backwards compatibility during migration.
 */
export function requireRole(..._roleSlugs: string[]) {
  return async (_ctx: Context, _next: Next) => {
    throw new AppError(403, 'Insufficient permissions');
  };
}
