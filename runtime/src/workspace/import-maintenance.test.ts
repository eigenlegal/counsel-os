import { afterEach, beforeEach, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdtempSync, rmSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { WorkspaceStore } from './store';
import { createWorkspaceBackup, restoreWorkspaceBackup } from './backups';
import { workspaceHandler } from './http';
import type { ImportChoice } from './import-types';

let root: string, store: WorkspaceStore;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'counsel-import-maintenance-')); store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') }); });
afterEach(() => { store.close(); rmSync(root, { recursive: true, force: true }); });
async function stage(files: Record<string, string>) {
  const batch = store.imports.create({ clientId: crypto.randomUUID(), label: 'Synthetic import',
    files: Object.entries(files).map(([path, text]) => ({ path, byteCount: Buffer.byteLength(text) })) });
  for (const entry of batch.entries) store.imports.receive(batch.id, entry.id, Buffer.from(files[entry.path]!).toString('base64'));
  await store.imports.idle(); return store.imports.get(batch.id);
}
function commit(id: string) { return store.imports.commit(id, { expectedRevisionId: store.imports.get(id).revisionId, allowPracticeWideTemplates: true }); }
function choice(id: string, entryId: string, patch: Partial<ImportChoice>) {
  const batch = store.imports.get(id), before = batch.entries.find(item => item.id === entryId)!;
  return store.imports.edit(id, entryId, { expectedRevisionId: batch.revisionId, choice: { ...before.choice, ...patch } });
}

test('renamed exact originals are detected across batches and pages; skip leaves saved data and matter links unchanged', async () => {
  const initial = await stage({ 'Original.txt': 'Same bytes.' }), saved = commit(initial.id).receipt!.items[0]!;
  const before = store.getSource(saved.sourceId);
  const incoming = await stage(Object.fromEntries([...Array.from({ length: 61 }, (_, i) => [`Folder/Renamed-${i}.txt`, 'Same bytes.']), ['New.txt', 'New bytes.']]));
  const preview = store.imports.duplicates(incoming.id);
  expect(preview.items).toHaveLength(61);
  expect(preview.items.every(item => item.sourceId === before.id)).toBe(true);
  store.imports.skipDuplicates(incoming.id, { expectedVersion: preview.expectedVersion, entryIds: preview.items.map(item => item.entryId) });
  expect(store.imports.get(incoming.id).selection.included).toBe(1);
  expect(store.imports.duplicates(incoming.id).items).toHaveLength(0);
  expect(store.getSource(before.id)).toEqual(before);
  expect(commit(incoming.id).receipt!.items).toHaveLength(1);
  expect(store.catalog().sources).toHaveLength(2);
});

test('old versions, Trash and corrupted originals cannot cause incoming files to be skipped; stale/foreign selections are atomic', async () => {
  const first = await stage({ 'Original.txt': 'Same bytes.' }), source = store.getSource(commit(first.id).receipt!.items[0]!.sourceId);
  const incoming = await stage({ 'A.txt': 'Same bytes.', 'B.txt': 'Different.' }), preview = store.imports.duplicates(incoming.id);
  expect(() => store.imports.skipDuplicates(incoming.id, { expectedVersion: preview.expectedVersion, entryIds: [preview.items[0]!.entryId, incoming.entries[1]!.id] })).toThrow('no longer matches');
  expect(store.imports.get(incoming.id).selection.included).toBe(2);
  const update = await store.updateSourceFile(source.id, { expectedRevisionId: source.latest.id, name: 'Original.txt', base64: Buffer.from('Changed bytes.').toString('base64') });
  expect(() => store.imports.skipDuplicates(incoming.id, { expectedVersion: preview.expectedVersion, entryIds: [preview.items[0]!.entryId] })).toThrow('changed');
  expect(store.imports.duplicates(incoming.id).items).toHaveLength(0);
  const newer = await stage({ 'C.txt': 'Changed bytes.' });
  const impact = store.recordImpact('source', update.id);
  store.changeRecord('source', update.id, { expectedVersion: impact.version, action: 'trash', confirm: true });
  expect(store.imports.duplicates(newer.id).items).toHaveLength(0);
  store.changeRecord('source', update.id, { expectedVersion: store.recordImpact('source', update.id).version, action: 'restore', confirm: true });
  const corrupt = store.imports.duplicates(newer.id);
  unlinkSync(`${store.databasePath}.originals/${update.latest.provenance.originalHash}`);
  expect(() => store.imports.skipDuplicates(newer.id, { expectedVersion: corrupt.expectedVersion, entryIds: [newer.entries[0]!.id] })).toThrow('original');
  expect(store.imports.get(newer.id).selection.included).toBe(1);
});

