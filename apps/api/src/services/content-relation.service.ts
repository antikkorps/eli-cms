import { eq, and, count as drizzleCount } from 'drizzle-orm';
import { db } from '../db/index.js';
import { contents, contentRelations } from '../db/schema/index.js';
import { AppError } from '../utils/app-error.js';
import { buildMeta } from '../utils/pagination.js';
import type { CreateContentRelationInput, ContentRelationListQuery } from '@eli-cms/shared';

export class ContentRelationService {
  static async create(sourceId: string, input: CreateContentRelationInput) {
    // Verify source exists
    const [source] = await db.select().from(contents).where(eq(contents.id, sourceId)).limit(1);
    if (!source) throw new AppError(404, 'Source content not found');

    // Prevent self-relation
    if (sourceId === input.targetId) {
      throw new AppError(400, 'A content cannot relate to itself');
    }

    // Verify target exists
    const [target] = await db.select().from(contents).where(eq(contents.id, input.targetId)).limit(1);
    if (!target) throw new AppError(404, 'Target content not found');

    // Check for duplicate
    const [existing] = await db
      .select()
      .from(contentRelations)
      .where(
        and(
          eq(contentRelations.sourceId, sourceId),
          eq(contentRelations.targetId, input.targetId),
          eq(contentRelations.relationType, input.relationType),
        ),
      )
      .limit(1);
    if (existing) throw new AppError(409, 'This relation already exists');

    const [relation] = await db
      .insert(contentRelations)
      .values({ sourceId, targetId: input.targetId, relationType: input.relationType })
      .returning();
    return relation;
  }

  static async findBySource(sourceId: string, query: ContentRelationListQuery) {
    const { page, limit, relationType } = query;
    const offset = (page - 1) * limit;

    const filters = [eq(contentRelations.sourceId, sourceId)];
    if (relationType) filters.push(eq(contentRelations.relationType, relationType));

    const where = and(...filters);

    const [{ total }] = await db
      .select({ total: drizzleCount() })
      .from(contentRelations)
      .where(where);

    const data = await db
      .select()
      .from(contentRelations)
      .where(where)
      .limit(limit)
      .offset(offset);

    return { data, meta: buildMeta(total, page, limit) };
  }

  static async delete(sourceId: string, relationId: string) {
    const [relation] = await db
      .select()
      .from(contentRelations)
      .where(and(eq(contentRelations.id, relationId), eq(contentRelations.sourceId, sourceId)))
      .limit(1);
    if (!relation) throw new AppError(404, 'Relation not found');

    await db.delete(contentRelations).where(eq(contentRelations.id, relationId));
  }
}
