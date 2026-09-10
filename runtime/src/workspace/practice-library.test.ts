import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkspaceStore } from './store';
import { seedPluginContext } from './fixtures/plugin-context';
import { workspaceHandler } from './http';

let store: WorkspaceStore, root: string;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'counsel-practice-library-')); store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') }); });
afterEach(() => { store.close(); rmSync(root, { recursive: true, force: true }); });

test('receipt-linked originals appear once; imported baselines remain in use without an approval mutation', () => {
  const ids = seedPluginContext(store), before = store.contextLibrary();
  const page = store.practiceLibrary({});
  for (const key of ['position', 'method', 'language', 'memory']) {
    expect(page.records.filter(r => r.id === ids.knowledge[key])).toHaveLength(1);
    expect(page.records.some(r => r.id === ids.sources[key])).toBe(false);
    expect(page.records.find(r => r.id === ids.knowledge[key])).toMatchObject({ use: 'baseline', needsReview: false, originalCount: 1 });
  }
  expect(page.records.some(r => r.id === ids.sources.employment)).toBe(false);
  expect(page.records.some(r => r.id === ids.sources.note)).toBe(false);
  expect(store.getKnowledge(ids.knowledge.position!).active).toBeNull();
  expect(store.contextLibrary()).toEqual(before);
  const original = store.practiceOriginals(ids.knowledge.position!)[0]!;
  expect(original.sourceId).toBe(ids.sources.position!);
  const k = store.getKnowledge(ids.knowledge.position!);
  store.proposeKnowledgeUpdate(k.id, { expectedRevisionId: k.latest.id, title: k.latest.title, body: 'Proposed 12 day limit.' });
  expect(store.practiceLibrary({ status: 'review' }).records.find(r => r.id === k.id)).toMatchObject({ use: 'baseline', needsReview: true });
  const latest = store.getKnowledge(k.id).latest;
  store.reviseKnowledge(k.id, latest.id, { title: latest.title, body: latest.body, status: 'approved', approvedBy: 'Synthetic user' });
  expect(store.practiceLibrary({ category: 'position' }).records.find(r => r.id === k.id)?.use).toBe('guidance');
  expect(store.practiceOriginals(k.id)[0]).toEqual(original);
  expect(store.getSource(original.sourceId).latest.body).toContain('14 days');
});

test('identity deduplication does not hide similarly titled independent files; templates retain one row and their pinned source', () => {
  const ids = seedPluginContext(store);
  const sameTitle = store.createSource({ kind: 'reference', revision: { title: 'Employee monitoring — practice position', body: 'Separate notes', provenance: { origin: 'upload' } } });
  store.placeSource(sameTitle.id, { collection: 'practice', expectedRevisionId: null });
  expect(store.practiceLibrary({ query: 'Employee monitoring — practice position' }).total).toBe(2);
  const template = store.templates.create({ clientId: crypto.randomUUID(), sourceRevisionId: sameTitle.latest.id, title: 'Monitoring starting point', whenToUse: 'Synthetic drafting', practiceWideUse: true });
  const page = store.practiceLibrary({});
  expect(page.records.some(r => r.id === sameTitle.id)).toBe(false);
  expect(page.records.find(r => r.id === template.id)).toMatchObject({ use: 'starting-point', recordKind: 'template' });
  expect(store.practiceLibrary({ category: 'template' }).total).toBe(1);
  expect(store.practiceLibrary({ category: 'position' }).records[0]?.id).toBe(ids.knowledge.position);
  store.changeRecord('source', sameTitle.id, { action: 'trash', confirm: true, expectedVersion: store.recordImpact('source', sameTitle.id).version });
  expect(store.practiceLibrary({ category: 'template' }).records[0]?.use).toBe('inactive');
});

test('combined filters paginate before limiting, including items beyond the main catalog', () => {
  for (let i = 0; i < 56; i++) store.createKnowledge({ kind: 'method', revision: { title: `Older method ${i}`, body: 'Synthetic draft' } });
  for (let i = 0; i < 501; i++) store.createSource({ kind: 'reference', revision: { title: `Newer file ${i}`, body: 'Synthetic', provenance: { origin: 'plugin:practice/reference/test.md' } } });
  const first = store.practiceLibrary({ category: 'method' }), next = store.practiceLibrary({ category: 'method', page: 1 });
  expect(first.total).toBe(56); expect(first.records).toHaveLength(50); expect(next.records).toHaveLength(6);
  expect(new Set([...first.records, ...next.records].map(r => r.id)).size).toBe(56);
  expect(store.practiceLibrary({ query: 'Older method 0' }).total).toBe(1);
  expect(store.practiceLibrary({ status: 'review' }).total).toBe(56);
});

test('ordinary reviewed imports deduplicate without inferring baseline approval', async () => {
  const body = '# Synthetic position\nUse written notices.';
  let batch = store.imports.create({ clientId: crypto.randomUUID(), label: 'Synthetic', files: [{ path: 'Practice/standards/notice.md', byteCount: Buffer.byteLength(body) }] });
  batch = await store.imports.upload(batch.id, batch.entries[0]!.id, Buffer.from(body).toString('base64'));
  await store.imports.idle();
  batch = store.imports.get(batch.id);
  const receipt = store.imports.commit(batch.id, { expectedRevisionId: batch.revisionId });
  const item = receipt.receipt!.items[0]!;
  expect(store.practiceLibrary({}).records).toHaveLength(1);
  expect(store.practiceLibrary({}).records[0]).toMatchObject({ id: item.practiceId, needsReview: true, use: 'proposed' });
  expect(store.practiceOriginals(item.practiceId!)[0]?.sourceId).toBe(item.sourceId);
});

test('combined library and original links require authentication and reject invalid filters', async () => {
  const handler = workspaceHandler({ store, token: 'fixture', origin: 'http://127.0.0.1:7432', distDir: root, demo: false });
  const req = (path: string, auth = true) => handler(new Request('http://127.0.0.1:7432/api/workspace' + path, { headers: auth ? { authorization: 'Bearer fixture' } : {} }));
  expect((await req('/practice-library', false)).status).toBe(401);
  expect((await req('/practice-library?category=unknown')).status).toBe(400);
  expect((await req('/practice-library?page=-1')).status).toBe(400);
  expect((await req('/practice-library')).status).toBe(200);
});
