import type { Context } from 'koa';
import { exportContentQuerySchema } from '@eli-cms/shared';
import { ContentExportService } from '../services/content-export.service.js';
import { AppError } from '../utils/app-error.js';
import { extractActor } from '../utils/extract-actor.js';

export class ContentExportController {
  static async exportContents(ctx: Context) {
    const result = exportContentQuerySchema.safeParse(ctx.query);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map((i) => i.message).join(', '));
    }

    const { data, mimeType, extension } = await ContentExportService.exportContents(result.data);

    ctx.set('Content-Type', mimeType);
    ctx.set('Content-Disposition', `attachment; filename="export.${extension}"`);
    ctx.body = data;
  }

  static async importContents(ctx: Context) {
    const file = ctx.file;
    if (!file) {
      throw new AppError(400, 'No file provided');
    }

    const contentTypeId = (ctx.request.body as Record<string, unknown>)?.contentTypeId;
    if (!contentTypeId || typeof contentTypeId !== 'string') {
      throw new AppError(400, 'contentTypeId is required');
    }

    // Detect format from file extension
    const originalName = file.originalname ?? '';
    let format = 'json';
    if (originalName.endsWith('.csv')) format = 'csv';
    else if (originalName.endsWith('.xml')) format = 'xml';

    const result = await ContentExportService.importContents(contentTypeId, file.buffer, format, extractActor(ctx));

    ctx.body = { success: true, data: result };
  }
}
