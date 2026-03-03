import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile, readdir, unlink } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import type { Readable } from 'node:stream';
import type { ImageTransformQuery } from '@eli-cms/shared';

const CACHE_DIR = join(process.cwd(), 'uploads', '.cache');
const CACHE_DIR_ABS = resolve(CACHE_DIR);

const FORMAT_TO_MIME: Record<string, string> = {
  webp: 'image/webp',
  avif: 'image/avif',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

const MIME_TO_FORMAT: Record<string, string> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/tiff': 'jpeg',
};

export class ImageTransformService {
  /** Hash mediaId to prevent path traversal in cache filenames. */
  private static safeId(mediaId: string): string {
    return createHash('sha256').update(mediaId).digest('hex');
  }

  /** Resolve a cache path and verify it stays inside CACHE_DIR. Returns null if unsafe. */
  private static safeCachePath(cacheKey: string): string | null {
    const candidate = resolve(CACHE_DIR_ABS, cacheKey);
    if (!candidate.startsWith(CACHE_DIR_ABS + sep)) return null;
    return candidate;
  }

  static buildCacheKey(mediaId: string, params: ImageTransformQuery): string {
    const safe = this.safeId(mediaId);
    const w = params.w ?? 0;
    const h = params.h ?? 0;
    const format = params.format ?? 'orig';
    const fit = params.fit ?? 'cover';
    const q = params.q ?? 0;
    return `${safe}_${w}_${h}_${format}_${fit}_${q}`;
  }

  static getOutputMimeType(originalMime: string, requestedFormat?: string): string {
    if (requestedFormat && FORMAT_TO_MIME[requestedFormat]) {
      return FORMAT_TO_MIME[requestedFormat];
    }
    return originalMime;
  }

  static getOutputFormat(originalMime: string, requestedFormat?: string): string {
    if (requestedFormat) return requestedFormat;
    return MIME_TO_FORMAT[originalMime] ?? 'jpeg';
  }

  static async getTransformed(
    mediaId: string,
    sourceStream: Readable,
    originalMime: string,
    params: ImageTransformQuery,
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    const cacheKey = this.buildCacheKey(mediaId, params);
    const mimeType = this.getOutputMimeType(originalMime, params.format);

    await mkdir(CACHE_DIR, { recursive: true });
    const cachePath = this.safeCachePath(cacheKey);

    // Check cache
    if (cachePath && existsSync(cachePath)) {
      const buffer = await readFile(cachePath);
      return { buffer, mimeType };
    }

    // Transform
    const buffer = await this.transform(sourceStream, originalMime, params, cachePath);
    return { buffer, mimeType };
  }

  private static async transform(
    sourceStream: Readable,
    originalMime: string,
    params: ImageTransformQuery,
    cachePath: string | null,
  ): Promise<Buffer> {
    // Collect stream into buffer
    const chunks: Buffer[] = [];
    for await (const chunk of sourceStream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const sourceBuffer = Buffer.concat(chunks);

    const format = this.getOutputFormat(originalMime, params.format);
    const quality = params.q ?? (format === 'avif' ? 50 : 80);

    let pipeline = sharp(sourceBuffer);

    if (params.w || params.h) {
      pipeline = pipeline.resize({
        width: params.w,
        height: params.h,
        fit: params.fit ?? 'cover',
        withoutEnlargement: true,
      });
    }

    pipeline = pipeline.toFormat(format as keyof sharp.FormatEnum, { quality });

    const result = await pipeline.toBuffer();

    // Write to cache (fire and forget — non-blocking, skip if path unsafe)
    if (cachePath) {
      writeFile(cachePath, result).catch(() => {});
    }

    return result;
  }

  static async clearCache(mediaId: string): Promise<void> {
    try {
      if (!existsSync(CACHE_DIR)) return;
      const files = await readdir(CACHE_DIR);
      const prefix = `${this.safeId(mediaId)}_`;
      const deletes = files
        .filter((f) => f.startsWith(prefix))
        .map((f) => {
          const filePath = this.safeCachePath(f);
          return filePath ? unlink(filePath).catch(() => {}) : Promise.resolve();
        });
      await Promise.all(deletes);
    } catch {
      // Cache cleanup is best-effort
    }
  }
}