test('guarded undo trashes unused originals, withdraws unreviewed practice, disables templates and keeps all bytes/history/matters', async () => {
  const staged = await stage({ 'Case/File.txt': 'Saved test file.', 'Position.txt': 'A synthetic position.', 'Template.txt': 'A synthetic starting point.' });
  const matter = store.createMatter({ title: 'Existing matter' });
  choice(staged.id, staged.entries[0]!.id, { matterId: matter.id, matterTitle: null });
  choice(staged.id, staged.entries[1]!.id, { destination: 'position' });
  choice(staged.id, staged.entries[2]!.id, { destination: 'template', whenToUse: 'Synthetic test only.' });
  const saved = commit(staged.id), receipt = saved.receipt!, preview = store.imports.undoPreview(staged.id);
  expect(preview.items.every(item => item.canUndo)).toBe(true);
  const beforeBytes = receipt.items.map(item => store.originalFile(item.sourceRevisionId).bytes);
  const input = { requestId: crypto.randomUUID(), expectedVersion: preview.expectedVersion, entryIds: preview.items.map(item => item.entryId) };
  const undone = store.imports.undo(staged.id, input);
  expect(undone.undone?.sourceIds).toHaveLength(3);
  for (const [index, item] of receipt.items.entries()) {
    expect(store.getSource(item.sourceId).lifecycle).toBe('trashed');
    expect(store.originalFile(item.sourceRevisionId).bytes).toEqual(beforeBytes[index]!);
    if (item.practiceId) { expect(store.getKnowledge(item.practiceId).latest.status).toBe('rejected'); expect(store.getKnowledge(item.practiceId).active).toBeNull(); }
    if (item.templateId) expect(store.templates.get(item.templateId).available).toBe(false);
  }
  expect(store.getMatter(matter.id).title).toBe('Existing matter');
  expect(store.conversations.list()).toHaveLength(0);
  expect(store.catalog().work).toHaveLength(0); // No invented human decision in audit.
  expect(store.imports.undo(staged.id, input)).toEqual(undone);
  const backup = await createWorkspaceBackup(store.databasePath), path = join(root, backup.name);
  await Bun.write(path, backup.bytes);
  const restored = await restoreWorkspaceBackup(path, root), copy = new WorkspaceStore({ databasePath: restored.databasePath });
  try { expect(copy.imports.undoPreview(staged.id).undone).toEqual(undone.undone); expect(copy.originalFile(receipt.items[0]!.sourceRevisionId).bytes).toEqual(beforeBytes[0]!); }
  finally { copy.close(); }
});

test('changed, adopted, read, cited and newly linked records are kept; an unchanged unrelated import item remains eligible', async () => {
  const staged = await stage({ 'Changed.txt': 'One.', 'Adopted.txt': 'Two.', 'Read.txt': 'Three.', 'Linked.txt': 'Four.', 'Support.txt': 'Five.', 'Untouched.txt': 'Six.' });
  choice(staged.id, staged.entries[1]!.id, { destination: 'position' });
  const saved = commit(staged.id).receipt!, [changed, adopted, read, linked, support] = saved.items;
  await store.updateSourceFile(changed!.sourceId, { expectedRevisionId: changed!.sourceRevisionId, name: 'Changed.txt', base64: Buffer.from('Changed.').toString('base64') });
  const p = store.getKnowledge(adopted!.practiceId!); store.reviewKnowledge(p.id, p.latest.id, 'approve', 'Synthetic Avery');
  const conversation = store.conversations.create({}); store.conversations.begin(conversation.id, { clientId: crypto.randomUUID(), message: 'Read this.', attachments: [read!.sourceRevisionId] }, 'fixture');
  store.linkSource(store.createMatter({ title: 'Another matter' }).id, linked!.sourceId);
  store.createKnowledge({ kind: 'method', revision: { title: 'Dependent method', body: 'Keep this.', supportingEvidence: [{ target: { kind: 'source', revisionId: support!.sourceRevisionId }, start: 0, quote: 'Five.' }] } });
  const preview = store.imports.undoPreview(staged.id);
  expect(preview.items.map(item => item.canUndo)).toEqual([false, false, false, false, false, true]);
  expect(() => store.imports.undo(staged.id, { expectedVersion: preview.expectedVersion, requestId: crypto.randomUUID(), entryIds: [changed!.entryId, saved.items[5]!.entryId] })).toThrow('unused');
  expect(store.getSource(saved.items[5]!.sourceId).lifecycle).toBe('active');
});

