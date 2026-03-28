import type { FieldDefinition } from '../types/index.js';

/** Reserved field name prefix for SEO fields — user fields cannot start with this. */
export const SEO_FIELD_PREFIX = '_seo';

/** SEO field names injected into every content type. */
export const SEO_FIELD_NAMES = ['_seoTitle', '_seoDescription', '_seoOgImage'] as const;

/** SEO field group name used for tab rendering in DynamicContentForm. */
export const SEO_GROUP = 'SEO';

/**
 * Returns the SEO field definitions injected into every content type at read-time.
 * These fields are optional, stored in the content `data` JSONB alongside user fields.
 */
export function getSeoFields(): FieldDefinition[] {
  return [
    {
      name: '_seoTitle',
      type: 'text',
      required: false,
      label: 'seo.metaTitle',
      group: SEO_GROUP,
      validation: { maxLength: 70 },
    },
    {
      name: '_seoDescription',
      type: 'textarea',
      required: false,
      label: 'seo.metaDescription',
      group: SEO_GROUP,
      validation: { maxLength: 160 },
    },
    {
      name: '_seoOgImage',
      type: 'media',
      required: false,
      label: 'seo.ogImage',
      multiple: false,
      accept: ['image/*'],
      group: SEO_GROUP,
    },
  ];
}
