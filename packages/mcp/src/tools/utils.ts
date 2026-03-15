/**
 * Format an error as a proper MCP error response.
 * Returns { isError: true, content: [...] } so the LLM knows the call failed.
 */
export function handleToolError(error: unknown): {
  isError: true;
  content: Array<{ type: 'text'; text: string }>;
} {
  const message = error instanceof Error ? error.message : String(error);
  return {
    isError: true,
    content: [{ type: 'text', text: message }],
  };
}
