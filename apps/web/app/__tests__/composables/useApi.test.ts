import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useApi } from '~/composables/useApi.js';

describe('useApi', () => {
  let mockFetch: ReturnType<typeof vi.mocked<typeof $fetch>>;

  beforeEach(() => {
    mockFetch = vi.mocked($fetch);
  });

  it('apiFetch sends GET request to correct URL', async () => {
    mockFetch.mockResolvedValueOnce({ success: true, data: [] });

    const { apiFetch } = useApi();
    await apiFetch('/contents');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/contents',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('apiFetch includes Authorization header when token is set', async () => {
    // Set the token cookie
    const cookie = useCookie('eli_access');
    cookie.value = 'my-jwt-token';

    mockFetch.mockResolvedValueOnce({ success: true, data: {} });

    const { apiFetch } = useApi();
    await apiFetch('/contents');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-jwt-token',
        }),
      }),
    );
  });

  it('apiFetch sends POST with body', async () => {
    mockFetch.mockResolvedValueOnce({ success: true, data: { id: '1' } });

    const { apiFetch } = useApi();
    await apiFetch('/contents', {
      method: 'POST',
      body: { title: 'Test' },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/contents'),
      expect.objectContaining({
        method: 'POST',
        body: { title: 'Test' },
      }),
    );
  });

  it('apiFetch does not set Content-Type for FormData', async () => {
    mockFetch.mockResolvedValueOnce({ success: true });

    const formData = new FormData();
    const { apiFetch } = useApi();
    await apiFetch('/uploads', { method: 'POST', body: formData });

    const callHeaders = mockFetch.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(callHeaders['Content-Type']).toBeUndefined();
  });

  it('apiFetch retries with refresh token on 401', async () => {
    const cookie = useCookie('eli_access');
    const refreshCookie = useCookie('eli_refresh');
    cookie.value = 'expired-token';
    refreshCookie.value = 'valid-refresh';

    // First call: 401 error
    mockFetch.mockRejectedValueOnce({ status: 401 });
    // Refresh call: success
    mockFetch.mockResolvedValueOnce({
      success: true,
      data: { accessToken: 'new-access', refreshToken: 'new-refresh' },
    });
    // Retry call: success
    mockFetch.mockResolvedValueOnce({ success: true, data: { id: '1' } });

    const { apiFetch } = useApi();
    const result = await apiFetch<{ success: boolean; data: { id: string } }>('/contents');

    expect(result.data.id).toBe('1');
    expect(cookie.value).toBe('new-access');
    expect(refreshCookie.value).toBe('new-refresh');
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('apiFetch clears tokens and navigates to login when refresh fails', async () => {
    const cookie = useCookie('eli_access');
    const refreshCookie = useCookie('eli_refresh');
    cookie.value = 'expired-token';
    refreshCookie.value = 'bad-refresh';

    // First call: 401
    mockFetch.mockRejectedValueOnce({ status: 401 });
    // Refresh call: also fails
    mockFetch.mockRejectedValueOnce(new Error('refresh failed'));

    const { apiFetch } = useApi();
    await expect(apiFetch('/contents')).rejects.toEqual({ status: 401 });

    expect(cookie.value).toBeNull();
    expect(refreshCookie.value).toBeNull();
  });

  it('apiFetch throws non-401 errors directly', async () => {
    mockFetch.mockRejectedValueOnce({ status: 500, message: 'Server Error' });

    const { apiFetch } = useApi();
    await expect(apiFetch('/contents')).rejects.toEqual({
      status: 500,
      message: 'Server Error',
    });
  });

  it('uploadFile sends FormData with file', async () => {
    mockFetch.mockResolvedValueOnce({ success: true, data: { id: 'upload-1' } });

    const file = new File(['hello'], 'test.txt', { type: 'text/plain' });
    const { uploadFile } = useApi();
    await uploadFile('/uploads', file);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/uploads'),
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      }),
    );
  });

  it('exposes baseURL', () => {
    const { baseURL } = useApi();
    expect(baseURL).toBe('http://localhost:8080/api/v1');
  });
});
