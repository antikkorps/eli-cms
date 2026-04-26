import type { FieldDefinition, I18nConfig, ComponentFieldsMap } from '@eli-cms/shared';

/**
 * Heuristic: a value is already locale-keyed if it's a plain object (not array,
 * not Date, not null) — for localizable scalar/media fields, the legacy form
 * is always a primitive or array, so this disambiguates safely.
 */
function isLocaleKeyed(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

/**
 * Walks the field tree and ensures every `localizable: true` field carries a
 * locale-keyed object. Legacy primitive/array values are auto-wrapped under
 * the default locale; unknown locales already in the value are preserved.
 *
 * Mutates a shallow copy and returns it. Repeatable and component fields are
 * never wrapped at the top level — recursion handles their inner localizable
 * sub-fields.
 */
export function localizeData(
  fields: FieldDefinition[],
  data: Record<string, unknown> | null | undefined,
  i18n: I18nConfig,
  componentMap?: ComponentFieldsMap,
): Record<string, unknown> {
  if (!data || typeof data !== 'object') return {};
  const out: Record<string, unknown> = { ...data };

  for (const field of fields) {
    const value = out[field.name];

    if (field.type === 'repeatable' && field.subFields) {
      if (Array.isArray(value)) {
        out[field.name] = value.map((item) =>
          localizeData(field.subFields!, item as Record<string, unknown>, i18n, componentMap),
        );
      }
      continue;
    }

    if (field.type === 'component' && componentMap) {
      if (Array.isArray(value)) {
        out[field.name] = value.map((block) => {
          const b = block as Record<string, unknown>;
          const compFields = componentMap.get(b._component as string);
          if (!compFields) return b;
          return { ...localizeData(compFields, b, i18n, componentMap), _component: b._component };
        });
      }
      continue;
    }

    if (field.localizable !== true) continue;
    if (value === undefined) continue;

    if (isLocaleKeyed(value)) {
      // Already wrapped — leave as-is. Default-locale presence is enforced by Zod.
      continue;
    }

    // Legacy primitive/array → wrap under default locale.
    if (value === null) {
      out[field.name] = {};
    } else {
      out[field.name] = { [i18n.defaultLocale]: value };
    }
  }

  return out;
}

/**
 * Flattens localizable fields to the requested locale (with fallback to default).
 * Used by the public API so consumers receive plain values.
 */
export function flattenLocalizedData(
  fields: FieldDefinition[],
  data: Record<string, unknown> | null | undefined,
  i18n: I18nConfig,
  locale: string,
  componentMap?: ComponentFieldsMap,
): Record<string, unknown> {
  if (!data || typeof data !== 'object') return {};
  const out: Record<string, unknown> = { ...data };

  for (const field of fields) {
    const value = out[field.name];

    if (field.type === 'repeatable' && field.subFields) {
      if (Array.isArray(value)) {
        out[field.name] = value.map((item) =>
          flattenLocalizedData(field.subFields!, item as Record<string, unknown>, i18n, locale, componentMap),
        );
      }
      continue;
    }

    if (field.type === 'component' && componentMap) {
      if (Array.isArray(value)) {
        out[field.name] = value.map((block) => {
          const b = block as Record<string, unknown>;
          const compFields = componentMap.get(b._component as string);
          if (!compFields) return b;
          return {
            ...flattenLocalizedData(compFields, b, i18n, locale, componentMap),
            _component: b._component,
          };
        });
      }
      continue;
    }

    if (field.localizable !== true) continue;
    if (!isLocaleKeyed(value)) continue;

    const wrapped = value as Record<string, unknown>;
    if (wrapped[locale] !== undefined) {
      out[field.name] = wrapped[locale];
    } else if (wrapped[i18n.defaultLocale] !== undefined) {
      out[field.name] = wrapped[i18n.defaultLocale];
    } else {
      out[field.name] = null;
    }
  }

  return out;
}
