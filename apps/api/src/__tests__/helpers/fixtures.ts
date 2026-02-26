import type { FieldDefinition } from '@eli-cms/shared';

export function buildBlogFields(): FieldDefinition[] {
  return [
    { name: 'title', type: 'text', required: true, label: 'Title' },
    { name: 'body', type: 'textarea', required: true, label: 'Body' },
    { name: 'featured', type: 'boolean', required: false, label: 'Featured' },
  ];
}

export function buildPageFields(): FieldDefinition[] {
  return [
    { name: 'title', type: 'text', required: true, label: 'Title' },
    { name: 'content', type: 'textarea', required: true, label: 'Content' },
    { name: 'seoDescription', type: 'text', required: false, label: 'SEO Description' },
  ];
}

export function buildBlogContentType() {
  return { slug: 'blog', name: 'Blog', fields: buildBlogFields() };
}

export function buildPageContentType() {
  return { slug: 'page', name: 'Page', fields: buildPageFields() };
}

export function buildBlogData(overrides: Record<string, unknown> = {}) {
  return { title: 'Hello World', body: 'Some content here', ...overrides };
}

export function buildPageData(overrides: Record<string, unknown> = {}) {
  return { title: 'About Us', content: 'About page content', ...overrides };
}
