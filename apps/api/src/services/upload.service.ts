import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { eq, and, count as drizzleCount } from 'drizzle-orm';
import type { Readable } from 'node:stream';
import { db } from '../db/index.js';
import { media } from '../db/schema/index.js';
import { getStorageProvider } from './storage/index.js';
import { SettingsService } from './settings.service.js';
import { AppError } from '../utils/app-error.js';
import { buildMeta } from '../utils/pagination.js';
import { sanitizeFilename } from '@eli-cms/shared';
import type { UploadListQuery } from '@eli-cms/shared';
import { eventBus } from './event-bus.js';
import type { Actor } from './content.service.js';

export class UploadService {
  static async upload(file: { buffer: Buffer; originalname: string; mimetype: string; size: number }, userId: string, actor?: Actor) {
    const safeName = sanitizeFilename(file.originalname);
    const ext = extname(safeName);
    const filename = `${randomUUID()}${ext}`;
    const storageKey = filename;

    const provider = await getStorageProvider();
    const config = await SettingsService.getStorageConfig();

    await provider.save(storageKey, file.buffer, file.mimetype);

    const [record] = await db
      .insert(media)
      .values({
        filename,
        originalName: safeName,
        mimeType: file.mimetype,
        size: file.size,
        storageKey,
        storageType: config.activeStorage,
        createdBy: userId,
      })
      .returning();

    const actorData = actor ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent } : {};
    eventBus.emit('media.uploaded', { media: record, ...actorData });
    return record;
  }

  static async findAll(query: UploadListQuery) {
    const { page, limit, mimeType, createdBy } = query;
    const offset = (page - 1) * limit;

    const filters = [];
    if (mimeType) filters.push(eq(media.mimeType, mimeType));
    if (createdBy) filters.push(eq(media.createdBy, createdBy));

    const where = filters.length > 0 ? and(...filters) : undefined;

    const [{ total }] = await db
      .select({ total: drizzleCount() })
      .from(media)
      .where(where);

    const data = await db
      .select()
      .from(media)
      .where(where)
      .orderBy(media.createdAt)
      .limit(limit)
      .offset(offset);

    return { data, meta: buildMeta(total, page, limit) };
  }

  static async findById(id: string) {
    const [record] = await db.select().from(media).where(eq(media.id, id)).limit(1);
    if (!record) throw new AppError(404, 'Media not found');
    return record;
  }

  static async delete(id: string, actor?: Actor) {
    const record = await this.findById(id);

    // Resolve the correct provider based on the record's storageType
    const provider = await getStorageProvider();
    const config = await SettingsService.getStorageConfig();

    // If the file was stored with a different backend than the current one,
    // instantiate the right provider
    if (record.storageType !== config.activeStorage) {
      const { LocalStorageProvider } = await import('./storage/local-storage.provider.js');
      const localProvider = new LocalStorageProvider();
      await localProvider.delete(record.storageKey);
    } else {
      await provider.delete(record.storageKey);
    }

    await db.delete(media).where(eq(media.id, id));
    const actorData = actor ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent } : {};
    eventBus.emit('media.deleted', { media: record, ...actorData });
  }

  static async getFileStream(id: string): Promise<{ stream: Readable; mimeType: string; filename: string }> {
    const record = await this.findById(id);
    const config = await SettingsService.getStorageConfig();

    let stream: Readable;

    if (record.storageType !== config.activeStorage) {
      // File on different backend — use its original provider
      if (record.storageType === 'local') {
        const { LocalStorageProvider } = await import('./storage/local-storage.provider.js');
        stream = await new LocalStorageProvider().getStream(record.storageKey);
      } else {
        // s3 config may have changed; best-effort with current config
        const provider = await getStorageProvider();
        stream = await provider.getStream(record.storageKey);
      }
    } else {
      const provider = await getStorageProvider();
      stream = await provider.getStream(record.storageKey);
    }

    return { stream, mimeType: record.mimeType, filename: record.originalName };
  }
}
