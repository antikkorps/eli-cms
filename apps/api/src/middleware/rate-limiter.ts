import type { Context, Next } from 'koa';
import ratelimit from 'koa-ratelimit';

const isTest = !!process.env.VITEST;

const noop = async (_ctx: Context, next: Next) => next();

const authDb = new Map();
const publicDb = new Map();

/** 10 requests per 15 minutes per IP — for login/register/refresh */
export const authRateLimit = isTest
  ? noop
  : ratelimit({
      driver: 'memory',
      db: authDb,
      duration: 15 * 60 * 1000,
      max: 10,
      id: (ctx) => ctx.ip,
      errorMessage: 'Too many requests, please try again later',
      throw: false,
    });

/** 100 requests per minute per IP — for public API */
export const publicRateLimit = isTest
  ? noop
  : ratelimit({
      driver: 'memory',
      db: publicDb,
      duration: 60 * 1000,
      max: 100,
      id: (ctx) => ctx.ip,
      errorMessage: 'Too many requests, please try again later',
      throw: false,
    });
