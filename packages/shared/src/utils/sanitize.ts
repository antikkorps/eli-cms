/**
 * Strip ALL HTML tags — returns plain text only.
 * Processes character-by-character to avoid ReDoS and incomplete sanitization.
 * Decodes basic HTML entities, with &amp; decoded last to prevent double-unescaping.
 * Final pass strips any remaining angle brackets.
 */
export function sanitize(input: string): string {
  // Character-level tag stripping — no regex backtracking risk
  let result = '';
  let inTag = false;
  for (let i = 0; i < input.length; i++) {
    if (input[i] === '<') {
      inTag = true;
    } else if (input[i] === '>') {
      inTag = false;
    } else if (!inTag) {
      result += input[i];
    }
  }

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
  let html = input;
  let previous: string;

  // Remove dangerous blocks — loop until stable
  do {
    previous = html;
    html = html
      .replace(/<script\b[^>]*>[^]*?<\/script\b[^>]*>/gi, '')
      .replace(/<style\b[^>]*>[^]*?<\/style\b[^>]*>/gi, '')
      .replace(/<!\[CDATA\[[^]*?\]\]>/g, '');
  } while (html !== previous);

  // Strip any remaining script/style tags (unclosed, malformed, or partial)
  do {
    previous = html;
    html = html.replace(/<\/?\s*(script|style)\b[^>]*>/gi, '');
  } while (html !== previous);

  // Strip HTML comments and any stray comment markers
  do {
    previous = html;
    html = html.replace(/<!-{2,}[^]*?-{2,}>/g, '');
  } while (html !== previous);
  html = html.replace(/<!--|-->/g, '');

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
