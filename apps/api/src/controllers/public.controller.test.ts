import { describe, it, expect, beforeEach } from 'vitest';
import { agent, getAdminToken } from '../__tests__/helpers/setup.js';
import { buildBlogContentType, buildBlogData } from '../__tests__/helpers/fixtures.js';

describe('Public API — full-text search', () => {
  let token: string;
  let ctId: string;

  beforeEach(async () => {
    token = await getAdminToken();
    const api = agent();
    const ctRes = await api
      .post('/api/content-types')
      .set('Authorization', `Bearer ${token}`)
      .send(buildBlogContentType());
    ctId = ctRes.body.data.id;
  });

  async function seedPublished(data: Record<string, unknown>) {
    await agent()
      .post('/api/contents')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentTypeId: ctId, status: 'published', data: buildBlogData(data) });
  }

  it('GET /api/public/contents?search=term filters published contents', async () => {
    await seedPublished({ title: 'Rust Ownership', body: 'Borrowing rules' });
    await seedPublished({ title: 'Go Concurrency', body: 'Goroutines explained' });

    const res = await agent().get('/api/public/contents').query({ search: 'Rust' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].data.title).toBe('Rust Ownership');
  });

  it('GET /api/public/contents/by-type/:slug?search=term filters by type and search', async () => {
    await seedPublished({ title: 'Docker Basics', body: 'Container fundamentals' });
    await seedPublished({ title: 'Kubernetes Intro', body: 'Orchestration overview' });

    const res = await agent()
      .get('/api/public/contents/by-type/blog')
      .query({ search: 'Docker' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].data.title).toBe('Docker Basics');
  });

  it('search with no match returns empty array', async () => {
    await seedPublished({ title: 'Some Article', body: 'Content here' });

    const res = await agent().get('/api/public/contents').query({ search: 'zzzznotfound' });

    expect(res.body.data).toHaveLength(0);
    expect(res.body.meta.total).toBe(0);
  });
});
