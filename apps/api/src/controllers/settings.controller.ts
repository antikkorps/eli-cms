import type { Context } from 'koa';
import { storageConfigSchema } from '@eli-cms/shared';
import { SettingsService } from '../services/settings.service.js';
import { invalidateStorageCache } from '../services/storage/index.js';
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
}
