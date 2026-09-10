import { DROP_UPKEEP } from './fixtures/legacy-upkeep';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FakeModelProvider, runToolDef } from '../core/fake-provider';
import { memoryStore } from '../providers/secrets';
import { WorkspaceChat } from './chat';
import { chatTools } from './chat-tools';
import { WorkspaceStore } from './store';
import { WorkspaceConnection } from './connection';
import { workspaceCodexConfig } from './codex';
import { lockWorkspace } from './lock';
import practice from './fixtures/practice.json';

let store: WorkspaceStore;
let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'counsel-chat-test-'));
  store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') });
});
afterEach(() => {
  store.close();
  rmSync(root, { recursive: true, force: true });
});
const send = (message = 'A question') => ({
  clientId: crypto.randomUUID(),
  message,
  attachments: [],
});
const source = (body = 'The witness has not been interviewed.', matterIds: string[] = []) =>
  store.createSource({
    kind: 'document',
    matterIds,
    revision: {
      title: 'Witness note',
      body,
      provenance: { origin: 'fixture:witness' },
    },
  });

describe('independent durable conversations', () => {
  test('responses overlap; same-chat duplicate sends are idempotent and different sends conflict', async () => {
    const provider = new FakeModelProvider([
      { text: 'Answer A', delayMs: 50 },
      { text: 'Answer B', delayMs: 50 },
    ]);
    const chat = new WorkspaceChat(store, () => provider);
    const a = store.conversations.create({}),
      b = store.conversations.create({});
    const input = send('A');
    const first = chat.start(a.id, input);
    const second = chat.start(b.id, send('B'));
    expect(store.conversations.list().filter((c) => c.running)).toHaveLength(2);
    expect(chat.start(a.id, input).id).toBe(first.id);
    expect(() => chat.start(a.id, send('Second in A'))).toThrow('still working');
    expect(() => chat.start(a.id, { ...input, message: 'changed' })).toThrow('already used');
    await chat.idle();
    expect(store.conversations.turn(first.id).state.answer).toBe('Answer A');
    expect(store.conversations.turn(second.id).state.answer).toBe('Answer B');
    expect(store.listWork()).toHaveLength(2);
    expect(chat.start(a.id, input).status).toBe('complete');
    const path = store.databasePath;
    store.close();
    store = new WorkspaceStore({ databasePath: path });
    expect(store.conversations.turns(a.id)).toHaveLength(1);
    expect(store.getWork(store.conversations.turn(first.id).workId!).answer).toBe('Answer A');
  });
  test('stopping one conversation does not stop another or save partial work', async () => {
    const provider = new FakeModelProvider([
      { text: 'A incomplete', delayMs: 40 },
      { text: 'B complete', delayMs: 40 },
    ]);
    const chat = new WorkspaceChat(store, () => provider);
    const a = store.conversations.create({}),
      b = store.conversations.create({});
    const ta = chat.start(a.id, send('A')),
      tb = chat.start(b.id, send('B'));
    await Bun.sleep(5);
    expect(() => chat.cancel(b.id, ta.id)).toThrow('another conversation');
    chat.cancel(a.id, ta.id);
    await chat.idle();
    expect(store.conversations.turn(ta.id).status).toBe('cancelled');
    expect(store.conversations.turn(ta.id).workId).toBeNull();
    expect(store.conversations.turn(tb.id).status).toBe('complete');
    expect(store.listWork()).toHaveLength(1);
  });
  test('restart marks abandoned runs interrupted, retaining partial text but no work', () => {
    const conversation = store.conversations.create({});
    const { turn } = store.conversations.begin(conversation.id, send(), 'fixture/model');
    turn.state.answer = 'Partial reasoning in prose';
    store.conversations.save(turn);
    store.conversations.recover();
    expect(store.conversations.turn(turn.id)).toMatchObject({
      status: 'interrupted',
      workId: null,
      state: { answer: 'Partial reasoning in prose' },
    });
    expect(store.listWork()).toHaveLength(0);
  });
  test('completed exchanges and explicit attachments persist; other chats never enter history', async () => {
    const doc = source();
    const provider = new FakeModelProvider([
      { text: 'First answer' },
      { text: 'Follow-up answer' },
    ]);
    const chat = new WorkspaceChat(store, () => provider);
    const conversation = store.conversations.create({});
    chat.start(conversation.id, {
      ...send('First question'),
      attachments: [doc.latest.id],
    });
    await chat.idle();
    const other = store.conversations.create({});
    store.conversations.begin(other.id, send('PRIVATE OTHER CHAT'), 'fixture');
    chat.start(conversation.id, send('Follow-up'));
    await chat.idle();
    expect(provider.lastRequest?.messages).toEqual([
      { role: 'user', content: 'First question' },
      { role: 'assistant', content: 'First answer' },
      { role: 'user', content: 'Follow-up' },
    ]);
    expect(provider.lastRequest?.system).toContain(doc.latest.id);
    expect(JSON.stringify(provider.lastRequest)).not.toContain('PRIVATE OTHER CHAT');
    expect(provider.lastRequest?.session).toBeUndefined();
  });
});

