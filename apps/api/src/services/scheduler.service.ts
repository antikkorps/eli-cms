import { db } from '../db/index.js';
import { contents } from '../db/schema/index.js';
import { eq, and, lte, isNull, isNotNull } from 'drizzle-orm';
import { eventBus } from './event-bus.js';
import { LockService } from './lock.service.js';
import { logger } from '../utils/logger.js';

const POLL_INTERVAL_MS = 60_000; // 60 seconds
const TRASH_RETENTION_DAYS = 30;

export class SchedulerService {
  private static timer: ReturnType<typeof setInterval> | null = null;

  static start() {
    if (this.timer) return;
    logger.info('Scheduler started (polling every 60s)');
    this.timer = setInterval(() => {
      this.publishScheduled().catch((err) => logger.error(err, 'Scheduler: publishScheduled failed'));
      this.purgeExpiredTrash().catch((err) => logger.error(err, 'Scheduler: purgeExpiredTrash failed'));
      LockService.cleanExpired().catch((err) => logger.error(err, 'Scheduler: cleanExpired failed'));
    }, POLL_INTERVAL_MS);
    // Run once immediately
    this.publishScheduled().catch((err) => logger.error(err, 'Scheduler: publishScheduled failed'));
    this.purgeExpiredTrash().catch((err) => logger.error(err, 'Scheduler: purgeExpiredTrash failed'));
    LockService.cleanExpired().catch((err) => logger.error(err, 'Scheduler: cleanExpired failed'));
  }

  static shutdown() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('Scheduler stopped');
    }
  }

  private static async publishScheduled() {
    const now = new Date();
    const scheduled = await db
      .select()
      .from(contents)
      .where(
        and(
          eq(contents.status, 'scheduled'),
          lte(contents.publishedAt, now),
          isNull(contents.deletedAt),
        ),
      );

    if (scheduled.length === 0) return;

    for (const content of scheduled) {
      const [updated] = await db
        .update(contents)
        .set({ status: 'published', publishedAt: now })
        .where(eq(contents.id, content.id))
        .returning();

      eventBus.emit('content.published', {
        content: updated,
        actorId: 'system',
        actorType: 'system',
      });
      logger.info({ contentId: content.id }, 'Auto-published scheduled content');
    }
  }

  private static async purgeExpiredTrash() {
    const cutoff = new Date(Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const expired = await db
      .select()
      .from(contents)
      .where(
        and(
          isNotNull(contents.deletedAt),
          lte(contents.deletedAt, cutoff),
        ),
      );

    if (expired.length === 0) return;

    await db.delete(contents).where(and(isNotNull(contents.deletedAt), lte(contents.deletedAt, cutoff)));

    for (const content of expired) {
      eventBus.emit('content.purged', {
        content,
        actorId: 'system',
        actorType: 'system',
      });
    }
    logger.info({ count: expired.length }, 'Purged expired trashed contents');
  }
}
