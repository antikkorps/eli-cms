import { eq, and, count as drizzleCount, asc, desc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { contents } from '../db/schema/index.js';
import { ContentTypeService } from './content-type.service.js';
import { AppError } from '../utils/app-error.js';
import { buildMeta } from '../utils/pagination.js';
import { buildContentDataSchema } from '@eli-cms/shared';
import type { CreateContentInput, UpdateContentInput, ContentListQuery } from '@eli-cms/shared';

const sortColumns = {
  createdAt: contents.createdAt,
  updatedAt: contents.updatedAt,
  status: contents.status,
} as const;

function sanitizeSearchTerms(raw: string): string | null {
  const terms = raw
    .split(/\s+/)
    .map(t => t.replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, ''))
    .filter(t => t.length > 0);
  return terms.length > 0 ? terms.join(' & ') : null;
}

export class ContentService {
  static async findAll(query: ContentListQuery) {
    const { page, limit, contentTypeId, status, search, sortBy, sortOrder } = query;
    const offset = (page - 1) * limit;

    const filters = [];
    if (contentTypeId) filters.push(eq(contents.contentTypeId, contentTypeId));
    if (status) filters.push(eq(contents.status, status));

    const tsquery = search ? sanitizeSearchTerms(search) : null;
    if (tsquery) {
      filters.push(sql`search_vector @@ to_tsquery('simple', ${tsquery})`);
    }

    const where = filters.length > 0 ? and(...filters) : undefined;

    const [{ total }] = await db
      .select({ total: drizzleCount() })
      .from(contents)
      .where(where);

    // Determine ordering
    let orderByClause;
    if (sortBy === 'relevance' && tsquery) {
      orderByClause = sql`ts_rank(search_vector, to_tsquery('simple', ${tsquery})) DESC`;
    } else {
      const orderFn = sortOrder === 'asc' ? asc : desc;
      const orderCol = sortBy === 'relevance' ? contents.createdAt : sortColumns[sortBy];
      orderByClause = orderFn(orderCol);
    }

    const data = await db
      .select()
      .from(contents)
      .where(where)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    return { data, meta: buildMeta(total, page, limit) };
  }

  static async findById(id: string) {
    const [content] = await db.select().from(contents).where(eq(contents.id, id)).limit(1);
    if (!content) throw new AppError(404, 'Content not found');
    return content;
  }

  static async findPublishedById(id: string) {
    const [content] = await db
      .select()
      .from(contents)
      .where(and(eq(contents.id, id), eq(contents.status, 'published')))
      .limit(1);
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
