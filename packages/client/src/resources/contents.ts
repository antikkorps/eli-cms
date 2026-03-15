import type { HttpTransport } from '../http.js';
import { ContentQueryBuilder } from '../query-builder.js';
import type {
  ContentGetParams,
  ContentListParams,
  PaginatedResult,
  TypedContent,
} from '../types.js';

export class ContentsResource {
  constructor(private readonly http: HttpTransport) {}

  async list<T = Record<string, unknown>>(
    params?: ContentListParams,
  ): Promise<PaginatedResult<TypedContent<T>>> {
    const { contentType, ...rest } = params ?? {};
    const queryParams = this.buildQueryParams(rest);

    const path = contentType
      ? `/api/v1/public/contents/by-type/${encodeURIComponent(contentType)}`
      : '/api/v1/public/contents';

    const response = await this.http.get<TypedContent<T>[]>(path, queryParams);
    return {
      data: response.data ?? [],
      meta: response.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  }

  async get<T = Record<string, unknown>>(
    id: string,
    params?: ContentGetParams,
  ): Promise<TypedContent<T>> {
    const queryParams = params ? this.buildQueryParams(params) : undefined;
    const response = await this.http.get<TypedContent<T>>(
      `/api/v1/public/contents/${encodeURIComponent(id)}`,
      queryParams,
    );
    if (!response.data) {
      throw new Error(`Content "${id}" not found`);
    }
    return response.data;
  }

  async getBySlug<T = Record<string, unknown>>(
    typeSlug: string,
    contentSlug: string,
    params?: ContentGetParams,
  ): Promise<TypedContent<T>> {
    const queryParams = params ? this.buildQueryParams(params) : undefined;
    const response = await this.http.get<TypedContent<T>>(
      `/api/v1/public/content-types/${encodeURIComponent(typeSlug)}/contents/${encodeURIComponent(contentSlug)}`,
      queryParams,
    );
    if (!response.data) {
      throw new Error(`Content "${contentSlug}" not found in type "${typeSlug}"`);
    }
    return response.data;
  }

  query<T = Record<string, unknown>>(typeSlug?: string): ContentQueryBuilder<T> {
    return new ContentQueryBuilder<T>(this.http, typeSlug);
  }

  private buildQueryParams(
    params: Omit<ContentListParams, 'contentType'> | ContentGetParams,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    if ('page' in params && params.page !== undefined) result.page = params.page;
    if ('limit' in params && params.limit !== undefined) result.limit = params.limit;
    if ('search' in params && params.search !== undefined) result.search = params.search;
    if ('sortBy' in params && params.sortBy !== undefined) result.sortBy = params.sortBy;
    if ('sortOrder' in params && params.sortOrder !== undefined) result.sortOrder = params.sortOrder;
    if (params.fields !== undefined) result.fields = params.fields;
    if (params.populate !== undefined) result.populate = params.populate;
    if (params.preview !== undefined) result.preview = params.preview;
    if ('filter' in params && params.filter !== undefined) {
      result.filter = params.filter;
    }

    return result;
  }
}
