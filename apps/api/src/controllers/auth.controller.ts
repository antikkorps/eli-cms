import type { Context } from 'koa';
import { loginSchema, registerSchema, refreshTokenSchema, logoutSchema, changePasswordSchema } from '@eli-cms/shared';
import type { TokenPair } from '@eli-cms/shared';
import { AuthService } from '../services/auth.service.js';
import { AppError } from '../utils/app-error.js';
import { env } from '../config/environment.js';
import { parseDuration } from '../utils/parse-duration.js';
import type { Actor } from '../services/content.service.js';

const COOKIE_ACCESS = 'eli_access';
const COOKIE_REFRESH = 'eli_refresh';

function setAuthCookies(ctx: Context, tokens: TokenPair) {
  const secure = env.COOKIE_SECURE;
  const accessMaxAge = parseDuration(env.JWT_ACCESS_EXPIRY) ?? 15 * 60_000;
  const refreshMaxAge = parseDuration(env.JWT_REFRESH_EXPIRY) ?? 7 * 86_400_000;

  ctx.cookies.set(COOKIE_ACCESS, tokens.accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/',
    maxAge: accessMaxAge,
    overwrite: true,
  });

  ctx.cookies.set(COOKIE_REFRESH, tokens.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: refreshMaxAge,
    overwrite: true,
  });
}

function clearAuthCookies(ctx: Context) {
  ctx.cookies.set(COOKIE_ACCESS, '', { maxAge: 0, path: '/', overwrite: true });
  ctx.cookies.set(COOKIE_REFRESH, '', { maxAge: 0, path: '/api/auth', overwrite: true });
}

export class AuthController {
  static async register(ctx: Context) {
    const result = registerSchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map(i => i.message).join(', '));
    }

    const actor: Actor = { id: 'anonymous', type: 'user', ip: ctx.ip, userAgent: ctx.get('user-agent') || undefined };
    const user = await AuthService.register(result.data, actor);
    ctx.status = 201;
    ctx.body = { success: true, data: user };
  }

  static async login(ctx: Context) {
    const result = loginSchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map(i => i.message).join(', '));
    }

    const actor: Actor = { id: 'anonymous', type: 'user', ip: ctx.ip, userAgent: ctx.get('user-agent') || undefined };
    const tokens = await AuthService.login(result.data, actor);
    setAuthCookies(ctx, tokens);
    ctx.body = { success: true, data: tokens };
  }

  static async refresh(ctx: Context) {
    const result = refreshTokenSchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, 'Invalid request body');
    }

    const refreshToken = result.data.refreshToken ?? ctx.cookies.get(COOKIE_REFRESH);
    if (!refreshToken) {
      throw new AppError(400, 'refreshToken is required');
    }

    const tokens = await AuthService.refresh(refreshToken);
    setAuthCookies(ctx, tokens);
    ctx.body = { success: true, data: tokens };
  }

  static async logout(ctx: Context) {
    const result = logoutSchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, 'Invalid request body');
    }

    const refreshToken = result.data.refreshToken ?? ctx.cookies.get(COOKIE_REFRESH);
    if (!refreshToken) {
      throw new AppError(400, 'refreshToken is required');
    }

    await AuthService.logout(refreshToken);
    clearAuthCookies(ctx);
    ctx.body = { success: true };
  }

  static async logoutAll(ctx: Context) {
    await AuthService.logoutAll(ctx.state.user.userId);
    clearAuthCookies(ctx);
    ctx.body = { success: true };
  }

  static async changePassword(ctx: Context) {
    const result = changePasswordSchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map(i => i.message).join(', '));
    }

    const actor: Actor = { id: ctx.state.user.userId, type: ctx.state.user.apiKeyId ? 'api_key' : 'user', ip: ctx.ip, userAgent: ctx.get('user-agent') || undefined };
    await AuthService.changePassword(ctx.state.user.userId, result.data, actor);
    clearAuthCookies(ctx);
    ctx.body = { success: true };
  }

  static async me(ctx: Context) {
    const user = await AuthService.getUserFromToken(ctx.state.user);
    ctx.body = { success: true, data: user };
  }
}
