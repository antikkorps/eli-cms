import { describe, it, expect, beforeEach } from 'vitest';
import { ContentService } from './content.service.js';
import { AppError } from '../utils/app-error.js';
import { agent, getAdminToken } from '../__tests__/helpers/setup.js';
import { buildBlogContentType, buildBlogData, buildPageContentType, buildPageData } from '../__tests__/helpers/fixtures.js';

describe('ContentService', () => {
  let contentTypeId: string;
  let token: string;
  let userId: string;

  beforeEach(async () => {
    token = await getAdminToken();
    // Create a content type via API (so it goes through proper validation)
    const res = await agent()
      .post('/api/v1/content-types')
      .set('Authorization', `Bearer ${token}`)
      .send(buildBlogContentType());
    contentTypeId = res.body.data.id;

    // Get user id from /auth/me
    const me = await agent()
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    userId = me.body.data.id;
  });

  // ─── create ─────────────────────────────────────────

  describe('create', () => {
    it('creates content with valid data', async () => {
      const content = await ContentService.create({
        contentTypeId,
        data: buildBlogData(),
      });

      expect(content.id).toBeDefined();
      expect(content.status).toBe('draft');
      expect(content.contentTypeId).toBe(contentTypeId);
      expect((content.data as Record<string, unknown>).title).toBe('Hello World');
    });

    it('auto-generates slug from first text field', async () => {
      const content = await ContentService.create({
        contentTypeId,
        data: buildBlogData({ title: 'My First Post' }),
      });

      expect(content.slug).toBe('my-first-post');
    });

    it('ensures unique slugs with suffix', async () => {
      await ContentService.create({ contentTypeId, data: buildBlogData({ title: 'Duplicate' }) });
      const second = await ContentService.create({ contentTypeId, data: buildBlogData({ title: 'Duplicate' }) });

      expect(second.slug).toBe('duplicate-1');
    });

    it('throws 400 for invalid data (missing required fields)', async () => {
      await expect(
        ContentService.create({ contentTypeId, data: {} }),
      ).rejects.toThrow(AppError);
    });

    it('throws 404 for non-existent content type', async () => {
      await expect(
        ContentService.create({ contentTypeId: '00000000-0000-0000-0000-000000000000', data: buildBlogData() }),
      ).rejects.toThrow(AppError);
    });

    it('enforces singleton constraint', async () => {
      // Create a singleton content type
      const singletonRes = await agent()
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${token}`)
        .send({ slug: 'site-settings', name: 'Site Settings', fields: [{ name: 'title', type: 'text', required: true, label: 'Title' }], isSingleton: true });
      const singletonId = singletonRes.body.data.id;

      await ContentService.create({ contentTypeId: singletonId, data: { title: 'Settings' } });

      await expect(
        ContentService.create({ contentTypeId: singletonId, data: { title: 'Second' } }),
      ).rejects.toThrow(/singleton/i);
    });

    it('emits content.created event', async () => {
      const { eventBus } = await import('./event-bus.js');
      const events: string[] = [];
      const listener = () => events.push('content.created');
      eventBus.on('content.created', listener);

      await ContentService.create({ contentTypeId, data: buildBlogData() });

      expect(events).toContain('content.created');
      eventBus.removeListener('content.created', listener);
    });
  });

  // ─── findById ───────────────────────────────────────

  describe('findById', () => {
    it('returns content with contentType info', async () => {
      const created = await ContentService.create({ contentTypeId, data: buildBlogData() });
      const found = await ContentService.findById(created.id);

      expect(found.id).toBe(created.id);
      expect(found.contentType).toBeDefined();
      expect(found.contentType.slug).toBe('blog');
      expect(found.contentType.fields).toHaveLength(3);
    });

    it('throws 404 for non-existent id', async () => {
      await expect(
        ContentService.findById('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(AppError);
    });

    it('throws 404 for soft-deleted content', async () => {
      const created = await ContentService.create({ contentTypeId, data: buildBlogData() });
      await ContentService.delete(created.id);

      await expect(ContentService.findById(created.id)).rejects.toThrow(AppError);
    });
  });

  // ─── findAll ────────────────────────────────────────

  describe('findAll', () => {
    it('returns paginated results', async () => {
      await ContentService.create({ contentTypeId, data: buildBlogData({ title: 'Post 1' }) });
      await ContentService.create({ contentTypeId, data: buildBlogData({ title: 'Post 2' }) });
      await ContentService.create({ contentTypeId, data: buildBlogData({ title: 'Post 3' }) });

      const result = await ContentService.findAll({ page: 1, limit: 2, sortBy: 'createdAt', sortOrder: 'desc' });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(3);
      expect(result.meta.totalPages).toBe(2);
    });

    it('filters by contentTypeId', async () => {
      const pageRes = await agent()
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${token}`)
        .send(buildPageContentType());
      const pageTypeId = pageRes.body.data.id;

      await ContentService.create({ contentTypeId, data: buildBlogData() });
      await ContentService.create({ contentTypeId: pageTypeId, data: buildPageData() });

      const result = await ContentService.findAll({ page: 1, limit: 20, contentTypeId, sortBy: 'createdAt', sortOrder: 'desc' });
      expect(result.data).toHaveLength(1);
    });

    it('filters by status', async () => {
      await ContentService.create({ contentTypeId, data: buildBlogData({ title: 'Draft' }) });
      await ContentService.create({ contentTypeId, data: buildBlogData({ title: 'Published' }), status: 'published' });

      const result = await ContentService.findAll({ page: 1, limit: 20, status: 'published', sortBy: 'createdAt', sortOrder: 'desc' });
      expect(result.data).toHaveLength(1);
      expect((result.data[0].data as Record<string, unknown>).title).toBe('Published');
    });

    it('excludes soft-deleted content', async () => {
      const created = await ContentService.create({ contentTypeId, data: buildBlogData() });
      await ContentService.delete(created.id);

      const result = await ContentService.findAll({ page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' });
      expect(result.data).toHaveLength(0);
    });
  });

  // ─── update ─────────────────────────────────────────

  describe('update', () => {
    it('updates content data', async () => {
      const created = await ContentService.create({ contentTypeId, data: buildBlogData() });
      const updated = await ContentService.update(created.id, {
        data: buildBlogData({ title: 'Updated Title' }),
      }, userId);

      expect((updated.data as Record<string, unknown>).title).toBe('Updated Title');
    });

    it('creates a version snapshot on update', async () => {
      const { ContentVersionService } = await import('./content-version.service.js');
      const created = await ContentService.create({ contentTypeId, data: buildBlogData() });

      await ContentService.update(created.id, {
        data: buildBlogData({ title: 'V2' }),
      }, userId);

      const versions = await ContentVersionService.findAll(created.id, { page: 1, limit: 10 });
      expect(versions.data.length).toBeGreaterThanOrEqual(1);
    });

    it('sets publishedAt when transitioning to published', async () => {
      const created = await ContentService.create({ contentTypeId, data: buildBlogData() });

      // draft → in-review → approved → published
      await ContentService.update(created.id, { status: 'in-review' }, userId, undefined, ['content:update']);
      await ContentService.update(created.id, { status: 'approved' }, userId, undefined, ['content:review']);
      const published = await ContentService.update(created.id, { status: 'published' }, userId, undefined, ['content:publish']);

      expect(published.publishedAt).toBeDefined();
      expect(published.status).toBe('published');
    });

    it('throws on invalid workflow transition', async () => {
      const created = await ContentService.create({ contentTypeId, data: buildBlogData() });

      // draft → published is not a valid transition
      await expect(
        ContentService.update(created.id, { status: 'published' }, userId, undefined, ['content:publish']),
      ).rejects.toThrow(/transition/i);
    });
  });

  // ─── delete / trash ─────────────────────────────────

  describe('delete & trash', () => {
    it('soft-deletes content', async () => {
      const created = await ContentService.create({ contentTypeId, data: buildBlogData() });
      await ContentService.delete(created.id);

      // Should be in trash
      const trashed = await ContentService.findTrashedById(created.id);
      expect(trashed.deletedAt).toBeDefined();
    });

    it('restores trashed content', async () => {
      const created = await ContentService.create({ contentTypeId, data: buildBlogData() });
      await ContentService.delete(created.id);
      const restored = await ContentService.restore(created.id);

      expect(restored.deletedAt).toBeNull();
      // Should be findable again
      const found = await ContentService.findById(restored.id);
      expect(found.id).toBe(created.id);
    });

    it('permanently deletes trashed content', async () => {
      const created = await ContentService.create({ contentTypeId, data: buildBlogData() });
      await ContentService.delete(created.id);
      await ContentService.permanentDelete(created.id);

      await expect(ContentService.findTrashedById(created.id)).rejects.toThrow(AppError);
    });

    it('trashCount returns correct count', async () => {
      const c1 = await ContentService.create({ contentTypeId, data: buildBlogData({ title: 'A' }) });
      const c2 = await ContentService.create({ contentTypeId, data: buildBlogData({ title: 'B' }) });
      await ContentService.create({ contentTypeId, data: buildBlogData({ title: 'C' }) });

      await ContentService.delete(c1.id);
      await ContentService.delete(c2.id);

      expect(await ContentService.trashCount()).toBe(2);
    });
  });

  // ─── duplicate ──────────────────────────────────────

  describe('duplicate', () => {
    it('duplicates content as draft', async () => {
      const created = await ContentService.create({ contentTypeId, data: buildBlogData() });
      const dup = await ContentService.duplicate(created.id);

      expect(dup.id).not.toBe(created.id);
      expect(dup.status).toBe('draft');
      expect(dup.slug).toBe('hello-world-copy');
      expect((dup.data as Record<string, unknown>).title).toBe('Hello World');
    });

    it('throws for singleton duplication', async () => {
      const singletonRes = await agent()
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${token}`)
        .send({ slug: 'about', name: 'About', fields: [{ name: 'title', type: 'text', required: true, label: 'Title' }], isSingleton: true });
      const singletonId = singletonRes.body.data.id;

      const created = await ContentService.create({ contentTypeId: singletonId, data: { title: 'About' } });

      await expect(ContentService.duplicate(created.id)).rejects.toThrow(/singleton/i);
    });
  });

  // ─── bulkAction ─────────────────────────────────────

  describe('bulkAction', () => {
    it('bulk deletes multiple items', async () => {
      const c1 = await ContentService.create({ contentTypeId, data: buildBlogData({ title: 'A' }) });
      const c2 = await ContentService.create({ contentTypeId, data: buildBlogData({ title: 'B' }) });

      const result = await ContentService.bulkAction([c1.id, c2.id], 'delete');
      expect(result.affected).toBe(2);
      expect(await ContentService.trashCount()).toBe(2);
    });

    it('bulk publishes multiple items', async () => {
      const c1 = await ContentService.create({ contentTypeId, data: buildBlogData({ title: 'A' }) });
      const c2 = await ContentService.create({ contentTypeId, data: buildBlogData({ title: 'B' }) });

      const result = await ContentService.bulkAction([c1.id, c2.id], 'publish');
      expect(result.affected).toBe(2);

      const found = await ContentService.findById(c1.id);
      expect(found.status).toBe('published');
    });

    it('bulk restores trashed items', async () => {
      const c1 = await ContentService.create({ contentTypeId, data: buildBlogData({ title: 'A' }) });
      await ContentService.delete(c1.id);

      const result = await ContentService.bulkAction([c1.id], 'restore');
      expect(result.affected).toBe(1);

      const found = await ContentService.findById(c1.id);
      expect(found.deletedAt).toBeNull();
    });

    it('throws for unknown action', async () => {
      await expect(ContentService.bulkAction(['x'], 'explode')).rejects.toThrow(/unknown/i);
    });
  });
});
