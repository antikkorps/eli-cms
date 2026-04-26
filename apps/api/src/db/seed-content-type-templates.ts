import { eq } from 'drizzle-orm';
import type { FieldDefinition } from '@eli-cms/shared';

interface SystemTemplate {
  slug: string;
  name: string;
  description: string;
  icon: string;
  fields: FieldDefinition[];
}

const SYSTEM_TEMPLATES: SystemTemplate[] = [
  {
    slug: 'blog-post',
    name: 'Blog Post',
    description: 'Article with title, cover image, body, author, and tags. Ready for editorial workflow.',
    icon: 'i-lucide-newspaper',
    fields: [
      { name: 'title', type: 'text', required: true, label: 'Title', validation: { maxLength: 200 } },
      { name: 'excerpt', type: 'textarea', required: false, label: 'Excerpt', validation: { maxLength: 300 } },
      { name: 'cover', type: 'media', required: false, label: 'Cover Image', accept: ['image/*'] },
      { name: 'body', type: 'richtext', required: true, label: 'Body' },
      { name: 'author', type: 'author', required: false, label: 'Author' },
      {
        name: 'tags',
        type: 'repeatable',
        required: false,
        label: 'Tags',
        subFields: [{ name: 'tag', type: 'text', required: true, label: 'Tag' }],
      },
    ],
  },
  {
    slug: 'landing-page',
    name: 'Landing Page',
    description: 'Marketing page with hero, features list, and CTA — optimised for conversion.',
    icon: 'i-lucide-layout-template',
    fields: [
      { name: 'title', type: 'text', required: true, label: 'Title' },
      { name: 'hero_headline', type: 'text', required: true, label: 'Hero Headline', group: 'Hero' },
      { name: 'hero_subhead', type: 'textarea', required: false, label: 'Hero Subhead', group: 'Hero' },
      { name: 'hero_image', type: 'media', required: false, label: 'Hero Image', accept: ['image/*'], group: 'Hero' },
      { name: 'cta_label', type: 'text', required: false, label: 'CTA Label', group: 'Call to Action' },
      { name: 'cta_url', type: 'url', required: false, label: 'CTA URL', group: 'Call to Action' },
      {
        name: 'features',
        type: 'repeatable',
        required: false,
        label: 'Features',
        group: 'Features',
        subFields: [
          { name: 'icon', type: 'text', required: false, label: 'Icon (lucide name)' },
          { name: 'title', type: 'text', required: true, label: 'Title' },
          { name: 'description', type: 'textarea', required: false, label: 'Description' },
        ],
      },
    ],
  },
  {
    slug: 'product',
    name: 'Product',
    description: 'E-commerce product with pricing, gallery, stock, and description.',
    icon: 'i-lucide-package',
    fields: [
      { name: 'name', type: 'text', required: true, label: 'Name' },
      { name: 'sku', type: 'text', required: true, label: 'SKU', validation: { unique: true } },
      { name: 'price', type: 'number', required: true, label: 'Price' },
      { name: 'compare_at_price', type: 'number', required: false, label: 'Compare-at Price' },
      { name: 'in_stock', type: 'boolean', required: false, label: 'In Stock', defaultValue: true },
      { name: 'description', type: 'richtext', required: false, label: 'Description' },
      { name: 'gallery', type: 'media', required: false, label: 'Gallery', multiple: true, accept: ['image/*'] },
      {
        name: 'category',
        type: 'select',
        required: false,
        label: 'Category',
        options: ['Apparel', 'Accessories', 'Home', 'Books', 'Other'],
      },
    ],
  },
  {
    slug: 'faq',
    name: 'FAQ',
    description: 'Frequently asked questions grouped by topic.',
    icon: 'i-lucide-help-circle',
    fields: [
      { name: 'topic', type: 'text', required: true, label: 'Topic' },
      {
        name: 'questions',
        type: 'repeatable',
        required: true,
        label: 'Questions',
        subFields: [
          { name: 'question', type: 'text', required: true, label: 'Question' },
          { name: 'answer', type: 'richtext', required: true, label: 'Answer' },
        ],
      },
    ],
  },
  {
    slug: 'author-bio',
    name: 'Author Bio',
    description: 'Author profile page with photo, bio, and social links.',
    icon: 'i-lucide-user',
    fields: [
      { name: 'full_name', type: 'text', required: true, label: 'Full Name' },
      { name: 'photo', type: 'media', required: false, label: 'Photo', accept: ['image/*'] },
      { name: 'role', type: 'text', required: false, label: 'Role / Title' },
      { name: 'bio', type: 'richtext', required: false, label: 'Bio' },
      { name: 'email', type: 'email', required: false, label: 'Email' },
      { name: 'website', type: 'url', required: false, label: 'Website' },
      {
        name: 'social_links',
        type: 'repeatable',
        required: false,
        label: 'Social Links',
        subFields: [
          {
            name: 'platform',
            type: 'select',
            required: true,
            label: 'Platform',
            options: ['Twitter / X', 'LinkedIn', 'GitHub', 'Mastodon', 'Other'],
          },
          { name: 'url', type: 'url', required: true, label: 'URL' },
        ],
      },
    ],
  },
];

/**
 * Inserts/updates the system content-type templates. System templates are
 * always overwritten on seed so changes to defaults propagate. User templates
 * are untouched.
 */
export async function seedSystemContentTypeTemplates(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contentTypeTemplates: any,
): Promise<void> {
  for (const tpl of SYSTEM_TEMPLATES) {
    const existing = await db
      .select()
      .from(contentTypeTemplates)
      .where(eq(contentTypeTemplates.slug, tpl.slug))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(contentTypeTemplates).values({ ...tpl, isSystem: true });
      console.log(`Content type template created: ${tpl.name}`);
    } else if (existing[0].isSystem) {
      // Refresh system templates on each seed to stay in sync with code defaults
      await db
        .update(contentTypeTemplates)
        .set({ name: tpl.name, description: tpl.description, icon: tpl.icon, fields: tpl.fields })
        .where(eq(contentTypeTemplates.slug, tpl.slug));
      console.log(`Content type template updated: ${tpl.name}`);
    }
  }
}
