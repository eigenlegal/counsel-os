import { expect, test } from 'bun:test';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Database } from 'bun:sqlite';
import { WorkspaceStore } from './store';
import { lockWorkspace } from './lock';

test('SIGKILL recovery preserves acknowledged work and uploads, rolls back an open transaction, and never repeats a model call', async () => {
  const root = mkdtempSync(join(tmpdir(), 'counsel-crash-test-')), path = join(root, 'workspace.sqlite3');
  const child = Bun.spawn([process.execPath, join(import.meta.dir, 'fixtures/crash-worker.ts'), path], { stdout: 'pipe', stderr: 'pipe' });
  let store: WorkspaceStore | undefined, release: (() => void) | undefined;
  const timeout = setTimeout(() => child.kill('SIGKILL'), 10_000);
  try {
    const reader = child.stdout.getReader();
    const first = await reader.read(); reader.releaseLock();
    if (!first.value) throw new Error('Crash fixture did not become ready: ' + await new Response(child.stderr).text());
    const ids = JSON.parse(new TextDecoder().decode(first.value));
    expect(() => lockWorkspace(path)).toThrow('already running');
    child.kill('SIGKILL'); await child.exited;
    expect(child.signalCode).toBe('SIGKILL');
    expect(existsSync(path + '.lock')).toBe(true); // No graceful cleanup occurred.
    release = lockWorkspace(path);
    store = new WorkspaceStore({ databasePath: path });
    store.conversations.recover();
    const partial = store.conversations.turn(ids.runningId), completed = store.conversations.turn(ids.completedId);
    expect(partial).toMatchObject({ status: 'interrupted', workId: null, state: { answer: 'Durable partial text.' } });
    expect(partial.state.activity[0]?.status).toBe('failed');
    expect(completed.status).toBe('complete');
    expect(store.getWork(completed.workId!).answer).toBe('Completed synthetic answer.');
    expect(store.getKnowledge(ids.practiceId).active?.body).toBe('Preserve this baseline.');
    expect(store.listMatters().some(matter => matter.title === 'Uncommitted ghost')).toBe(false);
    await store.imports.idle();
    expect(store.imports.get(ids.batchId).progress).toMatchObject({ ready: 1, awaitingUpload: 1 });
    expect(store.imports.inspect(ids.batchId, ids.entryId).body).toBe('one');
    expect(store.catalog().sources).toHaveLength(0);
    const retry = store.conversations.begin(ids.conversationId, { clientId: ids.clientId, message: 'An unfinished exchange.' }, 'fixture');
    expect(retry).toMatchObject({ created: false, turn: { id: ids.runningId, status: 'interrupted' } });
    expect(store.listWork()).toHaveLength(1);
    const db = new Database(path, { readonly: true });
    try { expect(db.query('PRAGMA integrity_check').get()).toEqual({ integrity_check: 'ok' }); expect(db.query('PRAGMA foreign_key_check').all()).toEqual([]); }
    finally { db.close(); }
  } finally {
    clearTimeout(timeout); if (child.exitCode === null) child.kill('SIGKILL'); await child.exited;
    store?.close(); release?.(); rmSync(root, { recursive: true, force: true });
  }
}, 15_000);
