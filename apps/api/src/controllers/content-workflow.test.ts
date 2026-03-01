import { describe, it, expect, beforeEach } from 'vitest';
import { agent, getAdminToken, getEditorToken, getReviewerToken } from '../__tests__/helpers/setup.js';
import { buildBlogContentType, buildBlogData } from '../__tests__/helpers/fixtures.js';

describe('Content Workflow', () => {
  let adminToken: string;
  let contentTypeId: string;

  beforeEach(async () => {
    adminToken = await getAdminToken();
    const ctRes = await agent()
      .post('/api/v1/content-types')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(buildBlogContentType());
    contentTypeId = ctRes.body.data.id;
  });

  async function createDraft(token?: string) {
    const res = await agent()
      .post('/api/v1/contents')
      .set('Authorization', `Bearer ${token ?? adminToken}`)
      .send({ contentTypeId, data: buildBlogData() });
    expect(res.status).toBe(201);
    return res.body.data;
  }

  async function transition(id: string, status: string, token: string, extra: Record<string, unknown> = {}) {
    return agent()
      .put(`/api/v1/contents/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status, ...extra });
  }

  /** Helper: move content from draft all the way to approved using admin */
  async function moveToApproved(id: string) {
    await transition(id, 'in-review', adminToken);
    await transition(id, 'approved', adminToken);
  }

  // ─── Happy path: full workflow ────────────────────────
  describe('full workflow (admin)', () => {
    it('draft → in-review → approved → published', async () => {
      const content = await createDraft();

      const r1 = await transition(content.id, 'in-review', adminToken);
      expect(r1.status).toBe(200);
      expect(r1.body.data.status).toBe('in-review');

      const r2 = await transition(content.id, 'approved', adminToken);
      expect(r2.status).toBe(200);
      expect(r2.body.data.status).toBe('approved');

      const r3 = await transition(content.id, 'published', adminToken);
      expect(r3.status).toBe(200);
      expect(r3.body.data.status).toBe('published');
      expect(r3.body.data.publishedAt).toBeDefined();
    });

    it('draft → in-review → approved → scheduled', async () => {
      const content = await createDraft();
      await moveToApproved(content.id);

      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const res = await transition(content.id, 'scheduled', adminToken, { publishedAt: futureDate });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('scheduled');
      expect(res.body.data.publishedAt).toBeDefined();
    });
  });

  // ─── Invalid transitions ──────────────────────────────
  describe('invalid transitions', () => {
    it('400 draft → published (skip workflow)', async () => {
      const content = await createDraft();
      const res = await transition(content.id, 'published', adminToken);
      expect(res.status).toBe(400);
    });

    it('400 draft → approved (skip review)', async () => {
      const content = await createDraft();
      const res = await transition(content.id, 'approved', adminToken);
      expect(res.status).toBe(400);
    });

    it('400 in-review → published (skip approval)', async () => {
      const content = await createDraft();
      await transition(content.id, 'in-review', adminToken);
      const res = await transition(content.id, 'published', adminToken);
      expect(res.status).toBe(400);
    });
  });

  // ─── Rejection flow ───────────────────────────────────
  describe('rejection', () => {
    it('in-review → draft (reject)', async () => {
      const content = await createDraft();
      await transition(content.id, 'in-review', adminToken);

      const res = await transition(content.id, 'draft', adminToken);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('draft');
    });

    it('published → draft (unpublish)', async () => {
      const content = await createDraft();
      await moveToApproved(content.id);
      await transition(content.id, 'published', adminToken);

      const res = await transition(content.id, 'draft', adminToken);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('draft');
    });
  });

  // ─── Permission checks ────────────────────────────────
  describe('permissions', () => {
    it('reviewer can approve (has content:review)', async () => {
      const reviewerToken = await getReviewerToken();
      // Create content as admin, then let reviewer approve
      const content = await createDraft();
      await transition(content.id, 'in-review', adminToken);

      const res = await transition(content.id, 'approved', reviewerToken);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('approved');
    });

    it('reviewer cannot publish (lacks content:publish)', async () => {
      const reviewerToken = await getReviewerToken();
      const content = await createDraft();
      await moveToApproved(content.id);

      const res = await transition(content.id, 'published', reviewerToken);
      expect(res.status).toBe(403);
    });

    it('editor can publish approved content (has content:publish)', async () => {
      const editorToken = await getEditorToken();
      const content = await createDraft();
      await moveToApproved(content.id);

      const res = await transition(content.id, 'published', editorToken);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('published');
    });
  });

  // ─── No-op transition ─────────────────────────────────
  it('same status (no-op) is allowed', async () => {
    const content = await createDraft();
    const res = await transition(content.id, 'draft', adminToken);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('draft');
  });
});
