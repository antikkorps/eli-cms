// ─── Main client ───────────────────────────────────────
export { EliClient } from './client.js';

// ─── Error ─────────────────────────────────────────────
export { EliError } from './error.js';

// ─── Query Builder ─────────────────────────────────────
export { ContentQueryBuilder } from './query-builder.js';

// ─── Types ─────────────────────────────────────────────
export type {
  EliClientOptions,
  CacheOptions,
  RetryOptions,
  ContentListParams,
  ContentTypeListParams,
  ContentGetParams,
  ContentFilter,
  PaginatedResult,
  TypedContent,
  TypedContentType,
} from './types.js';
