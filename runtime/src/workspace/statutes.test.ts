import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { WorkspaceStore } from './store';
import { extractStatute, lookupStatute } from './statutes';
import { StatuteLookup } from './authority-types';
import { chatTools } from './chat-tools';
import { runToolDef } from '../core/fake-provider';
import { workspaceHandler } from './http';
import { createWorkspaceBackup, restoreWorkspaceBackup } from './backups';

let root: string, store: WorkspaceStore;
const realFetch = globalThis.fetch, signal = () => new AbortController().signal;
const citation = { title: 15, section: '7001' };
const html = (text = 'Synthetic statutory rule.', marker = '20260712_119-102', volatile = 'first') => Buffer.from(`<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html><body><input value="${volatile}"/><div id="docViewer"><span class="contextHeadline">15 USC 7001: Synthetic section</span><span class="lawsInEffect">Text contains those laws in effect on September 6, 2026</span><!-- documentid:15_7001 usckey:15007001 currentthrough:${marker} documentPDFPage:-1 --><h3>Section 7001</h3><p>${text}</p><h4>Effective date</h4><p>Read the synthetic statutory note.</p><script>NEVER RUN OR READ THIS</script></div></body></html>`);
const transport = (bytes = html()) => (async () => new Response(bytes)) as unknown as typeof fetch;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'counsel-statute-test-')); store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') }); });
afterEach(() => { globalThis.fetch = realFetch; store.close(); rmSync(root, { recursive: true, force: true }); });

test('statutes retain exact original, both currency dates and statutory notes; volatile page state is not a new law version', async () => {
  const receipt = await lookupStatute(store, citation, signal(), { transport: transport() });
  const saved = store.getSource(receipt.sourceId);
  expect(receipt.publication).toMatchObject({ publisher: 'uscode', versionDate: '2026-07-12', lawsInEffectOn: '2026-09-06', currentThroughPublicLaw: '119-102' });
  expect(saved).toMatchObject({ kind: 'authority', matterIds: [], placement: { collection: 'external' }, latest: { provenance: { mediaType: 'text/html' } } });
  expect(store.originalFile(receipt.revisionId).bytes).toEqual(html());
  expect(saved.latest.body).toContain('Read the synthetic statutory note.');
  expect(saved.latest.body).not.toContain('NEVER RUN');
  const same = await lookupStatute(store, citation, signal(), { transport: transport(html(undefined, undefined, 'second')) });
  expect(same).toMatchObject({ reused: true, revisionId: receipt.revisionId, retrievedAt: receipt.retrievedAt });
  const work = store.recordWork({ title: 'Earlier synthetic advice', request: 'Test', answer: 'Preserve this answer.', evidence: [{ target: { kind: 'source', revisionId: receipt.revisionId }, start: 0, quote: saved.latest.body! }] });
  const changed = await lookupStatute(store, citation, signal(), { transport: transport(html('Amended synthetic rule.')) });
  expect(changed).toMatchObject({ sourceId: receipt.sourceId, version: 2, reused: false });
  expect(store.referenceChanges(work.id)[0]?.citedRevisionId).toBe(receipt.revisionId);
  expect(store.getWork(work.id)).toEqual(work);
  const backup = await createWorkspaceBackup(store.databasePath), path = join(root, backup.name);
  await Bun.write(path, backup.bytes);
  const restored = await restoreWorkspaceBackup(path, root), copy = new WorkspaceStore({ databasePath: restored.databasePath });
  try { expect(copy.getSource(receipt.sourceId).latest.id).toBe(changed.revisionId); expect(copy.originalFile(receipt.revisionId).bytes).toEqual(html()); }
  finally { copy.close(); }
});

test('only bounded legal citations can leave the workspace; redirects, failed status and unexpected origins fail', async () => {
  for (const input of [{ ...citation, section: '../secret' }, { ...citation, title: 55 }, { ...citation, query: 'private facts' }, { ...citation, asOf: '2020-01-01' }]) expect(StatuteLookup.safeParse(input).success).toBe(false);
  let request: { url: string; init: RequestInit } | undefined;
  await lookupStatute(store, citation, signal(), { transport: (async (url, init) => { request = { url: String(url), init: init! }; return new Response(html()); }) as typeof fetch });
  expect(request!.url).toBe('https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title15-section7001&num=0&edition=prelim');
  expect(request!.init).toMatchObject({ credentials: 'omit', redirect: 'error', method: 'GET' });
  expect(request!.init.body).toBeUndefined();
  for (const status of [302, 401, 403, 404, 429, 503]) await expect(lookupStatute(store, citation, signal(), { transport: (async () => new Response('', { status })) as unknown as typeof fetch })).rejects.toThrow();
  const response = new Response(html()); Object.defineProperty(response, 'url', { value: 'https://unexpected.example/' });
  await expect(lookupStatute(store, citation, signal(), { transport: (async () => response) as unknown as typeof fetch })).rejects.toThrow('Unexpected');
});

