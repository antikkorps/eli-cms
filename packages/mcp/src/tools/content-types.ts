import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../api-client.js';
import { handleToolError } from './utils.js';

const fieldValidationSchema = z
  .object({
    minLength: z.number().int().optional().describe('Minimum length (text, textarea, richtext)'),
    maxLength: z.number().int().optional().describe('Maximum length (text, textarea, richtext)'),
    min: z.number().optional().describe('Minimum value (number)'),
    max: z.number().optional().describe('Maximum value (number)'),
    pattern: z.string().optional().describe('Regex pattern (text, email, url)'),
    patternMessage: z.string().optional().describe('Error message when pattern fails'),
    unique: z.boolean().optional().describe('Enforce unique values (text, email, url, number)'),
  })
  .optional()
  .describe('Advanced validation rules');

const fieldDefinitionSchema: z.ZodType = z.lazy(() =>
  z.object({
    name: z.string().describe('Field key (camelCase)'),
    type: z
      .enum([
        'text',
        'textarea',
        'number',
        'boolean',
        'date',
        'email',
        'url',
        'select',
        'media',
        'richtext',
        'author',
        'repeatable',
        'component',
      ])
      .describe('Field data type'),
    required: z.boolean().describe('Whether the field is required'),
    label: z.string().describe('Display label'),
    options: z.array(z.string()).optional().describe('Options for select type'),
    multiple: z.boolean().optional().describe('Allow multiple values (media type)'),
    accept: z
      .array(z.string())
      .optional()
      .describe('MIME type filters for media (e.g. ["image/*", "application/pdf"])'),
    defaultValue: z.unknown().optional().describe('Default value for new content'),
    group: z.string().optional().describe('Group/tab name for UI organization'),
    subFields: z.array(fieldDefinitionSchema).optional().describe('Sub-fields for repeatable type'),
    componentSlugs: z.array(z.string()).optional().describe('Allowed component slugs for component type'),
    validation: fieldValidationSchema,
  }),
);

export function registerContentTypeTools(server: McpServer, api: ApiClient) {
  server.tool(
    'list_content_types',
    'List all content types defined in the CMS. Returns slug, name, fields, and whether it is a singleton.',
    {
      page: z.number().int().positive().optional().describe('Page number (default: 1)'),
      limit: z.number().int().min(1).max(100).optional().describe('Items per page (default: 20)'),
      search: z.string().optional().describe('Search by name'),
      includeCounts: z.boolean().optional().describe('Include content count per type'),
    },
    async (params) => {
      try {
        const result = await api.get('/api/v1/content-types', params);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.tool(
    'get_content_type',
    'Get a content type by slug. Returns full field definitions including types, validation rules, and default values.',
    {
      slug: z.string().describe('Content type slug (e.g. "blog", "page")'),
    },
    async ({ slug }) => {
      try {
        const result = await api.get(`/api/v1/content-types/${encodeURIComponent(slug)}`);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.tool(
    'create_content_type',
    'Create a new content type. Fields define the data schema. Field types: text, textarea, number, boolean, date, email, url, select, media, richtext, author, repeatable, component.',
    {
      slug: z.string().describe('Unique slug in kebab-case (e.g. "blog-post")'),
      name: z.string().describe('Display name (e.g. "Blog Post")'),
      fields: z.array(fieldDefinitionSchema).describe('Field definitions'),
      isSingleton: z.boolean().optional().describe('Only one content of this type can exist'),
    },
    async (params) => {
      try {
        const result = await api.post('/api/v1/content-types', params);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );
}
