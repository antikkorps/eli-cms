import { describe, it, expect, beforeEach } from 'vitest';
import { agent, getAdminToken } from '../__tests__/helpers/setup.js';
import { buildBlogContentType, buildBlogData } from '../__tests__/helpers/fixtures.js';

describe('Content Versions API', () => {
  let token: string;
  let contentTypeId: string;
  let contentId: string;

  beforeEach(async () => {
    token = await getAdminToken();

    // Create a content type
    const ctRes = await agent()
      .post('/api/v1/content-types')
      .set('Authorization', `Bearer ${token}`)
      .send(buildBlogContentType());
    contentTypeId = ctRes.body.data.id;

    // Create content
    const cRes = await agent()
      .post('/api/v1/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId, data: buildBlogData() });
    contentId = cRes.body.data.id;
  });

  // ─── Auto-snapshot on update ───────────────────────────
  describe('Auto-snapshot on content update', () => {
    it('creates a version when content is updated', async () => {
      // Update the content
      await agent()
        .put(`/api/v1/contents/${contentId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ data: buildBlogData({ title: 'Updated Title' }) });

      // List versions
      const res = await agent().get(`/api/v1/contents/${contentId}/versions`).set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].data.title).toBe('Hello World'); // original data
      expect(res.body.data[0].versionNumber).toBe(1);
    });
  });

  // ─── GET /api/contents/:id/versions ────────────────────
  describe('GET /api/contents/:id/versions', () => {
    it('returns 401 without token', async () => {
      const res = await agent().get(`/api/v1/contents/${contentId}/versions`);
      expect(res.status).toBe(401);
    });

    it('returns paginated list ordered by versionNumber desc', async () => {
      // Make 2 updates
      await agent()
        .put(`/api/v1/contents/${contentId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ data: buildBlogData({ title: 'V2' }) });
      await agent()
        .put(`/api/v1/contents/${contentId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ data: buildBlogData({ title: 'V3' }) });

      const res = await agent().get(`/api/v1/contents/${contentId}/versions`).set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].versionNumber).toBe(2);
      expect(res.body.data[1].versionNumber).toBe(1);
      expect(res.body.meta.total).toBe(2);
    });
  });

  // ─── GET /api/contents/:id/versions/:versionId ─────────
  describe('GET /api/contents/:id/versions/:versionId', () => {
    it('returns a specific version', async () => {
      await agent()
        .put(`/api/v1/contents/${contentId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ data: buildBlogData({ title: 'Updated' }) });

      const listRes = await agent()
        .get(`/api/v1/contents/${contentId}/versions`)
        .set('Authorization', `Bearer ${token}`);
      const versionId = listRes.body.data[0].id;

      const res = await agent()
        .get(`/api/v1/contents/${contentId}/versions/${versionId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(versionId);
      expect(res.body.data.data.title).toBe('Hello World');
    });

    it('returns 404 for non-existent version', async () => {
      const res = await agent()
        .get(`/api/v1/contents/${contentId}/versions/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  // ─── POST /api/contents/:id/versions/:versionId/restore
  describe('POST /api/contents/:id/versions/:versionId/restore', () => {
    it('restores a previous version', async () => {
      // Update content (creates version 1 with original data)
      await agent()
        .put(`/api/v1/contents/${contentId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ data: buildBlogData({ title: 'Updated Title' }) });

      // Get the version
      const listRes = await agent()
        .get(`/api/v1/contents/${contentId}/versions`)
        .set('Authorization', `Bearer ${token}`);
      const versionNumber = listRes.body.data[0].versionNumber;

      // Restore it
      const res = await agent()
        .post(`/api/v1/contents/${contentId}/versions/${versionNumber}/restore`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.data.title).toBe('Hello World'); // restored to original

      // Should have created another version (snapshot of "Updated Title" before restore)
      const versionsAfter = await agent()
        .get(`/api/v1/contents/${contentId}/versions`)
        .set('Authorization', `Bearer ${token}`);
      expect(versionsAfter.body.data.length).toBe(2);
    });
  });

  // ─── Version purge ─────────────────────────────────────
  describe('Version purge beyond 20', () => {
    it('keeps only 20 versions', async () => {
      // Create 22 updates (= 22 versions)
      for (let i = 1; i <= 22; i++) {
        await agent()
          .put(`/api/v1/contents/${contentId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ data: buildBlogData({ title: `Version ${i}` }) });
      }

      const res = await agent()
        .get(`/api/v1/contents/${contentId}/versions`)
        .query({ limit: 100 })
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.meta.total).toBeLessThanOrEqual(20);
    });
  });
});
