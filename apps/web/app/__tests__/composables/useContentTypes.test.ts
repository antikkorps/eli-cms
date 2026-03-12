import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useContentTypes } from '~/composables/useContentTypes.js';

describe('useContentTypes', () => {
  beforeEach(() => {
    // Reset singleton state
    const ct = useContentTypes();
    ct.invalidate();
    // @ts-expect-error -- reset internal state
    ct.items.value = [];
  });

  it('starts with empty items after reset', () => {
    const { items, loaded } = useContentTypes();
    expect(items.value).toEqual([]);
    expect(loaded.value).toBe(false);
  });

  it('fetch loads content types from API', async () => {
    const mockFetch = vi.mocked($fetch);
    mockFetch.mockResolvedValueOnce({
      success: true,
      data: [
        { id: '1', name: 'Blog Post', slug: 'blog-post', contentCount: 5 },
        { id: '2', name: 'Page', slug: 'page', isSingleton: true, contentCount: 1 },
      ],
    });

    const ct = useContentTypes();
    await ct.fetch();

    expect(ct.items.value).toHaveLength(2);
    expect(ct.items.value[0].slug).toBe('blog-post');
    expect(ct.loaded.value).toBe(true);
  });

  it('fetch is idempotent (only loads once)', async () => {
    const mockFetch = vi.mocked($fetch);
    mockFetch.mockResolvedValue({ success: true, data: [] });

    const ct = useContentTypes();
    await ct.fetch();
    await ct.fetch();

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('invalidate allows re-fetch', async () => {
    const mockFetch = vi.mocked($fetch);
    mockFetch.mockResolvedValue({ success: true, data: [] });

    const ct = useContentTypes();
    await ct.fetch();
    expect(ct.loaded.value).toBe(true);

    ct.invalidate();
    expect(ct.loaded.value).toBe(false);
  });

  it('fetch handles API errors gracefully', async () => {
    const mockFetch = vi.mocked($fetch);
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const ct = useContentTypes();
    await ct.fetch();

    expect(ct.items.value).toEqual([]);
    expect(ct.loading.value).toBe(false);
  });
});
