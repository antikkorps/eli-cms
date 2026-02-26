import type { StorageProvider } from './storage.interface.js';
import { LocalStorageProvider } from './local-storage.provider.js';
import { S3StorageProvider } from './s3-storage.provider.js';
import { SettingsService } from '../settings.service.js';
import type { StorageConfig } from '@eli-cms/shared';

let cachedProvider: StorageProvider | null = null;
let cachedConfigHash: string | null = null;

function configHash(config: StorageConfig): string {
  return JSON.stringify(config);
}

export async function getStorageProvider(): Promise<StorageProvider> {
  const config = await SettingsService.getStorageConfig();
  const hash = configHash(config);

  if (cachedProvider && cachedConfigHash === hash) {
    return cachedProvider;
  }

  if (config.activeStorage === 's3' && config.s3) {
    cachedProvider = new S3StorageProvider(config.s3);
  } else {
    cachedProvider = new LocalStorageProvider();
  }

  cachedConfigHash = hash;
  return cachedProvider;
}

export function invalidateStorageCache(): void {
  cachedProvider = null;
  cachedConfigHash = null;
}
