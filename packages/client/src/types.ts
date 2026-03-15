// ─── Client Options ────────────────────────────────────
export interface EliClientOptions {
  /** Base URL of the Eli CMS instance (e.g. "https://cms.example.com") */
  baseUrl: string;
  /** API key for authentication (X-API-Key header) */
  apiKey?: string;
  /** Bearer token for authentication */
  token?: string;
  /** Cache configuration. Set to false to disable caching. */
  cache?: CacheOptions | false;
  /** Custom fetch implementation (defaults to globalThis.fetch) */
  fetch?: typeof globalThis.fetch;
  /** Retry configuration */
  retry?: RetryOptions;
}

export interface CacheOptions {
  /** TTL in milliseconds (default: 60000) */
  ttl?: number;
}

export interface RetryOptions {
  /** Maximum number of retries (default: 3) */
  maxRetries?: number;
  /** Base delay in milliseconds for exponential backoff (default: 500) */
  baseDelay?: number;
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelay?: number;
}

// ─── Query Parameters ──────────────────────────────────
export interface ContentListParams {
  contentType?: string;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filter?: Record<string, unknown>;
  fields?: string[];
  populate?: 'relations';
  preview?: boolean;
}

export interface ContentTypeListParams {
  page?: number;
  limit?: number;
  search?: string;
  includeCounts?: boolean;
}

export interface ContentGetParams {
  fields?: string[];
  populate?: 'relations';
  preview?: boolean;
}

// ─── Content Filter ────────────────────────────────────
export interface ContentFilter {
  [key: string]: unknown;
}

// ─── Results ───────────────────────────────────────────
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * A content item with typed data payload.
 * T represents the shape of the `data` field.
 */
export interface TypedContent<T = Record<string, unknown>> {
  id: string;
  contentTypeId: string;
  slug: string | null;
  status: string;
  data: T;
  publishedAt: string | null;
  editedBy: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _relations?: Array<{
    id: string;
    relationType: string;
    target: TypedContent;
  }>;
}

export interface TypedContentType {
  id: string;
  slug: string;
  name: string;
  fields: Array<{
    name: string;
    type: string;
    required: boolean;
    label: string;
    options?: string[];
    multiple?: boolean;
    accept?: string[];
    subFields?: Array<Record<string, unknown>>;
    defaultValue?: unknown;
    group?: string;
    componentSlugs?: string[];
    validation?: Record<string, unknown>;
  }>;
  isSingleton: boolean;
  slugPattern: string | null;
  createdAt: string;
  updatedAt: string;
}
