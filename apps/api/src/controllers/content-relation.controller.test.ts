import { describe, it, expect, beforeEach } from 'vitest';
import { agent, getAdminToken } from '../__tests__/helpers/setup.js';
import { buildBlogContentType, buildBlogData } from '../__tests__/helpers/fixtures.js';

describe('Content Relations API', () => {
  let token: string;
  let contentTypeId: string;
  let sourceId: string;
  let targetId: string;

  beforeEach(async () => {
    token = await getAdminToken();

    // Create a content type
    const ctRes = await agent()
      .post('/api/v1/content-types')
      .set('Authorization', `Bearer ${token}`)
      .send(buildBlogContentType());
    contentTypeId = ctRes.body.data.id;

    // Create source content
    const srcRes = await agent()
      .post('/api/v1/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId, data: buildBlogData() });
    sourceId = srcRes.body.data.id;

    // Create target content
    const tgtRes = await agent()
      .post('/api/v1/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId, data: buildBlogData({ title: 'Target Post' }) });
    targetId = tgtRes.body.data.id;
  });

  // ─── POST /api/contents/:id/relations ──────────────────
  describe('POST /api/contents/:id/relations', () => {
    it('returns 401 without token', async () => {
      const res = await agent()
        .post(`/api/v1/contents/${sourceId}/relations`)
        .send({ targetId, relationType: 'reference' });
      expect(res.status).toBe(401);
    });

    it('creates a relation (201)', async () => {
      const res = await agent()
        .post(`/api/v1/contents/${sourceId}/relations`)
        .set('Authorization', `Bearer ${token}`)
        .send({ targetId, relationType: 'reference' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        sourceId,
        targetId,
        relationType: 'reference',
      });
      expect(res.body.data.id).toBeDefined();
    });

    it('rejects self-relation (400)', async () => {
      const res = await agent()
        .post(`/api/v1/contents/${sourceId}/relations`)
        .set('Authorization', `Bearer ${token}`)
        .send({ targetId: sourceId, relationType: 'reference' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/itself/i);
    });

    it('rejects duplicate relation (409)', async () => {
      await agent()
        .post(`/api/v1/contents/${sourceId}/relations`)
        .set('Authorization', `Bearer ${token}`)
        .send({ targetId, relationType: 'reference' });

      const res = await agent()
        .post(`/api/v1/contents/${sourceId}/relations`)
        .set('Authorization', `Bearer ${token}`)
        .send({ targetId, relationType: 'reference' });
      expect(res.status).toBe(409);
    });

    it('returns 404 for non-existent source', async () => {
      const res = await agent()
        .post('/api/v1/contents/00000000-0000-0000-0000-000000000000/relations')
        .set('Authorization', `Bearer ${token}`)
        .send({ targetId, relationType: 'reference' });
      expect(res.status).toBe(404);
    });

    it('returns 404 for non-existent target', async () => {
      const res = await agent()
        .post(`/api/v1/contents/${sourceId}/relations`)
        .set('Authorization', `Bearer ${token}`)
        .send({ targetId: '00000000-0000-0000-0000-000000000000', relationType: 'reference' });
      expect(res.status).toBe(404);
    });
  });

  // ─── GET /api/contents/:id/relations ───────────────────
  describe('GET /api/contents/:id/relations', () => {
    it('returns paginated list', async () => {
      // Create a relation first
      await agent()
        .post(`/api/v1/contents/${sourceId}/relations`)
        .set('Authorization', `Bearer ${token}`)
        .send({ targetId, relationType: 'reference' });

      const res = await agent().get(`/api/v1/contents/${sourceId}/relations`).set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta.total).toBe(1);
    });

    it('filters by relationType', async () => {
      await agent()
        .post(`/api/v1/contents/${sourceId}/relations`)
        .set('Authorization', `Bearer ${token}`)
        .send({ targetId, relationType: 'reference' });

      const res = await agent()
        .get(`/api/v1/contents/${sourceId}/relations`)
        .query({ relationType: 'parent' })
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.data).toHaveLength(0);
    });
  });

  // ─── DELETE /api/contents/:id/relations/:relationId ────
  describe('DELETE /api/contents/:id/relations/:relationId', () => {
    it('deletes a relation (204)', async () => {
      const createRes = await agent()
        .post(`/api/v1/contents/${sourceId}/relations`)
        .set('Authorization', `Bearer ${token}`)
        .send({ targetId, relationType: 'reference' });
      const relationId = createRes.body.data.id;

      const res = await agent()
        .delete(`/api/v1/contents/${sourceId}/relations/${relationId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(204);
    });

    it('returns 404 for non-existent relation', async () => {
      const res = await agent()
        .delete(`/api/v1/contents/${sourceId}/relations/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });
});
