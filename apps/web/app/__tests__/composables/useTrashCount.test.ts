import { describe, it, expect, vi } from 'vitest';
import { useTrashCount } from '~/composables/useTrashCount.js';

describe('useTrashCount', () => {
  // useTrashCount uses module-level singleton state.
  // Tests run sequentially within this file, so we work with the state as-is.

  it('starts with count 0 and not loaded', () => {
    const { count, loading } = useTrashCount();
    expect(count.value).toBe(0);
    expect(loading.value).toBe(false);
  });

  it('fetch loads trash count from API', async () => {
    const mockFetch = vi.mocked($fetch);
    mockFetch.mockResolvedValueOnce({
      success: true,
      data: { count: 7 },
    });

    const trash = useTrashCount();
    await trash.fetch();

    expect(trash.count.value).toBe(7);
  });

  it('fetch is idempotent when already loaded', async () => {
    const mockFetch = vi.mocked($fetch);
    // State is already loaded from previous test, so fetch should be a no-op
    const trash = useTrashCount();
    await trash.fetch();

    expect(mockFetch).not.toHaveBeenCalled();
    expect(trash.count.value).toBe(7); // still has value from previous test
  });

  it('invalidate re-fetches with new count', async () => {
    const mockFetch = vi.mocked($fetch);
    mockFetch.mockResolvedValueOnce({ success: true, data: { count: 3 } });

    const trash = useTrashCount();
    await trash.invalidate();

    expect(trash.count.value).toBe(3);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('handles API errors gracefully (count unchanged)', async () => {
    const mockFetch = vi.mocked($fetch);
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const trash = useTrashCount();
    await trash.invalidate();

    // Count stays at previous value (3), loading is false
    expect(trash.count.value).toBe(3);
    expect(trash.loading.value).toBe(false);
  });
});
