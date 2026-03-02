import { db } from '../db/index.js';
import { contents } from '../db/schema/index.js';
import { eq, and, lte, isNull, isNotNull } from 'drizzle-orm';
import { eventBus } from './event-bus.js';

const POLL_INTERVAL_MS = 60_000; // 60 seconds
const TRASH_RETENTION_DAYS = 30;

export class SchedulerService {
  private static timer: ReturnType<typeof setInterval> | null = null;

  static start() {
    if (this.timer) return;
    console.log('Scheduler started (polling every 60s)');
    this.timer = setInterval(() => {
      this.publishScheduled().catch(console.error);
      this.purgeExpiredTrash().catch(console.error);
    }, POLL_INTERVAL_MS);
    // Run once immediately
    this.publishScheduled().catch(console.error);
    this.purgeExpiredTrash().catch(console.error);
  }

  static shutdown() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('Scheduler stopped');
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
      console.log(`Auto-published content ${content.id}`);
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
    console.log(`Purged ${expired.length} expired trashed content(s)`);
  }
}
