import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { WorkspaceStore } from './store';
import { lookupWebPage } from './web-sources';
import { type WebNetwork } from './public-web';
import { chatTools } from './chat-tools';
import { runToolDef } from '../core/fake-provider';
import { createWorkspaceBackup, restoreWorkspaceBackup } from './backups';

let root: string, store: WorkspaceStore;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'counsel-web-test-')); store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') }); });
afterEach(() => { store.close(); rmSync(root, { recursive: true, force: true }); });
const signal = () => AbortSignal.timeout(5000);
const html = (version = 'one') => Buffer.from(`<html><title>Example terms</title><body><h1>Terms ${version}</h1><p>${'Synthetic service terms for this fixture only. '.repeat(5)}</p><a href="/definitions">Definitions</a></body></html>`);
function network(bytes = html(), contentType = 'text/html', requests: string[] = []): WebNetwork {
  return { resolve: async () => [{ address: '93.184.216.34', family: 4 }],
    request: async url => { requests.push(url.href); return { status: 200, headers: { 'content-type': contentType }, bytes }; } };
}

test('public snapshots retain exact bytes, immutable versions, original retrieval dates, source placement and backups', async () => {
  const input = { url: 'https://example.org/terms' };
  const first = await lookupWebPage(store, input, signal(), { network: network(), now: () => new Date('2026-09-01T12:00:00Z') });
  expect(store.getSource(first.sourceId)).toMatchObject({ kind: 'reference', matterIds: [], placement: { collection: 'external' } });
  expect(store.originalFile(first.revisionId).bytes).toEqual(html());
  expect(store.getSourceRevision(first.revisionId).provenance).toMatchObject({ origin: input.url, retrievedAt: first.retrievedAt, mediaType: 'text/html' });
  const second = await lookupWebPage(store, input, signal(), { network: network(), now: () => new Date('2026-09-02T12:00:00Z') });
  expect(second).toMatchObject({ revisionId: first.revisionId, reused: true, retrievedAt: first.retrievedAt, checkedAt: '2026-09-02T12:00:00.000Z' });
  const work = store.recordWork({ title: 'Earlier analysis', request: 'Synthetic question', answer: 'Draft.', evidence: [{ target: { kind: 'source', revisionId: first.revisionId }, start: 0, quote: 'Terms one' }] });
  const changed = await lookupWebPage(store, input, signal(), { network: network(html('two')) });
  expect(changed).toMatchObject({ sourceId: first.sourceId, version: 2, reused: false });
  expect(store.referenceChanges(work.id)[0]?.citedRevisionId).toBe(first.revisionId);
  expect(store.getWork(work.id)).toEqual(work);
  await expect(store.updateSourceFile(first.sourceId, { expectedRevisionId: changed.revisionId, name: 'Changed.txt', base64: Buffer.from('Replaced').toString('base64') })).rejects.toThrow('publisher');
  const backup = await createWorkspaceBackup(store.databasePath), path = join(root, backup.name);
  await Bun.write(path, backup.bytes);
  const restored = await restoreWorkspaceBackup(path, root), copy = new WorkspaceStore({ databasePath: restored.databasePath });
  try { expect(copy.originalFile(first.revisionId).bytes).toEqual(html()); expect(copy.getSource(first.sourceId).latest.id).toBe(changed.revisionId); }
  finally { copy.close(); }
});

test('malformed, unsupported, empty and cancelled responses cannot create saved sources', async () => {
  for (const [bytes, contentType] of [[Buffer.from('null'), 'application/json'], [Buffer.from(' '), 'text/plain'], [Buffer.from('<script>load()</script>'), 'text/html']] as const)
    await expect(lookupWebPage(store, { url: 'https://example.org/' }, signal(), { network: network(bytes, contentType) })).rejects.toThrow();
  const abort = new AbortController(); abort.abort();
  await expect(lookupWebPage(store, { url: 'https://example.org/' }, abort.signal, { network: network() })).rejects.toThrow();
  expect(store.catalog().sources).toHaveLength(0);
});

