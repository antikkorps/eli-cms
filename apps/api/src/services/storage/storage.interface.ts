import type { Readable } from 'node:stream';

export interface StorageProvider {
  save(key: string, buffer: Buffer, mimeType: string): Promise<void>;
  delete(key: string): Promise<void>;
  getStream(key: string): Promise<Readable>;
  getUrl(key: string): string;
}
