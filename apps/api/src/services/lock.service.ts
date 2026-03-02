import { eq, and, lte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { contentLocks, users } from '../db/schema/index.js';
import { AppError } from '../utils/app-error.js';

const LOCK_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class LockService {
  private static ttl() {
    return new Date(Date.now() + LOCK_TTL_MS);
  }

  static async acquire(contentId: string, userId: string) {
    const now = new Date();

    // Check existing lock
    const [existing] = await db
      .select()
      .from(contentLocks)
      .where(eq(contentLocks.contentId, contentId))
      .limit(1);

    if (existing) {
      // Lock expired → delete and replace
      if (existing.expiresAt <= now) {
        await db.delete(contentLocks).where(eq(contentLocks.id, existing.id));
      } else if (existing.lockedBy === userId) {
        // Same user → refresh
        const [refreshed] = await db
          .update(contentLocks)
          .set({ expiresAt: this.ttl() })
          .where(eq(contentLocks.id, existing.id))
          .returning();
        return refreshed;
      } else {
        // Locked by another user
        const [locker] = await db.select({ email: users.email }).from(users).where(eq(users.id, existing.lockedBy)).limit(1);
        throw new AppError(423, `Content is being edited by ${locker?.email ?? 'another user'}`);
      }
    }

    // Insert new lock
    const [lock] = await db
      .insert(contentLocks)
      .values({ contentId, lockedBy: userId, expiresAt: this.ttl() })
      .returning();

    return lock;
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
      console.log(`Cleaned ${result.length} expired content lock(s)`);
    }
  }
}
