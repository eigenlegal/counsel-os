import { afterEach, beforeEach, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { WorkspaceStore } from './store';
import { sourceLinkPath, type SourceLinkPreview } from './source-links';
import { createWorkspaceBackup, inspectWorkspaceBackup, restoreWorkspaceBackup } from './backups';
import { openWorkspaceDatabase } from './database';
import { workspaceHandler } from './http';
import { WorkspaceChat } from './chat';
import { FakeModelProvider } from '../core/fake-provider';

let root: string, store: WorkspaceStore;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'counsel-source-links-')); store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') }); });
afterEach(() => { store.close(); rmSync(root, { recursive: true, force: true }); });
function drain() { for (let n = 0; n < 100; n++) { store.upkeep.pulse(100); if (!store.upkeep.status().pending) return; } throw new Error('Queue did not settle'); }
function source(path: string, body: string, matterId?: string, origin = 'plugin:') {
  return store.createSource({ kind: 'reference', matterIds: matterId ? [matterId] : [],
    revision: { title: path, body, textStatus: 'ready', provenance: { origin: origin + path } } });
}
async function imported(path: string, body: string, matterId?: string) {
  const batch = store.imports.create({ clientId: crypto.randomUUID(), label: path.slice(0, 200), files: [{ path, byteCount: Buffer.byteLength(body) }] });
  store.imports.receive(batch.id, batch.entries[0]!.id, Buffer.from(body).toString('base64')); await store.imports.idle();
  const ready = store.imports.get(batch.id);
  store.imports.edit(batch.id, ready.entries[0]!.id, { expectedRevisionId: ready.revisionId,
    choice: { ...ready.entries[0]!.choice, destination: 'source', collection: 'unfiled', matterId: matterId ?? null, matterTitle: null } });
  const committed = store.imports.commit(batch.id, { expectedRevisionId: store.imports.get(batch.id).revisionId });
  return store.getSource(committed.receipt!.items[0]!.sourceId);
}
function apply(preview: SourceLinkPreview, ids = preview.items.filter(i => i.canShare).map(i => i.id)) {
  return store.applySourceLinks(preview.sourceId, { expectedVersion: preview.expectedVersion, linkIds: ids, confirmAccessChanges: true });
}
const linkFinding = (id: string) => store.upkeep.status().items.find(i => i.code === 'source-links' && i.targetId === id)!;

test('later separate import resolves an earlier reference; only reviewed links reach matter retrieval and chat context', async () => {
  const matter = store.createMatter({ title: 'Acme NDA' }), other = store.createMatter({ title: 'Unrelated matter' });
  const note = await imported('Counsel/matters/nda.md', 'Review record. [[Companies/Acme/background]]', matter.id);
  drain(); expect(linkFinding(note.id).detail).toContain('1 unresolved');
  const company = await imported('Companies/Acme/background.md', 'COMPANYFACTS signed address history. This is not signing authority.');
  drain(); expect(linkFinding(note.id).detail).toContain('1 possible matter');
  let review = store.sourceLinks(note.id); expect(review.shareable).toBe(1); expect(review.items[0]!.crossImport).toBe(true);
  expect(store.search({ matterId: matter.id, query: 'COMPANYFACTS' }).hits).toHaveLength(0);
  expect(apply(review).added).toBe(1); drain(); expect(linkFinding(note.id)).toBeUndefined();
  expect(store.getSource(company.id).latest).toEqual(company.latest);
  expect(store.getSource(company.id).matterIds).toEqual([matter.id]);
  expect(store.search({ matterId: other.id, query: 'COMPANYFACTS' }).hits).toHaveLength(0);
  const provider = new FakeModelProvider([{ text: 'Synthetic qualification answer.' }]), chat = new WorkspaceChat(store, () => provider);
  try {
    const conversation = store.conversations.create({ scope: 'matter', matterId: matter.id });
    const turn = chat.start(conversation.id, { clientId: crypto.randomUUID(), message: 'What company background do we have?' }); await chat.idle();
    expect(store.conversations.turn(turn.id).status).toBe('complete');
    expect(provider.lastRequest!.system).toContain('COMPANYFACTS');
    expect(store.conversations.turn(turn.id).state.context.some(r => r.id === company.latest.id && r.ranges.length)).toBe(true);
  } finally { chat.stop(); await chat.idle(); }
  expect(store.clients.list()).toHaveLength(0); expect(store.catalog().knowledge).toHaveLength(0);
  expect(store.getProfile()).toBeNull(); expect(store.getEntityRegistry()).toBeNull();
  review = store.sourceLinks(note.id); expect(review.items[0]!.alreadyShared).toBe(true);
  store.changeSourceMatter(company.id, { action: 'unlink', matterId: matter.id, expectedVersion: store.sourceMatters(company.id).version, confirm: true });
  drain(); expect(store.sourceLinks(note.id).shareable).toBe(1); expect(store.getSource(company.id).matterIds).toEqual([]);
});

