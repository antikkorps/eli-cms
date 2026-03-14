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
    const res = await agent().get('/api/v1/contents');
    expect(res.status).toBe(401);
  });

  // ─── Pagination defaults ──────────────────────────────
  it('returns default pagination meta', async () => {
    const res = await agent().get('/api/v1/contents').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 20, total: 0, totalPages: 0 });
  });

  // ─── Pagination explicit ──────────────────────────────
  it('respects explicit page and limit', async () => {
    const api = agent();
    // create content type
    const ctRes = await api
      .post('/api/v1/content-types')
      .set('Authorization', `Bearer ${token}`)
      .send(buildBlogContentType());
    const ctId = ctRes.body.data.id;

    // seed 3 contents
    for (let i = 0; i < 3; i++) {
      await api
        .post('/api/v1/contents')
        .set('Authorization', `Bearer ${token}`)
        .send({ contentTypeId: ctId, data: buildBlogData({ title: `Post ${i}` }) });
    }

    const res = await api
      .get('/api/v1/contents')
      .query({ page: 1, limit: 2 })
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });
  });

  // ─── Filter: status ───────────────────────────────────
  it('filters by status=draft', async () => {
    const api = agent();
    const ctRes = await api
      .post('/api/v1/content-types')
      .set('Authorization', `Bearer ${token}`)
      .send(buildBlogContentType());
    const ctId = ctRes.body.data.id;

    await api
      .post('/api/v1/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId: ctId, status: 'draft', data: buildBlogData() });
    await api
      .post('/api/v1/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId: ctId, status: 'published', data: buildBlogData({ title: 'Published' }) });

    const res = await api
      .get('/api/v1/contents')
      .query({ status: 'draft' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe('draft');
    expect(res.body.meta.total).toBe(1);
  });

  it('filters by status=published', async () => {
    const api = agent();
    const ctRes = await api
      .post('/api/v1/content-types')
      .set('Authorization', `Bearer ${token}`)
      .send(buildBlogContentType());
    const ctId = ctRes.body.data.id;

    await api
      .post('/api/v1/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId: ctId, status: 'draft', data: buildBlogData() });
    await api
      .post('/api/v1/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId: ctId, status: 'published', data: buildBlogData({ title: 'Pub' }) });

    const res = await api
      .get('/api/v1/contents')
      .query({ status: 'published' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe('published');
  });

  // ─── Filter: contentTypeId ────────────────────────────
  it('filters by contentTypeId', async () => {
    const api = agent();
    const blogRes = await api
      .post('/api/v1/content-types')
      .set('Authorization', `Bearer ${token}`)
      .send(buildBlogContentType());
    const blogId = blogRes.body.data.id;

    const pageRes = await api
      .post('/api/v1/content-types')
      .set('Authorization', `Bearer ${token}`)
      .send(buildPageContentType());
    const pageId = pageRes.body.data.id;

    await api
      .post('/api/v1/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId: blogId, data: buildBlogData() });
    await api
      .post('/api/v1/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId: pageId, data: { title: 'About', content: 'About text' } });

    const res = await api
      .get('/api/v1/contents')
      .query({ contentTypeId: blogId })
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].contentTypeId).toBe(blogId);
  });

  it('returns 400 for invalid contentTypeId UUID', async () => {
    const res = await agent()
      .get('/api/v1/contents')
      .query({ contentTypeId: 'not-a-uuid' })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  // ─── Combined filters ─────────────────────────────────
  it('combines status + contentTypeId + pagination', async () => {
    const api = agent();
    const ctRes = await api
      .post('/api/v1/content-types')
      .set('Authorization', `Bearer ${token}`)
      .send(buildBlogContentType());
    const ctId = ctRes.body.data.id;

    // 3 drafts + 2 published
    for (let i = 0; i < 3; i++) {
      await api
        .post('/api/v1/contents')
        .set('Authorization', `Bearer ${token}`)
        .send({ contentTypeId: ctId, status: 'draft', data: buildBlogData({ title: `Draft ${i}` }) });
    }
    for (let i = 0; i < 2; i++) {
      await api
        .post('/api/v1/contents')
        .set('Authorization', `Bearer ${token}`)
        .send({ contentTypeId: ctId, status: 'published', data: buildBlogData({ title: `Pub ${i}` }) });
    }

    const res = await api
      .get('/api/v1/contents')
      .query({ contentTypeId: ctId, status: 'draft', page: 1, limit: 2 })
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toMatchObject({ total: 3, totalPages: 2, page: 1, limit: 2 });
    expect(res.body.data.every((c: Record<string, unknown>) => c.status === 'draft')).toBe(true);
  });

  // ─── Sorting ──────────────────────────────────────────
  it('default sort is createdAt desc', async () => {
    const api = agent();
    const ctRes = await api
      .post('/api/v1/content-types')
      .set('Authorization', `Bearer ${token}`)
      .send(buildBlogContentType());
    const ctId = ctRes.body.data.id;

    await api
      .post('/api/v1/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId: ctId, data: buildBlogData({ title: 'First' }) });
    await api
      .post('/api/v1/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId: ctId, data: buildBlogData({ title: 'Second' }) });

    const res = await api.get('/api/v1/contents').set('Authorization', `Bearer ${token}`);

    // desc → most recent first
    expect(res.body.data[0].data.title).toBe('Second');
    expect(res.body.data[1].data.title).toBe('First');
  });

  it('supports sortBy + sortOrder=asc', async () => {
    const api = agent();
    const ctRes = await api
      .post('/api/v1/content-types')
      .set('Authorization', `Bearer ${token}`)
      .send(buildBlogContentType());
    const ctId = ctRes.body.data.id;

    await api
      .post('/api/v1/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId: ctId, data: buildBlogData({ title: 'First' }) });
    await api
      .post('/api/v1/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId: ctId, data: buildBlogData({ title: 'Second' }) });

    const res = await api
      .get('/api/v1/contents')
      .query({ sortBy: 'createdAt', sortOrder: 'asc' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data[0].data.title).toBe('First');
    expect(res.body.data[1].data.title).toBe('Second');
  });

  // ─── Validation ───────────────────────────────────────
  it('returns 400 for page=0', async () => {
    const res = await agent()
      .get('/api/v1/contents')
      .query({ page: 0 })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('returns 400 for limit=101', async () => {
    const res = await agent()
      .get('/api/v1/contents')
      .query({ limit: 101 })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  // ─── Full-text search ────────────────────────────────
  it('search returns contents matching a term in data', async () => {
    const api = agent();
    const ctRes = await api
      .post('/api/v1/content-types')
      .set('Authorization', `Bearer ${token}`)
      .send(buildBlogContentType());
    const ctId = ctRes.body.data.id;

    await api
      .post('/api/v1/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId: ctId, data: buildBlogData({ title: 'TypeScript Guide', body: 'Learn TS' }) });
    await api
      .post('/api/v1/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId: ctId, data: buildBlogData({ title: 'Python Guide', body: 'Learn Python' }) });

    const res = await api
      .get('/api/v1/contents')
      .query({ search: 'TypeScript' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].data.title).toBe('TypeScript Guide');
    expect(res.body.meta.total).toBe(1);
  });

  it('search is case-insensitive', async () => {
    const api = agent();
    const ctRes = await api
      .post('/api/v1/content-types')
      .set('Authorization', `Bearer ${token}`)
      .send(buildBlogContentType());
    const ctId = ctRes.body.data.id;

    await api
      .post('/api/v1/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId: ctId, data: buildBlogData({ title: 'JavaScript Basics' }) });

    const res = await api
      .get('/api/v1/contents')
      .query({ search: 'javascript' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].data.title).toBe('JavaScript Basics');
  });

  it('multi-word search uses AND (both terms must match)', async () => {
    const api = agent();
    const ctRes = await api
      .post('/api/v1/content-types')
      .set('Authorization', `Bearer ${token}`)
      .send(buildBlogContentType());
    const ctId = ctRes.body.data.id;

    await api
      .post('/api/v1/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId: ctId, data: buildBlogData({ title: 'TypeScript Guide', body: 'Advanced patterns' }) });
    await api
      .post('/api/v1/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId: ctId, data: buildBlogData({ title: 'TypeScript Intro', body: 'Basic concepts' }) });

    const res = await api
      .get('/api/v1/contents')
      .query({ search: 'TypeScript Advanced' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].data.title).toBe('TypeScript Guide');
  });

  it('search combines with status filter', async () => {
    const api = agent();
    const ctRes = await api
      .post('/api/v1/content-types')
      .set('Authorization', `Bearer ${token}`)
      .send(buildBlogContentType());
    const ctId = ctRes.body.data.id;

    await api
      .post('/api/v1/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId: ctId, status: 'draft', data: buildBlogData({ title: 'Draft Rust Article' }) });
    await api
      .post('/api/v1/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId: ctId, status: 'published', data: buildBlogData({ title: 'Published Rust Article' }) });

    const res = await api
      .get('/api/v1/contents')
      .query({ search: 'Rust', status: 'published' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe('published');
  });

  it('sortBy=relevance sorts by relevance when search is active', async () => {
    const api = agent();
    const ctRes = await api
      .post('/api/v1/content-types')
      .set('Authorization', `Bearer ${token}`)
      .send(buildBlogContentType());
    const ctId = ctRes.body.data.id;

    // "golang" appears once in the body only
    await api
      .post('/api/v1/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId: ctId, data: buildBlogData({ title: 'Web Dev', body: 'Uses golang for backend' }) });
    // "golang" appears in both title and body — higher relevance
    await api
      .post('/api/v1/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId: ctId, data: buildBlogData({ title: 'golang tutorial', body: 'Learn golang step by step' }) });

    const res = await api
      .get('/api/v1/contents')
      .query({ search: 'golang', sortBy: 'relevance' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data).toHaveLength(2);
    // The one with more "golang" occurrences should rank first
    expect(res.body.data[0].data.title).toBe('golang tutorial');
  });

  it('search with no match returns empty array', async () => {
    const api = agent();
    const ctRes = await api
      .post('/api/v1/content-types')
      .set('Authorization', `Bearer ${token}`)
      .send(buildBlogContentType());
    const ctId = ctRes.body.data.id;

    await api
      .post('/api/v1/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId: ctId, data: buildBlogData({ title: 'Hello World' }) });

    const res = await api
      .get('/api/v1/contents')
      .query({ search: 'nonexistentterm' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data).toHaveLength(0);
    expect(res.body.meta.total).toBe(0);
  });

  it('empty search string returns all contents', async () => {
    const api = agent();
    const ctRes = await api
      .post('/api/v1/content-types')
      .set('Authorization', `Bearer ${token}`)
      .send(buildBlogContentType());
    const ctId = ctRes.body.data.id;

    await api
      .post('/api/v1/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId: ctId, data: buildBlogData({ title: 'Post A' }) });
    await api
      .post('/api/v1/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId: ctId, data: buildBlogData({ title: 'Post B' }) });

    const res = await api
      .get('/api/v1/contents')
      .query({ search: '' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data).toHaveLength(2);
  });
});
