import { eq, and, count as drizzleCount, desc, max } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { db } from '../db/index.js';
import { contents, contentVersions } from '../db/schema/index.js';
import { AppError } from '../utils/app-error.js';
import { buildMeta } from '../utils/pagination.js';
import type { ContentVersionListQuery } from '@eli-cms/shared';

const MAX_VERSIONS = 20;

export class ContentVersionService {
  /** Snapshots the current state of a content before an update. */
  static async snapshot(contentId: string, editedBy: string, tx?: NodePgDatabase<any>) {
    const runner = tx ?? db;

    const [content] = await runner.select().from(contents).where(eq(contents.id, contentId)).limit(1);
    if (!content) throw new AppError(404, 'Content not found');

    // Get next version number
    const [result] = await runner
      .select({ maxVersion: max(contentVersions.versionNumber) })
      .from(contentVersions)
      .where(eq(contentVersions.contentId, contentId));
    const nextVersion = (result.maxVersion ?? 0) + 1;

    const [version] = await runner
      .insert(contentVersions)
      .values({
        contentId,
        versionNumber: nextVersion,
        data: content.data,
        status: content.status,
        editedBy,
      })
      .returning();

    // Purge old versions if exceeding MAX_VERSIONS
    if (nextVersion > MAX_VERSIONS) {
      const oldVersions = await runner
        .select({ id: contentVersions.id })
        .from(contentVersions)
        .where(eq(contentVersions.contentId, contentId))
        .orderBy(desc(contentVersions.versionNumber))
        .offset(MAX_VERSIONS);

      for (const v of oldVersions) {
        await runner.delete(contentVersions).where(eq(contentVersions.id, v.id));
      }
    }

    return version;
  }

  static async findAll(contentId: string, query: ContentVersionListQuery) {
    const { page, limit } = query;
    const offset = (page - 1) * limit;

    const where = eq(contentVersions.contentId, contentId);

    const [{ total }] = await db
      .select({ total: drizzleCount() })
      .from(contentVersions)
      .where(where);

    const data = await db
      .select()
      .from(contentVersions)
      .where(where)
      .orderBy(desc(contentVersions.versionNumber))
      .limit(limit)
      .offset(offset);

    return { data, meta: buildMeta(total, page, limit) };
  }

  static async findById(contentId: string, versionId: string) {
    const [version] = await db
      .select()
      .from(contentVersions)
      .where(and(eq(contentVersions.id, versionId), eq(contentVersions.contentId, contentId)))
      .limit(1);
    if (!version) throw new AppError(404, 'Version not found');
    return version;
  }

  static async findByNumber(contentId: string, versionNumber: number) {
    const [version] = await db
      .select()
      .from(contentVersions)
      .where(and(eq(contentVersions.versionNumber, versionNumber), eq(contentVersions.contentId, contentId)))
      .limit(1);
    if (!version) throw new AppError(404, 'Version not found');
    return version;
  }

  /** Restores a previous version: snapshots current state first, then overwrites with the chosen version. */
  static async restore(contentId: string, versionNumber: number, userId: string) {
    const version = await this.findByNumber(contentId, versionNumber);

    // Snapshot current state before restoring
    await this.snapshot(contentId, userId);

    // Overwrite content with the restored version's data
    const [updated] = await db
      .update(contents)
      .set({ data: version.data, status: version.status as 'draft' | 'published' })
      .where(eq(contents.id, contentId))
      .returning();

    return updated;
  }
}
