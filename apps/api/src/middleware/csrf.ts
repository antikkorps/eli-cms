import type { Context, Next } from 'koa';
import crypto from 'node:crypto';
import { AppError } from '../utils/app-error.js';

const CSRF_COOKIE = 'eli_csrf';
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Auth routes are public or rate-limited — no CSRF needed
const EXEMPT_PREFIXES = ['/api/v1/auth/', '/api/v1/setup'];

/**
 * Double-submit cookie CSRF protection.
 *
 * On every response: set a random CSRF token in a non-httpOnly cookie (JS-readable).
 * On state-changing requests using cookie auth: require the same token in X-CSRF-Token header.
 *
 * Skipped for:
 * - Safe methods (GET, HEAD, OPTIONS)
 * - Bearer token auth (not vulnerable to CSRF)
 * - API key auth (not cookie-based)
 */
export async function csrf(ctx: Context, next: Next) {
  // Always ensure a CSRF cookie exists
  let csrfToken = ctx.cookies.get(CSRF_COOKIE);
  if (!csrfToken) {
    csrfToken = crypto.randomBytes(32).toString('hex');
    ctx.cookies.set(CSRF_COOKIE, csrfToken, {
      httpOnly: false, // must be readable by JS
      sameSite: 'strict',
      path: '/',
      secure: ctx.secure,
    });
  }

  // Safe methods don't need CSRF validation
  if (SAFE_METHODS.has(ctx.method)) {
    return next();
  }

  // Exempt auth/setup routes
  if (EXEMPT_PREFIXES.some((p) => ctx.path.startsWith(p))) {
    return next();
  }

  // Only enforce CSRF for cookie-based auth (not Bearer / API key)
  const hasBearer = ctx.headers.authorization?.startsWith('Bearer ');
  const hasApiKey = !!ctx.headers['x-api-key'];
  const hasCookieAuth = !!ctx.cookies.get('eli_access');

  if (!hasCookieAuth || hasBearer || hasApiKey) {
    return next();
  }

  // Validate CSRF token
  const headerToken = ctx.get(CSRF_HEADER);
  if (!headerToken || !csrfToken || headerToken !== csrfToken) {
    throw new AppError(403, 'Invalid or missing CSRF token');
  }

  return next();
}
