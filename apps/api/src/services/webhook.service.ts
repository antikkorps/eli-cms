import { createHmac } from 'node:crypto';
import { eq, and, count as drizzleCount, lte, isNotNull, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { webhooks, webhookDeliveries } from '../db/schema/index.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';
import { buildMeta } from '../utils/pagination.js';
import { eventBus } from './event-bus.js';
import type { CmsEvent } from './event-bus.js';
import type {
  CreateWebhookInput,
  UpdateWebhookInput,
  WebhookListQuery,
  WebhookDeliveryListQuery,
} from '@eli-cms/shared';
import type { Actor } from './content.service.js';

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS = [10_000, 60_000, 300_000]; // 10s, 60s, 5min
const RETRY_POLL_INTERVAL = 30_000; // 30s

let retryTimer: ReturnType<typeof setInterval> | null = null;
// Track webhook-bound listeners so we can remove only them (not audit listeners)
const webhookListeners: Array<{ event: string; listener: (...args: unknown[]) => void }> = [];

export class WebhookService {
  static async findAll(query: WebhookListQuery) {
    const { page, limit, isActive } = query;
    const offset = (page - 1) * limit;

    const filters = [];
    if (isActive !== undefined) filters.push(eq(webhooks.isActive, isActive));

    const where = filters.length > 0 ? and(...filters) : undefined;

    const [{ total }] = await db.select({ total: drizzleCount() }).from(webhooks).where(where);

    const data = await db.select().from(webhooks).where(where).orderBy(webhooks.createdAt).limit(limit).offset(offset);

    return { data, meta: buildMeta(total, page, limit) };
  }

  static async findById(id: string) {
    const [webhook] = await db.select().from(webhooks).where(eq(webhooks.id, id)).limit(1);
    if (!webhook) throw new AppError(404, 'Webhook not found');
    return webhook;
  }

  static async create(input: CreateWebhookInput, userId: string, actor?: Actor) {
    const [webhook] = await db
      .insert(webhooks)
      .values({
        name: input.name,
        url: input.url,
        secret: input.secret,
        events: input.events,
        isActive: input.isActive ?? true,
        createdBy: userId,
      })
      .returning();

    // Re-register listeners if active
    if (webhook.isActive) {
      this.registerWebhookListeners(webhook);
    }

    const actorData = actor
      ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent }
      : {};
    eventBus.emit('webhook.created', { webhook, ...actorData });
    return webhook;
  }

  static async update(id: string, input: UpdateWebhookInput, actor?: Actor) {
    await this.findById(id);

    const [webhook] = await db.update(webhooks).set(input).where(eq(webhooks.id, id)).returning();

    // Re-initialize to pick up event changes
    await this.initialize();

    const actorData = actor
      ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent }
      : {};
    eventBus.emit('webhook.updated', { webhook, ...actorData });
    return webhook;
  }

  static async delete(id: string, actor?: Actor) {
    const webhook = await this.findById(id);
    await db.delete(webhooks).where(eq(webhooks.id, id));
    // Re-initialize to remove listeners
    await this.initialize();

    const actorData = actor
      ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent }
      : {};
    eventBus.emit('webhook.deleted', { webhook, ...actorData });
  }

  static async findDeliveries(webhookId: string, query: WebhookDeliveryListQuery) {
    const { page, limit, status } = query;
    const offset = (page - 1) * limit;

    const filters = [eq(webhookDeliveries.webhookId, webhookId)];
    if (status) filters.push(eq(webhookDeliveries.status, status));

    const where = and(...filters);

    const [{ total }] = await db.select({ total: drizzleCount() }).from(webhookDeliveries).where(where);

    const data = await db
      .select()
      .from(webhookDeliveries)
      .where(where)
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(limit)
      .offset(offset);

    return { data, meta: buildMeta(total, page, limit) };
  }

  static async retryDelivery(webhookId: string, deliveryId: string) {
    const webhook = await this.findById(webhookId);

    const [delivery] = await db
      .select()
      .from(webhookDeliveries)
      .where(and(eq(webhookDeliveries.id, deliveryId), eq(webhookDeliveries.webhookId, webhookId)))
      .limit(1);

    if (!delivery) throw new AppError(404, 'Delivery not found');
    if (delivery.status !== 'failed') throw new AppError(400, 'Only failed deliveries can be retried');

    // Reset delivery for retry
    await db
      .update(webhookDeliveries)
      .set({ status: 'pending', nextRetryAt: null })
      .where(eq(webhookDeliveries.id, deliveryId));

    // Attempt delivery immediately
    await this.attemptDelivery(deliveryId, webhook, delivery.payload as unknown as CmsEvent);

    // Return updated delivery
    const [updated] = await db.select().from(webhookDeliveries).where(eq(webhookDeliveries.id, deliveryId)).limit(1);
    return updated;
  }

  // ─── Test Delivery ─────────────────────────────────────

  static async testDelivery(webhookId: string) {
    const webhook = await this.findById(webhookId);

    const testEvent: CmsEvent = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: { message: 'Test delivery from Eli CMS', webhookId: webhook.id },
    };

    const body = JSON.stringify(testEvent);
    const signature = createHmac('sha256', webhook.secret).update(body).digest('hex');

    let status: 'success' | 'failed' = 'failed';
    let responseStatus: number | null = null;
    let errorMessage: string | null = null;

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': 'webhook.test',
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });

      responseStatus = response.status;
      status = response.ok ? 'success' : 'failed';
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
    }

    // Record the test delivery
    const [delivery] = await db
      .insert(webhookDeliveries)
      .values({
        webhookId: webhook.id,
        event: 'webhook.test',
        payload: testEvent as unknown as Record<string, unknown>,
        status,
        responseStatus,
        attempts: 1,
        nextRetryAt: null,
      })
      .returning();

    return { delivery, responseStatus, errorMessage };
  }

  // ─── Initialization / Event Listeners ──────────────────

  static async initialize() {
    // Remove only webhook-bound listeners (not audit listeners)
    for (const { event, listener } of webhookListeners) {
      eventBus.removeListener(event, listener);
    }
    webhookListeners.length = 0;

    // Load active webhooks
    const activeWebhooks = await db.select().from(webhooks).where(eq(webhooks.isActive, true));

    for (const webhook of activeWebhooks) {
      this.registerWebhookListeners(webhook);
    }

    // Start retry poller
    if (retryTimer) clearInterval(retryTimer);
    retryTimer = setInterval(() => {
      this.processRetries().catch((err) => logger.error(err, 'Webhook retry processing failed'));
    }, RETRY_POLL_INTERVAL);

    logger.info({ count: activeWebhooks.length }, 'Webhooks initialized');
  }

  static shutdown() {
    if (retryTimer) {
      clearInterval(retryTimer);
      retryTimer = null;
    }
  }

  private static registerWebhookListeners(webhook: typeof webhooks.$inferSelect) {
    for (const evt of webhook.events) {
      const listener = (cmsEvent: CmsEvent) => {
        this.deliver(webhook, cmsEvent).catch((err) => logger.error(err, 'Webhook delivery failed'));
      };
      eventBus.on(evt, listener);
      webhookListeners.push({ event: evt, listener: listener as (...args: unknown[]) => void });
    }
  }

  // ─── Delivery ─────────────────────────────────────────

  private static async deliver(webhook: typeof webhooks.$inferSelect, cmsEvent: CmsEvent) {
    // Create delivery record
    const [delivery] = await db
      .insert(webhookDeliveries)
      .values({
        webhookId: webhook.id,
        event: cmsEvent.event,
        payload: cmsEvent as unknown as Record<string, unknown>,
        status: 'pending',
        attempts: 0,
      })
      .returning();

    await this.attemptDelivery(delivery.id, webhook, cmsEvent);
  }

  private static async attemptDelivery(deliveryId: string, webhook: typeof webhooks.$inferSelect, cmsEvent: CmsEvent) {
    const body = JSON.stringify(cmsEvent);
    const signature = createHmac('sha256', webhook.secret).update(body).digest('hex');

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': cmsEvent.event,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });

      await db
        .update(webhookDeliveries)
        .set({
          status: response.ok ? 'success' : 'failed',
          responseStatus: response.status,
          attempts: 1,
          nextRetryAt: response.ok ? null : this.getNextRetryAt(1),
        })
        .where(eq(webhookDeliveries.id, deliveryId));

      // If the first attempt failed, we rely on the retry poller
    } catch {
      await db
        .update(webhookDeliveries)
        .set({
          status: 'failed',
          attempts: 1,
          nextRetryAt: this.getNextRetryAt(1),
        })
        .where(eq(webhookDeliveries.id, deliveryId));
    }
  }

  private static getNextRetryAt(currentAttempt: number): Date | null {
    if (currentAttempt >= MAX_RETRY_ATTEMPTS) return null;
    const delay = RETRY_DELAYS[currentAttempt - 1] ?? RETRY_DELAYS[RETRY_DELAYS.length - 1];
    return new Date(Date.now() + delay);
  }

  private static async processRetries() {
    const now = new Date();
    const pending = await db
      .select()
      .from(webhookDeliveries)
      .where(
        and(
          eq(webhookDeliveries.status, 'failed'),
          isNotNull(webhookDeliveries.nextRetryAt),
          lte(webhookDeliveries.nextRetryAt, now),
        ),
      )
      .limit(50);

    for (const delivery of pending) {
      // Fetch the webhook
      const [webhook] = await db.select().from(webhooks).where(eq(webhooks.id, delivery.webhookId)).limit(1);
      if (!webhook || !webhook.isActive) {
        // Mark as failed permanently
        await db.update(webhookDeliveries).set({ nextRetryAt: null }).where(eq(webhookDeliveries.id, delivery.id));
        continue;
      }

      const body = JSON.stringify(delivery.payload);
      const signature = createHmac('sha256', webhook.secret).update(body).digest('hex');
      const nextAttempt = delivery.attempts + 1;

      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': delivery.event,
          },
          body,
          signal: AbortSignal.timeout(10_000),
        });

        await db
          .update(webhookDeliveries)
          .set({
            status: response.ok ? 'success' : 'failed',
            responseStatus: response.status,
            attempts: nextAttempt,
            nextRetryAt: response.ok ? null : this.getNextRetryAt(nextAttempt),
          })
          .where(eq(webhookDeliveries.id, delivery.id));
      } catch {
        await db
          .update(webhookDeliveries)
          .set({
            attempts: nextAttempt,
            nextRetryAt: this.getNextRetryAt(nextAttempt),
          })
          .where(eq(webhookDeliveries.id, delivery.id));
      }
    }
  }
}
