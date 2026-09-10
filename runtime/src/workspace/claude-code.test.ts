import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { WorkspaceStore } from './store';
import { WorkspaceChat } from './chat';
import { WorkspaceConnection } from './connection';
import { memoryStore } from '../providers/secrets';
import { chatTools } from './chat-tools';
import type { StepEvent, StepRequest } from '../core/types';
import {
  checkClaudeSignIn,
  claudeCodeEnv,
  ClaudeOutput,
  WorkspaceClaudeCodeProvider,
  type ClaudeRuntime,
} from './claude-code';

let root: string;
let store: WorkspaceStore;
let runtime: ClaudeRuntime;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'counsel-claude-adapter-test-'));
  store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') });
  runtime = {
    command: [process.execPath, resolve(import.meta.dir, 'fixtures/claude-cli.ts')],
    env: {
      HOME: root,
      USER: 'synthetic-user',
      PATH: process.env.PATH,
      ANTHROPIC_API_KEY: 'SYNTHETIC-AMBIENT-KEY',
      CLAUDE_CODE_OAUTH_TOKEN: 'SYNTHETIC-AMBIENT-OAUTH',
      UNRELATED_SECRET: 'SYNTHETIC-OTHER-SECRET',
    },
  };
});
afterEach(() => {
  store.close();
  rmSync(root, { recursive: true, force: true });
});
const input = (message: string) => ({ clientId: crypto.randomUUID(), message, attachments: [] });
function request(message = 'hello', signal?: AbortSignal): StepRequest {
  const conversation = store.conversations.create({ scope: 'workspace' });
  const turn = store.conversations.begin(conversation.id, input(message), 'fixture').turn;
  const { tools } = chatTools({
    store,
    conversation,
    turn,
    attachments: [],
    signal: signal ?? new AbortController().signal,
    save: () => store.conversations.save(turn),
  });
  return {
    tenant: 'workspace',
    system: 'PRIVATE APP CONTEXT',
    messages: [{ role: 'user', content: message }],
    tools,
    signal,
  };
}
async function events(provider: WorkspaceClaudeCodeProvider, req: StepRequest) {
  const result: StepEvent[] = [];
  for await (const event of provider.run(req)) result.push(event);
  return result;
}
function authRuntime(mode: string): ClaudeRuntime {
  return { ...runtime, command: [...runtime.command!, '--fixture-auth', mode] };
}

