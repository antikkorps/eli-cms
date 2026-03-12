import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'node:crypto';
import { WebhookService } from './webhook.service.js';
import { AppError } from '../utils/app-error.js';
import { agent, getAdminToken } from '../__tests__/helpers/setup.js';

describe('WebhookService', () => {
  let token: string;
  let userId: string;

  beforeEach(async () => {
    token = await getAdminToken();
    const me = await agent()
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    userId = me.body.data.id;
  });

  afterEach(() => {
    WebhookService.shutdown();
  });

  // ─── CRUD ───────────────────────────────────────────

  describe('create', () => {
    it('creates a webhook', async () => {
      const webhook = await WebhookService.create({
        name: 'Test Hook',
        url: 'https://example.com/hook',
        secret: 'my-secret-key-long',
        events: ['content.created'],
        isActive: true,
      }, userId);

      expect(webhook.id).toBeDefined();
      expect(webhook.name).toBe('Test Hook');
      expect(webhook.url).toBe('https://example.com/hook');
      expect(webhook.events).toEqual(['content.created']);
      expect(webhook.isActive).toBe(true);
    });

    it('creates inactive webhook', async () => {
      const webhook = await WebhookService.create({
        name: 'Inactive',
        url: 'https://example.com/hook',
        secret: 'secret-long-enough',
        events: ['content.created'],
        isActive: false,
      }, userId);

      expect(webhook.isActive).toBe(false);
    });
  });

  describe('findById', () => {
    it('returns the webhook', async () => {
      const created = await WebhookService.create({
        name: 'Find Me',
        url: 'https://example.com/hook',
        secret: 'secret-long-enough',
        events: ['content.created'],
        isActive: true,
      }, userId);

      const found = await WebhookService.findById(created.id);
      expect(found.id).toBe(created.id);
      expect(found.name).toBe('Find Me');
    });

    it('throws 404 for non-existent id', async () => {
      await expect(
        WebhookService.findById('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(AppError);
    });
  });

  describe('findAll', () => {
    it('returns paginated results', async () => {
      await WebhookService.create({ name: 'Hook 1', url: 'https://a.com', secret: 'secret-long-enough', events: ['content.created'], isActive: true }, userId);
      await WebhookService.create({ name: 'Hook 2', url: 'https://b.com', secret: 'secret-long-enough', events: ['content.updated'], isActive: true }, userId);

      const result = await WebhookService.findAll({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it('filters by isActive', async () => {
      await WebhookService.create({ name: 'Active', url: 'https://a.com', secret: 'secret-long-enough', events: ['content.created'], isActive: true }, userId);
      await WebhookService.create({ name: 'Inactive', url: 'https://b.com', secret: 'secret-long-enough', events: ['content.created'], isActive: false }, userId);

      const result = await WebhookService.findAll({ page: 1, limit: 10, isActive: true });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Active');
    });
  });

  describe('update', () => {
    it('updates webhook fields', async () => {
      const created = await WebhookService.create({
        name: 'Original',
        url: 'https://example.com/hook',
        secret: 'secret-long-enough',
        events: ['content.created'],
        isActive: true,
      }, userId);

      const updated = await WebhookService.update(created.id, {
        name: 'Updated',
        events: ['content.created', 'content.updated'],
      });

      expect(updated.name).toBe('Updated');
      expect(updated.events).toEqual(['content.created', 'content.updated']);
    });

    it('throws 404 for non-existent webhook', async () => {
      await expect(
        WebhookService.update('00000000-0000-0000-0000-000000000000', { name: 'X' }),
      ).rejects.toThrow(AppError);
    });
  });

  describe('delete', () => {
    it('deletes the webhook', async () => {
      const created = await WebhookService.create({
        name: 'To Delete',
        url: 'https://example.com/hook',
        secret: 'secret-long-enough',
        events: ['content.created'],
        isActive: true,
      }, userId);

      await WebhookService.delete(created.id);

      await expect(WebhookService.findById(created.id)).rejects.toThrow(AppError);
    });
  });

  // ─── Delivery ───────────────────────────────────────

  describe('delivery', () => {
    it('delivers webhook with HMAC signature on content event', async () => {
      const deliveries: Array<{ url: string; body: string; headers: Record<string, string> }> = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockImplementation(async (url: string, opts: RequestInit) => {
        deliveries.push({
          url: url as string,
          body: opts.body as string,
          headers: opts.headers as Record<string, string>,
        });
        return new Response('OK', { status: 200 });
      }) as typeof fetch;

      try {
        await WebhookService.create({
          name: 'Delivery Test',
          url: 'https://example.com/webhook',
          secret: 'test-secret-long-enough',
          events: ['content.created'],
          isActive: true,
        }, userId);

        await WebhookService.initialize();

        const { eventBus } = await import('./event-bus.js');
        eventBus.emit('content.created', { content: { id: 'test-id', title: 'Test' } });

        await new Promise((r) => setTimeout(r, 200));

        expect(deliveries.length).toBeGreaterThanOrEqual(1);
        const delivery = deliveries[0];
        expect(delivery.url).toBe('https://example.com/webhook');
        expect(delivery.headers['Content-Type']).toBe('application/json');
        expect(delivery.headers['X-Webhook-Event']).toBe('content.created');

        // Verify HMAC signature
        const expectedSig = createHmac('sha256', 'test-secret-long-enough').update(delivery.body).digest('hex');
        expect(delivery.headers['X-Webhook-Signature']).toBe(expectedSig);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('records delivery in database', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue(new Response('OK', { status: 200 })) as typeof fetch;

      try {
        const webhook = await WebhookService.create({
          name: 'DB Record Test',
          url: 'https://example.com/webhook',
          secret: 'secret-long-enough',
          events: ['content.updated'],
          isActive: true,
        }, userId);

        await WebhookService.initialize();

        const { eventBus } = await import('./event-bus.js');
        eventBus.emit('content.updated', { content: { id: 'c1' } });

        await new Promise((r) => setTimeout(r, 200));

        const deliveryResult = await WebhookService.findDeliveries(webhook.id, { page: 1, limit: 10 });
        expect(deliveryResult.data.length).toBeGreaterThanOrEqual(1);
        expect(deliveryResult.data[0].event).toBe('content.updated');
        expect(deliveryResult.data[0].status).toBe('success');
        expect(deliveryResult.data[0].responseStatus).toBe(200);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('marks delivery as failed on HTTP error', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue(new Response('Server Error', { status: 500 })) as typeof fetch;

      try {
        const webhook = await WebhookService.create({
          name: 'Fail Test',
          url: 'https://example.com/webhook',
          secret: 'secret-long-enough',
          events: ['content.deleted'],
          isActive: true,
        }, userId);

        await WebhookService.initialize();

        const { eventBus } = await import('./event-bus.js');
        eventBus.emit('content.deleted', { content: { id: 'c1' } });

        await new Promise((r) => setTimeout(r, 200));

        const deliveryResult = await WebhookService.findDeliveries(webhook.id, { page: 1, limit: 10 });
        expect(deliveryResult.data.length).toBeGreaterThanOrEqual(1);
        expect(deliveryResult.data[0].status).toBe('failed');
        expect(deliveryResult.data[0].responseStatus).toBe(500);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('marks delivery as failed on network error with retry scheduled', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED')) as typeof fetch;

      try {
        const webhook = await WebhookService.create({
          name: 'Network Error Test',
          url: 'https://example.com/webhook',
          secret: 'secret-long-enough',
          events: ['media.uploaded'],
          isActive: true,
        }, userId);

        await WebhookService.initialize();

        const { eventBus } = await import('./event-bus.js');
        eventBus.emit('media.uploaded', { media: { id: 'm1' } });

        await new Promise((r) => setTimeout(r, 200));

        const deliveryResult = await WebhookService.findDeliveries(webhook.id, { page: 1, limit: 10 });
        expect(deliveryResult.data.length).toBeGreaterThanOrEqual(1);
        expect(deliveryResult.data[0].status).toBe('failed');
        expect(deliveryResult.data[0].attempts).toBe(1);
        expect(deliveryResult.data[0].nextRetryAt).toBeDefined();
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('does not deliver to inactive webhooks', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response('OK', { status: 200 }));
      const originalFetch = globalThis.fetch;
      globalThis.fetch = fetchMock as typeof fetch;

      try {
        await WebhookService.create({
          name: 'Inactive Hook',
          url: 'https://example.com/webhook',
          secret: 'secret-long-enough',
          events: ['content.created'],
          isActive: false,
        }, userId);

        await WebhookService.initialize();

        const { eventBus } = await import('./event-bus.js');
        eventBus.emit('content.created', { content: { id: 'c1' } });

        await new Promise((r) => setTimeout(r, 200));

        expect(fetchMock).not.toHaveBeenCalled();
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  // ─── Initialize / Shutdown ──────────────────────────

  describe('initialize', () => {
    it('loads active webhooks and starts retry poller', async () => {
      await WebhookService.create({
        name: 'Init Test',
        url: 'https://example.com/hook',
        secret: 'secret-long-enough',
        events: ['content.created'],
        isActive: true,
      }, userId);

      await WebhookService.initialize();
    });

    it('shutdown cleans up retry timer', () => {
      WebhookService.shutdown();
    });
  });
});
