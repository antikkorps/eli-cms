import { buildContentDataSchema } from '@eli-cms/shared';
import type { FieldDefinition } from '@eli-cms/shared';

export function useContentValidation() {
  const errors = ref<Record<string, string>>({});

  function validate(
    fields: FieldDefinition[],
    data: Record<string, unknown>,
  ): { valid: boolean; errors: Record<string, string> } {
    const schema = buildContentDataSchema(fields);
    const result = schema.safeParse(data);

    if (result.success) {
      errors.value = {};
      return { valid: true, errors: {} };
    }

    const map: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.');
      if (!map[key]) {
        map[key] = issue.message;
      }
    }
    errors.value = map;
    return { valid: false, errors: map };
  }

  function clearError(key: string) {
    const { [key]: _, ...rest } = errors.value;
    errors.value = rest;
  }

  function clearErrors() {
    errors.value = {};
  }

  return { errors, validate, clearError, clearErrors };
}
