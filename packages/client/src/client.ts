import { HttpTransport } from './http.js';
import { ContentTypesResource } from './resources/content-types.js';
import { ContentsResource } from './resources/contents.js';
import type { EliClientOptions } from './types.js';

export class EliClient {
  readonly contentTypes: ContentTypesResource;
  readonly contents: ContentsResource;
  private readonly http: HttpTransport;

  constructor(options: EliClientOptions) {
    this.http = new HttpTransport(options);
    this.contentTypes = new ContentTypesResource(this.http);
    this.contents = new ContentsResource(this.http);
  }

  /** Clear the in-memory cache */
  clearCache(): void {
    this.http.clearCache();
  }
}
