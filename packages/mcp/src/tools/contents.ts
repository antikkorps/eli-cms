import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../api-client.js';
import { handleToolError } from './utils.js';

export function registerContentTools(server: McpServer, api: ApiClient) {
  server.tool(
    'list_contents',
    'List content entries. Can filter by content type, status, and search term. Returns paginated results.',
    {
      contentTypeId: z
        .string()
        .uuid()
        .optional()
        .describe('Filter by content type ID'),
      status: z
        .enum(['draft', 'in-review', 'approved', 'scheduled', 'published'])
        .optional()
        .describe('Filter by status'),
      search: z.string().optional().describe('Full-text search'),
      page: z.number().int().positive().optional().describe('Page number (default: 1)'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Items per page (default: 20)'),
      sortBy: z
        .enum(['createdAt', 'updatedAt', 'status', 'slug', 'relevance'])
        .optional()
        .describe('Sort field'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
    },
    async (params) => {
      try {
        const result = await api.get('/api/v1/contents', params);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.tool(
    'create_content',
    'Create a new content entry. The data object must match the field definitions of the content type. Always get_content_type first to know the expected fields.',
    {
      contentTypeId: z.string().uuid().describe('ID of the content type'),
      slug: z
        .string()
        .optional()
        .describe('URL slug (auto-generated if omitted)'),
      status: z
        .enum(['draft', 'in-review', 'approved', 'scheduled', 'published'])
        .optional()
        .describe('Content status (default: "draft")'),
      data: z
        .record(z.unknown())
        .describe(
          'Content data — keys must match the field names defined in the content type',
        ),
      publishedAt: z
        .string()
        .optional()
        .describe('ISO datetime for scheduled publishing'),
    },
    async (params) => {
      try {
        const result = await api.post('/api/v1/contents', params);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );
}
