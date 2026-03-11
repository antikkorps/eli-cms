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

const uploadDb = new Map();

/** 20 requests per minute per IP — for file uploads */
export const uploadRateLimit = isTest
  ? noop
  : ratelimit({
      driver: 'memory',
      db: uploadDb,
      duration: 60 * 1000,
      max: 20,
      id: (ctx) => ctx.ip,
      errorMessage: 'Too many upload requests, please try again later',
      throw: false,
    });

const serveDb = new Map();

/** 60 requests per minute per IP — for file serving with transforms */
export const serveRateLimit = isTest
  ? noop
  : ratelimit({
      driver: 'memory',
      db: serveDb,
      duration: 60 * 1000,
      max: 60,
      id: (ctx) => ctx.ip,
      errorMessage: 'Too many requests, please try again later',
      throw: false,
    });

const forgotPwDb = new Map();

/** 5 requests per hour per IP — for forgot-password */
export const forgotPasswordRateLimit = isTest
  ? noop
  : ratelimit({
      driver: 'memory',
      db: forgotPwDb,
      duration: 60 * 60 * 1000,
      max: 5,
      id: (ctx) => ctx.ip,
      errorMessage: 'Too many password reset requests, please try again later',
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
