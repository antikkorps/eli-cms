import { describe, it, expect, beforeEach } from 'vitest';
import { agent, getAdminToken } from '../__tests__/helpers/setup.js';
import { buildBlogContentType, buildBlogData } from '../__tests__/helpers/fixtures.js';

describe('Content Bulk Actions', () => {
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

  async function createContent(overrides: Record<string, unknown> = {}) {
    const res = await agent()
      .post('/api/v1/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId, data: buildBlogData(), ...overrides });
    return res.body.data;
  }

  it('POST /contents/bulk-action deletes multiple contents', async () => {
    const c1 = await createContent({ data: buildBlogData({ title: 'A' }) });
    const c2 = await createContent({ data: buildBlogData({ title: 'B' }) });
    const c3 = await createContent({ data: buildBlogData({ title: 'C' }) });

    const res = await agent()
      .post('/api/v1/contents/bulk-action')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: [c1.id, c2.id], action: 'delete' });

    expect(res.status).toBe(200);
    expect(res.body.data.affected).toBe(2);

    // c3 should still exist
    const get = await agent()
      .get(`/api/v1/contents/${c3.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(get.status).toBe(200);

    // c1 should be gone
    const gone = await agent()
      .get(`/api/v1/contents/${c1.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(gone.status).toBe(404);
  });

  it('POST /contents/bulk-action publishes multiple contents', async () => {
    const c1 = await createContent({ data: buildBlogData({ title: 'A' }) });
    const c2 = await createContent({ data: buildBlogData({ title: 'B' }) });

    const res = await agent()
      .post('/api/v1/contents/bulk-action')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: [c1.id, c2.id], action: 'publish' });

    expect(res.status).toBe(200);
    expect(res.body.data.affected).toBe(2);

    const get = await agent()
      .get(`/api/v1/contents/${c1.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(get.body.data.status).toBe('published');
  });

  it('POST /contents/bulk-action unpublishes multiple contents', async () => {
    const c1 = await createContent({ status: 'published', data: buildBlogData({ title: 'A' }) });
    const c2 = await createContent({ status: 'published', data: buildBlogData({ title: 'B' }) });

    const res = await agent()
      .post('/api/v1/contents/bulk-action')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: [c1.id, c2.id], action: 'unpublish' });

    expect(res.status).toBe(200);

    const get = await agent()
      .get(`/api/v1/contents/${c1.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(get.body.data.status).toBe('draft');
  });

  it('400 rejects empty ids array', async () => {
    const res = await agent()
      .post('/api/v1/contents/bulk-action')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: [], action: 'delete' });

    expect(res.status).toBe(400);
  });

  it('400 rejects invalid action', async () => {
    const res = await agent()
      .post('/api/v1/contents/bulk-action')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: ['00000000-0000-0000-0000-000000000000'], action: 'invalid' });

    expect(res.status).toBe(400);
  });

  it('401 rejects without token', async () => {
    const res = await agent()
      .post('/api/v1/contents/bulk-action')
      .send({ ids: ['00000000-0000-0000-0000-000000000000'], action: 'delete' });

    expect(res.status).toBe(401);
  });
});