test('concurrent dependencies invalidate preview and a late write failure rolls back the entire undo', async () => {
  const staged = await stage({ 'First.txt': 'One.', 'Second.txt': 'Two.' }), saved = commit(staged.id).receipt!, preview = store.imports.undoPreview(staged.id);
  store.recordWork({ title: 'New dependent work', request: 'Review', answer: 'Test', evidence: [{ target: { kind: 'source', revisionId: saved.items[0]!.sourceRevisionId }, start: 0, quote: 'One.' }] });
  expect(() => store.imports.undo(staged.id, { expectedVersion: preview.expectedVersion, requestId: crypto.randomUUID(), entryIds: [saved.items[1]!.entryId] })).toThrow('changed');
  const current = store.imports.undoPreview(staged.id), db = new Database(store.databasePath);
  db.run("CREATE TRIGGER stop_import_undo BEFORE UPDATE OF receipt_json ON import_batches BEGIN SELECT RAISE(ABORT,'synthetic receipt failure'); END");
  try { expect(() => store.imports.undo(staged.id, { expectedVersion: current.expectedVersion, requestId: crypto.randomUUID(), entryIds: [saved.items[1]!.entryId] })).toThrow('synthetic'); }
  finally { db.run('DROP TRIGGER stop_import_undo'); db.close(); }
  expect(store.getSource(saved.items[1]!.sourceId).lifecycle).toBe('active');
  expect(store.imports.get(staged.id).receipt!.undo).toBeUndefined();
});

test('maintenance endpoints require authentication; preview is nonmutating and no model tool exposes undo', async () => {
  const staged = await stage({ 'File.txt': 'One.' }); commit(staged.id);
  const handler = workspaceHandler({ store, token: 'test', origin: 'http://127.0.0.1:7458', distDir: '.', demo: true });
  const url = `http://127.0.0.1:7458/api/workspace/imports/${staged.id}/undo`;
  expect((await handler(new Request(url))).status).toBe(401);
  const response = await handler(new Request(url, { headers: { authorization: 'Bearer test' } }));
  expect(response.status).toBe(200);
  expect(store.imports.get(staged.id).receipt!.undo).toBeUndefined();
});

test('a thousand-file cleanup reviews and acts on the complete batch without a UI-page limit', async () => {
  const staged = await stage(Object.fromEntries(Array.from({ length: 1000 }, (_, i) => [`File-${i}.txt`, 'Synthetic retained bytes.'])));
  const saved = commit(staged.id), started = performance.now(), preview = store.imports.undoPreview(staged.id);
  expect(preview.items).toHaveLength(1000);
  expect(preview.items.every(item => item.canUndo)).toBe(true);
  const result = store.imports.undo(staged.id, { expectedVersion: preview.expectedVersion, requestId: crypto.randomUUID(), entryIds: preview.items.map(item => item.entryId) });
  expect(result.undone?.sourceIds).toHaveLength(1000);
  expect(store.originalFile(saved.receipt!.items[999]!.sourceRevisionId).bytes.toString()).toBe('Synthetic retained bytes.');
  console.log(`1,000-file preview + atomic cleanup: ${Math.round(performance.now() - started)} ms`);
}, 20_000);
