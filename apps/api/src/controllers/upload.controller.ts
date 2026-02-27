import type { Context } from 'koa';
import { uploadListQuerySchema } from '@eli-cms/shared';
import { UploadService } from '../services/upload.service.js';
import { AppError } from '../utils/app-error.js';
import { isAllowedMimeType } from '../utils/mime-types.js';

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
    const data = await UploadService.upload(file, userId);
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

  static async delete(ctx: Context) {
    await UploadService.delete(ctx.params.id);
    ctx.status = 204;
  }

  static async serve(ctx: Context) {
    const { stream, mimeType, filename } = await UploadService.getFileStream(ctx.params.id);
    ctx.set('Content-Type', mimeType);
    ctx.set('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
    ctx.body = stream;
  }
}
