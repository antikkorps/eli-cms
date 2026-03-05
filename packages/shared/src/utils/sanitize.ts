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

/**
 * Sanitize HTML — allow safe formatting tags, strip dangerous ones (script, style, event handlers).
 * Used for richtext fields that intentionally contain HTML.
 */
export function sanitizeHtml(input: string): string {
  // Remove script/style tags and their content
  let html = input
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');

  // Remove event handler attributes (on*)
  html = html.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');

  // Remove javascript: and data: URLs from href/src attributes
  html = html.replace(/(href|src)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '$1=""');
  html = html.replace(/(href|src)\s*=\s*(?:"data:[^"]*"|'data:[^']*')/gi, '$1=""');

  return html.trim();
}

/** Sanitize a filename: keep alphanumeric, dots, hyphens, underscores, spaces. */
export function sanitizeFilename(input: string): string {
  return input.replace(/[^a-zA-Z0-9.\-_ ]/g, '_').trim() || 'unnamed';
}
