import type { Context } from 'koa';
import { storageConfigSchema, smtpConfigSchema, seoConfigSchema, i18nConfigSchema } from '@eli-cms/shared';
import { SettingsService } from '../services/settings.service.js';
import { invalidateStorageCache } from '../services/storage/index.js';
import { EmailService } from '../services/email.service.js';
import { AppError } from '../utils/app-error.js';
import { extractActor } from '../utils/extract-actor.js';

const MASK = '••••••••';

function maskSecrets(config: Record<string, unknown>): Record<string, unknown> {
  const result = { ...config };
  if (result.s3 && typeof result.s3 === 'object') {
    const s3 = { ...(result.s3 as Record<string, unknown>) };
    if (s3.secretAccessKey) s3.secretAccessKey = MASK;
    if (s3.accessKeyId) s3.accessKeyId = MASK;
    result.s3 = s3;
  }
  if (result.password) result.password = MASK;
  if (result.clientSecret) result.clientSecret = MASK;
  if (result.refreshToken) result.refreshToken = MASK;
  return result;
}

export class SettingsController {
  static async getStorage(ctx: Context) {
    const config = await SettingsService.getStorageConfig();
    ctx.body = { success: true, data: maskSecrets(config as unknown as Record<string, unknown>) };
  }

  static async updateStorage(ctx: Context) {
    const result = storageConfigSchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((i) => i.message).join(', '));
    }

    const saved = await SettingsService.updateStorageConfig(result.data, extractActor(ctx));
    invalidateStorageCache();

    ctx.body = { success: true, data: maskSecrets(saved as unknown as Record<string, unknown>) };
  }

  static async getSmtp(ctx: Context) {
    const config = await SettingsService.getSmtpConfig();
    ctx.body = { success: true, data: config ? maskSecrets(config as unknown as Record<string, unknown>) : null };
  }

  static async updateSmtp(ctx: Context) {
    const result = smtpConfigSchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((i) => i.message).join(', '));
    }

    const saved = await SettingsService.updateSmtpConfig(result.data, extractActor(ctx));
    ctx.body = { success: true, data: maskSecrets(saved as unknown as Record<string, unknown>) };
  }

  static async testSmtp(ctx: Context) {
    const body = ctx.request.body as { email?: string };
    if (!body.email || typeof body.email !== 'string') {
      throw new AppError(400, 'email is required');
    }

    await EmailService.sendTestEmail(body.email);
    ctx.body = { success: true };
  }

  static async getSeo(ctx: Context) {
    const config = await SettingsService.getSeoConfig();
    ctx.body = { success: true, data: config };
  }

  static async updateSeo(ctx: Context) {
    const result = seoConfigSchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((i) => i.message).join(', '));
    }

    const saved = await SettingsService.updateSeoConfig(result.data, extractActor(ctx));
    ctx.body = { success: true, data: saved };
  }

  static async getI18n(ctx: Context) {
    const config = await SettingsService.getI18nConfig();
    ctx.body = { success: true, data: config };
  }

  static async updateI18n(ctx: Context) {
    const result = i18nConfigSchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((issue: { message: string }) => issue.message).join(', '));
    }

    const saved = await SettingsService.updateI18nConfig(result.data, extractActor(ctx));
    ctx.body = { success: true, data: saved };
  }
}
