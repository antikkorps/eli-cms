import { eq, and, count as drizzleCount, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { notifications, users } from '../db/schema/index.js';
import { buildMeta } from '../utils/pagination.js';
import { AppError } from '../utils/app-error.js';
import type { NotificationListQuery } from '@eli-cms/shared';

export class NotificationService {
  static async findByUser(userId: string, query: NotificationListQuery) {
    const { page, limit, isRead } = query;
    const offset = (page - 1) * limit;

    const filters = [eq(notifications.userId, userId)];
    if (isRead !== undefined) filters.push(eq(notifications.isRead, isRead));

    const where = and(...filters);

    const [{ total }] = await db.select({ total: drizzleCount() }).from(notifications).where(where);

    const data = await db
      .select()
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    return { data, meta: buildMeta(total, page, limit) };
  }

  static async unreadCount(userId: string) {
    const [{ total }] = await db
      .select({ total: drizzleCount() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return total;
  }

  static async markRead(notificationId: string, userId: string) {
    const [notif] = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
      .limit(1);
    if (!notif) throw new AppError(404, 'Notification not found');

    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId))
      .returning();
    return updated;
  }

  static async markAllRead(userId: string) {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  }

  static async createMentionNotifications(mentionerUserId: string, contentId: string, mentionedUserIds: string[]) {
    if (mentionedUserIds.length === 0) return;

    // Filter out self-mention
    const targetIds = mentionedUserIds.filter((id) => id !== mentionerUserId);
    if (targetIds.length === 0) return;

    // Get mentioner display name
    const [mentioner] = await db
      .select({ firstName: users.firstName, lastName: users.lastName, email: users.email })
      .from(users)
      .where(eq(users.id, mentionerUserId))
      .limit(1);

    const mentionerName = mentioner?.firstName
      ? [mentioner.firstName, mentioner.lastName].filter(Boolean).join(' ')
      : (mentioner?.email ?? 'Someone');

    const values = targetIds.map((userId) => ({
      userId,
      type: 'mention',
      title: `${mentionerName} mentioned you in a comment`,
      resourceType: 'content',
      resourceId: contentId,
      link: `/admin/contents/${contentId}?tab=comments`,
    }));

    await db.insert(notifications).values(values);
  }
}
