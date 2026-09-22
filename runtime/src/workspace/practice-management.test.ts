import { afterEach, beforeEach, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { WorkspaceStore } from './store';
import { importedPracticeTitle } from './practice-presentation';
import { suggestImport } from './import-types';
import { seedImportedStandards } from './fixtures/imported-standards';
import { seedPluginContext } from './fixtures/plugin-context';
import { chatTools } from './chat-tools';
import { runToolDef } from '../core/fake-provider';
import { createWorkspaceBackup, inspectWorkspaceBackup, restoreWorkspaceBackup } from './backups';
import { prepareWorkspaceUpgrade } from './upgrade-safety';
import { workspaceHandler } from './http';

let root: string, store: WorkspaceStore;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'counsel-practice-management-')); store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') }); });
afterEach(() => { store.close(); rmSync(root, { recursive: true, force: true }); });
const boundary = { all: true, matterId: null, sourceRevisionIds: [], workIds: [] };
const trash = (id: string, action: 'trash' | 'restore' = 'trash') => store.changeRecord('knowledge', id, { action, expectedVersion: store.recordImpact('knowledge', id).version, confirm: true });
const item = () => store.createKnowledge({ kind: 'pattern', revision: { title: 'Synthetic retrospective', body: 'Retrospectivecanary observed in a single synthetic matter.', status: 'approved', approvedBy: 'Synthetic Reviewer' } });
const filing = (id: string, matterId: string | null) => ({ destination: matterId ? 'matter' as const : 'practice' as const, matterId, expectedVersion: store.recordImpact('knowledge', id).version, confirm: true as const });

test('receipt-backed frontmatter imports use real headings; unrelated hex names and user renames survive', () => {
  const original = { title: 'regional privacy   abcdef12', origin: 'import:fixture/Sources/regional-privacy - abcdef12.md', body: '---\ncounsel-os-type: law-area\n---\n# Regional privacy source map\n\nSynthetic authority map.' };
  expect(importedPracticeTitle(original.title, original)).toBe('Regional privacy source map');
  const retro = { title: 'retro 2026 01 02   abcdef12', origin: 'import:fixture/retro-2026-01-02 - abcdef12.md', body: '---\ncounsel-os-type: memory-patterns\n---\n# Retrospective — 2026-01-02\n\nSynthetic report.' };
  expect(importedPracticeTitle(retro.title, retro)).toBe('Retrospective — 2026-01-02');
  expect(importedPracticeTitle('My custom name abcdef12', retro)).toBe('My custom name abcdef12');
  expect(importedPracticeTitle(original.title, { ...original, body: '# Unrelated heading' })).toBe(original.title);
  expect(importedPracticeTitle(original.title, { ...original, origin: 'upload' })).toBe(original.title);
  expect(suggestImport('Practice/methods/retro-2026-01-02.md').destination).toBe('source');
});

test('Trash withdraws all practice revisions from discovery and direct tools but preserves evidence and restoration', async () => {
  const k = item(), work = store.recordWork({ title: 'Synthetic advice', request: 'Review', answer: 'Earlier conclusion', evidence: [{ target: { kind: 'knowledge', revisionId: k.latest.id }, quote: k.latest.body, start: 0 }] });
  const c = store.conversations.create({});
  const turn = store.conversations.begin(c.id, { clientId: crypto.randomUUID(), message: 'Find lessons', attachments: [] }, 'fixture').turn;
  const tools = chatTools({ store, conversation: c, turn, attachments: [], signal: new AbortController().signal, save: () => store.conversations.save(turn) }).tools;
  trash(k.id);
  expect(store.getKnowledge(k.id).active).toBeNull();
  expect(store.practiceLibrary({}).total).toBe(0);
  expect(store.catalog().totals.knowledge).toBe(0);
  expect(store.search({ query: 'Retrospectivecanary', kinds: ['knowledge'], includeHistory: true }).hits).toHaveLength(0);
  expect(store.listRecords({ kind: 'knowledge' }, boundary).total).toBe(0);
  expect(store.rankContext({ terms: ['Retrospectivecanary'], kinds: ['knowledge'] }, boundary)).toHaveLength(0);
  expect((await runToolDef(tools, 'counsel_read_record', { kind: 'knowledge', id: k.latest.id }, 'workspace')).isError).toBe(true);
  expect(store.getWork(work.id).evidence).toEqual(work.evidence);
  expect(store.getKnowledgeRevision(k.latest.id)).toEqual(k.latest);
  expect(() => store.proposeKnowledgeUpdate(k.id, { expectedRevisionId: k.latest.id, title: 'Edit', body: 'New proposal' })).toThrow('Trash');
  expect(store.recordTrash({ kind: 'knowledge' }).total).toBe(1);
  trash(k.id, 'restore');
  expect(store.getKnowledge(k.id).active?.id).toBe(k.latest.id);
  expect(store.search({ query: 'Retrospectivecanary', kinds: ['knowledge'] }).hits).toHaveLength(1);
});