test('tool fetches only URLs from the request or actually-read material; exact read/cite and chat scope persist', async () => {
  const document = store.importTextFile({ name: 'Agreement.txt', base64: Buffer.from('Incorporated terms: https://example.org/terms. PrivateFact must stay here.').toString('base64') });
  const other = store.importTextFile({ name: 'Other matter.txt', base64: Buffer.from('Not permitted https://example.org/private').toString('base64') });
  const conversation = store.conversations.create({});
  const turn = store.conversations.begin(conversation.id, { clientId: crypto.randomUUID(), message: 'Review the linked terms.', attachments: [document.latest.id] }, 'fixture').turn;
  const requests: string[] = [];
  const kit = chatTools({ store, conversation, turn, attachments: [document.latest.id], signal: signal(), save: () => {}, webNetwork: network(html(), 'text/html', requests) });
  const call = (name: string, input: unknown) => runToolDef(kit.tools, name, input, 'workspace');
  expect((await call('counsel_fetch_webpage', { url: 'https://example.org/terms' })).isError).toBe(true);
  expect(requests).toHaveLength(0);
  expect((await call('counsel_read_record', { kind: 'source', id: document.latest.id })).isError).not.toBe(true);
  expect((await call('counsel_fetch_webpage', { url: 'https://example.org/terms?leak=PrivateFact' })).isError).toBe(true);
  expect((await call('counsel_fetch_webpage', { url: 'https://example.org/terms', headers: { authorization: 'secret' } })).isError).toBe(true);
  expect((await call('counsel_fetch_webpage', { url: 'https://example.org/terms' })).isError).not.toBe(true);
  const receipt = turn.state.webLookups![0]!;
  expect((await call('counsel_cite_passage', { kind: 'source', id: receipt.revisionId, quote: 'Terms one' })).isError).toBe(true);
  expect((await call('counsel_read_record', { kind: 'source', id: receipt.revisionId })).isError).not.toBe(true);
  expect((await call('counsel_cite_passage', { kind: 'source', id: receipt.revisionId, quote: 'Terms one' })).isError).not.toBe(true);
  expect((await call('counsel_fetch_webpage', { url: 'https://example.org/definitions' })).isError).not.toBe(true);
  expect((await call('counsel_read_record', { kind: 'source', id: other.latest.id })).isError).toBe(true);
  expect((await call('counsel_fetch_webpage', { url: 'https://example.org/private' })).isError).toBe(true);
  expect(kit.boundary.sourceRevisionIds).toContain(receipt.revisionId);
  expect(requests).toEqual(['https://example.org/terms', 'https://example.org/definitions']);
  expect(turn.state.citations).toHaveLength(1);
});

test('explicit user URLs need no manual module selection; calls are bounded', async () => {
  const conversation = store.conversations.create({});
  const turn = store.conversations.begin(conversation.id, { clientId: crypto.randomUUID(), message: 'Read https://example.org/terms' }, 'fixture').turn;
  const requests: string[] = [];
  const kit = chatTools({ store, conversation, turn, attachments: [], signal: signal(), save: () => {}, webNetwork: network(html(), 'text/html', requests) });
  for (let i = 0; i < 8; i++) expect((await runToolDef(kit.tools, 'counsel_fetch_webpage', { url: 'https://example.org/terms' }, 'workspace')).isError).not.toBe(true);
  expect((await runToolDef(kit.tools, 'counsel_fetch_webpage', { url: 'https://example.org/terms' }, 'workspace')).isError).toBe(true);
  expect(requests).toHaveLength(8);
});

test('follow-up chats retain exact fetched revisions but do not grant another conversation access', async () => {
  const conversation = store.conversations.create({});
  const turn = store.conversations.begin(conversation.id, { clientId: crypto.randomUUID(), message: 'Read https://example.org/terms' }, 'fixture').turn;
  const kit = chatTools({ store, conversation, turn, attachments: [], signal: signal(), save: () => store.conversations.save(turn), webNetwork: network() });
  expect((await runToolDef(kit.tools, 'counsel_fetch_webpage', { url: 'https://example.org/terms' }, 'workspace')).isError).not.toBe(true);
  const original = turn.state.webLookups![0]!;
  turn.status = 'complete'; turn.finishedAt = new Date().toISOString(); store.conversations.save(turn);
  await lookupWebPage(store, { url: 'https://example.org/terms' }, signal(), { network: network(html('two')) });
  const next = store.conversations.begin(conversation.id, { clientId: crypto.randomUUID(), message: 'Read the exact earlier version.' }, 'fixture').turn;
  const followup = chatTools({ store, conversation, turn: next, attachments: [], signal: signal(), save: () => {}, webNetwork: network() });
  expect((await runToolDef(followup.tools, 'counsel_read_record', { kind: 'source', id: original.revisionId }, 'workspace')).isError).not.toBe(true);
  expect((await runToolDef(followup.tools, 'counsel_cite_passage', { kind: 'source', id: original.revisionId, quote: 'Terms one' }, 'workspace')).isError).not.toBe(true);
  const separate = store.conversations.create({});
  const separateTurn = store.conversations.begin(separate.id, { clientId: crypto.randomUUID(), message: 'Unrelated question.' }, 'fixture').turn;
  const outside = chatTools({ store, conversation: separate, turn: separateTurn, attachments: [], signal: signal(), save: () => {}, webNetwork: network() });
  expect((await runToolDef(outside.tools, 'counsel_read_record', { kind: 'source', id: original.revisionId }, 'workspace')).isError).toBe(true);
});
