#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ApiClient } from './api-client.js';
import { loadConfig } from './config.js';
import { registerAllTools } from './tools/index.js';

const config = loadConfig();

const server = new McpServer({
  name: 'eli-cms',
  version: '0.1.0',
});

const api = new ApiClient(config.url, config.key);

registerAllTools(server, api);

const transport = new StdioServerTransport();
await server.connect(transport);

process.stderr.write(`Eli CMS MCP server running (API: ${config.url})\n`);