test('imported baselines and pending adoption candidates stay withdrawn until restored, without deleting originals', async () => {
  const ids = seedPluginContext(store), k = ids.knowledge.position!;
  trash(k);
  expect(store.contextLibrary().records.some(r => r.practiceItemId === k || r.recordId === k || r.recordId === ids.sources.position)).toBe(false);
  expect(store.getSource(ids.sources.position!).lifecycle).toBe('active');
  trash(k, 'restore');
  expect(store.contextLibrary().records.some(r => r.practiceItemId === k)).toBe(true);
  const [imported] = await seedImportedStandards(store, 1);
  trash(imported!.practiceId!);
  expect(store.importedStandards().total).toBe(0);
  expect(store.catalog().knowledge.some(r => r.id === imported!.practiceId)).toBe(false);
  trash(imported!.practiceId!, 'restore');
  expect(store.importedStandards().total).toBe(1);
});

test('stale confirmation and running reads block deletion; missing confirmation never mutates', async () => {
  const k = item(), old = store.recordImpact('knowledge', k.id);
  store.proposeKnowledgeUpdate(k.id, { expectedRevisionId: k.latest.id, title: k.latest.title, body: 'A new proposed lesson' });
  expect(() => store.changeRecord('knowledge', k.id, { action: 'trash', expectedVersion: old.version, confirm: true })).toThrow('changed');
  const c = store.conversations.create({});
  const turn = store.conversations.begin(c.id, { clientId: crypto.randomUUID(), message: 'Read a lesson', attachments: [] }, 'fixture').turn;
  const tools = chatTools({ store, conversation: c, turn, attachments: [], signal: new AbortController().signal, save: () => store.conversations.save(turn) }).tools;
  expect((await runToolDef(tools, 'counsel_read_record', { kind: 'knowledge', id: k.latest.id }, 'workspace')).isError).not.toBe(true);
  expect(() => trash(k.id)).toThrow('response');
});

test('filing an unchanged import reuses its original and preserves links, history, bytes and prior citations', async () => {
  const [imported] = await seedImportedStandards(store, 1, ['pattern']);
  const k = store.getKnowledge(imported!.practiceId!), a = store.createMatter({ title: 'Synthetic matter A' }), b = store.createMatter({ title: 'Synthetic matter B' });
  store.linkSource(a.id, imported!.sourceId);
  const bytes = store.originalFile(imported!.sourceRevisionId).bytes;
  const result = store.filePracticeDocument(k.id, filing(k.id, b.id));
  expect(result).toEqual({ sourceId: imported!.sourceId, reusedOriginal: true });
  expect(store.getSource(result.sourceId).matterIds.sort()).toEqual([a.id, b.id].sort());
  expect(store.getSource(result.sourceId).placement?.collection).toBe('matter');
  expect(store.getKnowledge(k.id).lifecycle).toBe('trashed');
  expect(store.knowledgeHistory(k.id).totalVersions).toBe(1);
  expect(store.originalFile(imported!.sourceRevisionId).bytes).toEqual(bytes);
  expect(store.catalog(500, b.id).sources.map(s => s.id)).toContain(result.sourceId);
  expect(store.practiceLibrary({}).records.some(r => r.id === k.id || r.id === result.sourceId)).toBe(false);
  trash(k.id, 'restore');
  expect(store.getSource(result.sourceId).matterIds.sort()).toEqual([a.id, b.id].sort());
});

