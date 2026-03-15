import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../api-client.js';
import { handleToolError } from './utils.js';

export function registerComponentTools(server: McpServer, api: ApiClient) {
  server.tool(
    'list_components',
    'List all reusable components (blocks). Components define field groups that can be used inside content via the "component" field type.',
    {
      page: z.number().int().positive().optional().describe('Page number (default: 1)'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Items per page (default: 20)'),
      search: z.string().optional().describe('Search by name'),
    },
    async (params) => {
      try {
        const result = await api.get('/api/v1/components', params);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );
}
