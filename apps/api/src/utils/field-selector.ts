const TOP_LEVEL_WHITELIST = new Set([
  'id', 'slug', 'status', 'contentTypeId', 'data',
  'publishedAt', 'createdAt', 'updatedAt',
]);

/**
 * Prune a content object to only include requested fields.
 * `id` is always included. `data.fieldName` selects specific keys from the data JSONB.
 *
 * @param item - Raw content record
 * @param fieldsParam - Comma-separated field list, e.g. "id,slug,data.title,createdAt"
 */
export function selectFields<T extends Record<string, unknown>>(item: T, fieldsParam: string): Partial<T> {
  const fields = fieldsParam.split(',').map(f => f.trim()).filter(Boolean);
  if (fields.length === 0) return item;

  const topFields = new Set<string>(['id']); // id always included
  const dataFields: string[] = [];

  for (const field of fields) {
    if (field.startsWith('data.')) {
      const sub = field.slice('data.'.length);
      if (sub) dataFields.push(sub);
    } else if (TOP_LEVEL_WHITELIST.has(field)) {
      topFields.add(field);
    }
  }

  // If any data.x field requested, include data in top-level selection
  if (dataFields.length > 0) topFields.add('data');

  const result: Record<string, unknown> = {};
  for (const key of topFields) {
    if (key in item) result[key] = item[key];
  }

  // Prune data to only requested sub-fields
  if (dataFields.length > 0 && result.data && typeof result.data === 'object') {
    const fullData = result.data as Record<string, unknown>;
    const prunedData: Record<string, unknown> = {};
    for (const df of dataFields) {
      if (df in fullData) prunedData[df] = fullData[df];
    }
    result.data = prunedData;
  }

  return result as Partial<T>;
}

/**
 * Apply field selection to an array of content items.
 */
export function selectFieldsMany<T extends Record<string, unknown>>(items: T[], fieldsParam: string): Partial<T>[] {
  return items.map(item => selectFields(item, fieldsParam));
}
