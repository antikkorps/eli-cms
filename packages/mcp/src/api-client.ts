/**
 * Lightweight HTTP client for authenticated Eli CMS API calls.
 * Uses native fetch — no external deps.
 */
export class ApiClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
  }

  async get<T = unknown>(path: string, params?: Record<string, unknown>): Promise<T> {
    const url = this.buildUrl(path, params);
    const res = await fetch(url, {
      method: 'GET',
      headers: this.headers(),
    });
    return this.handleResponse<T>(res);
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...this.headers(), 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(res);
  }

  private headers(): Record<string, string> {
    return {
      Accept: 'application/json',
      'X-API-Key': this.apiKey,
    };
  }

  private buildUrl(path: string, params?: Record<string, unknown>): string {
    const url = `${this.baseUrl}${path}`;
    if (!params || Object.keys(params).length === 0) return url;

    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        qs.append(key, String(value));
      }
    }
    const str = qs.toString();
    return str ? `${url}?${str}` : url;
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    const body = await res.json();
    if (!res.ok || body.success === false) {
      const message = body.error || res.statusText || 'API request failed';
      throw new Error(`[${res.status}] ${message}`);
    }
    return body as T;
  }
}
