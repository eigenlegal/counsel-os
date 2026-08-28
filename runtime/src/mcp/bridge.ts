import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolDef } from '../core/types';
import { runToolDef } from '../core/fake-provider';

export interface McpToolSpec {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  /** The original zod schema, kept alongside the JSON schema above because the
   * installed @modelcontextprotocol/sdk's `registerTool` (v1.30.0) validates
   * input itself and requires a zod schema (or raw shape) — not a JSON Schema
   * object — for its own `inputSchema` config. See `registerOnServer`. */
  zodSchema: z.ZodType;
  handler(input: unknown): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }>;
}

export function toMcpTools(tools: ToolDef[], tenant: string): McpToolSpec[] {
  return tools.map(t => ({
    name: t.name,
    description: t.description,
    inputSchema: z.toJSONSchema(t.inputSchema) as Record<string, unknown>,
    zodSchema: t.inputSchema,
    async handler(input) {
      const r = await runToolDef(tools, t.name, input, tenant);
      const text = typeof r.output === 'string' ? r.output : JSON.stringify(r.output);
      return r.isError ? { content: [{ type: 'text', text }], isError: true } : { content: [{ type: 'text', text }] };
    },
  }));
}

export function registerOnServer(server: McpServer, specs: McpToolSpec[]): void {
  for (const s of specs) {
    server.registerTool(
      s.name,
      { description: s.description, inputSchema: s.zodSchema as never },
      s.handler as never,
    );
  }
}
