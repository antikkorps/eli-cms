import { describe, it, expect, beforeEach } from 'vitest';
import { agent, getAdminToken } from '../__tests__/helpers/setup.js';
import { buildBlogContentType, buildPageContentType, buildBlogData } from '../__tests__/helpers/fixtures.js';

describe('GET /api/contents', () => {
  let token: string;

  beforeEach(async () => {
    token = await getAdminToken();
  });

  // ─── Auth ──────────────────────────────────────────────
  it('returns 401 without token', async () => {
    const res = await agent().get('/api/contents');
    expect(res.status).toBe(401);
  });

  // ─── Pagination defaults ──────────────────────────────
  it('returns default pagination meta', async () => {
    const res = await agent().get('/api/contents').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 20, total: 0, totalPages: 0 });
  });

  // ─── Pagination explicit ──────────────────────────────
  it('respects explicit page and limit', async () => {
    const api = agent();
    // create content type
    const ctRes = await api
      .post('/api/content-types')
      .set('Authorization', `Bearer ${token}`)
      .send(buildBlogContentType());
    const ctId = ctRes.body.data.id;

    // seed 3 contents
    for (let i = 0; i < 3; i++) {
      await api
        .post('/api/contents')
        .set('Authorization', `Bearer ${token}`)
        .send({ contentTypeId: ctId, data: buildBlogData({ title: `Post ${i}` }) });
    }

    const res = await api
      .get('/api/contents')
      .query({ page: 1, limit: 2 })
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });
  });

  // ─── Filter: status ───────────────────────────────────
  it('filters by status=draft', async () => {
    const api = agent();
    const ctRes = await api
      .post('/api/content-types')
      .set('Authorization', `Bearer ${token}`)
      .send(buildBlogContentType());
    const ctId = ctRes.body.data.id;

    await api
      .post('/api/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId: ctId, status: 'draft', data: buildBlogData() });
    await api
      .post('/api/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId: ctId, status: 'published', data: buildBlogData({ title: 'Published' }) });

    const res = await api
      .get('/api/contents')
      .query({ status: 'draft' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe('draft');
    expect(res.body.meta.total).toBe(1);
  });

  it('filters by status=published', async () => {
    const api = agent();
    const ctRes = await api
      .post('/api/content-types')
      .set('Authorization', `Bearer ${token}`)
      .send(buildBlogContentType());
    const ctId = ctRes.body.data.id;

    await api
      .post('/api/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId: ctId, status: 'draft', data: buildBlogData() });
    await api
      .post('/api/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId: ctId, status: 'published', data: buildBlogData({ title: 'Pub' }) });

    const res = await api
      .get('/api/contents')
      .query({ status: 'published' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe('published');
  });

  // ─── Filter: contentTypeId ────────────────────────────
  it('filters by contentTypeId', async () => {
    const api = agent();
    const blogRes = await api
      .post('/api/content-types')
      .set('Authorization', `Bearer ${token}`)
      .send(buildBlogContentType());
    const blogId = blogRes.body.data.id;

    const pageRes = await api
      .post('/api/content-types')
      .set('Authorization', `Bearer ${token}`)
      .send(buildPageContentType());
    const pageId = pageRes.body.data.id;

    await api
      .post('/api/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId: blogId, data: buildBlogData() });
    await api
      .post('/api/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId: pageId, data: { title: 'About', content: 'About text' } });

    const res = await api
      .get('/api/contents')
      .query({ contentTypeId: blogId })
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].contentTypeId).toBe(blogId);
  });

  it('returns 400 for invalid contentTypeId UUID', async () => {
    const res = await agent()
      .get('/api/contents')
      .query({ contentTypeId: 'not-a-uuid' })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  // ─── Combined filters ─────────────────────────────────
  it('combines status + contentTypeId + pagination', async () => {
    const api = agent();
    const ctRes = await api
      .post('/api/content-types')
      .set('Authorization', `Bearer ${token}`)
      .send(buildBlogContentType());
    const ctId = ctRes.body.data.id;

    // 3 drafts + 2 published
    for (let i = 0; i < 3; i++) {
      await api
        .post('/api/contents')
        .set('Authorization', `Bearer ${token}`)
        .send({ contentTypeId: ctId, status: 'draft', data: buildBlogData({ title: `Draft ${i}` }) });
    }
    for (let i = 0; i < 2; i++) {
      await api
        .post('/api/contents')
        .set('Authorization', `Bearer ${token}`)
        .send({ contentTypeId: ctId, status: 'published', data: buildBlogData({ title: `Pub ${i}` }) });
    }

    const res = await api
      .get('/api/contents')
      .query({ contentTypeId: ctId, status: 'draft', page: 1, limit: 2 })
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toMatchObject({ total: 3, totalPages: 2, page: 1, limit: 2 });
    expect(res.body.data.every((c: any) => c.status === 'draft')).toBe(true);
  });

  // ─── Sorting ──────────────────────────────────────────
  it('default sort is createdAt desc', async () => {
    const api = agent();
    const ctRes = await api
      .post('/api/content-types')
      .set('Authorization', `Bearer ${token}`)
      .send(buildBlogContentType());
    const ctId = ctRes.body.data.id;

    await api
      .post('/api/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId: ctId, data: buildBlogData({ title: 'First' }) });
    await api
      .post('/api/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId: ctId, data: buildBlogData({ title: 'Second' }) });

    const res = await api.get('/api/contents').set('Authorization', `Bearer ${token}`);

    // desc → most recent first
    expect(res.body.data[0].data.title).toBe('Second');
    expect(res.body.data[1].data.title).toBe('First');
  });

  it('supports sortBy + sortOrder=asc', async () => {
    const api = agent();
    const ctRes = await api
      .post('/api/content-types')
      .set('Authorization', `Bearer ${token}`)
      .send(buildBlogContentType());
    const ctId = ctRes.body.data.id;

    await api
      .post('/api/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId: ctId, data: buildBlogData({ title: 'First' }) });
    await api
      .post('/api/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId: ctId, data: buildBlogData({ title: 'Second' }) });

    const res = await api
      .get('/api/contents')
      .query({ sortBy: 'createdAt', sortOrder: 'asc' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data[0].data.title).toBe('First');
    expect(res.body.data[1].data.title).toBe('Second');
  });

  // ─── Validation ───────────────────────────────────────
  it('returns 400 for page=0', async () => {
    const res = await agent()
      .get('/api/contents')
      .query({ page: 0 })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('returns 400 for limit=101', async () => {
    const res = await agent()
      .get('/api/contents')
      .query({ limit: 101 })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});
