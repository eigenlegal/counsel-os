import { afterEach, beforeEach, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { WorkspaceStore, textHash } from './store';
import { openWorkspaceDatabase } from './database';
import { createWorkspaceBackup, inspectWorkspaceBackup, restoreWorkspaceBackup } from './backups';
import { workspaceHandler } from './http';
import type { UpkeepFinding } from './upkeep-types';

let root: string, store: WorkspaceStore, now: Date;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'counsel-upkeep-')); now = new Date('2026-09-08T12:00:00Z');
  store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3'), clock: () => now }); });
afterEach(() => { store.close(); rmSync(root, { recursive: true, force: true }); });
const source = (title = 'Loose file', textStatus: 'ready' | 'partial' = 'ready') => store.createSource({ kind: 'reference',
  revision: { title, body: 'Synthetic document facts.', textStatus, provenance: { origin: 'fixture:upkeep' } } });
function drain() { let ticks = 0; do { store.upkeep.pulse(100); if (++ticks > 100) throw new Error('Queue did not settle.'); } while (store.upkeep.status().pending); }
const decision = (item: UpkeepFinding, action: 'dismiss' | 'restore' = 'dismiss') => ({ kind: item.kind, targetId: item.targetId, code: item.code, expectedVersion: item.version, action });

test('transactional events coalesce, rollbacks disappear, and checks never alter content, sharing or standards', () => {
  drain(); const a = source(), b = source('Other');
  store.placeSource(b.id, { collection: 'practice', expectedRevisionId: null });
  store.placeSource(b.id, { collection: 'auto', expectedRevisionId: store.getSource(b.id).placement!.revisionId });
  expect(store.upkeep.status().pending).toBe(3); // Two source checks plus one coalesced cross-import refresh.
  const db = new Database(store.databasePath);
  try {
    expect(() => db.transaction(() => { db.run("INSERT INTO source_placements VALUES (?,'external',?,'fixture')", [a.id, crypto.randomUUID()]); throw new Error('rollback'); })()).toThrow('rollback');
  } finally { db.close(); }
  const before = store.catalog(); drain();
  expect(store.catalog()).toEqual(before);
  expect(store.upkeep.status().attention).toBe(2);
  expect(store.upkeep.status().history[0]!.reason).toBe('changes');
  expect(store.upkeep.status().history[0]!.checked).toBe(2);
  expect(store.upkeep.status().history[0]!.completedAt).not.toBeNull();
  expect(store.sourceMatters(a.id).matters).toEqual([]);
  expect(store.getProfile()).toBeNull(); expect(store.getWorkingPreferences()).toBeNull();
});

test('leave-as-is survives checks/reopen; actual revisions resurface findings and stale decisions refuse', () => {
  const s = source('Partial notes', 'partial'); drain();
  const original = store.upkeep.status().items;
  for (const item of original) store.upkeep.decide(decision(item));
  store.upkeep.request(); drain(); expect(store.upkeep.status().attention).toBe(0);
  expect(store.upkeep.status({ view: 'dismissed' }).total).toBe(2);
  const path = store.databasePath; store.close(); store = new WorkspaceStore({ databasePath: path, clock: () => now });
  drain(); expect(store.upkeep.status().attention).toBe(0);
  store.updateSourceText(s.id, { expectedRevisionId: s.latest.id, title: s.latest.title, body: 'More complete notes.', origin: 'fixture:upkeep', textStatus: 'ready' });
  expect(() => store.upkeep.decide(decision(original[0]!))).toThrow('changed');
  drain(); const revised = store.upkeep.status().items;
  expect(revised).toHaveLength(1); expect(revised[0]!.code).toBe('unfiled');
  expect(revised[0]!.version).not.toBe(original[0]!.version);
  store.upkeep.decide(decision(revised[0]!));
  store.upkeep.decide(decision(revised[0]!, 'restore'));
  expect(store.upkeep.status().attention).toBe(1);
  store.placeSource(s.id, { collection: 'external', expectedRevisionId: null }); drain();
  expect(store.upkeep.status().attention).toBe(0); expect(store.upkeep.status().dismissed).toBe(0);
});

