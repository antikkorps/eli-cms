/**
 * Strip ALL HTML tags — returns plain text only.
 * Uses a loop to handle nested/reconstructed patterns safely.
 * Decodes basic HTML entities, with &amp; decoded last to prevent double-unescaping.
 * Final pass strips any remaining angle brackets.
 */
export function sanitize(input: string): string {
  let previous: string;
  let result = input;

  // Loop until stable — prevents incomplete multi-character sanitization
  do {
    previous = result;
    result = previous
      .replace(/<!--[\s\S]*?-->/g, '')       // HTML comments
      .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '') // CDATA
      .replace(/<[^>]*>/g, '');               // HTML tags
  } while (result !== previous);

  return result
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')   // decode &amp; last to prevent double-unescaping
    .replace(/[<>]/g, '')     // strip any angle brackets produced by entity decoding
    .trim();
}

/**
 * Remove inline event handler attributes (on*) from HTML.
 * Loops until stable to prevent incomplete multi-character sanitization.
 */
function removeEventHandlerAttributes(html: string): string {
  const pattern = /\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi;
  let previous: string;
  let current = html;
  do {
    previous = current;
    current = current.replace(pattern, '');
  } while (current !== previous);
  return current;
}

/**
 * Sanitize HTML — allow safe formatting tags, strip dangerous ones (script, style, event handlers).
 * Used for richtext fields that intentionally contain HTML.
 */
export function sanitizeHtml(input: string): string {
  // Loop until stable to handle nested/reconstructed dangerous blocks
  let html = input;
  let previous: string;
  do {
    previous = html;
    html = html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script\b[^>]*>/gi, '')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style\b[^>]*>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
  } while (html !== previous);

  // Remove event handler attributes (on*)
  html = removeEventHandlerAttributes(html);

  // Remove javascript: and data: URLs from href/src attributes
  html = html.replace(/(href|src)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '$1=""');
  html = html.replace(/(href|src)\s*=\s*(?:"data:[^"]*"|'data:[^']*')/gi, '$1=""');

  return html.trim();
}

/** Sanitize a filename: keep alphanumeric, dots, hyphens, underscores, spaces. */
export function sanitizeFilename(input: string): string {
  return input.replace(/[^a-zA-Z0-9.\-_ ]/g, '_').trim() || 'unnamed';
}
