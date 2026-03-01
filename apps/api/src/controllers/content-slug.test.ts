import { describe, it, expect, beforeEach } from 'vitest';
import { agent, getAdminToken } from '../__tests__/helpers/setup.js';
import { buildBlogContentType, buildBlogData } from '../__tests__/helpers/fixtures.js';

describe('Content Slug', () => {
  let token: string;
  let contentTypeId: string;

  beforeEach(async () => {
    token = await getAdminToken();
    const ctRes = await agent()
      .post('/api/v1/content-types')
      .set('Authorization', `Bearer ${token}`)
      .send(buildBlogContentType());
    contentTypeId = ctRes.body.data.id;
  });

  it('auto-generates slug from first text field', async () => {
    const res = await agent()
      .post('/api/v1/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId, data: buildBlogData({ title: 'Hello World' }) });

    expect(res.status).toBe(201);
    expect(res.body.data.slug).toBe('hello-world');
  });

  it('uses provided slug instead of auto-generating', async () => {
    const res = await agent()
      .post('/api/v1/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId, slug: 'custom-slug', data: buildBlogData() });

    expect(res.status).toBe(201);
    expect(res.body.data.slug).toBe('custom-slug');
  });

  it('ensures unique slug by appending suffix', async () => {
    const api = agent();

    await api
      .post('/api/v1/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId, data: buildBlogData({ title: 'My Post' }) });

    const res = await api
      .post('/api/v1/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId, data: buildBlogData({ title: 'My Post' }) });

    expect(res.status).toBe(201);
    expect(res.body.data.slug).toBe('my-post-1');
  });

  it('allows same slug across different content types', async () => {
    const api = agent();

    await api
      .post('/api/v1/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId, slug: 'same-slug', data: buildBlogData() });

    // Create a different content type
    const ctRes = await api
      .post('/api/v1/content-types')
      .set('Authorization', `Bearer ${token}`)
      .send({ slug: 'page', name: 'Page', fields: [{ name: 'title', type: 'text', required: true, label: 'Title' }, { name: 'content', type: 'textarea', required: true, label: 'Content' }] });

    const res = await api
      .post('/api/v1/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId: ctRes.body.data.id, slug: 'same-slug', data: { title: 'Page', content: 'Page content' } });

    expect(res.status).toBe(201);
    expect(res.body.data.slug).toBe('same-slug');
  });

  it('updates slug on PUT', async () => {
    const api = agent();
    const created = await api
      .post('/api/v1/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId, slug: 'original-slug', data: buildBlogData() });

    const res = await api
      .put(`/api/v1/contents/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ slug: 'new-slug' });

    expect(res.status).toBe(200);
    expect(res.body.data.slug).toBe('new-slug');
  });

  it('400 rejects invalid slug format', async () => {
    const res = await agent()
      .post('/api/v1/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId, slug: 'UPPER CASE!', data: buildBlogData() });

    expect(res.status).toBe(400);
  });

  // ─── Public API slug route ───────────────────────────
  it('GET /public/content-types/:slug/contents/:contentSlug returns published content', async () => {
    const api = agent();

    const created = await api
      .post('/api/v1/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId, slug: 'my-article', status: 'published', data: buildBlogData() });

    expect(created.status).toBe(201);

    const res = await api.get('/api/v1/public/content-types/blog/contents/my-article');

    expect(res.status).toBe(200);
    expect(res.body.data.slug).toBe('my-article');
    expect(res.body.data.data.title).toBe('Hello World');
  });

  it('GET /public/.../contents/:slug returns 404 for draft content', async () => {
    const api = agent();

    await api
      .post('/api/v1/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId, slug: 'draft-article', status: 'draft', data: buildBlogData() });

    const res = await api.get('/api/v1/public/content-types/blog/contents/draft-article');

    expect(res.status).toBe(404);
  });
});
