import { eq, count as drizzleCount, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { contents, contentComments, users } from '../db/schema/index.js';
import { AppError } from '../utils/app-error.js';
import { buildMeta } from '../utils/pagination.js';
import { NotificationService } from './notification.service.js';
import type { CreateContentCommentInput, UpdateContentCommentInput, ContentCommentListQuery } from '@eli-cms/shared';

export class ContentCommentService {
  static async findByContent(contentId: string, query: ContentCommentListQuery) {
    const { page, limit } = query;
    const offset = (page - 1) * limit;

    const where = eq(contentComments.contentId, contentId);

    const [{ total }] = await db.select({ total: drizzleCount() }).from(contentComments).where(where);

    const rows = await db
      .select({
        comment: contentComments,
        author: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          avatarStyle: users.avatarStyle,
          avatarSeed: users.avatarSeed,
        },
      })
      .from(contentComments)
      .innerJoin(users, eq(contentComments.userId, users.id))
      .where(where)
      .orderBy(desc(contentComments.createdAt))
      .limit(limit)
      .offset(offset);

    const data = rows.map((r) => ({ ...r.comment, author: r.author }));

    return { data, meta: buildMeta(total, page, limit) };
  }

  static async create(contentId: string, userId: string, input: CreateContentCommentInput) {
    const [content] = await db.select({ id: contents.id }).from(contents).where(eq(contents.id, contentId)).limit(1);
    if (!content) throw new AppError(404, 'Content not found');

    const mentionedUserIds = input.mentionedUserIds ?? [];

    const [comment] = await db
      .insert(contentComments)
      .values({ contentId, userId, body: input.body, mentionedUserIds })
      .returning();

    // Create notifications for mentioned users (async, don't block response)
    if (mentionedUserIds.length > 0) {
      NotificationService.createMentionNotifications(userId, contentId, mentionedUserIds).catch(() => {
        // Notification creation failure should not affect comment creation
      });
    }

    return comment;
  }

  static async update(commentId: string, userId: string, input: UpdateContentCommentInput, isAdmin: boolean) {
    const [comment] = await db.select().from(contentComments).where(eq(contentComments.id, commentId)).limit(1);
    if (!comment) throw new AppError(404, 'Comment not found');
    if (comment.userId !== userId && !isAdmin) {
      throw new AppError(403, 'You can only edit your own comments');
    }

    const updateData: Record<string, unknown> = { body: input.body };
    if (input.mentionedUserIds !== undefined) {
      updateData.mentionedUserIds = input.mentionedUserIds;

      // Notify newly mentioned users
      const previousMentions = (comment.mentionedUserIds as string[]) ?? [];
      const newMentions = input.mentionedUserIds.filter((id) => !previousMentions.includes(id));
      if (newMentions.length > 0) {
        NotificationService.createMentionNotifications(userId, comment.contentId, newMentions).catch(() => {});
      }
    }

    const [updated] = await db
      .update(contentComments)
      .set(updateData)
      .where(eq(contentComments.id, commentId))
      .returning();
    return updated;
  }

  static async delete(commentId: string, userId: string, isAdmin: boolean) {
    const [comment] = await db.select().from(contentComments).where(eq(contentComments.id, commentId)).limit(1);
    if (!comment) throw new AppError(404, 'Comment not found');
    if (comment.userId !== userId && !isAdmin) {
      throw new AppError(403, 'You can only delete your own comments');
    }

    await db.delete(contentComments).where(eq(contentComments.id, commentId));
  }
}
