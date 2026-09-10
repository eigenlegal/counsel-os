/** Installed CLI + local fake Messages endpoint. Synthetic HOME; no real login or inference. */
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { z } from 'zod';
import { locateCli } from '../runtime/src/providers/cli-locate';
import { claudeCodeArgs, claudeCodeEnv } from '../runtime/src/workspace/claude-code';
import { openToolBridge } from '../runtime/src/workspace/tool-bridge';

const root = mkdtempSync(join(tmpdir(), 'counsel-claude-preflight-'));
const home = join(root, 'home'), cwd = join(root, 'run');
mkdirSync(join(home, '.claude'), { recursive: true }); mkdirSync(cwd);
const marker = `PRIVATE-MEMORY-${crypto.randomUUID()}`;
const account = `private-account-${crypto.randomUUID()}@example.invalid`;
writeFileSync(join(home, '.claude', 'CLAUDE.md'), `Private inherited instructions: ${marker}`);
writeFileSync(join(home, '.claude.json'), JSON.stringify({ hasCompletedOnboarding: true,
  oauthAccount: { accountUuid: crypto.randomUUID(), organizationUuid: crypto.randomUUID(), emailAddress: account, displayName: 'Private fixture account' } }));
const abort = new AbortController();
let executions = 0, child: Bun.Subprocess | undefined;
const bridge = openToolBridge([{ name: 'counsel_read_record', description: 'Synthetic allowed tool.',
  inputSchema: z.object({ id: z.string() }), execute: async () => { executions++; return { fixture: true }; } }], abort.signal);
const requests: Record<string, any>[] = [];
const server = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: async request => {
  const url = new URL(request.url);
  if (url.pathname.endsWith('/count_tokens')) return Response.json({ input_tokens: 100 });
  if (request.method === 'POST' && url.pathname === '/v1/messages') {
    const body = await request.json(); requests.push(body);
    const useTool = requests.length === 1;
    const block = useTool ? { type: 'tool_use', id: 'fixture-tool', name: 'mcp__counsel__counsel_read_record', input: {} }
      : { type: 'text', text: '' };
    const events = [
      { type: 'message_start', message: { id: 'fixture-message', type: 'message', role: 'assistant', content: [], model: body.model,
        stop_reason: null, stop_sequence: null, usage: { input_tokens: 1, output_tokens: 0 } } },
      { type: 'content_block_start', index: 0, content_block: block },
      { type: 'content_block_delta', index: 0, delta: useTool ? { type: 'input_json_delta', partial_json: '{"id":"synthetic"}' }
        : { type: 'text_delta', text: 'Synthetic completed.' } },
      { type: 'content_block_stop', index: 0 },
      { type: 'message_delta', delta: { stop_reason: useTool ? 'tool_use' : 'end_turn', stop_sequence: null }, usage: { output_tokens: 1 } },
      { type: 'message_stop' },
    ];
    return new Response(events.map(event => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join(''), {
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }
  return Response.json({});
} });
try {
  const cli = locateCli('claude'); if (!cli) throw new Error('Claude CLI unavailable.');
  const system = join(cwd, 'instructions.txt'), mcp = join(cwd, 'tools.json');
  writeFileSync(system, 'Synthetic self-contained request; use only the supplied context.');
  writeFileSync(mcp, JSON.stringify({ mcpServers: { counsel: { type: 'http', url: bridge.url, headers: { Authorization: `Bearer ${bridge.token}` } } } }));
  const args = claudeCodeArgs('sonnet', ['counsel_read_record'], system, mcp, 3);
  if (process.argv.includes('--exclude-memory')) args[args.indexOf('--settings') + 1] = JSON.stringify({ disableAllHooks: true, claudeMdExcludes: ['/**'] });
  if (process.argv.includes('--safe-mode')) args.unshift('--safe-mode');
  child = Bun.spawn([cli, ...args], { cwd,
    env: { ...claudeCodeEnv({ PATH: process.env.PATH, HOME: home, USER: 'synthetic' }),
      // Test-only API transport: dummy key, never a subscription credential.
      ANTHROPIC_API_KEY: 'sk-ant-synthetic-fixture', ANTHROPIC_BASE_URL: server.url.origin },
    stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' });
  child.stdin.write('Synthetic transport preflight.'); await child.stdin.end();
  const timeout = setTimeout(() => child?.kill('SIGKILL'), 20_000);
  const [output, errors, exit] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  clearTimeout(timeout);
  const payload = JSON.stringify(requests);
  const checks = { requestCaptured: requests.length >= 2, allowedToolExecuted: executions === 1,
    onlyAllowedTools: requests.every(request => JSON.stringify(request.tools?.map((tool: any) => tool.name).sort()) === JSON.stringify(['mcp__counsel__counsel_read_record'])),
    noInheritedMemory: !payload.includes(marker), noAccountIdentity: !payload.includes(account), cliCompleted: exit === 0 };
  console.log(JSON.stringify({ checks, mode: process.argv.slice(2), tools: requests[0]?.tools?.map((tool: any) => tool.name),
    systemSections: requests[0]?.system?.map((section: any) => ({ characters: section.text?.length, inheritedMemory: section.text?.includes(marker), accountIdentity: section.text?.includes(account) })),
    syntheticToolExecutions: executions, vendorModelCalls: 0,
    ...(exit !== 0 ? { diagnostics: errors.slice(-1000), output: output.slice(-500) } : {}) }, null, 2));
  if (Object.values(checks).some(value => !value)) process.exitCode = 1;
} finally {
  if (child?.exitCode === null) { child.kill('SIGKILL'); await child.exited; }
  abort.abort(); bridge.close(); server.stop(true); rmSync(root, { recursive: true, force: true });
}
