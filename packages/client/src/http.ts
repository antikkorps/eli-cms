import { MemoryCache } from './cache.js';
import { EliError } from './error.js';
import type { EliClientOptions, RetryOptions } from './types.js';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const DEFAULT_RETRY: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 500,
  maxDelay: 10_000,
};

export class HttpTransport {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly fetchFn: typeof globalThis.fetch;
  private readonly cache: MemoryCache | null;
  private readonly retry: Required<RetryOptions>;

  constructor(options: EliClientOptions) {
    // Strip trailing slash
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');

    this.headers = {
      Accept: 'application/json',
    };
    if (options.apiKey) {
      this.headers['X-API-Key'] = options.apiKey;
    } else if (options.token) {
      this.headers['Authorization'] = `Bearer ${options.token}`;
    }

    this.fetchFn = options.fetch ?? globalThis.fetch;

    if (options.cache === false) {
      this.cache = null;
    } else {
      const ttl = options.cache?.ttl ?? 60_000;
      this.cache = new MemoryCache(ttl);
    }

    this.retry = { ...DEFAULT_RETRY, ...options.retry };
  }

  async get<T>(path: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
    const url = this.buildUrl(path, params);
    const cacheKey = url;

    if (this.cache) {
      const cached = this.cache.get<ApiResponse<T>>(cacheKey);
      if (cached) return cached;
    }

    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      throw await EliError.fromResponse(response);
    }

    const body = (await response.json()) as ApiResponse<T>;

    if (this.cache) {
      this.cache.set(cacheKey, body);
    }

    return body;
  }

  buildUrl(path: string, params?: Record<string, unknown>): string {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    if (!params || Object.keys(params).length === 0) return url;

    const serialized = this.serializeParams(params);
    const qs = serialized.toString();
    return qs ? `${url}?${qs}` : url;
  }

  serializeParams(
    obj: Record<string, unknown>,
    prefix?: string,
  ): URLSearchParams {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined || value === null) continue;

      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (Array.isArray(value)) {
        // Arrays: comma-separated (e.g. fields=id,slug,data.title)
        if (value.length > 0) {
          params.append(fullKey, value.map(String).join(','));
        }
      } else if (typeof value === 'object') {
        // Nested objects: recurse with dot-notation prefix
        const nested = this.serializeParams(value as Record<string, unknown>, fullKey);
        for (const [k, v] of nested.entries()) {
          params.append(k, v);
        }
      } else {
        params.append(fullKey, String(value));
      }
    }

    return params;
  }

  private async fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.retry.maxRetries; attempt++) {
      try {
        const response = await this.fetchFn(url, init);

        // Only retry on 5xx errors
        if (response.status >= 500 && attempt < this.retry.maxRetries) {
          lastError = await EliError.fromResponse(response);
          await this.delay(attempt);
          continue;
        }

        return response;
      } catch (error) {
        // Retry on network errors (TypeError from fetch)
        if (error instanceof TypeError && attempt < this.retry.maxRetries) {
          lastError = error;
          await this.delay(attempt);
          continue;
        }
        throw error;
      }
    }

    throw lastError ?? new EliError(500, 'Max retries exceeded');
  }

  private delay(attempt: number): Promise<void> {
    const exponential = this.retry.baseDelay * Math.pow(2, attempt);
    const capped = Math.min(exponential, this.retry.maxDelay);
    // Add jitter: 0.5x to 1.5x
    const jitter = capped * (0.5 + Math.random());
    return new Promise((resolve) => setTimeout(resolve, jitter));
  }

  clearCache(): void {
    this.cache?.clear();
  }
}
