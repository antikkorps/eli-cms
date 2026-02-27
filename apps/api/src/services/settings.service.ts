import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { settings } from '../db/schema/index.js';
import type { StorageConfig } from '@eli-cms/shared';
import { eventBus } from './event-bus.js';
import type { Actor } from './content.service.js';

const STORAGE_KEY = 'storage';

const DEFAULT_STORAGE_CONFIG: StorageConfig = { activeStorage: 'local' };

export class SettingsService {
  static async getStorageConfig(): Promise<StorageConfig> {
    const [row] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, STORAGE_KEY))
      .limit(1);

    return row ? (row.value as StorageConfig) : DEFAULT_STORAGE_CONFIG;
  }

  static async updateStorageConfig(config: StorageConfig, actor?: Actor): Promise<StorageConfig> {
    const [row] = await db
      .insert(settings)
      .values({ key: STORAGE_KEY, value: config, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: config, updatedAt: new Date() },
      })
      .returning();

    const actorData = actor ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent } : {};
    eventBus.emit('settings.updated', { key: STORAGE_KEY, ...actorData });
    return row.value as StorageConfig;
  }
}
