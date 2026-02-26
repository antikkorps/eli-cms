import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { contents } from '../db/schema/index.js';
import { ContentTypeService } from './content-type.service.js';
import { AppError } from '../utils/app-error.js';
import { buildContentDataSchema } from '@eli-cms/shared';
import type { CreateContentInput, UpdateContentInput } from '@eli-cms/shared';

export class ContentService {
  static async findAll(contentTypeId?: string) {
    if (contentTypeId) {
      return db.select().from(contents).where(eq(contents.contentTypeId, contentTypeId)).orderBy(contents.createdAt);
    }
    return db.select().from(contents).orderBy(contents.createdAt);
  }

  static async findById(id: string) {
    const [content] = await db.select().from(contents).where(eq(contents.id, id)).limit(1);
    if (!content) throw new AppError(404, 'Content not found');
    return content;
  }

  static async create(input: CreateContentInput) {
    const contentType = await ContentTypeService.findById(input.contentTypeId);

    // Dynamic validation
    const dataSchema = buildContentDataSchema(contentType.fields);
    const dataResult = dataSchema.safeParse(input.data);
    if (!dataResult.success) {
      throw new AppError(400, `Data validation: ${dataResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')}`);
    }

    const [content] = await db
      .insert(contents)
      .values({ contentTypeId: input.contentTypeId, status: input.status ?? 'draft', data: dataResult.data })
      .returning();
    return content;
  }

  static async update(id: string, input: UpdateContentInput) {
    const existing = await this.findById(id);

    if (input.data) {
      const contentType = await ContentTypeService.findById(existing.contentTypeId);
      const dataSchema = buildContentDataSchema(contentType.fields);
      const dataResult = dataSchema.safeParse(input.data);
      if (!dataResult.success) {
        throw new AppError(400, `Data validation: ${dataResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')}`);
      }
      input.data = dataResult.data as Record<string, unknown>;
    }

    const [content] = await db.update(contents).set(input).where(eq(contents.id, id)).returning();
    return content;
  }

  static async delete(id: string) {
    await this.findById(id);
    await db.delete(contents).where(eq(contents.id, id));
  }
}