test('plugin note provenance works across imported roots, while network/absolute/traversal links are never followed', async () => {
  const matter = store.createMatter({ title: 'Matter' });
  const note = source('matters/note.md', '[[Companies/Acme/facts]]\n[site](https://example.com)\n[local](/Users/private.txt)\n[escape](../../private.txt)\n`[[fake]]`', matter.id);
  const target = await imported('Companies/Acme/facts.md', 'Company facts');
  const review = store.sourceLinks(note.id);
  expect(review.items).toHaveLength(4); expect(review.shareable).toBe(1); expect(review.unresolved).toBe(2);
  expect(review.items[0]!.targetId).toBe(target.id);
  expect(review.items.filter(i => i.status === 'outside').every(i => !i.canShare)).toBe(true);
  for (const path of ['plugin:../secret.md', 'file:/secret.md', 'https://example.com/a.md', 'import:not-uuid/a.md', 'plugin:/secret.md']) expect(sourceLinkPath(path)).toBeNull();
  const web = source('research.md', '[Citation](https://example.com/statute)'); drain(); expect(linkFinding(web.id)).toBeUndefined();
});

test('name collisions remain ambiguous; same-import identity takes priority; relative Markdown does not guess filenames', async () => {
  const matter = store.createMatter({ title: 'Matter' });
  const note = source('notes/note.md', '[[facts]]\n[Draft](draft.txt)', matter.id);
  await imported('One/facts.md', 'A'); const b = await imported('Two/facts.md', 'B'); await imported('Other/draft.txt', 'Draft');
  expect(store.sourceLinks(note.id).items.map(i => i.status)).toEqual(['ambiguous','missing']);
  expect(store.sourceLinks(note.id).shareable).toBe(0);
  const local = source('notes/facts.md', 'Same original root');
  expect(store.sourceLinks(note.id).items[0]!.targetId).toBe(local.id);
  expect(store.sourceLinks(note.id).items[0]!.targetId).not.toBe(b.id);
});

test('current matter choices win over old receipts; reviewed additional access never overwrites other filing', async () => {
  const a = store.createMatter({ title: 'Original' }), b = store.createMatter({ title: 'Corrected' }), c = store.createMatter({ title: 'Existing document matter' });
  const note = await imported('notes/record.md', '[[background]]', a.id), target = await imported('company/background.md', 'Facts', c.id);
  store.changeSourceMatter(note.id, { action: 'unlink', matterId: a.id, expectedVersion: store.sourceMatters(note.id).version, confirm: true }); store.linkSource(b.id, note.id);
  let review = store.sourceLinks(note.id); expect(review.items[0]!.matter?.id).toBe(b.id);
  apply(review); expect(store.getSource(target.id).matterIds.sort()).toEqual([b.id,c.id].sort());
  expect(store.getSource(target.id).latest).toEqual(target.latest);
  store.placeSource(target.id, { collection: 'practice', expectedRevisionId: null });
  store.linkSource(a.id, note.id); review = store.sourceLinks(note.id); expect(review.shareable).toBe(0);
  store.placeSource(target.id, { collection: 'external', expectedRevisionId: store.getSource(target.id).placement!.revisionId });
  expect(store.sourceLinks(note.id).shareable).toBe(0);
});

