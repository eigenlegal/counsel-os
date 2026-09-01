import { describe, expect, test, beforeEach } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
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

  test('clearSession forgets one provider\'s session and leaves the others alone', async () => {
    const header = await store.create('default', {});
    await store.setSession('default', header.id, 'claude-sub/opus-5', 'sess-123');
    await store.setSession('default', header.id, 'codex-sub/gpt', 'thread-456');

    await store.clearSession('default', header.id, 'claude-sub/opus-5');

    const got = await store.get('default', header.id);
    expect(got.header.sessions).toEqual({ 'codex-sub/gpt': 'thread-456' });
  });

  test('clearSession on a provider with no session is a no-op', async () => {
    const header = await store.create('default', {});
    await store.setSession('default', header.id, 'codex-sub/gpt', 'thread-456');

    await store.clearSession('default', header.id, 'claude-sub/opus-5');

    const got = await store.get('default', header.id);
    expect(got.header.sessions).toEqual({ 'codex-sub/gpt': 'thread-456' });
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

  // cou-88: threads from before titling existed (or created bare by another
  // client) must not sit in the rail as `Untitled` rows — list/get derive a
  // title from the first user message.
  test('an untitled thread with messages lists and gets under its first line', async () => {
    const header = await store.create('default', {});
    await store.append('default', header.id, { t: 'user', at: '2026-01-01T00:00:00.000Z', content: '\nReview the Acme NDA\nplease' });

    const listed = await store.list('default');
    expect(listed[0]?.title).toBe('Review the Acme NDA');
    expect((await store.get('default', header.id)).header.title).toBe('Review the Acme NDA');
  });

  test('a derived title is cut to 60 characters on a word boundary, and never written back', async () => {
    const header = await store.create('default', {});
    const long = 'What is our position on liability caps in vendor agreements today?';
    await store.append('default', header.id, { t: 'user', at: '2026-01-01T00:00:00.000Z', content: long });

    const listed = await store.list('default');
    expect(listed[0]?.title).toBe('What is our position on liability caps in vendor agreements…');

    const onDisk = JSON.parse(readFileSync(join(root, '.counsel', 'threads', 'default', `${header.id}.json`), 'utf8')) as { title?: string };
    expect(onDisk.title).toBeUndefined();
  });

  test('a real title always wins over derivation; no messages leaves the thread untitled', async () => {
    const titled = await store.create('default', { title: 'Named by hand' });
    await store.append('default', titled.id, { t: 'user', at: '2026-01-01T00:00:00.000Z', content: 'something else' });
    const empty = await store.create('default', {});

    const byId = new Map((await store.list('default')).map(h => [h.id, h]));
    expect(byId.get(titled.id)?.title).toBe('Named by hand');
    expect(byId.get(empty.id)?.title).toBeUndefined();
  });

  test('append on an unknown thread throws and creates no orphan .jsonl', async () => {
    const unknownId = randomUUID();
    await expect(
      store.append('default', unknownId, { t: 'user', at: '2026-01-01T00:00:00.000Z', content: 'hi' })
    ).rejects.toThrow();

    expect(existsSync(join(root, '.counsel', 'threads', 'default', `${unknownId}.jsonl`))).toBe(false);
  });
});

describe('ThreadStore.update (rename + matter link)', () => {
  test('renames without touching updatedAt, so the rail order holds', async () => {
    const header = await store.create('default', { title: 'Acme NDA' });
    await new Promise(resolve => setTimeout(resolve, 5));
    const renamed = await store.update('default', header.id, { title: 'Acme — residuals' });
    expect(renamed.title).toBe('Acme — residuals');
    expect(renamed.updatedAt).toBe(header.updatedAt);
    expect((await store.get('default', header.id)).header.title).toBe('Acme — residuals');
  });

  test('an empty title clears the name; the derived one comes back at read time', async () => {
    const header = await store.create('default', { title: 'Named' });
    await store.append('default', header.id, { t: 'user', at: header.createdAt, content: 'What is the cap?' });
    const cleared = await store.update('default', header.id, { title: '' });
    expect(cleared.title).toBe('What is the cap?');
    // On disk the name is gone, not stored as ''.
    const raw = JSON.parse(readFileSync(join(root, '.counsel', 'threads', 'default', `${header.id}.json`), 'utf8')) as { title?: string };
    expect('title' in raw).toBe(false);
  });

  test('links and unlinks a matter; null removes the key', async () => {
    const header = await store.create('default', {});
    const linked = await store.update('default', header.id, { matter: 'matters/acme.md' });
    expect(linked.matter).toBe('matters/acme.md');
    const unlinked = await store.update('default', header.id, { matter: null });
    expect(unlinked.matter).toBeUndefined();
    expect((await store.list('default'))[0]!.matter).toBeUndefined();
  });

  test('rejects a malformed id before touching disk', async () => {
    await expect(store.update('default', '../x', { title: 'x' })).rejects.toThrow('invalid thread id');
  });
});

describe('artifact events', () => {
  test('an artifact event round-trips through the log with its summary', async () => {
    const root = mkdtempSync(join(tmpdir(), 'store-artifact-'));
    const store = new ThreadStore(root, { codexHomeRoot: mkdtempSync(join(tmpdir(), 'store-artifact-codex-')) });
    const header = await store.create('default', {});
    const ev = {
      t: 'artifact' as const,
      at: '2026-09-01T12:00:00.000Z',
      id: 'art-1',
      kind: 'docx-redline' as const,
      path: 'matters/acme/nda-redline-2026-09-01.docx',
      source: 'matters/acme/nda.docx',
      author: 'Jack Wang',
      tracked: true,
      summary: { changes: 14, comments: 3, applied: 5, skipped: 0, clauses: 5, bytes: 42_000 },
    };
    await store.append('default', header.id, ev);
    const got = await store.get('default', header.id);
    expect(got.events).toEqual([ev]);
  });
});
