import { createReadStream } from 'node:fs';
import { mkdir, writeFile, unlink, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { Readable } from 'node:stream';
import type { StorageProvider } from './storage.interface.js';
import { AppError } from '../../utils/app-error.js';

const UPLOADS_DIR = join(process.cwd(), 'uploads');

export class LocalStorageProvider implements StorageProvider {
  async save(key: string, buffer: Buffer, _mimeType: string): Promise<void> {
    const filePath = join(UPLOADS_DIR, key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
  }

  async delete(key: string): Promise<void> {
    const filePath = join(UPLOADS_DIR, key);
    try {
      await unlink(filePath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }

  async getStream(key: string): Promise<Readable> {
    const filePath = join(UPLOADS_DIR, key);
    try {
      await access(filePath);
    } catch {
      throw new AppError(404, 'File not found on disk');
    }
    return createReadStream(filePath);
  }

  getUrl(key: string): string {
    return `/api/uploads/${key}/file`;
  }
}
