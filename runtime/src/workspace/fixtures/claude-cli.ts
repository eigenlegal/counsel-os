/** Synthetic subprocess for adapter tests ONLY. It never calls a model or reads user credentials. */
import { readFileSync } from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const args = process.argv.slice(2);
const option = (name: string) => args[args.indexOf(name) + 1];
const emit = (value: unknown) => process.stdout.write(`${JSON.stringify(value)}\n`);
if (args.includes('auth') && args.includes('status')) {
  const mode = args.includes('--fixture-auth') ? option('--fixture-auth') : 'subscription';
  if (mode === 'stall') {
    process.on('SIGTERM', () => {});
    await Bun.sleep(60_000);
  }
  emit({
    loggedIn: mode !== 'missing' && (mode !== 'needs-user' || !!process.env.USER?.trim()),
    authMethod: mode === 'subscription' || mode === 'needs-user' ? 'claude.ai' : mode === 'api' ? 'api_key' : 'unexpected',
    email: 'private@example.invalid',
    orgId: 'private-org',
    secret: 'SYNTHETIC-NEVER-EXPOSE',
  });
  process.exit(mode === 'missing' ? 1 : 0);
}
const input = await Bun.stdin.text();
const envelope = args.includes('--input-format') ? JSON.parse(input) : null;
const transcript = envelope ? envelope.message.content.find((part: { type: string; text?: string }) => part.type === 'text' && part.text?.startsWith('Conversation messages (JSON data):\n')).text : input;
const messages = JSON.parse(transcript.split('Conversation messages (JSON data):\n')[1]!);
const prompt = messages.at(-1).content as string;
if (prompt === 'image transport fixture') {
  const images = envelope?.message.content.filter((part: { type: string }) => part.type === 'image') ?? [];
  emit({ type: 'result', subtype: 'success', result: `${images.length} image parts received`, usage: { input_tokens: 0, output_tokens: 0 } });
  process.exit(0);
}
if (prompt === 'invalid json') {
  process.stdout.write('{invalid}\n');
  process.exit(0);
}
if (prompt === 'too large') {
  process.stdout.write('x'.repeat(1_000_001));
  await Bun.sleep(30_000);
}
if (prompt === 'fail') {
  process.stderr.write('SYNTHETIC-NEVER-EXPOSE');
  process.exit(1);
}
const id = crypto.randomUUID();
emit({ type: 'system', subtype: 'init', session_id: id });
emit({ type: 'stream_event', event: { type: 'message_start', message: { id } } });
emit({
  type: 'stream_event',
  event: {
    type: 'content_block_delta',
    delta: { type: 'thinking_delta', thinking: 'PRIVATE REASONING' },
  },
});
emit({
  type: 'stream_event',
  event: {
    type: 'content_block_delta',
    delta: { type: 'text_delta', text: 'Reading the permitted records. ' },
  },
});
emit({
  type: 'assistant',
  message: { id, content: [{ type: 'text', text: 'Reading the permitted records. ' }] },
});
if (prompt === 'hold' || prompt === 'ignore stop') {
  if (prompt === 'ignore stop') process.on('SIGTERM', () => {});
  await Bun.sleep(60_000);
}
if (prompt === 'no result') process.exit(0);
const mcp = JSON.parse(readFileSync(option('--mcp-config')!, 'utf8')).mcpServers.counsel;
const client = new Client({ name: 'synthetic-cli-fixture', version: '1' });
let answer = `Completed ${prompt}`;
try {
  await client.connect(
    new StreamableHTTPClientTransport(new URL(mcp.url), { requestInit: { headers: mcp.headers } }),
  );
  const listed = await client.listTools();
  const search = await client.callTool({
    name: 'counsel_search_records',
    arguments: { query: 'witness' },
  });
  const data = search.structuredContent as {
    result: { hits: Array<{ kind: string; revisionId: string }> };
  };
  const hit = data.result.hits.find((item) => item.kind === 'source');
  if (hit) {
    const read = await client.callTool({
      name: 'counsel_read_record',
      arguments: { kind: 'source', id: hit.revisionId },
    });
    const text = (read.structuredContent as { result: { text: string } }).result.text;
    const quote = text.split('. ')[0] + (text.includes('. ') ? '.' : '');
    const cited = await client.callTool({
      name: 'counsel_cite_passage',
      arguments: { kind: 'source', id: hit.revisionId, quote, start: 0 },
    });
    if (cited.isError) throw new Error('Synthetic citation failed');
    answer += ' [S1]';
  }
  if (prompt === 'inspect process')
    answer = JSON.stringify({
      args,
      input,
      system: readFileSync(option('--system-prompt-file')!, 'utf8'),
      cwd: process.cwd(),
      files: (await import('node:fs')).readdirSync(process.cwd()),
      env: process.env,
      tools: listed.tools.map((tool) => tool.name),
    });
  if (prompt === 'invalid tool') {
    const denied = await client.callTool({
      name: 'counsel_read_record',
      arguments: { kind: 'source', id: 'not-an-id' },
    });
    answer = denied.isError ? 'Invalid tool input was rejected' : 'Unexpected success';
  }
  await Bun.sleep(100);
} finally {
  await client.close();
}
emit({
  type: 'result',
  subtype: 'success',
  is_error: prompt === 'error result',
  result: answer,
  usage: { input_tokens: 10, output_tokens: 20 },
});
process.exit(prompt === 'bad exit' ? 1 : 0);
