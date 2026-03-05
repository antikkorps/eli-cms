/**
 * Strip ALL HTML tags — returns plain text only.
 * Uses a lightweight regex instead of sanitize-html to stay browser-compatible.
 * Handles: tags, HTML comments, CDATA, and decodes basic HTML entities.
 */
export function sanitize(input: string): string {
  return input
    .replace(/<!--[\s\S]*?-->/g, '')     // HTML comments
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '') // CDATA
    .replace(/<[^>]*>/g, '')              // HTML tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .trim();
}

/** Sanitize a filename: keep alphanumeric, dots, hyphens, underscores, spaces. */
export function sanitizeFilename(input: string): string {
  return input.replace(/[^a-zA-Z0-9.\-_ ]/g, '_').trim() || 'unnamed';
}
