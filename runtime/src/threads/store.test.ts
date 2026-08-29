import { describe, expect, test, beforeEach } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ThreadStore } from './store';
import type { ThreadEvent } from './store';

let root: string;
let codexHomeRoot: string;
let store: ThreadStore;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'threads-'));
  codexHomeRoot = mkdtempSync(join(tmpdir(), 'codex-'));
  store = new ThreadStore(root, { codexHomeRoot });
});

describe('ThreadStore', () => {
  test('create, then list, then get returns the header and no events', async () => {
    const header = await store.create('default', { title: 'Acme NDA' });
    expect(header.id).toBeTruthy();
    expect(header.title).toBe('Acme NDA');
    expect(header.sessions).toEqual({});
    expect(header.createdAt).toBe(header.updatedAt);

    const listed = await store.list('default');
    expect(listed).toHaveLength(1);
    expect(listed[0]).toEqual(header);

    const got = await store.get('default', header.id);
    expect(got.header).toEqual(header);
    expect(got.events).toEqual([]);
  });

  test('append three events, then get returns them in order', async () => {
    const header = await store.create('default', {});
    const events: ThreadEvent[] = [
      { t: 'user', at: '2026-01-01T00:00:00.000Z', content: 'hello' },
      { type: 'text', text: 'hi there', at: '2026-01-01T00:00:01.000Z' },
      { type: 'done', output: null, usage: { inputTokens: 1, outputTokens: 1 }, at: '2026-01-01T00:00:02.000Z' },
    ];
    for (const ev of events) await store.append('default', header.id, ev);

    const got = await store.get('default', header.id);
    expect(got.events).toEqual(events);
  });

  test('setSession persists into the header', async () => {
    const header = await store.create('default', {});
    await store.setSession('default', header.id, 'claude-sub/opus-5', 'sess-123');

    const got = await store.get('default', header.id);
    expect(got.header.sessions).toEqual({ 'claude-sub/opus-5': 'sess-123' });
    expect(got.header.updatedAt >= header.updatedAt).toBe(true);
  });

  test('updateProposal flips the status of the matching proposal event', async () => {
    const header = await store.create('default', {});
    await store.append('default', header.id, {
      t: 'user',
      at: '2026-01-01T00:00:00.000Z',
      content: 'update the NDA',
    });
    await store.append('default', header.id, {
      t: 'proposal',
      at: '2026-01-01T00:00:01.000Z',
      id: 'prop-1',
      path: 'matters/acme/nda.md',
      content: 'new content',
      rationale: 'because',
      status: 'pending',
      expectedVersion: 'abc123',
    });
    await store.append('default', header.id, {
      t: 'proposal',
      at: '2026-01-01T00:00:02.000Z',
      id: 'prop-2',
      path: 'matters/acme/other.md',
      content: 'other content',
      rationale: 'because too',
      status: 'pending',
      expectedVersion: null,
    });

    await store.updateProposal('default', header.id, 'prop-1', 'approved');

    const got = await store.get('default', header.id);
    expect(got.events).toHaveLength(3);
    const prop1 = got.events.find(e => 't' in e && e.t === 'proposal' && e.id === 'prop-1');
    const prop2 = got.events.find(e => 't' in e && e.t === 'proposal' && e.id === 'prop-2');
    expect(prop1).toMatchObject({ status: 'approved' });
    expect(prop2).toMatchObject({ status: 'pending' });
    // order is preserved by the rewrite
    expect('t' in got.events[0]! && got.events[0]!.t).toBe('user');
    expect(got.events[1]).toMatchObject({ id: 'prop-1' });
    expect(got.events[2]).toMatchObject({ id: 'prop-2' });
  });

  test('remove deletes the header, the log, and the codex home dir', async () => {
    const header = await store.create('default', {});
    await store.append('default', header.id, { t: 'user', at: '2026-01-01T00:00:00.000Z', content: 'hi' });

    const codexHome = store.codexHomeFor(header.id);
    mkdirSync(codexHome, { recursive: true });
    writeFileSync(join(codexHome, 'session.json'), '{}', 'utf8');
    expect(existsSync(codexHome)).toBe(true);

    await store.remove('default', header.id);

    expect(existsSync(join(root, '.counsel', 'threads', 'default', `${header.id}.json`))).toBe(false);
    expect(existsSync(join(root, '.counsel', 'threads', 'default', `${header.id}.jsonl`))).toBe(false);
    expect(existsSync(codexHome)).toBe(false);

    const listed = await store.list('default');
    expect(listed).toHaveLength(0);
  });

  test('ids of two creates differ', async () => {
    const a = await store.create('default', {});
    const b = await store.create('default', {});
    expect(a.id).not.toBe(b.id);
  });

  test('codexHomeFor defaults to ~/.counsel-os/codex/<id> when codexHomeRoot is not injected', () => {
    const defaultStore = new ThreadStore(root);
    const id = randomUUID();
    const path = defaultStore.codexHomeFor(id);
    expect(path.endsWith(join('.counsel-os', 'codex', id))).toBe(true);
  });

  test('rejects a path-traversal thread id', async () => {
    await expect(store.get('default', '../../x')).rejects.toThrow('invalid thread id');
  });

  test('rejects a path-traversal tenant', async () => {
    await expect(store.get('../t', randomUUID())).rejects.toThrow('invalid tenant');
  });

  test('a real uuid passes id validation', async () => {
    const header = await store.create('default', {});
    await expect(store.get('default', header.id)).resolves.toBeDefined();
  });

  test('append on an unknown thread throws and creates no orphan .jsonl', async () => {
    const unknownId = randomUUID();
    await expect(
      store.append('default', unknownId, { t: 'user', at: '2026-01-01T00:00:00.000Z', content: 'hi' })
    ).rejects.toThrow();

    expect(existsSync(join(root, '.counsel', 'threads', 'default', `${unknownId}.jsonl`))).toBe(false);
  });
});
