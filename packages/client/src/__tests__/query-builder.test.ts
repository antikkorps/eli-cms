import { describe, it, expect, vi } from 'vitest';
import { ContentQueryBuilder } from '../query-builder.js';
import type { HttpTransport } from '../http.js';

function createMockHttp(responses?: Array<{ data: unknown[]; meta: { page: number; limit: number; total: number; totalPages: number } }>) {
  const queue = [...(responses ?? [])];
  return {
    get: vi.fn().mockImplementation(() => {
      const response = queue.shift() ?? { success: true, data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      return Promise.resolve({ success: true, ...response });
    }),
  } as unknown as HttpTransport;
}

describe('ContentQueryBuilder', () => {
  it('should build query with filters', async () => {
    const http = createMockHttp([
      { data: [{ id: '1' }], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } },
    ]);

    await new ContentQueryBuilder(http, 'blog')
      .filter('data.category', 'tech')
      .execute();

    expect(http.get).toHaveBeenCalledWith(
      '/api/v1/public/contents/by-type/blog',
      expect.objectContaining({
        filter: { data: { category: 'tech' } },
      }),
    );
  });

  it('should build nested filters from dot-notation', async () => {
    const http = createMockHttp([
      { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
    ]);

    await new ContentQueryBuilder(http)
      .filter('publishedAt.gte', '2024-01-01')
      .filter('data.title.like', 'hello')
      .execute();

    expect(http.get).toHaveBeenCalledWith(
      '/api/v1/public/contents',
      expect.objectContaining({
        filter: {
          publishedAt: { gte: '2024-01-01' },
          data: { title: { like: 'hello' } },
        },
      }),
    );
  });

  it('should chain all fluent methods', async () => {
    const http = createMockHttp([
      { data: [{ id: '1' }], meta: { page: 1, limit: 10, total: 1, totalPages: 1 } },
    ]);

    await new ContentQueryBuilder(http, 'blog')
      .filter('data.category', 'tech')
      .fields('id', 'slug', 'data.title')
      .sortBy('publishedAt', 'desc')
      .populate('relations')
      .search('hello')
      .limit(10)
      .page(2)
      .execute();

    expect(http.get).toHaveBeenCalledWith(
      '/api/v1/public/contents/by-type/blog',
      {
        filter: { data: { category: 'tech' } },
        fields: ['id', 'slug', 'data.title'],
        sortBy: 'publishedAt',
        sortOrder: 'desc',
        populate: 'relations',
        search: 'hello',
        limit: 10,
        page: 2,
      },
    );
  });

  it('should use /contents when no typeSlug', async () => {
    const http = createMockHttp([
      { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
    ]);

    await new ContentQueryBuilder(http).execute();

    expect(http.get).toHaveBeenCalledWith('/api/v1/public/contents', {});
  });

  it('first() should return single item or null', async () => {
    const http = createMockHttp([
      { data: [{ id: '1', data: { title: 'Hello' } }], meta: { page: 1, limit: 1, total: 1, totalPages: 1 } },
    ]);

    const result = await new ContentQueryBuilder(http, 'blog').first();
    expect(result).toEqual({ id: '1', data: { title: 'Hello' } });
  });

  it('first() should return null when empty', async () => {
    const http = createMockHttp([
      { data: [], meta: { page: 1, limit: 1, total: 0, totalPages: 0 } },
    ]);

    const result = await new ContentQueryBuilder(http, 'blog').first();
    expect(result).toBeNull();
  });

  it('all() should auto-paginate across pages', async () => {
    const http = createMockHttp([
      { data: [{ id: '1' }, { id: '2' }], meta: { page: 1, limit: 2, total: 4, totalPages: 2 } },
      { data: [{ id: '3' }, { id: '4' }], meta: { page: 2, limit: 2, total: 4, totalPages: 2 } },
    ]);

    const result = await new ContentQueryBuilder(http).all();
    expect(result).toHaveLength(4);
    expect(http.get).toHaveBeenCalledTimes(2);
  });

  it('pages() should yield page arrays', async () => {
    const http = createMockHttp([
      { data: [{ id: '1' }], meta: { page: 1, limit: 1, total: 2, totalPages: 2 } },
      { data: [{ id: '2' }], meta: { page: 2, limit: 1, total: 2, totalPages: 2 } },
    ]);

    const pages: unknown[][] = [];
    for await (const page of new ContentQueryBuilder(http).pages()) {
      pages.push(page);
    }
    expect(pages).toHaveLength(2);
    expect(pages[0]).toEqual([{ id: '1' }]);
    expect(pages[1]).toEqual([{ id: '2' }]);
  });

  it('preview() should set preview param', async () => {
    const http = createMockHttp([
      { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
    ]);

    await new ContentQueryBuilder(http, 'blog').preview().execute();

    expect(http.get).toHaveBeenCalledWith(
      '/api/v1/public/contents/by-type/blog',
      expect.objectContaining({ preview: true }),
    );
  });
});
