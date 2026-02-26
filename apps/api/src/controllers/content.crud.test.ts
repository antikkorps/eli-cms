import { describe, it, expect, beforeEach } from 'vitest';
import { agent, getAdminToken } from '../__tests__/helpers/setup.js';
import { buildBlogContentType, buildBlogData } from '../__tests__/helpers/fixtures.js';

describe('Contents CRUD', () => {
  let token: string;
  let contentTypeId: string;

  beforeEach(async () => {
    token = await getAdminToken();

    // Create a blog content type for content tests
    const ctRes = await agent()
      .post('/api/content-types')
      .set('Authorization', `Bearer ${token}`)
      .send(buildBlogContentType());
    contentTypeId = ctRes.body.data.id;
  });

  // ─── POST /api/contents ──────────────────────────────
  describe('POST /api/contents', () => {
    it('201 creates a draft content by default', async () => {
      const res = await agent()
        .post('/api/contents')
        .set('Authorization', `Bearer ${token}`)
        .send({ contentTypeId, data: buildBlogData() });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('draft');
      expect(res.body.data.contentTypeId).toBe(contentTypeId);
      expect(res.body.data.data.title).toBe('Hello World');
      expect(res.body.data.id).toBeDefined();
    });

    it('201 creates a published content', async () => {
      const res = await agent()
        .post('/api/contents')
        .set('Authorization', `Bearer ${token}`)
        .send({ contentTypeId, status: 'published', data: buildBlogData() });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('published');
    });

    it('400 rejects missing contentTypeId', async () => {
      const res = await agent()
        .post('/api/contents')
        .set('Authorization', `Bearer ${token}`)
        .send({ data: buildBlogData() });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('400 rejects missing required field in data', async () => {
      const res = await agent()
        .post('/api/contents')
        .set('Authorization', `Bearer ${token}`)
        .send({ contentTypeId, data: { title: 'No body field' } });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('400 rejects wrong field type in data', async () => {
      const res = await agent()
        .post('/api/contents')
        .set('Authorization', `Bearer ${token}`)
        .send({ contentTypeId, data: { title: 123, body: 'valid' } });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('400 rejects invalid UUID for contentTypeId', async () => {
      const res = await agent()
        .post('/api/contents')
        .set('Authorization', `Bearer ${token}`)
        .send({ contentTypeId: 'not-a-uuid', data: buildBlogData() });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('401 rejects without token', async () => {
      const res = await agent()
        .post('/api/contents')
        .send({ contentTypeId, data: buildBlogData() });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── GET /api/contents/:id ───────────────────────────
  describe('GET /api/contents/:id', () => {
    it('200 returns the content', async () => {
      const api = agent();
      const created = await api
        .post('/api/contents')
        .set('Authorization', `Bearer ${token}`)
        .send({ contentTypeId, data: buildBlogData() });

      const res = await api
        .get(`/api/contents/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(created.body.data.id);
      expect(res.body.data.contentTypeId).toBe(contentTypeId);
      expect(res.body.data.status).toBe('draft');
      expect(res.body.data.data.title).toBe('Hello World');
      expect(res.body.data.createdAt).toBeDefined();
      expect(res.body.data.updatedAt).toBeDefined();
    });

    it('404 for non-existent id', async () => {
      const res = await agent()
        .get('/api/contents/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('401 without token', async () => {
      const res = await agent().get('/api/contents/00000000-0000-0000-0000-000000000000');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── PUT /api/contents/:id ───────────────────────────
  describe('PUT /api/contents/:id', () => {
    it('200 updates status from draft to published', async () => {
      const api = agent();
      const created = await api
        .post('/api/contents')
        .set('Authorization', `Bearer ${token}`)
        .send({ contentTypeId, data: buildBlogData() });

      const res = await api
        .put(`/api/contents/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'published' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('published');
    });

    it('200 updates the data', async () => {
      const api = agent();
      const created = await api
        .post('/api/contents')
        .set('Authorization', `Bearer ${token}`)
        .send({ contentTypeId, data: buildBlogData() });

      const res = await api
        .put(`/api/contents/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ data: buildBlogData({ title: 'Updated Title', body: 'Updated body' }) });

      expect(res.status).toBe(200);
      expect(res.body.data.data.title).toBe('Updated Title');
      expect(res.body.data.data.body).toBe('Updated body');
    });

    it('400 rejects invalid data per dynamic schema', async () => {
      const api = agent();
      const created = await api
        .post('/api/contents')
        .set('Authorization', `Bearer ${token}`)
        .send({ contentTypeId, data: buildBlogData() });

      const res = await api
        .put(`/api/contents/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ data: { title: 123, body: 'valid' } });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('404 for non-existent id', async () => {
      const res = await agent()
        .put('/api/contents/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'published' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('401 without token', async () => {
      const res = await agent()
        .put('/api/contents/00000000-0000-0000-0000-000000000000')
        .send({ status: 'published' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── DELETE /api/contents/:id ────────────────────────
  describe('DELETE /api/contents/:id', () => {
    it('204 deletes the content', async () => {
      const api = agent();
      const created = await api
        .post('/api/contents')
        .set('Authorization', `Bearer ${token}`)
        .send({ contentTypeId, data: buildBlogData() });

      const res = await api
        .delete(`/api/contents/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);

      // Verify it's gone
      const getRes = await api
        .get(`/api/contents/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(getRes.status).toBe(404);
    });

    it('404 for non-existent id', async () => {
      const res = await agent()
        .delete('/api/contents/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('401 without token', async () => {
      const res = await agent().delete('/api/contents/00000000-0000-0000-0000-000000000000');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
