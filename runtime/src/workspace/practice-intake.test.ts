import { afterEach, beforeEach, expect, test } from 'bun:test';
import { WorkspaceStore } from './store';
import { practiceIntakeHint } from './practice-intake-hints';
import { practiceCapabilityNotes, PRACTICE_CAPABILITIES } from './practice-capabilities';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { workspaceHandler } from './http';
import { WorkspaceChat } from './chat';
import { FakeModelProvider } from '../core/fake-provider';

let store: WorkspaceStore, root: string;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'counsel-practice-intake-')); store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') }); });
afterEach(() => { store.close(); rmSync(root, { recursive: true, force: true }); });
const source = (title: string, body: string) => store.createSource({ kind: 'document', revision: { title, body, provenance: { origin: 'fixture' } } });
async function stage(path: string, body: string) {
  const batch = store.imports.create({ clientId: crypto.randomUUID(), label: 'Instructions fixture', files: [{ path, byteCount: Buffer.byteLength(body) }] });
  store.imports.receive(batch.id, batch.entries[0]!.id, Buffer.from(body).toString('base64'));
  await store.imports.idle(); return store.imports.get(batch.id);
}

test('content discovery is independent of filename and does not adopt instructions or infer company identity', () => {
  const body = 'I prefer short summaries before detailed analysis. My name is Avery Example.';
  expect(practiceIntakeHint(body, 'notes-483')).toBeTruthy();
  expect(practiceIntakeHint('Acme is a company with 20 staff and an external legal team.', 'Company overview')).toBeNull();
  const file = source('notes-483', body);
  source('Company overview', 'Acme is a company with 20 staff.');
  const page = store.practiceSources({});
  expect(page.items.map(item => item.revisionId)).toEqual([file.latest.id]);
  expect(store.getProfile()).toBeNull(); expect(store.getWorkingPreferences()).toBeNull();
  expect(store.conversations.list()).toHaveLength(0);
});

test('only readable latest active versions are offered; explicit search includes non-suggestions', () => {
  const file = source('Notes', 'I prefer concise drafts.');
  const latest = store.reviseSource(file.id, file.latest.id, { title: 'New title', body: 'An ordinary document with the literal %_ characters.', provenance: { origin: 'fixture' } });
  source('Empty', '');
  expect(store.practiceSources({}).items).toHaveLength(0);
  expect(store.practiceSources({ query: '%_' }).items.map(item => item.revisionId)).toEqual([latest.id]);
  expect(store.practiceSources({ all: 'true' }).items).toHaveLength(1);
  store.changeRecord('source', file.id, { action: 'trash', confirm: true, expectedVersion: store.recordImpact('source', file.id).version });
  expect(store.practiceSources({ all: 'true' }).items).toHaveLength(0);
});

test('batch discovery includes only committed files, supports designated arbitrary text, and never applies legacy profile fields', async () => {
  source('Other workspace note', 'I prefer direct writing.');
  const batch = await stage('Arbitrary folder/operating-notes.md', 'Use a light touch for routine work.');
  expect(store.practiceSources({ batch: batch.id, all: 'true' }).items).toHaveLength(0);
  const edited = store.imports.edit(batch.id, batch.entries[0]!.id, { expectedRevisionId: batch.revisionId,
    choice: { ...batch.entries[0]!.choice, destination: 'profile', profile: null, preferences: null } });
  const committed = store.imports.commit(batch.id, { expectedRevisionId: edited.revisionId, profile: null });
  const page = store.practiceSources({ batch: batch.id });
  expect(page.items).toHaveLength(1);
  expect(page.items[0]!.revisionId).toBe(committed.receipt!.items[0]!.sourceRevisionId);
  expect(page.items[0]!.reason).toContain('Identified during import');
  expect(store.getProfile()).toBeNull(); expect(store.getWorkingPreferences()).toBeNull();
});

test('bounded pages do not hide files beyond the initial discovery window and query inputs are validated', () => {
  for (let index = 0; index < 205; index++) source(`Ordinary ${index}`, 'Ordinary saved content.');
  const first = store.practiceSources({});
  expect(first.items).toHaveLength(0); expect(first.scanned).toBe(200); expect(first.nextOffset).toBe(200);
  const second = store.practiceSources({ all: 'true', offset: first.nextOffset! });
  expect(second.items).toHaveLength(5); expect(second.nextOffset).toBeNull();
  expect(() => store.practiceSources({ batch: '../../outside' })).toThrow();
  expect(() => store.practiceSources({ offset: -1 })).toThrow();
});

test('capability hints are conditional and distinguish native font preservation from arbitrary script execution', () => {
  expect(practiceCapabilityNotes('Keep sentences short.')).toHaveLength(0);
  const notes = practiceCapabilityNotes('Run strip_font_embed.py and file into my Obsidian vault at /Users/example/practice.');
  expect(notes).toHaveLength(3);
  expect(notes.map(note => note.detail).join(' ')).toContain('preserv');
  expect(PRACTICE_CAPABILITIES.join(' ')).toContain('not');
});

test('discovery endpoint is authenticated, validates queries and never calls the provider', async () => {
  source('Private instructions', 'I prefer detail.');
  const model = new FakeModelProvider([]), chat = new WorkspaceChat(store, () => model);
  const handler = workspaceHandler({ store, chat, distDir: '/tmp', token: 'fixture', origin: 'http://127.0.0.1:7432', demo: true });
  const call = (query = '', token = 'fixture') => handler(new Request(`http://127.0.0.1:7432/api/workspace/practice-document/sources${query}`, { headers: { authorization: `Bearer ${token}` } }));
  expect((await call('', 'wrong')).status).toBe(401);
  expect((await call('?offset=-1')).status).toBe(400);
  expect((await call('?batch=not-an-id')).status).toBe(400);
  const response = await call(); expect(response.status).toBe(200);
  expect((await response.json() as { items: unknown[] }).items).toHaveLength(1);
  expect(model.lastRequest).toBeUndefined();
});
