/**
 * Strip ALL HTML tags — returns plain text only.
 * Processes character-by-character to avoid ReDoS and incomplete sanitization.
 * Decodes basic HTML entities, with &amp; decoded last to prevent double-unescaping.
 * Final pass strips any remaining angle brackets.
 */
export function sanitize(input: string): string {
  // Character-level tag stripping — no regex backtracking risk
  // Also strips content inside <script> and <style> tags
  let result = '';
  let inTag = false;
  let tagName = '';
  let collectingTagName = false;
  let skipUntilClose = ''; // non-empty when inside <script> or <style>
  for (let i = 0; i < input.length; i++) {
    if (input[i] === '<') {
      inTag = true;
      tagName = '';
      collectingTagName = true;
    } else if (input[i] === '>') {
      inTag = false;
      collectingTagName = false;
      const lower = tagName.toLowerCase().replace(/^\//, '');
      if (lower === 'script' || lower === 'style') {
        if (tagName.startsWith('/')) {
          skipUntilClose = ''; // closing tag — stop skipping
        } else {
          skipUntilClose = lower; // opening tag — start skipping content
        }
      }
    } else if (inTag && collectingTagName) {
      if (input[i] === ' ' || input[i] === '\t' || input[i] === '\n') {
        collectingTagName = false;
      } else {
        tagName += input[i];
      }
    } else if (!inTag && !skipUntilClose) {
      result += input[i];
    }
  }

  return result
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&') // decode &amp; last to prevent double-unescaping
    .replace(/[<>]/g, '') // strip any angle brackets produced by entity decoding
    .trim();
}

/** Allowed HTML tags for richtext fields (whitelist approach). */
const ALLOWED_TAGS = new Set([
  // Inline formatting
  'b',
  'i',
  'em',
  'strong',
  'u',
  's',
  'sub',
  'sup',
  'mark',
  'small',
  // Block formatting
  'p',
  'br',
  'hr',
  'div',
  'span',
  // Headings
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  // Lists
  'ul',
  'ol',
  'li',
  // Links
  'a',
  // Code
  'code',
  'pre',
  // Quotes
  'blockquote',
  // Tables
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  // Media (for embedded images in richtext)
  'img',
]);

/** Allowed attributes per tag. Attributes not listed are stripped. */
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel', 'title']),
  img: new Set(['src', 'alt', 'width', 'height', 'title']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan']),
};

/** Globally allowed attributes on any tag. */
const GLOBAL_ATTRS = new Set(['class', 'id', 'title']);

/**
 * Sanitize HTML using a whitelist approach — only allowed tags and attributes are kept.
 * Processes character-by-character to parse tags, avoiding regex ReDoS entirely.
 * Used for richtext fields that intentionally contain HTML.
 */
export function sanitizeHtml(input: string): string {
  const result: string[] = [];
  let i = 0;
  const len = input.length;

  while (i < len) {
    if (input[i] === '<') {
      // Find the end of the tag
      const closeIdx = input.indexOf('>', i);
      if (closeIdx === -1) {
        // No closing > — discard the rest (malformed)
        break;
      }

      const tagContent = input.substring(i + 1, closeIdx);
      i = closeIdx + 1;

      // Check for comment start
      if (tagContent.startsWith('!--')) {
        // Skip until end of comment (-->, --!>, or end of string)
        const commentEnd = findCommentEnd(input, i);
        i = commentEnd;
        continue;
      }

      // Check for CDATA
      if (tagContent.startsWith('![CDATA[')) {
        const cdataEnd = input.indexOf(']]>', i);
        i = cdataEnd === -1 ? len : cdataEnd + 3;
        continue;
      }

      // Parse tag name
      const parsed = parseTag(tagContent);
      if (!parsed) continue;

      const { tagName, isClosing, attrs } = parsed;
      const lower = tagName.toLowerCase();

      // Only keep whitelisted tags
      if (!ALLOWED_TAGS.has(lower)) continue;

      // Rebuild the tag with only allowed attributes
      if (isClosing) {
        result.push(`</${lower}>`);
      } else {
        const safeAttrs = filterAttributes(lower, attrs);
        const selfClosing = tagContent.trimEnd().endsWith('/') ? ' /' : '';
        result.push(`<${lower}${safeAttrs}${selfClosing}>`);
      }
    } else {
      result.push(input[i]!);
      i++;
    }
  }

  return result.join('').trim();
}

/** Find the end of an HTML comment, handling --> and --!> variants. */
function findCommentEnd(input: string, startFrom: number): number {
  let j = startFrom;
  const len = input.length;
  while (j < len - 2) {
    if (input[j] === '-' && input[j + 1] === '-') {
      // Check for --> or --!>
      if (input[j + 2] === '>') return j + 3;
      if (input[j + 2] === '!' && j + 3 < len && input[j + 3] === '>') return j + 4;
    }
    j++;
  }
  return len; // unterminated comment — skip to end
}

/** Parse a tag's content into name, closing flag, and raw attributes string. */
function parseTag(content: string): { tagName: string; isClosing: boolean; attrs: string } | null {
  let trimmed = content.trim();
  if (!trimmed) return null;

  const isClosing = trimmed.startsWith('/');
  if (isClosing) trimmed = trimmed.substring(1).trim();

  // Remove trailing slash (self-closing)
  if (trimmed.endsWith('/')) trimmed = trimmed.slice(0, -1).trim();

  // Extract tag name (letters, digits, hyphens)
  const nameMatch = trimmed.match(/^[a-zA-Z][a-zA-Z0-9-]*/);
  if (!nameMatch) return null;

  const tagName = nameMatch[0]!;
  const attrs = trimmed.substring(tagName.length);

  return { tagName, isClosing, attrs };
}

/** Filter attributes, keeping only those in the whitelist. Also sanitizes href/src values. */
function filterAttributes(tagName: string, attrsStr: string): string {
  if (!attrsStr.trim()) return '';

  const tagAllowed = ALLOWED_ATTRS[tagName];
  const parts: string[] = [];

  // Match attribute patterns: name="value", name='value', name=value, or bare name
  const attrRegex = /([a-zA-Z][a-zA-Z0-9-]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
  let m: RegExpExecArray | null;

  while ((m = attrRegex.exec(attrsStr)) !== null) {
    const attrName = m[1]!.toLowerCase();
    const attrValue = m[2] ?? m[3] ?? m[4] ?? '';

    // Check if attribute is allowed (tag-specific or global)
    if (!GLOBAL_ATTRS.has(attrName) && (!tagAllowed || !tagAllowed.has(attrName))) {
      continue;
    }

    // Block event handlers (on*)
    if (attrName.startsWith('on')) continue;

    // Sanitize href/src — block javascript: and data: URLs
    if (attrName === 'href' || attrName === 'src') {
      const stripped = attrValue.replace(/\s/g, '').toLowerCase();
      if (stripped.startsWith('javascript:') || stripped.startsWith('data:')) continue;
    }

    parts.push(` ${attrName}="${escapeAttrValue(attrValue)}"`);
  }

  return parts.join('');
}

/** Escape special characters in an attribute value. */
function escapeAttrValue(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Sanitize a filename: keep alphanumeric, dots, hyphens, underscores, spaces. */
export function sanitizeFilename(input: string): string {
  return input.replace(/[^a-zA-Z0-9.\-_ ]/g, '_').trim() || 'unnamed';
}
