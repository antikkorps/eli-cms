/**
 * Transforms flat dot-notation query params into nested filter object.
 *
 * Input  (ctx.query):
 *   { "filter.data.category": "news", "filter.createdAt.gte": "2024-01-01T00:00:00Z", page: "1" }
 *
 * Output:
 *   { filter: { data: { category: "news" }, createdAt: { gte: "2024-01-01T00:00:00Z" } }, page: "1" }
 */
export function parsePublicQuery(raw: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (!key.startsWith('filter.')) {
      result[key] = value;
      continue;
    }

    const parts = key.slice('filter.'.length).split('.');
    if (parts.length === 0 || parts.length > 3) continue;

    if (!result.filter) result.filter = {};
    const filter = result.filter as Record<string, unknown>;

    if (parts.length === 1) {
      // filter.slug=my-article  →  { slug: "my-article" }
      filter[parts[0]] = value;
    } else if (parts.length === 2) {
      // filter.createdAt.gte=...  →  { createdAt: { gte: ... } }
      // filter.data.category=news →  { data: { category: "news" } }
      if (!filter[parts[0]]) filter[parts[0]] = {};
      (filter[parts[0]] as Record<string, unknown>)[parts[1]] = value;
    } else if (parts.length === 3) {
      // filter.data.title.like=hello  →  { data: { title: { like: "hello" } } }
      if (!filter[parts[0]]) filter[parts[0]] = {};
      const level1 = filter[parts[0]] as Record<string, unknown>;
      if (!level1[parts[1]]) level1[parts[1]] = {};
      (level1[parts[1]] as Record<string, unknown>)[parts[2]] = value;
    }
  }

  return result;
}