test('stale note, target revision, duplicate arrival, renamed matter, placement and Trash refuse atomically', async () => {
  const matter = store.createMatter({ title: 'Original' });
  const note = source('note.md', '[[facts]]', matter.id), target = await imported('facts.md', 'Original facts');
  const mutate = async (change: () => unknown) => { const before = store.sourceLinks(note.id); await change(); expect(() => apply(before)).toThrow('changed'); expect(store.getSource(target.id).matterIds).toEqual([]); };
  await mutate(() => { const db = new Database(store.databasePath); db.run('UPDATE matters SET title=? WHERE id=?', ['Renamed', matter.id]); db.close(); });
  await mutate(() => store.updateSourceFile(target.id, { expectedRevisionId: target.latest.id, name: 'facts.md', base64: Buffer.from('Updated facts').toString('base64') }));
  await mutate(() => store.placeSource(target.id, { collection: 'practice', expectedRevisionId: null }));
  store.placeSource(target.id, { collection: 'auto', expectedRevisionId: store.getSource(target.id).placement!.revisionId });
  await mutate(() => store.changeRecord('source', target.id, { action: 'trash', expectedVersion: store.recordImpact('source', target.id).version, confirm: true }));
  store.changeRecord('source', target.id, { action: 'restore', expectedVersion: store.recordImpact('source', target.id).version, confirm: true });
  await mutate(() => store.updateSourceText(note.id, { expectedRevisionId: note.latest.id, title: note.latest.title, body: 'Updated note. [[facts]]', origin: 'plugin:note.md', textStatus: 'ready' }));
  await mutate(() => imported('facts.md', 'Different file'));
  const before = store.sourceLinks(note.id);
  expect(() => apply(before, [before.items[0]!.id])).toThrow('cannot be shared');
  expect(() => apply(before, ['0'.repeat(64)])).toThrow('cannot be shared');
});

test('dismissal survives unrelated activity and backup/restart; a later relevant target resurfaces it', async () => {
  const matter = store.createMatter({ title: 'Matter' }), note = source('note.md', '[[future]]', matter.id); drain();
  const finding = linkFinding(note.id);
  store.upkeep.decide({ kind: 'source', targetId: note.id, code: 'source-links', expectedVersion: finding.version, action: 'dismiss' });
  await imported('unrelated.md', 'Other facts'); drain(); expect(linkFinding(note.id)).toBeUndefined();
  expect(store.upkeep.status({ view: 'dismissed' }).items.some(i => i.targetId === note.id)).toBe(true);
  // Backup with the coalesced dependency refresh still pending.
  await imported('future.md', 'Arrived later');
  const backup = await createWorkspaceBackup(store.databasePath); expect((await inspectWorkspaceBackup(backup.bytes)).schemaVersion).toBe(20);
  const file = join(root, 'fixture.counsel-backup'); writeFileSync(file, backup.bytes);
  const restored = await restoreWorkspaceBackup(file, join(root, 'restored'));
  store.close(); store = new WorkspaceStore({ databasePath: restored.databasePath }); drain();
  expect(linkFinding(note.id).version).not.toBe(finding.version); expect(store.sourceLinks(note.id).shareable).toBe(1);
  expect(() => store.upkeep.decide({ kind: 'source', targetId: note.id, code: 'source-links', expectedVersion: finding.version, action: 'dismiss' })).toThrow('changed');
});

