import type { HttpTransport } from '../http.js';
import type { ContentTypeListParams, PaginatedResult, TypedContentType } from '../types.js';

export class ContentTypesResource {
  constructor(private readonly http: HttpTransport) {}

  async list(params?: ContentTypeListParams): Promise<PaginatedResult<TypedContentType>> {
    const response = await this.http.get<TypedContentType[]>(
      '/api/v1/public/content-types',
      params as Record<string, unknown>,
    );
    return {
      data: response.data ?? [],
      meta: response.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  }

  async get(slug: string): Promise<TypedContentType> {
    const response = await this.http.get<TypedContentType>(`/api/v1/public/content-types/${encodeURIComponent(slug)}`);
    if (!response.data) {
      throw new Error(`Content type "${slug}" not found`);
    }
    return response.data;
  }
}
