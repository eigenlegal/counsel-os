import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { WorkspaceStore } from './store';
import { lookupAuthority, extractAuthority } from './authorities';
import { AuthorityLookup } from './authority-types';
import { createWorkspaceBackup, restoreWorkspaceBackup } from './backups';
import { chatTools } from './chat-tools';
import { runToolDef } from '../core/fake-provider';
import { workspaceHandler } from './http';

let root: string, store: WorkspaceStore;
const originalFetch = globalThis.fetch;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'counsel-authority-test-')); store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') }); });
afterEach(() => { globalThis.fetch = originalFetch; store.close(); rmSync(root, { recursive: true, force: true }); });
const citation = { title: 31, section: '1010.100' };
const signal = () => new AbortController().signal;
const xml = (body = '<P>(a) Synthetic <I>test</I> definition.</P>') => Buffer.from(`<DIV8 N="1010.100" TYPE="SECTION"><HEAD>§ 1010.100 Test definitions.</HEAD>${body}</DIV8>`);
function transport(body = xml(), date = '2026-09-03', requests: Array<{ url: string; init: RequestInit }> = []) {
  return (async (url, init) => {
    requests.push({ url: String(url), init: init! });
    return String(url).endsWith('titles.json') ? Response.json({ titles: [{ number: 31, reserved: false, up_to_date_as_of: date }] }) : new Response(body);
  }) as typeof fetch;
}

test('bounded citation lookup preserves XML, dates and version identity; changes flag earlier advice and survive backup', async () => {
  const requests: Array<{ url: string; init: RequestInit }> = [];
  const receipt = await lookupAuthority(store, citation, signal(), { transport: transport(xml(), undefined, requests) });
  expect(requests.map(r => r.url)).toEqual(['https://www.ecfr.gov/api/versioner/v1/titles.json', 'https://www.ecfr.gov/api/versioner/v1/full/2026-09-03/title-31.xml?part=1010&section=1010.100']);
  expect(requests.every(r => r.init.redirect === 'error' && r.init.credentials === 'omit' && !r.init.body)).toBe(true);
  const source = store.getSource(receipt.sourceId);
  expect(source).toMatchObject({ kind: 'authority', matterIds: [], placement: { collection: 'external' }, latest: { provenance: { mediaType: 'application/xml', publication: { versionDate: '2026-09-03', requestedDate: null } } } });
  expect(store.originalFile(receipt.revisionId).bytes).toEqual(xml());
  expect(source.latest.body).toContain('(a) Synthetic test definition.');
  const duplicate = await lookupAuthority(store, citation, signal(), { transport: transport() });
  expect(duplicate).toMatchObject({ revisionId: receipt.revisionId, reused: true, retrievedAt: receipt.retrievedAt });
  const work = store.recordWork({ title: 'Earlier test advice', request: 'Synthetic rule?', answer: 'Synthetic answer.', evidence: [{ target: { kind: 'source', revisionId: receipt.revisionId }, start: 0, quote: source.latest.body! }] });
  const changed = await lookupAuthority(store, citation, signal(), { transport: transport(xml('<P>(a) Revised synthetic definition.</P>'), '2026-09-04') });
  expect(changed).toMatchObject({ sourceId: receipt.sourceId, version: 2, reused: false });
  expect(store.referenceChanges(work.id)[0]?.citedRevisionId).toBe(receipt.revisionId);
  expect(store.getWork(work.id)).toEqual(work);
  const historical = await lookupAuthority(store, { ...citation, asOf: '2026-09-03' }, signal(), { transport: transport() });
  expect(historical.sourceId).not.toBe(receipt.sourceId);
  const backup = await createWorkspaceBackup(store.databasePath), path = join(root, backup.name);
  await Bun.write(path, backup.bytes);
  const restored = await restoreWorkspaceBackup(path, root), copy = new WorkspaceStore({ databasePath: restored.databasePath });
  try { expect(copy.getSource(receipt.sourceId).latest.id).toBe(changed.revisionId); expect(copy.originalFile(receipt.revisionId).bytes).toEqual(xml()); }
  finally { copy.close(); }
});

test('citation validation cannot carry arbitrary URLs or private query text; no fetch for invalid input or pre-cancelled call', async () => {
  for (const input of [{ ...citation, section: '1010.100&query=secret' }, { ...citation, title: 51 }, { ...citation, url: 'http://127.0.0.1' }, { ...citation, asOf: '2026-02-30' }])
    expect(AuthorityLookup.safeParse(input).success).toBe(false);
  const requests: Array<{ url: string; init: RequestInit }> = [], fetcher = transport(xml(), undefined, requests);
  const abort = new AbortController(); abort.abort();
  await expect(lookupAuthority(store, citation, abort.signal, { transport: fetcher })).rejects.toThrow();
  expect(requests).toHaveLength(0);
  for (const asOf of ['2016-12-31', '2026-09-04']) await expect(lookupAuthority(store, { ...citation, asOf }, signal(), { transport: fetcher })).rejects.toThrow('Choose a date');
  expect(requests.every(r => r.url.endsWith('titles.json'))).toBe(true);
});

