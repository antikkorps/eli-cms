import { describe, it, expect, beforeEach } from 'vitest';
import { agent, getAdminToken, getEditorToken } from '../__tests__/helpers/setup.js';
import { buildBlogContentType, buildBlogFields } from '../__tests__/helpers/fixtures.js';

describe('Content Types CRUD', () => {
  let adminToken: string;

  beforeEach(async () => {
    adminToken = await getAdminToken();
  });

  // ─── POST /api/content-types ─────────────────────────
  describe('POST /api/content-types', () => {
    it('201 creates a valid content type', async () => {
      const res = await agent()
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(buildBlogContentType());

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe('blog');
      expect(res.body.data.name).toBe('Blog');
      expect(res.body.data.fields).toHaveLength(3);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.createdAt).toBeDefined();
    });

    it('400 rejects non-kebab-case slug', async () => {
      const res = await agent()
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ slug: 'Not_Kebab', name: 'Test', fields: buildBlogFields() });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('400 rejects empty fields array', async () => {
      const res = await agent()
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ slug: 'empty', name: 'Empty', fields: [] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('400 rejects invalid field name', async () => {
      const res = await agent()
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          slug: 'bad-field',
          name: 'Bad Field',
          fields: [{ name: '123invalid', type: 'text', required: true, label: 'Bad' }],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('409 rejects duplicate slug', async () => {
      const api = agent();
      await api.post('/api/v1/content-types').set('Authorization', `Bearer ${adminToken}`).send(buildBlogContentType());

      const res = await api
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(buildBlogContentType());

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('403 rejects editor role', async () => {
      const editorToken = await getEditorToken();

      const res = await agent()
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${editorToken}`)
        .send(buildBlogContentType());

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('401 rejects without token', async () => {
      const res = await agent().post('/api/v1/content-types').send(buildBlogContentType());

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── GET /api/content-types/:id ──────────────────────
  describe('GET /api/content-types/:id', () => {
    it('200 returns the content type', async () => {
      const api = agent();
      const created = await api
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(buildBlogContentType());

      const res = await api
        .get(`/api/v1/content-types/${created.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(created.body.data.id);
      expect(res.body.data.slug).toBe('blog');
      expect(res.body.data.name).toBe('Blog');
      expect(res.body.data.fields).toHaveLength(3);
      expect(res.body.data.createdAt).toBeDefined();
      expect(res.body.data.updatedAt).toBeDefined();
    });

    it('404 for non-existent id', async () => {
      const res = await agent()
        .get('/api/v1/content-types/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('401 without token', async () => {
      const res = await agent().get('/api/v1/content-types/00000000-0000-0000-0000-000000000000');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── PUT /api/content-types/:id ──────────────────────
  describe('PUT /api/content-types/:id', () => {
    it('200 updates the name', async () => {
      const api = agent();
      const created = await api
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(buildBlogContentType());

      const res = await api
        .put(`/api/v1/content-types/${created.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Blog' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Blog');
      expect(res.body.data.slug).toBe('blog');
    });

    it('200 updates the slug', async () => {
      const api = agent();
      const created = await api
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(buildBlogContentType());

      const res = await api
        .put(`/api/v1/content-types/${created.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ slug: 'articles' });

      expect(res.status).toBe(200);
      expect(res.body.data.slug).toBe('articles');
    });

    it('200 updates the fields', async () => {
      const api = agent();
      const created = await api
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(buildBlogContentType());

      const newFields = [{ name: 'headline', type: 'text', required: true, label: 'Headline' }];

      const res = await api
        .put(`/api/v1/content-types/${created.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ fields: newFields });

      expect(res.status).toBe(200);
      expect(res.body.data.fields).toHaveLength(1);
      expect(res.body.data.fields[0].name).toBe('headline');
    });

    it('409 rejects slug taken by another content type', async () => {
      const api = agent();
      await api.post('/api/v1/content-types').set('Authorization', `Bearer ${adminToken}`).send(buildBlogContentType());

      const other = await api
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ slug: 'news', name: 'News', fields: buildBlogFields() });

      const res = await api
        .put(`/api/v1/content-types/${other.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ slug: 'blog' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('404 for non-existent id', async () => {
      const res = await agent()
        .put('/api/v1/content-types/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Ghost' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('403 rejects editor role', async () => {
      const api = agent();
      const created = await api
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(buildBlogContentType());

      const editorToken = await getEditorToken();

      const res = await api
        .put(`/api/v1/content-types/${created.body.data.id}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ name: 'Hacked' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── DELETE /api/content-types/:id ───────────────────
  describe('DELETE /api/content-types/:id', () => {
    it('204 deletes the content type', async () => {
      const api = agent();
      const created = await api
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(buildBlogContentType());

      const res = await api
        .delete(`/api/v1/content-types/${created.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);

      // Verify it's gone
      const getRes = await api
        .get(`/api/v1/content-types/${created.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(getRes.status).toBe(404);
    });

    it('404 for non-existent id', async () => {
      const res = await agent()
        .delete('/api/v1/content-types/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('403 rejects editor role', async () => {
      const api = agent();
      const created = await api
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(buildBlogContentType());

      const editorToken = await getEditorToken();

      const res = await api
        .delete(`/api/v1/content-types/${created.body.data.id}`)
        .set('Authorization', `Bearer ${editorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
