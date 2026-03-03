import { createHash } from 'node:crypto';
import type { Context } from 'koa';
import { uploadListQuerySchema, imageTransformQuerySchema, updateMediaSchema } from '@eli-cms/shared';
import { UploadService } from '../services/upload.service.js';
import { ImageTransformService } from '../services/image-transform.service.js';
import { AppError } from '../utils/app-error.js';
import { isAllowedMimeType, TRANSFORMABLE_MIME_TYPES } from '../utils/mime-types.js';
import { extractActor } from '../utils/extract-actor.js';

export class UploadController {
  static async upload(ctx: Context) {
    const file = ctx.file as Express.Multer.File | undefined;
    if (!file) {
      throw new AppError(400, 'No file provided. The file type may not be allowed.');
    }

    // Defense-in-depth: validate MIME type even after multer fileFilter
    if (!isAllowedMimeType(file.mimetype)) {
      throw new AppError(400, `File type "${file.mimetype}" is not allowed`);
    }

    const userId = ctx.state.user.userId as string;
    const folderId = (ctx.request.body as Record<string, unknown>)?.folderId as string | undefined;
    const data = await UploadService.upload(file, userId, extractActor(ctx), folderId);
    ctx.status = 201;
    ctx.body = { success: true, data };
  }

  static async list(ctx: Context) {
    const result = uploadListQuerySchema.safeParse(ctx.query);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((i) => i.message).join(', '));
    }
    const { data, meta } = await UploadService.findAll(result.data);
    ctx.body = { success: true, data, meta };
  }

  static async get(ctx: Context) {
    const data = await UploadService.findById(ctx.params.id);
    ctx.body = { success: true, data };
  }

  static async update(ctx: Context) {
    const result = updateMediaSchema.safeParse(ctx.request.body);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((i) => i.message).join(', '));
    }
    const data = await UploadService.update(ctx.params.id, result.data);
    ctx.body = { success: true, data };
  }

  static async delete(ctx: Context) {
    await UploadService.delete(ctx.params.id, extractActor(ctx));
    ctx.status = 204;
  }

  static async serve(ctx: Context) {
    const { stream, mimeType, filename } = await UploadService.getFileStream(ctx.params.id);

    // Try to parse transform query params
    const parsed = imageTransformQuerySchema.safeParse(ctx.query);
    const hasTransformParams =
      parsed.success &&
      (parsed.data.w !== undefined ||
        parsed.data.h !== undefined ||
        parsed.data.format !== undefined ||
        parsed.data.fit !== undefined ||
        parsed.data.q !== undefined);

    if (hasTransformParams && TRANSFORMABLE_MIME_TYPES.has(mimeType)) {
      const params = parsed.data;
      const cacheKey = ImageTransformService.buildCacheKey(ctx.params.id, params);
      const etag = `"${createHash('md5').update(cacheKey).digest('hex')}"`;

      // ETag / 304 support
      if (ctx.get('If-None-Match') === etag) {
        ctx.status = 304;
        stream.destroy();
        return;
      }

      const { buffer, mimeType: outputMime } = await ImageTransformService.getTransformed(
        ctx.params.id,
        stream,
        mimeType,
        params,
      );

      ctx.set('Content-Type', outputMime);
      ctx.set('Content-Length', String(buffer.length));
      ctx.set('Cache-Control', 'public, max-age=31536000, immutable');
      ctx.set('ETag', etag);
      ctx.body = buffer;
    } else {
      // Serve original file
      ctx.set('Content-Type', mimeType);
      ctx.set('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
      ctx.set('Cache-Control', 'public, max-age=86400');
      ctx.body = stream;
    }
  }
}