describe('context, citations and human approval boundaries', () => {
  test('out-of-scope search hits cannot crowd out permitted evidence or disclose coverage', async () => {
    const permitted = source('marker permitted evidence');
    for (let index = 0; index < 110; index++) source('marker unrelated evidence');
    const outside = store.createMatter({ title: 'Unrelated' });
    store.createSource({
      kind: 'document',
      matterIds: [outside.id],
      revision: {
        title: 'Private missing source',
        body: null,
        textStatus: 'unavailable',
        provenance: { origin: 'fixture:missing' },
      },
    });
    const conversation = store.conversations.create({});
    const turn = store.conversations.begin(conversation.id, send(), 'fixture').turn;
    const { tools } = chatTools({
      store,
      conversation,
      turn,
      attachments: [permitted.latest.id],
      signal: new AbortController().signal,
      save: () => store.conversations.save(turn),
    });
    const result = await runToolDef(
      tools,
      'counsel_search_records',
      { query: 'marker' },
      'workspace',
    );
    expect(result.isError).toBeFalsy();
    expect(result.output).toMatchObject({
      hits: [{ revisionId: permitted.latest.id }],
      truncated: false,
      coverage: { complete: true, gaps: [] },
    });
    expect(JSON.stringify(result.output)).not.toContain('unrelated');
  });
  test('a final record failure rolls back staged knowledge and leaves the response failed', async () => {
    const provider = new FakeModelProvider([
      {
        toolCalls: [
          {
            name: 'counsel_propose_knowledge',
            input: {
              title: 'Prepared',
              body: 'A proposed rule',
              scope: 'practice',
              kind: 'method',
            },
          },
        ],
        text: 'A completed model response',
      },
    ]);
    const recordWork = store.recordWork.bind(store);
    store.recordWork = () => {
      throw new Error('Simulated database write failure');
    };
    const chat = new WorkspaceChat(store, () => provider);
    const turn = chat.start(store.conversations.create({}).id, send());
    try {
      await chat.idle();
      expect(store.conversations.turn(turn.id)).toMatchObject({
        status: 'failed',
        workId: null,
        state: { proposalIds: [] },
      });
      expect(store.catalog().totals.knowledge).toBe(0);
      expect(store.listWork()).toHaveLength(0);
    } finally {
      store.recordWork = recordWork;
    }
  });
  test('a completed response atomically saves exact evidence and pending knowledge', async () => {
    const matter = store.createMatter({ title: 'Investigation' });
    const doc = source(undefined, [matter.id]);
    const conversation = store.conversations.create({
      scope: 'matter',
      matterId: matter.id,
    });
    const provider = new FakeModelProvider([
      {
        toolCalls: [
          {
            name: 'counsel_read_record',
            input: { kind: 'source', id: doc.latest.id },
          },
          {
            name: 'counsel_cite_passage',
            input: {
              kind: 'source',
              id: doc.latest.id,
              quote: doc.latest.body,
              start: 0,
            },
          },
          {
            name: 'counsel_propose_knowledge',
            input: {
              title: 'Interview first',
              body: 'Confirm the interview before closing this matter.',
              scope: 'matter',
              kind: 'method',
            },
          },
        ],
        text: 'The interview is outstanding. [S1]',
      },
    ]);
    const chat = new WorkspaceChat(store, () => provider);
    const turn = chat.start(conversation.id, send());
    await chat.idle();
    const saved = store.conversations.turn(turn.id);
    expect(saved.status).toBe('complete');
    expect(saved.state.activity).toHaveLength(3);
    expect(saved.state.context[0]?.ranges).toEqual([{ start: 0, end: doc.latest.body!.length }]);
    const work = store.getWork(saved.workId!);
    expect(work.disposition).toBe('draft');
    expect(work.decisionBy).toBeNull();
    expect(work.evidence[0]?.quote).toBe(doc.latest.body!);
    const proposal = store.getKnowledge(saved.state.proposalIds[0]!);
    expect(proposal.active).toBeNull();
    expect(proposal.latest.status).toBe('pending');
    expect(proposal.matterId).toBe(matter.id);
    const approved = store.reviewKnowledge(
      proposal.id,
      proposal.latest.id,
      'approve',
      'Human reviewer',
    );
    expect(approved.active?.approvedBy).toBe('Human reviewer');
    expect(() =>
      store.reviewKnowledge(proposal.id, proposal.latest.id, 'reject', 'Another reviewer'),
    ).toThrow('changed');
  });
  test('failed runs discard prepared knowledge and do not persist provider secrets', async () => {
    const provider = new FakeModelProvider([
      {
        toolCalls: [
          {
            name: 'counsel_propose_knowledge',
            input: {
              title: 'Uncommitted',
              body: 'A proposed rule',
              scope: 'practice',
              kind: 'method',
            },
          },
        ],
        text: 'Partial answer',
        error: '429 usage limit; SECRET-API-CREDENTIAL',
      },
    ]);
    const chat = new WorkspaceChat(store, () => provider);
    const turn = chat.start(store.conversations.create({}).id, send());
    await chat.idle();
    expect(store.conversations.turn(turn.id)).toMatchObject({
      status: 'failed',
      state: { answer: 'Partial answer', proposalIds: [], error: expect.stringContaining('usage or rate limit') },
    });
    expect(JSON.stringify(store.conversations.turn(turn.id))).not.toContain(
      'SECRET-API-CREDENTIAL',
    );
    expect(store.catalog().knowledge).toHaveLength(0);
    expect(store.listWork()).toHaveLength(0);
  });
  test('tool access never widens beyond a matter; guessed IDs, approvals and unreads are refused', async () => {
    const ids = store.importSeed(practice).records;
    const conversation = store.conversations.create({
      scope: 'matter',
      matterId: ids.matters.investigation!,
    });
    const turn = store.conversations.begin(conversation.id, send(), 'fixture').turn;
    const tools = chatTools({
      store,
      conversation,
      turn,
      attachments: [],
      signal: new AbortController().signal,
      save: () => store.conversations.save(turn),
    }).tools;
    const call = (name: string, input: unknown) => runToolDef(tools, name, input, 'workspace');
    const outside = store.getSource(ids.sources['agreement-text']!);
    expect(
      (
        await call('counsel_read_record', {
          kind: 'source',
          id: outside.latest.id,
        })
      ).isError,
    ).toBe(true);
    const proposed = store.getKnowledge(ids.knowledge['unreviewed-pattern']!);
    expect(
      (
        await call('counsel_read_record', {
          kind: 'knowledge',
          id: proposed.latest.id,
        })
      ).isError,
    ).toBe(true);
    expect((await call('approve_knowledge', { id: proposed.id })).isError).toBe(true);
    const reference = store.getSource(ids.sources['monitoring-reference']!);
    expect(
      (
        await call('counsel_cite_passage', {
          kind: 'source',
          id: reference.latest.id,
          quote: 'Document',
          start: 0,
        })
      ).isError,
    ).toBe(true);
    await call('counsel_read_record', {
      kind: 'source',
      id: reference.latest.id,
    });
    expect(
      (
        await call('counsel_cite_passage', {
          kind: 'source',
          id: reference.latest.id,
          quote: 'Invented',
          start: 0,
        })
      ).isError,
    ).toBe(true);
    const result = await call('counsel_search_records', { query: 'notice' });
    expect(JSON.stringify(result.output)).not.toContain(outside.latest.id);
  });
  test('explicit historical attachments are readable; approved global knowledge is available without other matters', async () => {
    const doc = source('Old draft.');
    store.reviseSource(doc.id, doc.latest.id, {
      title: 'New version',
      body: 'New draft.',
      provenance: { origin: 'fixture:new' },
    });
    store.createKnowledge({
      kind: 'method',
      revision: {
        title: 'Common',
        body: 'globalmarker',
        status: 'approved',
        approvedBy: 'reviewer',
      },
    });
    const other = store.createMatter({ title: 'Other' });
    source('globalmarker private evidence', [other.id]);
    const conversation = store.conversations.create({});
    const turn = store.conversations.begin(conversation.id, send(), 'fixture').turn;
    const build = (attachments: string[]) =>
      chatTools({
        store,
        conversation,
        turn,
        attachments,
        signal: new AbortController().signal,
        save: () => store.conversations.save(turn),
      }).tools;
    expect(
      (
        await runToolDef(
          build([]),
          'counsel_read_record',
          { kind: 'source', id: doc.latest.id },
          'workspace',
        )
      ).isError,
    ).toBe(true);
    const tools = build([doc.latest.id]);
    expect(
      (
        await runToolDef(
          tools,
          'counsel_read_record',
          { kind: 'source', id: doc.latest.id },
          'workspace',
        )
      ).output,
    ).toMatchObject({ text: 'Old draft.', version: 1 });
    const found = await runToolDef(
      tools,
      'counsel_search_records',
      { query: 'globalmarker' },
      'workspace',
    );
    expect(JSON.stringify(found.output)).toContain('Common');
    expect(JSON.stringify(found.output)).not.toContain('private evidence');
  });
});

