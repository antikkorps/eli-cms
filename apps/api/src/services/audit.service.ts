import { and, count as drizzleCount, desc, eq, gte, lte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { auditLogs } from '../db/schema/index.js';
import { buildMeta } from '../utils/pagination.js';
import { eventBus } from './event-bus.js';
import type { CmsEvent } from './event-bus.js';
import type { AuditLogListQuery, ActorType } from '@eli-cms/shared';

const KNOWN_EVENTS = [
  // Content
  'content.created', 'content.updated', 'content.deleted', 'content.published',
  'content.trashed', 'content.restored', 'content.purged',
  // Content types
  'content_type.created', 'content_type.updated', 'content_type.deleted',
  // Media
  'media.uploaded', 'media.deleted',
  // Auth
  'auth.login', 'auth.register', 'auth.password_changed',
  // Users
  'user.deleted',
  // Roles
  'role.created', 'role.updated', 'role.deleted',
  // Webhooks
  'webhook.created', 'webhook.updated', 'webhook.deleted',
  // Settings
  'settings.updated',
];

function extractResource(event: string, data: Record<string, unknown>): { resourceType: string; resourceId: string | null } {
  const [resourceType] = event.split('.');

  if (data.content && typeof data.content === 'object') {
    return { resourceType: 'content', resourceId: (data.content as Record<string, unknown>).id as string ?? null };
  }
  if (data.contentType && typeof data.contentType === 'object') {
    return { resourceType: 'content_type', resourceId: (data.contentType as Record<string, unknown>).id as string ?? null };
  }
  if (data.media && typeof data.media === 'object') {
    return { resourceType: 'media', resourceId: (data.media as Record<string, unknown>).id as string ?? null };
  }
  if (data.role && typeof data.role === 'object') {
    return { resourceType: 'role', resourceId: (data.role as Record<string, unknown>).id as string ?? null };
  }
  if (data.webhook && typeof data.webhook === 'object') {
    return { resourceType: 'webhook', resourceId: (data.webhook as Record<string, unknown>).id as string ?? null };
  }
  if (data.userId && typeof data.userId === 'string') {
    return { resourceType: 'user', resourceId: data.userId };
  }
  if (data.resourceId && typeof data.resourceId === 'string') {
    return { resourceType, resourceId: data.resourceId };
  }

  return { resourceType, resourceId: null };
}

export class AuditService {
  static initialize() {
    for (const event of KNOWN_EVENTS) {
      eventBus.on(event, (cmsEvent: CmsEvent) => {
        this.handleEvent(cmsEvent).catch(console.error);
      });
    }
    console.log(`Audit service initialized: listening to ${KNOWN_EVENTS.length} events`);
  }

  private static async handleEvent(cmsEvent: CmsEvent) {
    const { data } = cmsEvent;
    const actorId = (data.actorId as string) || 'system';
    const actorType = (data.actorType as ActorType) || 'system';
    const ipAddress = (data.ipAddress as string) || null;
    const userAgent = (data.userAgent as string) || null;

    const { resourceType, resourceId } = extractResource(cmsEvent.event, data);

    // Build metadata: everything except actor/resource fields
    const { actorId: _a, actorType: _b, ipAddress: _c, userAgent: _d, ...metadata } = data;

    await db.insert(auditLogs).values({
      actorId,
      actorType,
      action: cmsEvent.event,
      resourceType,
      resourceId,
      metadata: Object.keys(metadata).length > 0 ? metadata : null,
      ipAddress,
      userAgent,
    });
  }

  static async findAll(query: AuditLogListQuery) {
    const { page, limit, actorId, action, resourceType, from, to } = query;
    const offset = (page - 1) * limit;

    const filters = [];
    if (actorId) filters.push(eq(auditLogs.actorId, actorId));
    if (action) filters.push(eq(auditLogs.action, action));
    if (resourceType) filters.push(eq(auditLogs.resourceType, resourceType));
    if (from) filters.push(gte(auditLogs.createdAt, new Date(from)));
    if (to) filters.push(lte(auditLogs.createdAt, new Date(to)));

    const where = filters.length > 0 ? and(...filters) : undefined;

    const [{ total }] = await db
      .select({ total: drizzleCount() })
      .from(auditLogs)
      .where(where);

    const data = await db
      .select()
      .from(auditLogs)
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return { data, meta: buildMeta(total, page, limit) };
  }
}