describe('Claude Code CLI connection', () => {
  test('checks only safe auth metadata and preserves the billing distinction', async () => {
    const status = await checkClaudeSignIn(runtime);
    expect(status).toMatchObject({ installed: true, loggedIn: true, billing: 'subscription' });
    expect(JSON.stringify(status)).not.toMatch(/private@example|private-org|NEVER-EXPOSE/);
    expect(await checkClaudeSignIn(authRuntime('api'))).toMatchObject({
      loggedIn: true,
      billing: 'api',
    });
    expect(await checkClaudeSignIn(authRuntime('missing'))).toMatchObject({
      loggedIn: false,
      billing: 'unknown',
    });
    expect(await checkClaudeSignIn(authRuntime('unknown'))).toMatchObject({
      loggedIn: true,
      billing: 'unknown',
    });
  });
  test('never inherits ambient credentials, execution switches, or another tool configuration', () => {
    const env = claudeCodeEnv({
      ...runtime.env,
      CLAUDE_CONFIG_DIR: '/synthetic/claude',
      NODE_OPTIONS: '--require dangerous',
      CLAUDE_CODE_USE_BEDROCK: '1',
      ANTHROPIC_BASE_URL: 'https://unexpected.invalid',
      CLAUDECODE: 'nested',
    });
    expect(env.HOME).toBe(root);
    expect(env.CLAUDE_CONFIG_DIR).toBe('/synthetic/claude');
    expect(env.ENABLE_CLAUDEAI_MCP_SERVERS).toBe('false');
    expect(JSON.stringify(env)).not.toMatch(
      /SYNTHETIC-AMBIENT|SYNTHETIC-OTHER|NODE_OPTIONS|BEDROCK|unexpected.invalid|CLAUDECODE/,
    );
  });
  test('subscription selection blocks an API login; explicit CLI API selection can run', async () => {
    const req = request();
    const blocked = await events(
      new WorkspaceClaudeCodeProvider('sonnet', 'subscription', authRuntime('api')),
      req,
    );
    expect(blocked).toHaveLength(1);
    expect(blocked[0]?.type).toBe('error');
    const allowed = await events(
      new WorkspaceClaudeCodeProvider('sonnet', 'api', authRuntime('api')),
      req,
    );
    expect(allowed.at(-1)).toMatchObject({ type: 'done', output: 'Completed hello' });
    const unknown = await events(
      new WorkspaceClaudeCodeProvider('sonnet', 'subscription', authRuntime('unknown')),
      req,
    );
    expect(unknown).toHaveLength(1);
    expect(unknown[0]?.type).toBe('error');
  });
  test('a real child process sees only scoped tools and private context files, with no session reuse or token copying', async () => {
    const result = await events(
      new WorkspaceClaudeCodeProvider('sonnet', 'subscription', runtime),
      request('inspect process'),
    );
    const done = result.at(-1);
    expect(done?.type).toBe('done');
    if (done?.type !== 'done') throw new Error('Missing result');
    const state = JSON.parse(done.output as string);
    expect(state.files.sort()).toEqual(['instructions.txt', 'tools.json']);
    expect(state.args).toContain('--restricted');
    expect(state.args).toContain('--no-session-persistence');
    expect(state.args).toContain('--strict-mcp-config');
    expect(state.args[state.args.indexOf('--tools') + 1]).toBe('');
    expect(state.args[state.args.indexOf('--setting-sources') + 1]).toBe('');
    expect(state.args[state.args.indexOf('--permission-mode') + 1]).toBe('dontAsk');
    expect(state.args).not.toContain('--bare');
    expect(state.args).not.toContain('--resume');
    expect(state.system).toContain('PRIVATE APP CONTEXT');
    expect(state.system).toContain('Counsel identity boundary:');
    expect(state.system).toContain('must not be used for attribution');
    expect(JSON.stringify(state.args)).not.toContain('PRIVATE APP CONTEXT');
    expect(JSON.stringify(state.args)).not.toContain('Bearer');
    expect(JSON.stringify(state.env)).not.toContain('SYNTHETIC-AMBIENT');
    expect(state.tools).toEqual([
      'counsel_lookup_statute',
      'counsel_lookup_authority',
      'counsel_read_entity',
      'counsel_check_signatory',
      'counsel_compare_document_rounds',
      'counsel_prepare_redline',
      'counsel_read_guide',
      'counsel_list_records',
      'counsel_propose_preferences',
      'counsel_propose_matter_brief',
      'counsel_prepare_output',
      'counsel_search_records',
      'counsel_read_record',
      'counsel_cite_passage',
      'counsel_propose_knowledge',
    ]);
    expect(existsSync(state.cwd)).toBe(false);
    expect(result.filter((event) => event.type === 'text')).toEqual([
      { type: 'text', text: 'Reading the permitted records. ' },
    ]);
    expect(JSON.stringify(result)).not.toContain('PRIVATE REASONING');
  });
  test('concurrent CLI processes retain independent scope, evidence, and durable work', async () => {
    const a = store.createMatter({ title: 'First' });
    const b = store.createMatter({ title: 'Second' });
    for (const [matter, body] of [
      [a, 'The first witness awaits an interview.'],
      [b, 'The second witness has replied.'],
    ] as const)
      store.createSource({
        kind: 'reference',
        matterIds: [matter.id],
        revision: { title: matter.title, body, provenance: { origin: 'fixture:witness' } },
      });
    const chat = new WorkspaceChat(
      store,
      () => new WorkspaceClaudeCodeProvider('sonnet', 'subscription', runtime),
    );
    const ca = store.conversations.create({ scope: 'matter', matterId: a.id });
    const cb = store.conversations.create({ scope: 'matter', matterId: b.id });
    const ta = chat.start(ca.id, input('A'));
    const tb = chat.start(cb.id, input('B'));
    expect(store.conversations.list().filter((c) => c.running)).toHaveLength(2);
    await chat.idle();
    expect(store.conversations.turn(ta.id).status).toBe('complete');
    expect(store.conversations.turn(tb.id).status).toBe('complete');
    const wa = store.getWork(store.conversations.turn(ta.id).workId!);
    const wb = store.getWork(store.conversations.turn(tb.id).workId!);
    expect(wa.answer).toBe('Completed A [S1]');
    expect(wb.answer).toBe('Completed B [S1]');
    expect(wa.evidence[0]?.quote).toBe('The first witness awaits an interview.');
    expect(wb.evidence[0]?.quote).toBe('The second witness has replied.');
  });
  test('cancel kills a stubborn child without stopping another run', async () => {
    const abort = new AbortController();
    const first = new WorkspaceClaudeCodeProvider('sonnet', 'subscription', runtime);
    const seen: StepEvent[] = [];
    const task = (async () => {
      for await (const event of first.run(request('ignore stop', abort.signal))) {
        seen.push(event);
        if (event.type === 'text') abort.abort();
      }
    })();
    const other = events(
      new WorkspaceClaudeCodeProvider('sonnet', 'subscription', runtime),
      request('other'),
    );
    await task;
    expect(seen.some((event) => event.type === 'done')).toBe(false);
    expect((await other).at(-1)).toMatchObject({ type: 'done', output: 'Completed other' });
  });
  test('malformed, oversized, truncated and failing processes never report completed work', async () => {
    for (const message of [
      'invalid json',
      'too large',
      'fail',
      'no result',
      'error result',
      'bad exit',
    ]) {
      const result = await events(
        new WorkspaceClaudeCodeProvider('sonnet', 'subscription', runtime),
        request(message),
      );
      expect(result.some((event) => event.type === 'done')).toBe(false);
      expect(result.at(-1)?.type).toBe('error');
      expect(JSON.stringify(result)).not.toContain('SYNTHETIC-NEVER-EXPOSE');
    }
  });
  test('connection settings store no CLI credentials and resolve the selected billing method', () => {
    const connection = new WorkspaceConnection(store, memoryStore(), { claudeRuntime: runtime });
    expect(connection.configure({ kind: 'claude-code', model: 'sonnet' })).toMatchObject({
      ready: true,
      claudeInstalled: true,
      config: { claudeBilling: 'subscription' },
    });
    expect(connection.resolve().id).toBe('claude-code/subscription/sonnet');
    connection.configure({ kind: 'claude-code', model: 'sonnet', claudeBilling: 'api' });
    expect(connection.resolve().id).toBe('claude-code/api/sonnet');
    expect(() =>
      connection.configure({ kind: 'claude-code', model: 'sonnet', apiKey: 'not-accepted' }),
    ).toThrow('CLI connections do not take API keys');
    expect(() =>
      connection.configure({ kind: 'openai-api', model: 'test', claudeBilling: 'api' }),
    ).toThrow('only applies');
    expect(JSON.stringify(store.setting('model-connection'))).not.toContain('not-accepted');
  });
  test('unstreamed assistant text remains visible and errors never expose raw diagnostics', () => {
    const mapper = new ClaudeOutput();
    expect(
      mapper.map({
        type: 'assistant',
        message: { id: '1', content: [{ type: 'text', text: 'Visible' }] },
      }),
    ).toEqual([{ type: 'text', text: 'Visible' }]);
    expect(
      JSON.stringify(
        mapper.map({
          type: 'result',
          subtype: 'success',
          is_error: true,
          result: 'PRIVATE SECRET',
        }),
      ),
    ).not.toContain('PRIVATE SECRET');
  });
});