describe('migration, files and connection safety', () => {
  test('version-one workspaces upgrade without changing existing work', () => {
    store.importSeed(practice);
    const before = store.listWork();
    const path = store.databasePath;
    store.close();
    const db = new Database(path);
    db.exec(
    DROP_UPKEEP + 'DROP TABLE import_organization_results; DROP TABLE import_organization_jobs; DROP TABLE knowledge_evidence; DROP INDEX evidence_source; DROP INDEX evidence_knowledge; DROP INDEX evidence_work; DROP INDEX import_queue_pending; DROP TABLE import_entry_metadata; DROP TABLE import_queue; DROP TABLE conversation_matters; DROP TABLE source_lifecycle; DROP TABLE work_lifecycle; DROP TABLE conversation_lifecycle; DROP TABLE conversation_clients; DROP TABLE matter_clients; DROP TABLE clients; DROP TABLE source_placements; DROP TABLE import_entries; DROP TABLE import_batches; DROP TABLE template_revisions; DROP TABLE practice_templates; DROP TABLE work_exports; DROP TABLE source_extractions; DROP TABLE work_outputs; DROP TABLE matter_briefs; DROP TABLE conversation_turns; DROP TABLE conversations; DROP TABLE source_originals; DROP TABLE workspace_settings; PRAGMA user_version = 1;',
    );
    db.close();
    store = new WorkspaceStore({ databasePath: path });
    expect(store.listWork()).toEqual(before);
    expect(store.conversations.list()).toEqual([]);
    expect(store.setting('model-connection')).toBeNull();
  });
  test('UTF-8 upload retains exact original bytes and rejects unsupported or binary files', () => {
    const bytes = Buffer.from('\uFEFF📄 Original text.\r\n');
    const doc = store.importTextFile({
      name: 'Evidence.txt',
      base64: bytes.toString('base64'),
    });
    const original = join(root, 'workspace.sqlite3.originals', doc.latest.provenance.originalHash!);
    expect(readFileSync(original)).toEqual(bytes);
    expect(statSync(original).mode & 0o777).toBe(0o600);
    expect(doc.latest.body).toBe('📄 Original text.\r\n');
    expect(() => store.importTextFile({ name: '../escape.txt', base64: '' })).toThrow();
    expect(() => store.importTextFile({ name: 'doc.pdf', base64: '' })).toThrow();
    expect(() =>
      store.importTextFile({
        name: 'binary.txt',
        base64: Buffer.from([0xff, 0]).toString('base64'),
      }),
    ).toThrow();
  });
  test('connection secrets are separate from model identity, status and SQLite settings', () => {
    const secrets = memoryStore();
    const connection = new WorkspaceConnection(store, secrets);
    const status = connection.configure({
      kind: 'anthropic-api',
      model: 'claude-sonnet-5',
      apiKey: 'test-secret-not-real',
    });
    expect(status.ready).toBe(true);
    expect(JSON.stringify(status)).not.toContain('test-secret');
    expect(JSON.stringify(store.setting('model-connection'))).not.toContain('test-secret');
    connection.configure({ kind: 'anthropic-api', model: 'different-model' });
    expect(connection.resolve().id).toBe('anthropic/different-model');
    expect(() =>
      connection.configure({
        kind: 'codex',
        model: 'gpt-5.6-sol',
        apiKey: 'not-allowed',
      }),
    ).toThrow('do not take API keys');
    expect(() => connection.configure({ kind: 'openai-api', model: 'gpt-5.6-sol' })).toThrow(
      'Paste an API key',
    );
  });
  test('Codex config requests run-scoped tools and isolation without legacy vault or API billing', () => {
    const config = workspaceCodexConfig('http://127.0.0.1:1234/mcp', '/fake/codex');
    expect(config.config?.mcp_servers).toEqual({
      counsel: {
        url: 'http://127.0.0.1:1234/mcp',
        enabled: true,
        required: true,
        bearer_token_env_var: 'COUNSEL_TURN_TOKEN',
        default_tools_approval_mode: 'approve',
      },
    });
    expect(config.config?.features).toMatchObject({
      shell_tool: false,
      unified_exec: false,
      multi_agent: false,
      hooks: false,
      image_generation: false,
      apps: false,
      plugins: false,
      remote_plugin: false,
      browser_use: false,
      computer_use: false,
      code_mode_host: false,
      code_mode: { enabled: false, excluded_tool_namespaces: ['functions'],
        direct_only_tool_namespaces: ['mcp__counsel'] },
      skip_host_skill_discovery: true,
      workspace_dependencies: false,
      unbounded_connection_retries: false,
    });
    expect(config.config?.forced_login_method).toBe('chatgpt');
    expect(config.config?.agents).toEqual({ enabled: false });
    expect(config.config?.cli_auth_credentials_store).toBe('file');
    expect(JSON.stringify(config)).not.toContain('COUNSEL_VAULT');
  });
  test('a live workspace lock prevents a second launcher', () => {
    const unlock = lockWorkspace(store.databasePath);
    expect(() => lockWorkspace(store.databasePath)).toThrow('already running');
    unlock();
    const release = lockWorkspace(store.databasePath);
    release();
  });
});