test('matter links, unlinking, Trash and restoration update findings without changing the originals', () => {
  const s = source(), matter = store.createMatter({ title: 'Synthetic NDA' }); drain();
  store.linkSource(matter.id, s.id); drain(); expect(store.upkeep.status().attention).toBe(0);
  store.changeSourceMatter(s.id, { action: 'unlink', matterId: matter.id, expectedVersion: store.sourceMatters(s.id).version, confirm: true });
  drain(); expect(store.upkeep.status().attention).toBe(1);
  store.changeRecord('source', s.id, { action: 'trash', confirm: true, expectedVersion: store.recordImpact('source', s.id).version });
  drain(); expect(store.upkeep.status().attention).toBe(0);
  store.changeRecord('source', s.id, { action: 'restore', confirm: true, expectedVersion: store.recordImpact('source', s.id).version });
  drain(); expect(store.upkeep.status().attention).toBe(1);
  expect(store.getSource(s.id).latest).toEqual(s.latest);
});

test('periodic and manual sweeps share the queue, respect bounded pages and recover missed events', () => {
  for (let i = 0; i < 121; i++) source(`File ${i}`);
  store.upkeep.request(); store.upkeep.request();
  expect(store.upkeep.status().history).toHaveLength(1);
  store.upkeep.pulse(25); expect(store.upkeep.status().pending).toBe(96); drain();
  const result = store.upkeep.status(); expect(result.total).toBe(121); expect(result.items).toHaveLength(50);
  expect(store.upkeep.status({ offset: 100 }).items).toHaveLength(21);
  const count = result.history.length;
  store.upkeep.pulse(); expect(store.upkeep.status().history).toHaveLength(count);
  // Simulate a missed event; the periodic sweep must reconcile the actual current state.
  const db = new Database(store.databasePath);
  db.run("INSERT INTO source_placements VALUES (?,'external',?,'fixture')", [result.items[0]!.targetId, crypto.randomUUID()]);
  db.run('DELETE FROM upkeep_queue'); db.close();
  now = new Date(now.getTime() + 4 * 60 * 60 * 1000); drain();
  expect(store.upkeep.status().total).toBe(120); expect(store.upkeep.status().history[0]!.reason).toBe('periodic');
  expect(() => store.upkeep.pulse(101)).toThrow();
});

test('unfinished imports and unresolved links surface; commit resolves import findings without replaying AI', async () => {
  const batch = store.imports.create({ clientId: crypto.randomUUID(), label: 'Cross-folder import', files: [{ path: 'note.md', byteCount: 11 }] });
  drain(); expect(store.upkeep.status().items[0]!.detail).toContain('uploading');
  store.imports.receive(batch.id, batch.entries[0]!.id, Buffer.from('[[missing]]').toString('base64'));
  await store.imports.idle(); drain();
  const result = store.upkeep.status(); expect(result.items.map(i => i.code)).toContain('import-links');
  expect(result.items.find(i => i.code === 'import-links')!.detail).toContain('1 unresolved');
  expect(store.imports.organization.get(batch.id)).toBeNull();
  store.imports.commit(batch.id, { expectedRevisionId: store.imports.get(batch.id).revisionId }); drain();
  expect(store.upkeep.status().items.every(i => i.kind === 'source')).toBe(true);
  expect(store.catalog().sources).toHaveLength(1);
});

test('failed checks retain tasks without hot retry, then recover through the same manual action', () => {
  const s = source(); drain();
  const inspect = (store.upkeep as any).inspect;
  (store.upkeep as any).inspect = () => { throw new Error('Sensitive internal detail'); };
  store.upkeep.request(); store.upkeep.pulse();
  const failed = store.upkeep.status(); expect(failed.failed).toBe(1); expect(failed.errors[0]!.error).not.toContain('Sensitive');
  expect(store.upkeep.pulse()).toBe(0);
  (store.upkeep as any).inspect = inspect;
  store.upkeep.request(); drain(); expect(store.upkeep.status().failed).toBe(0);
  expect(store.upkeep.status().items[0]!.targetId).toBe(s.id);
});

