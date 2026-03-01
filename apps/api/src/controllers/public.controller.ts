import type { Context } from 'koa';
import {
  contentTypeListQuerySchema,
  publicContentListQuerySchema,
  CONTENT_PREVIEW,
} from '@eli-cms/shared';
import type { JwtPayload } from '@eli-cms/shared';
import { ContentTypeService } from '../services/content-type.service.js';
import { ContentService } from '../services/content.service.js';
import { ContentRelationService } from '../services/content-relation.service.js';
import { AppError } from '../utils/app-error.js';
import { parsePublicQuery } from '../utils/parse-public-query.js';
import { selectFields, selectFieldsMany } from '../utils/field-selector.js';

function isPreviewAllowed(ctx: Context): boolean {
  const user = ctx.state.user as JwtPayload | undefined;
  return !!user && Array.isArray(user.permissions) && user.permissions.includes(CONTENT_PREVIEW);
}

export class PublicController {
  static async listContentTypes(ctx: Context) {
    const result = contentTypeListQuerySchema.safeParse(ctx.query);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map(i => i.message).join(', '));
    }
    const { data, meta } = await ContentTypeService.findAll(result.data);
    ctx.body = { success: true, data, meta };
  }

  static async getContentTypeBySlug(ctx: Context) {
    const data = await ContentTypeService.findBySlugOrFail(ctx.params.slug);
    ctx.body = { success: true, data };
  }

  static async listContents(ctx: Context) {
    const parsed = parsePublicQuery(ctx.query as Record<string, unknown>);
    const result = publicContentListQuerySchema.safeParse(parsed);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map(i => i.message).join(', '));
    }

    const isPreview = result.data.preview === true && isPreviewAllowed(ctx);

    const { data, meta } = await ContentService.findPublic(result.data, { isPreview });

    let items: Record<string, unknown>[] = data;

    // Populate relations
    if (result.data.populate === 'relations' && items.length > 0) {
      const ids = items.map(c => c.id as string);
      const relationsMap = await ContentRelationService.populateRelations(ids, {
        onlyPublished: !isPreview,
      });
      items = items.map(c => ({
        ...c,
        _relations: relationsMap.get(c.id as string) ?? [],
      }));
    }

    // Field selection
    if (result.data.fields) {
      items = selectFieldsMany(items, result.data.fields);
    }

    ctx.body = { success: true, data: items, meta };
  }

  static async getContentById(ctx: Context) {
    const parsed = parsePublicQuery(ctx.query as Record<string, unknown>);
    const result = publicContentListQuerySchema.safeParse(parsed);
    const preview = result.success && result.data.preview === true && isPreviewAllowed(ctx);
    const populate = result.success ? result.data.populate : undefined;
    const fields = result.success ? result.data.fields : undefined;

    let item: Record<string, unknown>;
    if (preview) {
      item = await ContentService.findById(ctx.params.id);
    } else {
      item = await ContentService.findPublishedById(ctx.params.id);
    }

    // Populate relations
    if (populate === 'relations') {
      const relationsMap = await ContentRelationService.populateRelations(
        [item.id as string],
        { onlyPublished: !preview },
      );
      item = { ...item, _relations: relationsMap.get(item.id as string) ?? [] };
    }

    // Field selection
    if (fields) {
      item = selectFields(item, fields);
    }

    ctx.body = { success: true, data: item };
  }

  static async listContentsByType(ctx: Context) {
    const contentType = await ContentTypeService.findBySlugOrFail(ctx.params.slug);

    const parsed = parsePublicQuery(ctx.query as Record<string, unknown>);
    const result = publicContentListQuerySchema.safeParse(parsed);
    if (!result.success) {
      throw new AppError(400, result.error.issues.map(i => i.message).join(', '));
    }

    const isPreview = result.data.preview === true && isPreviewAllowed(ctx);

    const { data, meta } = await ContentService.findPublic(result.data, {
      isPreview,
      contentTypeId: contentType.id,
    });

    let items: Record<string, unknown>[] = data;

    // Populate relations
    if (result.data.populate === 'relations' && items.length > 0) {
      const ids = items.map(c => c.id as string);
      const relationsMap = await ContentRelationService.populateRelations(ids, {
        onlyPublished: !isPreview,
      });
      items = items.map(c => ({
        ...c,
        _relations: relationsMap.get(c.id as string) ?? [],
      }));
    }

    // Field selection
    if (result.data.fields) {
      items = selectFieldsMany(items, result.data.fields);
    }

    ctx.body = { success: true, data: items, meta };
  }

  static async getContentBySlug(ctx: Context) {
    const contentType = await ContentTypeService.findBySlugOrFail(ctx.params.slug);

    const parsed = parsePublicQuery(ctx.query as Record<string, unknown>);
    const result = publicContentListQuerySchema.safeParse(parsed);
    const preview = result.success && result.data.preview === true && isPreviewAllowed(ctx);
    const populate = result.success ? result.data.populate : undefined;
    const fields = result.success ? result.data.fields : undefined;

    let item: Record<string, unknown>;
    if (preview) {
      item = await ContentService.findBySlug(ctx.params.contentSlug, contentType.id);
    } else {
      item = await ContentService.findPublishedBySlug(ctx.params.contentSlug, contentType.id);
    }

    // Populate relations
    if (populate === 'relations') {
      const relationsMap = await ContentRelationService.populateRelations(
        [item.id as string],
        { onlyPublished: !preview },
      );
      item = { ...item, _relations: relationsMap.get(item.id as string) ?? [] };
    }

    // Field selection
    if (fields) {
      item = selectFields(item, fields);
    }

    ctx.body = { success: true, data: item };
  }
}
