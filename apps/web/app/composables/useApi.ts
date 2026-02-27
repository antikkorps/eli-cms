type FetchMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';

interface ApiFetchOptions {
  method?: FetchMethod;
  headers?: Record<string, string>;
  body?: string | Record<string, unknown>;
}

export function useApi() {
  const config = useRuntimeConfig();
  const baseURL = config.public.apiBase as string;
  const tokenCookie = useCookie('eli_token', { maxAge: 60 * 15 });
  const refreshCookie = useCookie('eli_refresh_token', { maxAge: 60 * 60 * 24 * 7 });

  async function apiFetch<T = unknown>(
    path: string,
    options: ApiFetchOptions = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (tokenCookie.value) {
      headers['Authorization'] = `Bearer ${tokenCookie.value}`;
    }

    const fetchOptions = {
      method: options.method,
      headers,
      body: options.body,
    };

    try {
      return await $fetch<T>(`${baseURL}${path}`, fetchOptions);
    } catch (error: unknown) {
      const fetchError = error as { status?: number };

      if (fetchError.status === 401 && refreshCookie.value) {
        try {
          const refreshRes = await $fetch<{
            success: boolean;
            data: { accessToken: string; refreshToken: string };
          }>(`${baseURL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: { refreshToken: refreshCookie.value },
          });

          tokenCookie.value = refreshRes.data.accessToken;
          refreshCookie.value = refreshRes.data.refreshToken;

          headers['Authorization'] = `Bearer ${refreshRes.data.accessToken}`;
          return await $fetch<T>(`${baseURL}${path}`, { ...fetchOptions, headers });
        } catch {
          tokenCookie.value = null;
          refreshCookie.value = null;
          navigateTo('/login');
          throw error;
        }
      }
      throw error;
    }
  }

  async function uploadFile<T = unknown>(path: string, file: File): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (tokenCookie.value) {
      headers['Authorization'] = `Bearer ${tokenCookie.value}`;
    }

    return await $fetch<T>(`${baseURL}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });
  }

  return { apiFetch, uploadFile, baseURL };
}