test('a practice-wide report is a reference document, not a fabricated matter or global approved pattern', async () => {
  const [imported] = await seedImportedStandards(store, 1, ['pattern']);
  const k = store.getKnowledge(imported!.practiceId!);
  const result = store.filePracticeDocument(k.id, filing(k.id, null));
  const row = store.practiceLibrary({}).records.find(r => r.id === result.sourceId)!;
  expect(row).toMatchObject({ recordKind: 'source', category: 'material', use: 'reference', needsReview: false });
  expect(store.catalog().totals.matters).toBe(0);
  expect(store.contextLibrary().records.some(r => r.recordId === k.id)).toBe(false);
});

test('changed practice text files a snapshot, never overwrites an original; failed filing is atomic', async () => {
  const [imported] = await seedImportedStandards(store, 1);
  let k = store.getKnowledge(imported!.practiceId!);
  const original = store.getSource(imported!.sourceId).latest;
  const stale = filing(k.id, null);
  k = store.proposeKnowledgeUpdate(k.id, { expectedRevisionId: k.latest.id, title: 'Synthetic revised report', body: 'Edited retrospective report' });
  expect(() => store.filePracticeDocument(k.id, stale)).toThrow('changed');
  expect(store.getKnowledge(k.id).lifecycle).toBe('active');
  expect(store.catalog().sources).toHaveLength(1);
  expect(() => store.filePracticeDocument(k.id, filing(k.id, crypto.randomUUID()))).toThrow('matter');
  expect(store.getKnowledge(k.id).lifecycle).toBe('active');
  const result = store.filePracticeDocument(k.id, filing(k.id, null));
  expect(result.reusedOriginal).toBe(false);
  expect(store.getSource(result.sourceId).latest.body).toBe(k.latest.body);
  expect(store.getSource(imported!.sourceId).latest).toEqual(original);
});

test('schema 20 upgrades preserve approvals and backups; Trash and filings survive restore', async () => {
  const k = item(), path = store.databasePath;
  store.close(); const old = new Database(path); old.exec('DROP TABLE knowledge_lifecycle; PRAGMA user_version=20;'); old.close();
  const recovery = await prepareWorkspaceUpgrade(path);
  expect((await inspectWorkspaceBackup(recovery!.backupPath)).schemaVersion).toBe(20);
  store = new WorkspaceStore({ databasePath: path });
  expect(store.getKnowledge(k.id).active?.id).toBe(k.latest.id);
  const result = store.filePracticeDocument(k.id, filing(k.id, null));
  const backup = await createWorkspaceBackup(path), archive = join(root, backup.name); writeFileSync(archive, backup.bytes);
  const recovered = await restoreWorkspaceBackup(archive, root), copy = new WorkspaceStore({ databasePath: recovered.databasePath });
  try {
    expect(copy.recordTrash({ kind: 'knowledge' }).total).toBe(1);
    expect(copy.getSource(result.sourceId).latest.body).toBe(k.latest.body);
    expect(copy.practiceLibrary({}).records.some(r => r.id === k.id)).toBe(false);
  } finally { copy.close(); }
});

test('human-only management APIs require authentication, exact fields and confirmation', async () => {
  const k = item();
  const handler = workspaceHandler({ store, token: 'fixture', origin: 'http://127.0.0.1:7432', distDir: root, demo: false });
  const call = (operation: string, body?: unknown, auth = true) => handler(new Request(`http://127.0.0.1:7432/api/workspace/knowledge/${k.id}/${operation}`, {
    method: body ? 'POST' : 'GET', headers: { ...(auth ? { authorization: 'Bearer fixture' } : {}), origin: 'http://127.0.0.1:7432', 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}),
  }));
  expect((await call('impact', undefined, false)).status).toBe(401);
  expect((await call('file-document', filing(k.id, null), false)).status).toBe(401);
  expect((await call('file-document', { ...filing(k.id, null), confirm: false })).status).toBe(400);
  expect((await call('file-document', { ...filing(k.id, null), destination: 'matter' })).status).toBe(400);
  expect((await call('file-document', filing(k.id, null))).status).toBe(200);
});