test('missing identity, invalid currency, huge/hostile data, error pages and duplicate viewers fail closed', () => {
  const sample = html().toString();
  for (const value of ['<html>Error page</html>', sample.replace('15_7001', '15_7002'), sample.replace('20260712', '20260230'), sample.replace('September', 'NotAMonth'), sample.replace('currentthrough:', 'unknown:'), sample.replace('docViewer', 'other'), sample.replace('</body>', '<div id="docViewer"></div></body>'), '<!DOCTYPE html [<!ENTITY x SYSTEM "file:///secret">]>'+sample, 'x'.repeat(2_000_001)])
    expect(() => extractStatute(Buffer.from(value), citation)).toThrow();
  expect(extractStatute(html('<table><tr><td>Table text needs inspection.</td></tr></table>'), citation).extracted.textStatus).toBe('partial');
});

test('cancelled calls and currency rollbacks cannot replace an acknowledged source', async () => {
  const first = await lookupStatute(store, citation, signal(), { transport: transport() });
  const abort = new AbortController(); abort.abort(); let calls = 0;
  await expect(lookupStatute(store, citation, abort.signal, { transport: (async () => { calls++; return new Response(html()); }) as unknown as typeof fetch })).rejects.toThrow();
  expect(calls).toBe(0);
  await expect(lookupStatute(store, citation, signal(), { transport: transport(html('Changed', '20260711_119-101')) })).rejects.toThrow('older');
  await expect(lookupStatute(store, citation, signal(), { transport: transport(Buffer.from(html().toString().replace('September 6', 'September 5'))) })).rejects.toThrow('older');
  expect(store.getSource(first.sourceId).latest.id).toBe(first.revisionId);
});

test('chat lookup grants only the saved public version, not a content read or another private file', async () => {
  globalThis.fetch = transport();
  const hidden = store.importTextFile({ name: 'Private.txt', base64: Buffer.from('Synthetic private material.').toString('base64') });
  const conversation = store.conversations.create({});
  const turn = store.conversations.begin(conversation.id, { clientId: crypto.randomUUID(), message: 'Read 15 USC 7001.' }, 'fixture').turn;
  const kit = chatTools({ store, conversation, turn, attachments: [], signal: signal(), save: () => {} });
  const call = (name: string, input: unknown) => runToolDef(kit.tools, name, input, 'workspace');
  expect((await call('counsel_lookup_statute', citation)).isError).not.toBe(true);
  const receipt = turn.state.authorityLookups![0]!, saved = store.getSourceRevision(receipt.revisionId);
  expect(turn.state.context).toHaveLength(0);
  expect((await call('counsel_cite_passage', { kind: 'source', id: saved.id, start: 0, quote: saved.body })).isError).toBe(true);
  expect((await call('counsel_read_record', { kind: 'source', id: hidden.latest.id })).isError).toBe(true);
  expect((await call('counsel_read_record', { kind: 'source', id: saved.id })).isError).not.toBe(true);
  expect((await call('counsel_cite_passage', { kind: 'source', id: saved.id, start: 0, quote: saved.body })).isError).not.toBe(true);
  for (let i = 0; i < 5; i++) expect((await call('counsel_lookup_statute', citation)).isError).not.toBe(true);
  expect((await call('counsel_lookup_authority', { title: 31, section: '1010.100' })).isError).toBe(true);
});

test('authenticated refresh routes statutes to their publisher; stale inputs make no request', async () => {
  globalThis.fetch = transport();
  const first = await lookupStatute(store, citation, signal());
  const handler = workspaceHandler({ store, token: 'synthetic-secret', origin: 'http://127.0.0.1:7458', distDir: '.', demo: true });
  const req = (revision = first.revisionId) => new Request(`http://127.0.0.1:7458/api/workspace/sources/${first.sourceId}/refresh`, { method: 'POST', headers: { Authorization: 'Bearer synthetic-secret', origin: 'http://127.0.0.1:7458', 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevisionId: revision }) });
  const result = await handler(req());
  expect(result.status).toBe(200);
  expect(await result.json()).toMatchObject({ receipt: { publication: { publisher: 'uscode' } } });
  let calls = 0; globalThis.fetch = (async () => { calls++; return new Response(html()); }) as unknown as typeof fetch;
  expect((await handler(req(crypto.randomUUID()))).status).toBe(409);
  expect(calls).toBe(0);
});
