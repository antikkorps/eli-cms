/**
 * Convert a kebab-case slug to a PascalCase interface name.
 * e.g. "blog-post" → "BlogPost", "hero" → "Hero"
 */
export function slugToInterfaceName(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}
