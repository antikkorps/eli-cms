import { eq, and, lte, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { contentLocks, users } from '../db/schema/index.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';

const LOCK_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class LockService {
  private static ttl() {
    return new Date(Date.now() + LOCK_TTL_MS);
  }

  static async acquire(contentId: string, userId: string) {
    return db.transaction(async (tx) => {
      const now = new Date();

      // Delete expired locks within the transaction
      await tx.delete(contentLocks).where(
        and(eq(contentLocks.contentId, contentId), lte(contentLocks.expiresAt, now)),
      );

      // SELECT … FOR UPDATE to serialize concurrent lock attempts
      const rows = await tx.execute(
        sql`SELECT id, content_id, locked_by, expires_at, created_at
            FROM content_locks
            WHERE content_id = ${contentId}
            FOR UPDATE`,
      );
      const existing = (rows as unknown as { rows: Array<{ id: string; locked_by: string; expires_at: Date }> }).rows?.[0];

      if (existing) {
        if (existing.locked_by === userId) {
          // Same user → refresh TTL
          const [refreshed] = await tx
            .update(contentLocks)
            .set({ expiresAt: this.ttl() })
            .where(eq(contentLocks.id, existing.id))
            .returning();
          return refreshed;
        }
        // Locked by another user
        const [locker] = await tx.select({ email: users.email }).from(users).where(eq(users.id, existing.locked_by)).limit(1);
        throw new AppError(423, `Content is being edited by ${locker?.email ?? 'another user'}`);
      }

      // No lock exists → insert
      const [lock] = await tx
        .insert(contentLocks)
        .values({ contentId, lockedBy: userId, expiresAt: this.ttl() })
        .returning();

      return lock;
    });
  }

  static async release(contentId: string, userId: string) {
    const result = await db
      .delete(contentLocks)
      .where(and(eq(contentLocks.contentId, contentId), eq(contentLocks.lockedBy, userId)))
      .returning();

    return result.length > 0;
  }

  static async heartbeat(contentId: string, userId: string) {
    const [updated] = await db
      .update(contentLocks)
      .set({ expiresAt: this.ttl() })
      .where(and(eq(contentLocks.contentId, contentId), eq(contentLocks.lockedBy, userId)))
      .returning();

    if (!updated) {
      throw new AppError(404, 'No active lock found');
    }

    return updated;
  }

  static async getStatus(contentId: string) {
    const now = new Date();

    const [lock] = await db
      .select({
        id: contentLocks.id,
        contentId: contentLocks.contentId,
        lockedBy: contentLocks.lockedBy,
        expiresAt: contentLocks.expiresAt,
        createdAt: contentLocks.createdAt,
        email: users.email,
      })
      .from(contentLocks)
      .innerJoin(users, eq(contentLocks.lockedBy, users.id))
      .where(eq(contentLocks.contentId, contentId))
      .limit(1);

    if (!lock || lock.expiresAt <= now) return null;

    return lock;
  }

  static async checkLock(contentId: string, userId: string) {
    const lock = await this.getStatus(contentId);
    if (lock && lock.lockedBy !== userId) {
      throw new AppError(423, `Content is being edited by ${lock.email}`);
    }
  }

  static async cleanExpired() {
    const now = new Date();
    const result = await db
      .delete(contentLocks)
      .where(lte(contentLocks.expiresAt, now))
      .returning();

    if (result.length > 0) {
      logger.info({ count: result.length }, 'Cleaned expired content locks');
    }
  }
}
