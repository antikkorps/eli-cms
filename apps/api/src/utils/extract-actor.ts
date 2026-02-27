import type { Context } from 'koa';
import type { Actor } from '../services/content.service.js';

export function extractActor(ctx: Context): Actor {
  const user = ctx.state.user;
  return {
    id: user.userId,
    type: user.apiKeyId ? 'api_key' : 'user',
    ip: ctx.ip,
    userAgent: ctx.get('user-agent') || undefined,
  };
}