test('missing, redirect, oversized, malformed, wrong-section, unsafe XML and in-progress responses never create a source', async () => {
  for (const body of [Buffer.from('<html>Unavailable</html>'), Buffer.from('<!DOCTYPE test [<!ENTITY foo SYSTEM "file:///etc/passwd">]><DIV8/>'), Buffer.from('<DIV8 TYPE="SECTION" N="1010.200"><P>Wrong.</P></DIV8>'), Buffer.from('x'.repeat(2_000_001)), Buffer.from('<DIV8 TYPE="SECTION" N="1010.100"><P>broken</DIV8>')])
    await expect(lookupAuthority(store, citation, signal(), { transport: transport(body) })).rejects.toThrow();
  for (const code of [302, 404, 429, 503]) await expect(lookupAuthority(store, citation, signal(), { transport: (async () => new Response('', { status: code })) as unknown as typeof fetch })).rejects.toThrow();
  await expect(lookupAuthority(store, citation, signal(), { transport: (async () => Response.json({ titles: [{ number: 31, reserved: false, up_to_date_as_of: '2026-09-03', processing_in_progress: true }] })) as unknown as typeof fetch })).rejects.toThrow('updating');
  expect(store.sourceLibrary({ collection: 'external' }).total).toBe(0);
  expect(extractAuthority(xml('<GPOTABLE><ROW><ENT>One</ENT><ENT>Two</ENT></ROW></GPOTABLE>'), citation)).toMatchObject({ textStatus: 'partial' });
});

test('cancellation before persistence and older publisher data preserve the current source; fetched sources cannot be overwritten by uploads', async () => {
  const first = await lookupAuthority(store, citation, signal(), { transport: transport() });
  const controller = new AbortController();
  const fetcher = transport(xml('<P>A different value.</P>'));
  let calls = 0;
  const aborting = (async (url, init) => { const response = await fetcher(url, init); if (++calls === 2) controller.abort(); return response; }) as typeof fetch;
  await expect(lookupAuthority(store, citation, controller.signal, { transport: aborting })).rejects.toThrow();
  await expect(lookupAuthority(store, citation, signal(), { transport: transport(xml(), '2026-09-02') })).rejects.toThrow('older');
  await expect(store.updateSourceFile(first.sourceId, { expectedRevisionId: first.revisionId, name: 'Replacement.txt', base64: Buffer.from('User text').toString('base64') })).rejects.toThrow('publisher');
  expect(store.getSource(first.sourceId).latest.id).toBe(first.revisionId);
});

test('the chat discovers a public source through its lookup, must read before citing, and gains no access to another matter', async () => {
  const secret = store.importTextFile({ name: 'Private.txt', base64: Buffer.from('ClientSecret').toString('base64') });
  const conversation = store.conversations.create({});
  const turn = store.conversations.begin(conversation.id, { clientId: crypto.randomUUID(), message: 'Read 31 CFR 1010.100. ClientSecret must stay private.' }, 'fixture').turn;
  const requests: Array<{ url: string; init: RequestInit }> = [];
  globalThis.fetch = transport(xml(), undefined, requests);
  const kit = chatTools({ store, conversation, turn, attachments: [], signal: signal(), save: () => {} });
  const call = (name: string, input: unknown) => runToolDef(kit.tools, name, input, 'workspace');
  expect((await call('counsel_lookup_authority', citation)).isError).not.toBe(true);
  const receipt = turn.state.authorityLookups![0]!, saved = store.getSourceRevision(receipt.revisionId);
  expect(turn.state.context).toHaveLength(0);
  expect((await call('counsel_cite_passage', { kind: 'source', id: saved.id, start: 0, quote: saved.body })).isError).toBe(true);
  expect((await call('counsel_read_record', { kind: 'source', id: saved.id })).isError).not.toBe(true);
  expect((await call('counsel_cite_passage', { kind: 'source', id: saved.id, start: 0, quote: saved.body })).isError).not.toBe(true);
  expect(turn.state.citations).toHaveLength(1);
  expect((await call('counsel_read_record', { kind: 'source', id: secret.latest.id })).isError).toBe(true);
  expect(JSON.stringify(requests)).not.toContain('ClientSecret');
  expect(kit.boundary.sourceRevisionIds).toContain(saved.id);
});

test('publisher refresh is authenticated and rejects stale revisions before any network request', async () => {
  const first = await lookupAuthority(store, citation, signal(), { transport: transport() });
  const handler = workspaceHandler({ store, token: 'fixture', origin: 'http://127.0.0.1:7458', distDir: '.', demo: true });
  const url = `http://127.0.0.1:7458/api/workspace/sources/${first.sourceId}/refresh`;
  const requests: Array<{ url: string; init: RequestInit }> = []; globalThis.fetch = transport(xml(), undefined, requests);
  expect((await handler(new Request(url, { method: 'POST', body: JSON.stringify({ expectedRevisionId: first.revisionId }) }))).status).toBe(401);
  expect(requests).toHaveLength(0);
  const headers = { authorization: 'Bearer fixture', origin: 'http://127.0.0.1:7458', 'content-type': 'application/json' };
  expect((await handler(new Request(url, { method: 'POST', headers, body: JSON.stringify({ expectedRevisionId: crypto.randomUUID() }) }))).status).toBe(409);
  expect(requests).toHaveLength(0);
  expect((await handler(new Request(url, { method: 'POST', headers, body: JSON.stringify({ expectedRevisionId: first.revisionId }) }))).status).toBe(200);
});
