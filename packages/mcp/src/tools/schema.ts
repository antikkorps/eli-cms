import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../api-client.js';
import { handleToolError } from './utils.js';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: { page: number; limit: number; total: number; totalPages: number };
}

interface ContentType {
  id: string;
  slug: string;
  name: string;
  fields: Array<Record<string, unknown>>;
  isSingleton: boolean;
}

interface Component {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  fields: Array<Record<string, unknown>>;
}

export function registerSchemaTools(server: McpServer, api: ApiClient) {
  server.tool(
    'get_schema',
    'Get the full CMS schema: all content types and components with their field definitions. Useful to understand the data model before creating or querying content.',
    {
      slug: z
        .string()
        .optional()
        .describe(
          'Optional: get schema for a specific content type slug only',
        ),
    },
    async ({ slug }) => {
      try {
        if (slug) {
          const ct = await api.get(`/api/v1/content-types/${encodeURIComponent(slug)}`);
          return { content: [{ type: 'text', text: JSON.stringify(ct, null, 2) }] };
        }

        const [ctResult, compResult] = await Promise.all([
          api.get<ApiResponse<ContentType[]>>('/api/v1/content-types', { limit: 100 }),
          api.get<ApiResponse<Component[]>>('/api/v1/components', { limit: 100 }),
        ]);

        const contentTypes = ctResult.data ?? [];
        const components = compResult.data ?? [];

        const schema = {
          contentTypes,
          components,
          summary: {
            totalContentTypes: contentTypes.length,
            totalComponents: components.length,
            types: contentTypes.map((ct: ContentType) => ({
              slug: ct.slug,
              name: ct.name,
              fieldCount: ct.fields.length,
              isSingleton: ct.isSingleton,
            })),
          },
        };

        return { content: [{ type: 'text', text: JSON.stringify(schema, null, 2) }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );
}
