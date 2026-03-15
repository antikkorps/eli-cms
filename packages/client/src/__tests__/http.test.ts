import { describe, it, expect, vi } from 'vitest';
import { HttpTransport } from '../http.js';

function mockFetch(body: unknown, status = 200): typeof globalThis.fetch {
  return vi.fn().mockImplementation(() =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );
}

describe('HttpTransport', () => {
  describe('buildUrl', () => {
    it('should join baseUrl and path', () => {
      const http = new HttpTransport({
        baseUrl: 'https://cms.example.com',
        fetch: mockFetch({}),
        cache: false,
      });
      expect(http.buildUrl('/api/v1/public/contents')).toBe(
        'https://cms.example.com/api/v1/public/contents',
      );
    });

    it('should strip trailing slash from baseUrl', () => {
      const http = new HttpTransport({
        baseUrl: 'https://cms.example.com/',
        fetch: mockFetch({}),
        cache: false,
      });
      expect(http.buildUrl('/api/test')).toBe('https://cms.example.com/api/test');
    });

    it('should serialize simple params', () => {
      const http = new HttpTransport({
        baseUrl: 'https://cms.example.com',
        fetch: mockFetch({}),
        cache: false,
      });
      const url = http.buildUrl('/api/test', { page: 1, limit: 10 });
      expect(url).toContain('page=1');
      expect(url).toContain('limit=10');
    });

    it('should serialize nested params with dot-notation', () => {
      const http = new HttpTransport({
        baseUrl: 'https://cms.example.com',
        fetch: mockFetch({}),
        cache: false,
      });
      const url = http.buildUrl('/api/test', {
        filter: { data: { category: 'tech' } },
      });
      expect(url).toContain('filter.data.category=tech');
    });

    it('should serialize array params', () => {
      const http = new HttpTransport({
        baseUrl: 'https://cms.example.com',
        fetch: mockFetch({}),
        cache: false,
      });
      const url = http.buildUrl('/api/test', {
        fields: ['id', 'slug', 'data.title'],
      });
      expect(url).toContain('fields=id');
      expect(url).toContain('fields=slug');
      expect(url).toContain('fields=data.title');
    });

    it('should skip null and undefined values', () => {
      const http = new HttpTransport({
        baseUrl: 'https://cms.example.com',
        fetch: mockFetch({}),
        cache: false,
      });
      const url = http.buildUrl('/api/test', { page: 1, search: undefined, x: null });
      expect(url).toContain('page=1');
      expect(url).not.toContain('search');
      expect(url).not.toContain('x=');
    });
  });

  describe('get', () => {
    it('should make a GET request and return parsed body', async () => {
      const body = { success: true, data: [{ id: '1' }], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } };
      const fetchFn = mockFetch(body);
      const http = new HttpTransport({
        baseUrl: 'https://cms.example.com',
        fetch: fetchFn,
        cache: false,
      });

      const result = await http.get('/api/v1/public/contents');
      expect(result).toEqual(body);
      expect(fetchFn).toHaveBeenCalledOnce();
    });

    it('should send X-API-Key header', async () => {
      const fetchFn = mockFetch({ success: true });
      const http = new HttpTransport({
        baseUrl: 'https://cms.example.com',
        apiKey: 'ek_test_123',
        fetch: fetchFn,
        cache: false,
      });

      await http.get('/test');
      const call = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[1].headers['X-API-Key']).toBe('ek_test_123');
    });

    it('should send Bearer token header', async () => {
      const fetchFn = mockFetch({ success: true });
      const http = new HttpTransport({
        baseUrl: 'https://cms.example.com',
        token: 'jwt_token_here',
        fetch: fetchFn,
        cache: false,
      });

      await http.get('/test');
      const call = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[1].headers['Authorization']).toBe('Bearer jwt_token_here');
    });

    it('should throw EliError on 4xx', async () => {
      const http = new HttpTransport({
        baseUrl: 'https://cms.example.com',
        fetch: mockFetch({ success: false, error: 'Not found' }, 404),
        cache: false,
      });

      await expect(http.get('/test')).rejects.toThrow('Not found');
    });

    it('should cache responses', async () => {
      const body = { success: true, data: 'cached' };
      const fetchFn = mockFetch(body);
      const http = new HttpTransport({
        baseUrl: 'https://cms.example.com',
        fetch: fetchFn,
        cache: { ttl: 60_000 },
      });

      const r1 = await http.get('/test');
      const r2 = await http.get('/test');
      expect(r1).toEqual(r2);
      expect(fetchFn).toHaveBeenCalledOnce();
    });

    it('should not cache when cache is disabled', async () => {
      const fetchFn = mockFetch({ success: true });
      const http = new HttpTransport({
        baseUrl: 'https://cms.example.com',
        fetch: fetchFn,
        cache: false,
      });

      await http.get('/test');
      await http.get('/test');
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('retry', () => {
    it('should retry on 5xx errors', async () => {
      let attempt = 0;
      const fetchFn = vi.fn().mockImplementation(() => {
        attempt++;
        if (attempt < 3) {
          return Promise.resolve(
            new Response(JSON.stringify({ error: 'Server error' }), { status: 500 }),
          );
        }
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: 'ok' }), { status: 200 }),
        );
      });

      const http = new HttpTransport({
        baseUrl: 'https://cms.example.com',
        fetch: fetchFn,
        cache: false,
        retry: { maxRetries: 3, baseDelay: 1, maxDelay: 10 },
      });

      const result = await http.get('/test');
      expect(result.data).toBe('ok');
      expect(fetchFn).toHaveBeenCalledTimes(3);
    });

    it('should retry on network errors (TypeError)', async () => {
      let attempt = 0;
      const fetchFn = vi.fn().mockImplementation(() => {
        attempt++;
        if (attempt < 2) {
          return Promise.reject(new TypeError('fetch failed'));
        }
        return Promise.resolve(
          new Response(JSON.stringify({ success: true }), { status: 200 }),
        );
      });

      const http = new HttpTransport({
        baseUrl: 'https://cms.example.com',
        fetch: fetchFn,
        cache: false,
        retry: { maxRetries: 3, baseDelay: 1, maxDelay: 10 },
      });

      const result = await http.get('/test');
      expect(result.success).toBe(true);
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 4xx errors', async () => {
      const fetchFn = mockFetch({ error: 'Bad request' }, 400);
      const http = new HttpTransport({
        baseUrl: 'https://cms.example.com',
        fetch: fetchFn,
        cache: false,
        retry: { maxRetries: 3, baseDelay: 1, maxDelay: 10 },
      });

      await expect(http.get('/test')).rejects.toThrow();
      expect(fetchFn).toHaveBeenCalledOnce();
    });
  });
});