test('read-only paged API and exact confirmation, all-or-nothing selections; no AI calls are involved', async () => {
  const matter = store.createMatter({ title: 'Matter' });
  const note = source('note.md', Array.from({ length: 61 }, (_, i) => `[[doc${i}]]`).join('\n'), matter.id);
  for (let i = 0; i < 61; i++) source(`docs/doc${i}.md`, `Synthetic ${i}`);
  const review = store.sourceLinks(note.id); expect(review.total).toBe(61); expect(review.items).toHaveLength(50);
  const page = store.sourceLinks(note.id, { offset: 50 }); expect(page.items).toHaveLength(11);
  expect(() => apply(review, [page.items[0]!.id, '0'.repeat(64)])).toThrow('cannot be shared');
  expect(store.getSource(page.items[0]!.targetId!).matterIds).toEqual([]);
  const handler = workspaceHandler({ store, token: 'fixture', origin: 'http://localhost', distDir: join(root, 'none'), demo: false });
  const request = (body?: unknown, auth = true, query = '') => new Request(`http://localhost/api/workspace/sources/${note.id}/links${query}`, {
    method: body ? 'POST' : 'GET', headers: { ...(auth ? { Authorization: 'Bearer fixture' } : {}), 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  expect((await handler(request(undefined, false))).status).toBe(401);
  expect((await handler(request(undefined, true, '?offset=50'))).status).toBe(200);
  expect((await handler(request(undefined, true, '?unknown=true'))).status).toBe(400);
  const input = { expectedVersion: review.expectedVersion, linkIds: [page.items[0]!.id], confirmAccessChanges: true };
  expect((await handler(request({ ...input, confirmAccessChanges: false }))).status).toBe(400);
  expect((await handler(request(input))).status).toBe(200);
  expect(store.getSource(page.items[0]!.targetId!).matterIds).toEqual([matter.id]);
});

test('schema 16 migrates intact, including exact dismissed findings, and queues older note links', async () => {
  const legacy = openWorkspaceDatabase(':memory:', 16), legacyPath = join(root, 'legacy.sqlite3');
  const id = crypto.randomUUID(), revision = crypto.randomUUID(), at = '2026-09-08T12:00:00Z', version = '1'.repeat(64);
  legacy.run('INSERT INTO upkeep_findings VALUES (?,?,?,?,?,?,1,?,?)', ['source', id, 'unfiled', version, 'Old finding', 'Old detail', version, at]);
  writeFileSync(legacyPath, legacy.serialize()); legacy.close();
  const copy = new WorkspaceStore({ databasePath: legacyPath });
  try { expect(copy.upkeep.status({ view: 'dismissed' }).items[0]).toMatchObject({ targetId: id, version, title: 'Old finding' });
    expect((await inspectWorkspaceBackup((await createWorkspaceBackup(legacyPath)).bytes)).schemaVersion).toBe(20);
  } finally { copy.close(); }
});

test('coverage is explicit for long notes and reference limits; queue refresh coalesces and rolls back', () => {
  const matter = store.createMatter({ title: 'Matter' }); drain();
  const note = source('large.md', Array.from({ length: 120 }, (_, i) => `[[missing${i}]]`).join('\n') + '\n' + 'x'.repeat(500001), matter.id);
  const review = store.sourceLinks(note.id); expect(review.truncated).toBe(true); expect(review.total).toBe(100); expect(review.items).toHaveLength(50);
  drain(); const db = new Database(store.databasePath);
  try {
    expect(() => db.transaction(() => { db.run('UPDATE matters SET title=? WHERE id=?', ['Rolled back', matter.id]); throw new Error('rollback'); })()).toThrow('rollback');
    expect(db.query('SELECT * FROM source_link_refresh').all()).toHaveLength(0);
    for (let i = 0; i < 10; i++) db.run('UPDATE matters SET title=? WHERE id=?', [`Title ${i}`, matter.id]);
    expect(db.query('SELECT * FROM source_link_refresh').all()).toHaveLength(1);
  } finally { db.close(); }
  drain(); expect(store.upkeep.status().pending).toBe(0);
});
