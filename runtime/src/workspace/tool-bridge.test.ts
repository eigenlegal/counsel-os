import { expect, test } from 'bun:test';
import { z } from 'zod';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { openToolBridge } from './tool-bridge';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkspaceStore } from './store';
import { chatTools, TOOL_LABELS } from './chat-tools';

test('all production workspace tools can be discovered and validated over the real MCP transport', async () => {
  const root = mkdtempSync(join(tmpdir(), 'counsel-real-tools-test-'));
  const store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') });
  const controller = new AbortController();
  const conversation = store.conversations.create({});
  const turn = store.conversations.begin(conversation.id, {
    clientId: crypto.randomUUID(), message: 'Synthetic schema check.',
  }, 'fixture/schema-check').turn;
  const { tools } = chatTools({ store, conversation, turn, attachments: [], signal: controller.signal, save: () => {} });
  const bridge = openToolBridge(tools, controller.signal);
  const client = new Client({ name: 'counsel-production-schema-test', version: '1' });
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL(bridge.url), {
      requestInit: { headers: { authorization: `Bearer ${bridge.token}` } },
    }));
    const listed = await client.listTools();
    expect(listed.tools.map(tool => tool.name).sort()).toEqual(Object.keys(TOOL_LABELS).sort());
    for (const tool of listed.tools) {
      expect(tool.inputSchema.type).toBe('object');
      expect(Object.keys(tool.inputSchema.properties ?? {}).length).toBeGreaterThan(0);
    }
    const citationSchema = listed.tools.find(tool => tool.name === 'counsel_cite_passage')!.inputSchema;
    expect(citationSchema.required).toContain('quote');
    expect(citationSchema.required).not.toContain('start');
    const search = await client.callTool({ name: 'counsel_search_records', arguments: { query: 'synthetic' } });
    expect(search.isError).not.toBe(true);
    expect(JSON.stringify(search)).toContain('hits');
    const invalid = await client.callTool({ name: 'counsel_prepare_output', arguments: { title: 'Synthetic', kind: 'unsupported' } });
    expect(invalid.isError).toBe(true);
    expect(turn.state.activity).toHaveLength(1);
  } finally {
    await client.close();
    bridge.close();
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test('real MCP transport authenticates, validates schemas, isolates concurrent run capabilities and closes', async () => {
  const abort = new AbortController();
  const first = openToolBridge(
    [
      {
        name: 'counsel_read_record',
        description: 'Synthetic bounded test read.',
        inputSchema: z.object({ id: z.string().uuid() }).strict(),
        execute: async () => ({ marker: 'first-run-only' }),
      },
    ],
    abort.signal,
  );
  const second = openToolBridge(
    [
      {
        name: 'counsel_read_record',
        description: 'Other run.',
        inputSchema: z.object({ id: z.string().uuid() }).strict(),
        execute: async () => ({ marker: 'second-run-only' }),
      },
    ],
    new AbortController().signal,
  );
  const client = new Client({ name: 'counsel-test', version: '1' });
  try {
    expect((await fetch(first.url)).status).toBe(401);
    expect(
      (
        await fetch(first.url, {
          headers: { authorization: `Bearer ${second.token}` },
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await fetch(first.url, {
          headers: {
            authorization: `Bearer ${first.token}`,
            origin: 'https://untrusted.example',
          },
        })
      ).status,
    ).toBe(403);
    const transport = new StreamableHTTPClientTransport(new URL(first.url), {
      requestInit: { headers: { authorization: `Bearer ${first.token}` } },
    });
    await client.connect(transport);
    const listed = await client.listTools();
    expect(listed.tools.map((t) => t.name)).toEqual(['counsel_read_record']);
    expect(listed.tools[0]?.annotations?.openWorldHint).toBe(false);
    const result = await client.callTool({
      name: 'counsel_read_record',
      arguments: { id: crypto.randomUUID() },
    });
    expect(JSON.stringify(result)).toContain('first-run-only');
    expect(JSON.stringify(result)).not.toContain('second-run-only');
    const invalid = await client.callTool({
      name: 'counsel_read_record',
      arguments: { id: '../outside', extra: true },
    });
    expect(invalid.isError).toBe(true);
    abort.abort();
    expect(
      (
        await fetch(first.url, {
          headers: { authorization: `Bearer ${first.token}` },
        })
      ).status,
    ).toBe(410);
  } finally {
    await client.close();
    first.close();
    second.close();
  }
});
