import type { Context, Next } from 'koa';
import { AppError } from '../utils/app-error.js';
import type { ApiResponse } from '@eli-cms/shared';

export async function errorHandler(ctx: Context, next: Next) {
  try {
    await next();
  } catch (err) {
    if (err instanceof AppError) {
      ctx.status = err.statusCode;
      ctx.body = { success: false, error: err.message } satisfies ApiResponse;
      return;
    }

    console.error('Unhandled error:', err);
    ctx.status = 500;
    ctx.body = { success: false, error: 'Internal server error' } satisfies ApiResponse;
  }
}