test('SIGKILL preserves committed checkpoints and remaining queue; backup retains decisions and queued work', async () => {
  for (let i = 0; i < 4; i++) source(`Crash fixture ${i}`);
  const path = store.databasePath; store.close();
  const child = Bun.spawn([process.execPath, '-e', `import { WorkspaceStore } from './runtime/src/workspace/store';
    const store = new WorkspaceStore({databasePath:process.argv[1]}); store.upkeep.pulse(1);
    console.log('checkpoint'); setInterval(()=>{},1000);`, path], { stdout: 'pipe', stderr: 'pipe' });
  const reader = child.stdout.getReader();
  try { const value = await reader.read(); expect(new TextDecoder().decode(value.value)).toContain('checkpoint'); }
  finally { child.kill('SIGKILL'); await child.exited; reader.releaseLock(); }
  store = new WorkspaceStore({ databasePath: path });
  expect(store.upkeep.status().pending).toBe(3); expect(store.upkeep.status().attention).toBe(1);
  const finding = store.upkeep.status().items[0]!; store.upkeep.decide(decision(finding));
  const backup = await createWorkspaceBackup(path); expect((await inspectWorkspaceBackup(backup.bytes)).schemaVersion).toBe(19);
  const file = join(root, 'fixture.counsel-backup'); writeFileSync(file, backup.bytes);
  const restored = await restoreWorkspaceBackup(file, join(root, 'recovered'));
  const copy = new WorkspaceStore({ databasePath: restored.databasePath });
  try { expect(copy.upkeep.status().pending).toBe(3); copy.upkeep.pulse(100);
    expect(copy.upkeep.status().attention).toBe(3); expect(copy.upkeep.status().dismissed).toBe(1);
    expect(copy.upkeep.status().history[0]!.checked).toBe(4);
  } finally { copy.close(); }
});

test('schema-15 backups remain valid and additive migration queues existing files for reconciliation', async () => {
  const old = openWorkspaceDatabase(':memory:', 15), path = join(root, 'old.sqlite3');
  const id = crypto.randomUUID();
  old.run("INSERT INTO sources VALUES (?,'reference',?)", [id, now.toISOString()]);
  old.run("INSERT INTO source_revisions VALUES (?,?,1,'Existing note','Earlier facts','ready',?,?,?)", [crypto.randomUUID(), id, textHash('Earlier facts'), '{"origin":"fixture:old"}', now.toISOString()]);
  old.exec(`VACUUM INTO '${path}'`); old.close();
  const backup = await createWorkspaceBackup(path); expect((await inspectWorkspaceBackup(backup.bytes)).schemaVersion).toBe(15);
  const migrated = new WorkspaceStore({ databasePath: path });
  try { const before = migrated.getSource(id); migrated.upkeep.pulse(); expect(migrated.upkeep.status().attention).toBe(1);
    expect(migrated.getSource(id)).toEqual(before); }
  finally { migrated.close(); }
  const db = new Database(path); expect(db.query('PRAGMA user_version').get()).toEqual({ user_version: 19 }); expect(db.query('PRAGMA foreign_key_check').all()).toEqual([]); db.close();
});

test('backup validation refuses malformed derived finding identities rather than retaining unsafe review targets', async () => {
  const s = source(); drain();
  const db = new Database(store.databasePath);
  try { db.run("UPDATE upkeep_findings SET target_id='invalid'");
    await expect(createWorkspaceBackup(store.databasePath)).rejects.toThrow();
  } finally { db.run('UPDATE upkeep_findings SET target_id=?', [s.id]); db.close(); }
});

test('authenticated API validates decisions and checks; GET is nonmutating and the worker yields to running chats', async () => {
  const s = source(); drain(); const item = store.upkeep.status().items[0]!;
  const origin = 'http://127.0.0.1:7469', handler = workspaceHandler({ store, origin, token: 'fixture', distDir: root, demo: false });
  const call = (path: string, input?: unknown, token = 'fixture') => handler(new Request(origin+'/api/workspace'+path,
    { headers: { authorization: 'Bearer '+token, 'content-type': 'application/json' }, ...(input === undefined ? {} : { method: 'POST', body: JSON.stringify(input) }) }));
  const before = store.upkeep.status(); expect((await call('/upkeep')).status).toBe(200); expect(store.upkeep.status()).toEqual(before);
  expect((await call('/upkeep', undefined, 'wrong')).status).toBe(401);
  expect((await call('/upkeep/check', { expandAccess: true })).status).toBe(400);
  expect((await call('/upkeep/decision', { ...decision(item), expectedVersion: '0'.repeat(64) })).status).toBe(409);
  expect((await call('/upkeep/decision', decision(item))).status).toBe(200);
  const conversation = store.conversations.create({ title: 'Busy', scope: 'conversation' });
  store.conversations.begin(conversation.id, { clientId: crypto.randomUUID(), message: 'Fixture' }, 'fixture');
  expect((await call('/upkeep/check', {})).status).toBe(200);
  await Bun.sleep(400); expect(store.upkeep.status().pending).toBe(1);
  store.conversations.recover();
  await Bun.sleep(1700); expect(store.upkeep.status().pending).toBe(0);
  expect(store.upkeep.status().dismissed).toBe(1); expect(store.getSource(s.id).latest).toEqual(s.latest);
});
