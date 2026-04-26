import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { settings } from '../db/schema/index.js';
import type { StorageConfig, SmtpConfig, SeoConfig, I18nConfig } from '@eli-cms/shared';
import { eventBus } from './event-bus.js';
import type { Actor } from './content.service.js';

const STORAGE_KEY = 'storage';
const SMTP_KEY = 'smtp';
const SEO_KEY = 'seo';
const I18N_KEY = 'i18n';

const DEFAULT_STORAGE_CONFIG: StorageConfig = { activeStorage: 'local' };
const DEFAULT_I18N_CONFIG: I18nConfig = { defaultLocale: 'en', locales: ['en'] };

let i18nCache: I18nConfig | null = null;

export class SettingsService {
  static async getStorageConfig(): Promise<StorageConfig> {
    const [row] = await db.select().from(settings).where(eq(settings.key, STORAGE_KEY)).limit(1);

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

    const actorData = actor
      ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent }
      : {};
    eventBus.emit('settings.updated', { key: STORAGE_KEY, ...actorData });
    return row.value as StorageConfig;
  }

  static async getSmtpConfig(): Promise<SmtpConfig | null> {
    const [row] = await db.select().from(settings).where(eq(settings.key, SMTP_KEY)).limit(1);

    return row ? (row.value as SmtpConfig) : null;
  }

  static async updateSmtpConfig(config: SmtpConfig, actor?: Actor): Promise<SmtpConfig> {
    const [row] = await db
      .insert(settings)
      .values({ key: SMTP_KEY, value: config, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: config, updatedAt: new Date() },
      })
      .returning();

    const actorData = actor
      ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent }
      : {};
    eventBus.emit('settings.updated', { key: SMTP_KEY, ...actorData });
    return row.value as SmtpConfig;
  }

  static async getSeoConfig(): Promise<SeoConfig | null> {
    const [row] = await db.select().from(settings).where(eq(settings.key, SEO_KEY)).limit(1);
    return row ? (row.value as SeoConfig) : null;
  }

  static async updateSeoConfig(config: SeoConfig, actor?: Actor): Promise<SeoConfig> {
    const [row] = await db
      .insert(settings)
      .values({ key: SEO_KEY, value: config, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: config, updatedAt: new Date() },
      })
      .returning();

    const actorData = actor
      ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent }
      : {};
    eventBus.emit('settings.updated', { key: SEO_KEY, ...actorData });
    return row.value as SeoConfig;
  }

  static async getI18nConfig(): Promise<I18nConfig> {
    if (i18nCache) return i18nCache;
    const [row] = await db.select().from(settings).where(eq(settings.key, I18N_KEY)).limit(1);
    i18nCache = row ? (row.value as I18nConfig) : DEFAULT_I18N_CONFIG;
    return i18nCache;
  }

  static async updateI18nConfig(config: I18nConfig, actor?: Actor): Promise<I18nConfig> {
    const [row] = await db
      .insert(settings)
      .values({ key: I18N_KEY, value: config, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: config, updatedAt: new Date() },
      })
      .returning();

    i18nCache = row.value as I18nConfig;

    const actorData = actor
      ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent }
      : {};
    eventBus.emit('settings.updated', { key: I18N_KEY, ...actorData });
    return i18nCache;
  }

  static invalidateI18nCache(): void {
    i18nCache = null;
  }
}
