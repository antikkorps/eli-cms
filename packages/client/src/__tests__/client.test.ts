import { describe, it, expect, vi } from 'vitest';
import { EliClient } from '../client.js';
import { ContentQueryBuilder } from '../query-builder.js';

function createMockFetch(body: unknown = { success: true, data: [] }) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

describe('EliClient', () => {
  it('should expose contentTypes and contents resources', () => {
    const client = new EliClient({
      baseUrl: 'https://cms.example.com',
      fetch: createMockFetch(),
      cache: false,
    });

    expect(client.contentTypes).toBeDefined();
    expect(client.contents).toBeDefined();
    expect(typeof client.contentTypes.list).toBe('function');
    expect(typeof client.contentTypes.get).toBe('function');
    expect(typeof client.contents.list).toBe('function');
    expect(typeof client.contents.get).toBe('function');
    expect(typeof client.contents.getBySlug).toBe('function');
    expect(typeof client.contents.query).toBe('function');
  });

  it('should clear cache', () => {
    const client = new EliClient({
      baseUrl: 'https://cms.example.com',
      fetch: createMockFetch(),
    });

    // Should not throw
    client.clearCache();
  });

  it('should list content types via public API', async () => {
    const body = {
      success: true,
      data: [{ id: '1', slug: 'blog', name: 'Blog' }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };
    const fetchFn = createMockFetch(body);
    const client = new EliClient({
      baseUrl: 'https://cms.example.com',
      fetch: fetchFn,
      cache: false,
    });

    const result = await client.contentTypes.list();
    expect(result.data).toEqual([{ id: '1', slug: 'blog', name: 'Blog' }]);
    expect(result.meta.total).toBe(1);

    const url = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(url).toContain('/api/v1/public/content-types');
  });

  it('should get content by slug', async () => {
    const body = {
      success: true,
      data: { id: '1', slug: 'hello-world', data: { title: 'Hello' } },
    };
    const fetchFn = createMockFetch(body);
    const client = new EliClient({
      baseUrl: 'https://cms.example.com',
      fetch: fetchFn,
      cache: false,
    });

    const result = await client.contents.getBySlug('blog', 'hello-world');
    expect(result.data).toEqual({ title: 'Hello' });

    const url = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(url).toContain('/api/v1/public/content-types/blog/contents/hello-world');
  });

  it('should return a query builder from contents.query()', () => {
    const client = new EliClient({
      baseUrl: 'https://cms.example.com',
      fetch: createMockFetch(),
      cache: false,
    });

    const qb = client.contents.query('blog');
    expect(qb).toBeInstanceOf(ContentQueryBuilder);
  });

  it('should list contents by type', async () => {
    const body = {
      success: true,
      data: [{ id: '1' }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };
    const fetchFn = createMockFetch(body);
    const client = new EliClient({
      baseUrl: 'https://cms.example.com',
      fetch: fetchFn,
      cache: false,
    });

    await client.contents.list({ contentType: 'blog', limit: 5 });

    const url = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(url).toContain('/api/v1/public/contents/by-type/blog');
    expect(url).toContain('limit=5');
  });

  it('should list all contents without type filter', async () => {
    const body = {
      success: true,
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
    const fetchFn = createMockFetch(body);
    const client = new EliClient({
      baseUrl: 'https://cms.example.com',
      fetch: fetchFn,
      cache: false,
    });

    await client.contents.list();

    const url = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(url).toContain('/api/v1/public/contents');
    expect(url).not.toContain('by-type');
  });
});
