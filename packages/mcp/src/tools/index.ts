import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiClient } from '../api-client.js';
import { registerContentTypeTools } from './content-types.js';
import { registerContentTools } from './contents.js';
import { registerComponentTools } from './components.js';
import { registerSchemaTools } from './schema.js';

export function registerAllTools(server: McpServer, api: ApiClient) {
  registerContentTypeTools(server, api);
  registerContentTools(server, api);
  registerComponentTools(server, api);
  registerSchemaTools(server, api);
}
