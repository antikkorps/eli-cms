import type { HttpTransport } from './http.js';
import type { PaginatedResult, TypedContent } from './types.js';

export class ContentQueryBuilder<T = Record<string, unknown>> {
  private readonly http: HttpTransport;
  private readonly typeSlug?: string;
  private params: Record<string, unknown> = {};
  private filters: Record<string, unknown> = {};

  constructor(http: HttpTransport, typeSlug?: string) {
    this.http = http;
    this.typeSlug = typeSlug;
  }

  /**
   * Add a filter. Supports dot-notation keys:
   * - `data.category` → `filter.data.category`
   * - `publishedAt.gte` → `filter.publishedAt = { gte: value }`
   */
  filter(key: string, value: unknown): this {
    this.setNestedFilter(this.filters, key, value);
    return this;
  }

  /** Select specific fields to return */
  fields(...fieldNames: string[]): this {
    this.params.fields = fieldNames;
    return this;
  }

  /** Sort results */
  sortBy(field: string, order: 'asc' | 'desc' = 'asc'): this {
    this.params.sortBy = field;
    this.params.sortOrder = order;
    return this;
  }

  /** Populate relations */
  populate(value: 'relations'): this {
    this.params.populate = value;
    return this;
  }

  /** Enable preview mode (requires auth) */
  preview(): this {
    this.params.preview = true;
    return this;
  }

  /** Full-text search */
  search(term: string): this {
    this.params.search = term;
    return this;
  }

  /** Set page size */
  limit(n: number): this {
    this.params.limit = n;
    return this;
  }

  /** Set page number */
  page(n: number): this {
    this.params.page = n;
    return this;
  }

  /** Execute the query and return a paginated result */
  async execute(): Promise<PaginatedResult<TypedContent<T>>> {
    const queryParams = this.buildParams();

    const path = this.typeSlug
      ? `/api/v1/public/contents/by-type/${encodeURIComponent(this.typeSlug)}`
      : '/api/v1/public/contents';

    const response = await this.http.get<TypedContent<T>[]>(path, queryParams);
    return {
      data: response.data ?? [],
      meta: response.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  }

  /** Execute and return the first result or null */
  async first(): Promise<TypedContent<T> | null> {
    this.params.limit = 1;
    const result = await this.execute();
    return result.data[0] ?? null;
  }

  /** Auto-paginate and return all results across all pages */
  async all(): Promise<TypedContent<T>[]> {
    const items: TypedContent<T>[] = [];
    for await (const page of this.pages()) {
      items.push(...page);
    }
    return items;
  }

  /** Async generator that yields page arrays */
  async *pages(): AsyncGenerator<TypedContent<T>[]> {
    let currentPage = (this.params.page as number) ?? 1;

    while (true) {
      this.params.page = currentPage;
      const result = await this.execute();
      if (result.data.length === 0) break;

      yield result.data;

      if (currentPage >= result.meta.totalPages) break;
      currentPage++;
    }
  }

  private buildParams(): Record<string, unknown> {
    const result: Record<string, unknown> = { ...this.params };
    if (Object.keys(this.filters).length > 0) {
      result.filter = this.filters;
    }
    return result;
  }

  /**
   * Parse dot-notation key and set value in nested object.
   * Examples:
   * - "data.category" → { data: { category: value } }
   * - "publishedAt.gte" → { publishedAt: { gte: value } }
   */
  private isSafeKey(part: string): boolean {
    return part !== '__proto__' && part !== 'constructor' && part !== 'prototype';
  }

  private setNestedFilter(obj: Record<string, unknown>, key: string, value: unknown): void {
    const parts = key.split('.');

    // Prevent prototype pollution via crafted keys
    for (const part of parts) {
      if (!this.isSafeKey(part)) return;
    }

    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || typeof current[part] !== 'object' || current[part] === null) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }
}
