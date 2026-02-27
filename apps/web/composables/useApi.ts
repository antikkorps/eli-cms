export function useApi() {
  const baseURL = 'http://localhost:8080/api/v1';

  async function apiFetch<T = unknown>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = useCookie('eli_token').value;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await $fetch<T>(`${baseURL}${path}`, {
      ...options,
      headers,
    });

    return response;
  }

  return { apiFetch };
}
