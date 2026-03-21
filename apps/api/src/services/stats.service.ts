import { db } from '../db/index.js';
import { contents, media, auditLogs, contentTypes } from '../db/schema/index.js';
import { sql, eq, gte, isNull, count, sum } from 'drizzle-orm';

export class StatsService {
  /**
   * Content created per day over the last N days
   */
  static async contentOverTime(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await db
      .select({
        date: sql<string>`date_trunc('day', ${contents.createdAt})::date`.as('date'),
        count: count().as('count'),
      })
      .from(contents)
      .where(sql`${contents.createdAt} >= ${since} AND ${contents.deletedAt} IS NULL`)
      .groupBy(sql`date_trunc('day', ${contents.createdAt})::date`)
      .orderBy(sql`date_trunc('day', ${contents.createdAt})::date`);

    return StatsService.fillMissingDays(rows, days);
  }

  /**
   * Content count grouped by status
   */
  static async contentByStatus() {
    const rows = await db
      .select({
        status: contents.status,
        count: count().as('count'),
      })
      .from(contents)
      .where(isNull(contents.deletedAt))
      .groupBy(contents.status);

    return rows;
  }

  /**
   * Content count per content type
   */
  static async contentByType() {
    const rows = await db
      .select({
        name: contentTypes.name,
        count: count().as('count'),
      })
      .from(contents)
      .innerJoin(contentTypes, eq(contents.contentTypeId, contentTypes.id))
      .where(isNull(contents.deletedAt))
      .groupBy(contentTypes.name)
      .orderBy(sql`count DESC`)
      .limit(10);

    return rows;
  }

  /**
   * Storage usage: total size and breakdown by mime type category
   */
  static async storageUsage() {
    const rows = await db
      .select({
        category: sql<string>`
          CASE
            WHEN ${media.mimeType} LIKE 'image/%' THEN 'image'
            WHEN ${media.mimeType} LIKE 'video/%' THEN 'video'
            WHEN ${media.mimeType} LIKE 'audio/%' THEN 'audio'
            WHEN ${media.mimeType} LIKE 'application/pdf' THEN 'document'
            ELSE 'other'
          END
        `.as('category'),
        totalSize: sum(media.size).as('total_size'),
        fileCount: count().as('file_count'),
      })
      .from(media)
      .groupBy(sql`category`);

    return rows.map((r) => ({
      category: r.category,
      totalSize: Number(r.totalSize) || 0,
      fileCount: r.fileCount,
    }));
  }

  /**
   * Activity (audit logs) per day over the last N days
   */
  static async activityOverTime(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await db
      .select({
        date: sql<string>`date_trunc('day', ${auditLogs.createdAt})::date`.as('date'),
        count: count().as('count'),
      })
      .from(auditLogs)
      .where(gte(auditLogs.createdAt, since))
      .groupBy(sql`date_trunc('day', ${auditLogs.createdAt})::date`)
      .orderBy(sql`date_trunc('day', ${auditLogs.createdAt})::date`);

    return StatsService.fillMissingDays(rows, days);
  }

  /**
   * Fill missing days with 0 so charts have continuous data
   */
  private static fillMissingDays(rows: { date: string; count: number }[], days: number) {
    const map = new Map(rows.map((r) => [r.date.slice(0, 10), r.count]));
    const result: { date: string; count: number }[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      result.push({ date: key, count: map.get(key) ?? 0 });
    }

    return result;
  }
}
