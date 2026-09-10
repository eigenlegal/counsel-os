import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { existsSync, mkdirSync, mkdtempSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ThreadEvent } from './store';
import { SqliteThreadStore } from './sqlite-store';

let root: string;
let codexHomeRoot: string;
let store: SqliteThreadStore;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'sqlite-threads-'));
  codexHomeRoot = mkdtempSync(join(tmpdir(), 'sqlite-codex-'));
  store = new SqliteThreadStore(root, { codexHomeRoot });
});

afterEach(() => {
  store.close();
});

describe('SqliteThreadStore', () => {
  test('creates a private versioned database and survives reopening', async () => {
    expect(existsSync(store.databasePath)).toBe(true);
    expect(statSync(store.databasePath).mode & 0o777).toBe(0o600);

    const header = await store.create('default', { title: 'Acme NDA', matter: 'matters/acme.md', task: 'review' });
    const events: ThreadEvent[] = [
      { t: 'user', at: '2026-09-04T12:00:00.000Z', content: 'Review this NDA' },
      { t: 'step', at: '2026-09-04T12:00:01.000Z', runId: 'run-1', provider: 'openai/gpt-6', task: 'review', taskSource: 'caller' },
      { type: 'done', at: '2026-09-04T12:00:02.000Z', output: null, usage: { inputTokens: 10, outputTokens: 4 } },
    ];
    for (const event of events) await store.append('default', header.id, event);
    await store.setSession('default', header.id, 'openai/gpt-6', 'response-1');

    store.close();
    store = new SqliteThreadStore(root, { codexHomeRoot });

    expect(await store.list('default')).toEqual([
      expect.objectContaining({ id: header.id, title: 'Acme NDA', matter: 'matters/acme.md', task: 'review' }),
    ]);
    const got = await store.get('default', header.id);
    expect(got.events).toEqual(events);
    expect(got.header.sessions).toEqual({ 'openai/gpt-6': 'response-1' });

    const db = new Database(store.databasePath, { readonly: true });
    expect((db.query('PRAGMA user_version').get() as { user_version: number }).user_version).toBe(1);
    db.close();
  });

  test('derives but does not persist a title, and a manual title wins', async () => {
    const header = await store.create('default');
    await store.append('default', header.id, {
      t: 'user',
      at: '2026-09-04T12:00:00.000Z',
      content: '\nWhat is our position on liability caps in vendor agreements today?\nPlease check Acme.',
    });

    expect((await store.header('default', header.id)).title).toBe('What is our position on liability caps in vendor agreements…');
    expect((await store.header('default', header.id, { derive: false })).title).toBeUndefined();

    const named = await store.update('default', header.id, { title: 'Acme cap' });
    expect(named.title).toBe('Acme cap');
    const cleared = await store.update('default', header.id, { title: '' });
    expect(cleared.title).toBe('What is our position on liability caps in vendor agreements…');
  });

  test('updates sessions, proposals, and routed steps without changing event order', async () => {
    const header = await store.create('default');
    await store.setSession('default', header.id, 'anthropic/claude-opus-5', 'session-a');
    await store.setSession('default', header.id, 'openai/gpt-6', 'session-b');
    await store.clearSession('default', header.id, 'anthropic/claude-opus-5');
    await store.clearSession('default', header.id, 'missing/model');

    const events: ThreadEvent[] = [
      { t: 'user', at: '2026-09-04T12:00:00.000Z', content: 'redline it' },
      { t: 'step', at: '2026-09-04T12:00:01.000Z', runId: 'run-1', provider: 'openai/gpt-6', task: 'chat', taskSource: 'default' },
      {
        t: 'proposal', at: '2026-09-04T12:00:02.000Z', id: 'proposal-1', path: 'matters/acme.md', content: 'updated',
        rationale: 'record the result', status: 'pending', expectedVersion: null,
      },
    ];
    for (const event of events) await store.append('default', header.id, event);

    expect(await store.updateStep('default', header.id, 'run-1', { task: 'redline', taskSource: 'corrected' })).toBe(true);
    expect(await store.updateStep('default', header.id, 'missing', { task: 'review', taskSource: 'corrected' })).toBe(false);
    await store.updateProposal('default', header.id, 'proposal-1', 'approved');

    const got = await store.get('default', header.id);
    expect(got.header.sessions).toEqual({ 'openai/gpt-6': 'session-b' });
    expect(got.events.map(event => ('t' in event ? event.t : event.type))).toEqual(['user', 'step', 'proposal']);
    expect(got.events[1]).toMatchObject({ runId: 'run-1', task: 'redline', taskSource: 'corrected' });
    expect(got.events[2]).toMatchObject({ id: 'proposal-1', status: 'approved' });
  });

  test('remove cascades state and removes the per-thread Codex home', async () => {
    const header = await store.create('default');
    await store.append('default', header.id, { t: 'user', at: '2026-09-04T12:00:00.000Z', content: 'hello' });
    await store.setSession('default', header.id, 'openai/gpt-6', 'session-b');
    const codexHome = store.codexHomeFor(header.id);
    mkdirSync(codexHome, { recursive: true });
    writeFileSync(join(codexHome, 'session.json'), '{}');

    await store.remove('default', header.id);

    expect(await store.list('default')).toEqual([]);
    await expect(store.get('default', header.id)).rejects.toThrow(/unknown thread/);
    expect(existsSync(codexHome)).toBe(false);
  });

  test('validates tenant and thread ids before querying', async () => {
    await expect(store.list('../other')).rejects.toThrow('invalid tenant');
    await expect(store.get('default', '../../other')).rejects.toThrow('invalid thread id');
  });

  test('append to an unknown thread is atomic', async () => {
    const id = crypto.randomUUID();
    await expect(store.append('default', id, { t: 'user', at: '2026-09-04T12:00:00.000Z', content: 'orphan' })).rejects.toThrow(/unknown thread/);
    expect(await store.list('default')).toEqual([]);
  });
});

test('a database from a newer runtime is refused', () => {
  const newerRoot = mkdtempSync(join(tmpdir(), 'sqlite-newer-'));
  const path = join(newerRoot, 'state.sqlite3');
  const db = new Database(path, { create: true });
  db.exec('PRAGMA user_version = 99');
  db.close();
  expect(() => new SqliteThreadStore(newerRoot, { databasePath: path })).toThrow(/newer than this runtime supports/);
});
