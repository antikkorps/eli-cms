import { describe, it, expect, beforeEach } from 'vitest';
import { agent, getAdminToken } from '../__tests__/helpers/setup.js';
import { buildBlogContentType, buildPageContentType } from '../__tests__/helpers/fixtures.js';

describe('GET /api/content-types', () => {
  let token: string;

  beforeEach(async () => {
    token = await getAdminToken();
  });

  // ─── Auth ──────────────────────────────────────────────
  it('returns 401 without token', async () => {
    const res = await agent().get('/api/v1/content-types');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 200 with a valid token', async () => {
    const res = await agent().get('/api/v1/content-types').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ─── Pagination defaults ──────────────────────────────
  it('returns default pagination meta (page=1, limit=20)', async () => {
    const res = await agent().get('/api/v1/content-types').set('Authorization', `Bearer ${token}`);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 20, total: 0, totalPages: 0 });
  });

  // ─── Pagination explicit ──────────────────────────────
  it('respects explicit page and limit', async () => {
    const api = agent();
    // seed 3 content types
    for (let i = 0; i < 3; i++) {
      await api
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${token}`)
        .send({ slug: `type-${i}`, name: `Type ${i}`, fields: buildBlogContentType().fields });
    }

    const res = await api
      .get('/api/v1/content-types')
      .query({ page: 1, limit: 2 })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });
  });

  it('returns page 2 correctly', async () => {
    const api = agent();
    for (let i = 0; i < 3; i++) {
      await api
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${token}`)
        .send({ slug: `type-${i}`, name: `Type ${i}`, fields: buildBlogContentType().fields });
    }

    const res = await api
      .get('/api/v1/content-types')
      .query({ page: 2, limit: 2 })
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta.page).toBe(2);
  });

  it('returns empty data for page beyond total', async () => {
    const api = agent();
    await api.post('/api/v1/content-types').set('Authorization', `Bearer ${token}`).send(buildBlogContentType());

    const res = await api.get('/api/v1/content-types').query({ page: 99 }).set('Authorization', `Bearer ${token}`);

    expect(res.body.data).toHaveLength(0);
    expect(res.body.meta.total).toBe(1);
  });

  // ─── Search ───────────────────────────────────────────
  it('searches by name (ILIKE)', async () => {
    const api = agent();
    await api.post('/api/v1/content-types').set('Authorization', `Bearer ${token}`).send(buildBlogContentType());
    await api.post('/api/v1/content-types').set('Authorization', `Bearer ${token}`).send(buildPageContentType());

    const res = await api
      .get('/api/v1/content-types')
      .query({ search: 'blog' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].slug).toBe('blog');
  });

  it('search is case-insensitive', async () => {
    const api = agent();
    await api.post('/api/v1/content-types').set('Authorization', `Bearer ${token}`).send(buildBlogContentType());

    const res = await api
      .get('/api/v1/content-types')
      .query({ search: 'BLOG' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data).toHaveLength(1);
  });

  it('search works on slug field', async () => {
    const api = agent();
    await api.post('/api/v1/content-types').set('Authorization', `Bearer ${token}`).send(buildPageContentType());

    const res = await api
      .get('/api/v1/content-types')
      .query({ search: 'page' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].slug).toBe('page');
  });

  it('combines search with pagination', async () => {
    const api = agent();
    for (let i = 0; i < 5; i++) {
      await api
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${token}`)
        .send({ slug: `article-${i}`, name: `Article ${i}`, fields: buildBlogContentType().fields });
    }
    await api.post('/api/v1/content-types').set('Authorization', `Bearer ${token}`).send(buildPageContentType());

    const res = await api
      .get('/api/v1/content-types')
      .query({ search: 'article', page: 1, limit: 2 })
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toMatchObject({ total: 5, totalPages: 3 });
  });

  // ─── Validation ───────────────────────────────────────
  it('returns 400 for page=0', async () => {
    const res = await agent().get('/api/v1/content-types').query({ page: 0 }).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('returns 400 for limit=101', async () => {
    const res = await agent()
      .get('/api/v1/content-types')
      .query({ limit: 101 })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('coerces string page/limit to numbers', async () => {
    const res = await agent()
      .get('/api/v1/content-types')
      .query({ page: '1', limit: '10' })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.meta.page).toBe(1);
    expect(res.body.meta.limit).toBe(10);
  });
});
