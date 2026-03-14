import { eq, and, count as drizzleCount, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { contents, contentRelations, contentTypes } from '../db/schema/index.js';
import { AppError } from '../utils/app-error.js';
import { buildMeta } from '../utils/pagination.js';
import type { CreateContentRelationInput, ContentRelationListQuery, PopulatedRelation } from '@eli-cms/shared';

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

    const [{ total }] = await db.select({ total: drizzleCount() }).from(contentRelations).where(where);

    const rows = await db.select().from(contentRelations).where(where).limit(limit).offset(offset);

    // Populate target contents with their content type
    const targetIds = [...new Set(rows.map((r) => r.targetId))];
    let targets: { content: typeof contents.$inferSelect; contentTypeName: string | null }[] = [];
    if (targetIds.length > 0) {
      targets = await db
        .select({
          content: contents,
          contentTypeName: contentTypes.name,
        })
        .from(contents)
        .leftJoin(contentTypes, eq(contents.contentTypeId, contentTypes.id))
        .where(inArray(contents.id, targetIds));
    }
    const targetMap = new Map(targets.map((t) => [t.content.id, t]));

    const data = rows.map((rel) => {
      const t = targetMap.get(rel.targetId);
      return {
        ...rel,
        target: t
          ? {
              id: t.content.id,
              data: t.content.data,
              contentType: t.contentTypeName ? { name: t.contentTypeName } : undefined,
            }
          : undefined,
      };
    });

    return { data, meta: buildMeta(total, page, limit) };
  }

  /**
   * Batch-populate relations for multiple content items (2 queries, never N+1).
   * Depth limited to 1 — populated targets do NOT have their own relations resolved.
   */
  static async populateRelations(
    contentIds: string[],
    options?: { onlyPublished?: boolean },
  ): Promise<Map<string, PopulatedRelation[]>> {
    const result = new Map<string, PopulatedRelation[]>();
    if (contentIds.length === 0) return result;

    // Query 1: fetch all relations for given source IDs
    const relations = await db.select().from(contentRelations).where(inArray(contentRelations.sourceId, contentIds));

    if (relations.length === 0) return result;

    // Query 2: fetch all target contents
    const targetIds = [...new Set(relations.map((r) => r.targetId))];
    let targetQuery = db.select().from(contents).where(inArray(contents.id, targetIds));
    if (options?.onlyPublished) {
      targetQuery = db
        .select()
        .from(contents)
        .where(and(inArray(contents.id, targetIds), eq(contents.status, 'published')));
    }
    const targets = await targetQuery;
    const targetMap = new Map(targets.map((t) => [t.id, t]));

    // Build the result map
    for (const rel of relations) {
      const target = targetMap.get(rel.targetId);
      if (!target) continue; // target filtered out (e.g. not published)

      const populated: PopulatedRelation = {
        id: rel.id,
        relationType: rel.relationType,
        target,
      };

      const existing = result.get(rel.sourceId);
      if (existing) {
        existing.push(populated);
      } else {
        result.set(rel.sourceId, [populated]);
      }
    }

    return result;
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
