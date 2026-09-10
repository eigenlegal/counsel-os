import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkspaceStore } from './store';
import { WorkspaceChat } from './chat';
import { chatTools } from './chat-tools';
import { FakeModelProvider, runToolDef } from '../core/fake-provider';
import { discoverEvidence } from './evidence-discovery';
import type { EvidenceDiscovery } from './evidence-discovery';
import type { EvidenceInput } from './types';
import { seedPluginContext } from './fixtures/plugin-context';
import { createWorkspaceBackup, restoreWorkspaceBackup } from './backups';

let store: WorkspaceStore, root: string;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'counsel-evidence-discovery-')); store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') }); });
afterEach(() => { store.close(); rmSync(root, { recursive: true, force: true }); });
const source = (matterIds: string[], body: string, title = 'Correspondence 17') => store.createSource({ kind: 'reference', matterIds,
  revision: { title, body, provenance: { origin: 'fixture' } } });
const link = (revisionId: string, quote: string, start = 0): EvidenceInput => ({ target: { kind: 'source', revisionId }, quote, start });
const bundle = (matterId: string, attachments: string[] = []) => {
  const conversation = store.conversations.create({ scope: 'matter', matterId });
  const turn = store.conversations.begin(conversation.id, { clientId: crypto.randomUUID(), message: 'Check our earlier advice.', attachments }, 'fixture').turn;
  return { turn, ...chatTools({ store, conversation, turn, attachments, signal: new AbortController().signal, save: () => {} }) };
};

test('supporting links expose only permitted metadata, not quotes, and do not authorize citation before a read', async () => {
  const a = store.createMatter({ title: 'Aster' }), b = store.createMatter({ title: 'Outside' });
  const allowed = source([a.id], 'The signed certificate is still outstanding.');
  const outside = source([b.id], 'PRIVATE-QUOTE-CANARY', 'PRIVATE-TITLE-CANARY');
  const work = store.recordWork({ matterId: a.id, title: 'Earlier advice', request: 'Status?', answer: 'The transfer is not ready.',
    evidence: [link(allowed.latest.id, allowed.latest.body!), link(outside.latest.id, outside.latest.body!)] });
  const { tools, turn } = bundle(a.id);
  const read = await runToolDef(tools, 'counsel_read_record', { kind: 'work', id: work.id }, 'workspace');
  expect(read.isError).toBe(false);
  const support = (read.output as { supportingRecords: EvidenceDiscovery }).supportingRecords;
  expect(support.records).toEqual([{ kind: 'source', id: allowed.latest.id, title: allowed.latest.title,
    status: 'ready', version: 1, relation: 'cited-version', start: 0, length: allowed.latest.body!.length }]);
  expect(support.unavailable).toBe(1);
  expect(JSON.stringify(read.output)).not.toContain(outside.latest.id);
  expect(JSON.stringify(read.output)).not.toMatch(/PRIVATE-|signed certificate/);
  expect(turn.state.context.some(record => record.id === allowed.latest.id)).toBe(false);
  expect((await runToolDef(tools, 'counsel_cite_passage', { kind: 'source', id: allowed.latest.id, start: 0, quote: allowed.latest.body! }, 'workspace')).isError).toBe(true);
  expect((await runToolDef(tools, 'counsel_read_record', { kind: 'source', id: allowed.latest.id }, 'workspace')).isError).toBe(false);
  expect((await runToolDef(tools, 'counsel_cite_passage', { kind: 'source', id: allowed.latest.id, start: 0, quote: allowed.latest.body! }, 'workspace')).isError).toBe(false);
});

test('a current replacement is distinguished from the cited version; historical attachments do not grant access to newer unselected matter files', async () => {
  const a = store.createMatter({ title: 'Aster' }), b = store.createMatter({ title: 'Outside' });
  const original = source([a.id], 'Old requirement.');
  const changed = store.reviseSource(original.id, original.latest.id, { title: 'Changed requirement', body: 'New requirement.', provenance: { origin: 'fixture' } });
  const foreign = source([b.id], 'Historical attachment.');
  store.reviseSource(foreign.id, foreign.latest.id, { title: 'PRIVATE-NEW-TITLE', body: 'PRIVATE-NEW-BODY', provenance: { origin: 'fixture' } });
  const work = store.recordWork({ matterId: a.id, title: 'Advice', request: 'Question', answer: 'A qualified answer.',
    evidence: [link(original.latest.id, original.latest.body!), link(foreign.latest.id, foreign.latest.body!)] });
  const { tools } = bundle(a.id, [foreign.latest.id]);
  const read = await runToolDef(tools, 'counsel_read_record', { kind: 'work', id: work.id }, 'workspace');
  const support = (read.output as { supportingRecords: EvidenceDiscovery }).supportingRecords;
  expect(support.records).toMatchObject([
    { id: changed.id, relation: 'newer-version', start: 0 },
    { id: foreign.latest.id, relation: 'cited-version' },
  ]);
  expect(support.unavailable).toBe(1);
  expect(JSON.stringify(read.output)).not.toContain(original.latest.id);
  expect(JSON.stringify(read.output)).not.toContain('PRIVATE-NEW');
  expect((await runToolDef(tools, 'counsel_read_record', { kind: 'source', id: original.latest.id }, 'workspace')).isError).toBe(true);
});

test('automatic preparation follows the actual evidence even when source text has none of the request keywords, and pins the path on reopen', async () => {
  const matter = store.createMatter({ title: 'Aster' });
  const quote = 'Certificate ZX-14 remains unsigned; do not proceed.';
  const body = 'Unrelated background 🧭.\n'.repeat(800) + quote;
  const original = source([matter.id], body);
  const work = store.recordWork({ matterId: matter.id, title: 'Earlier novation advice', request: 'A different question', answer: 'The novation cannot complete yet.',
    evidence: [link(original.latest.id, quote, body.indexOf(quote))] });
  for (let i = 0; i < 12; i++) source([matter.id], 'Novation overview and general background.', `Novation reference ${i}`);
  const provider = new FakeModelProvider([{ text: 'Fixture only.' }]), chat = new WorkspaceChat(store, () => provider);
  const start = chat.start(store.conversations.create({ scope: 'matter', matterId: matter.id }).id,
    { clientId: crypto.randomUUID(), message: 'What blocks the novation?' });
  await chat.idle();
  const turn = store.conversations.turn(start.id);
  expect(turn.status).toBe('complete');
  expect(provider.lastRequest!.system).toContain(quote);
  expect(turn.state.preparedContext?.retrieval?.evidenceReads).toEqual([
    { kind: 'source', id: original.latest.id, from: { kind: 'work', id: work.id }, relation: 'cited-version' },
  ]);
  expect(turn.state.context.find(item => item.id === original.latest.id)?.ranges).toEqual([{ start: body.indexOf(quote), end: body.length }]);
  expect(turn.state.citations).toEqual([]);
  const db = store.databasePath; store.close(); store = new WorkspaceStore({ databasePath: db });
  expect(store.conversations.turn(turn.id).state.preparedContext).toEqual(turn.state.preparedContext);
  const backup = await createWorkspaceBackup(store.databasePath), path = join(root, 'evidence.counsel-backup');
  writeFileSync(path, backup.bytes);
  const restored = new WorkspaceStore({ databasePath: (await restoreWorkspaceBackup(path, root)).databasePath });
  try {
    expect(restored.conversations.turn(turn.id).state.preparedContext).toEqual(turn.state.preparedContext);
    expect(restored.getWork(work.id).evidence[0]?.target).toEqual({ kind: 'source', revisionId: original.latest.id });
  } finally { restored.close(); }
});

test('approved Practice exposes its evidence, while current knowledge never gains permission from a superseded supporting link', async () => {
  const a = store.createMatter({ title: 'Aster' }), b = store.createMatter({ title: 'Boreal' });
  const original = source([a.id], 'Signed confirmation is required.');
  const baseline = store.createKnowledge({ kind: 'position', revision: { title: 'Transfer baseline', body: 'Hold the transfer pending confirmation.',
    status: 'approved', approvedBy: 'Fixture lawyer', supportingEvidence: [link(original.latest.id, original.latest.body!)] } });
  const newer = store.reviseKnowledge(baseline.id, baseline.latest.id, { title: 'Revised baseline', body: 'Obtain written confirmation.', status: 'approved', approvedBy: 'Fixture lawyer', supportingEvidence: [link(original.latest.id, original.latest.body!)] });
  const oldAdvice = store.recordWork({ matterId: a.id, title: 'Earlier advice', request: 'Question', answer: 'Waiting for confirmation.',
    evidence: [{ target: { kind: 'knowledge', revisionId: baseline.latest.id }, quote: baseline.latest.body, start: 0 }] });
  const { tools } = bundle(a.id);
  const read = await runToolDef(tools, 'counsel_read_record', { kind: 'work', id: oldAdvice.id }, 'workspace');
  expect((read.output as { supportingRecords: EvidenceDiscovery }).supportingRecords.records).toMatchObject([{ id: newer.id, relation: 'newer-version' }]);
  const current = await runToolDef(tools, 'counsel_read_record', { kind: 'knowledge', id: newer.id }, 'workspace');
  expect((current.output as { supportingRecords: EvidenceDiscovery }).supportingRecords.records).toMatchObject([{ id: original.latest.id, relation: 'cited-version' }]);
  const restricted = bundle(b.id);
  const outside = await runToolDef(restricted.tools, 'counsel_read_record', { kind: 'knowledge', id: newer.id }, 'workspace');
  expect((outside.output as { supportingRecords: EvidenceDiscovery }).supportingRecords.records).toEqual([]);
  expect(JSON.stringify(outside.output)).not.toContain(original.latest.id);
});

test('discovery is bounded, deduplicates exact links, and cannot recurse through a cycle', () => {
  const id = crypto.randomUUID(), other = crypto.randomUUID();
  const evidence = Array.from({ length: 130 }, (_, index) => link(index % 2 ? id : other, 'Not exposed', index));
  const found = discoverEvidence([evidence[0]!, ...evidence], () => ({ title: 'Allowed', version: 1, status: 'ready' }), () => null);
  expect(found.records).toHaveLength(20);
  expect(found.omitted).toBe(110);
  expect(JSON.stringify(found)).not.toContain('Not exposed');
  const cycle = discoverEvidence([{ target: { kind: 'work', workId: id }, quote: 'Self', start: 0 }],
    () => ({ title: 'Self', version: null, status: 'draft' }), () => { throw new Error('Must not follow again'); });
  expect(cycle.records).toHaveLength(1);
});

test('a busy library cannot crowd out prior advice, and six selected matter notes get a starting read', async () => {
  const plugin = seedPluginContext(store);
  const ids = [plugin.matters.aster!];
  for (let i = 0; i < 6; i++) {
    const matter = store.createMatter({ title: `Monitoring project ${i}` }); ids.push(matter.id);
    store.createSource({ kind: 'reference', matterIds: [matter.id], revision: { title: `Monitoring note ${i}`, body: 'Employee monitoring is awaiting notice.', provenance: { origin: `plugin:matters/note-${i}.md` } } });
  }
  const work = store.recordWork({ matterId: ids[0], title: 'Monitoring advice', request: 'Question', answer: 'Monitoring remains on hold pending HR notice.' });
  const files = Array.from({ length: 3 }, (_, i) => source([], 'Employee monitoring policy for evaluation.', `Monitoring attachment ${i}`));
  const provider = new FakeModelProvider([{ text: 'Fixture only.' }]), chat = new WorkspaceChat(store, () => provider);
  const start = chat.start(store.conversations.create({ scope: 'matters', matterIds: ids }).id,
    { clientId: crypto.randomUUID(), message: 'Assess employee monitoring against our practice standards and law.', attachments: files.map(item => item.latest.id) });
  await chat.idle();
  const turn = store.conversations.turn(start.id);
  expect(turn.status).toBe('complete');
  expect(turn.state.preparedContext?.retrieval).toMatchObject({ selectedMatters: 7, matterNotesRead: 6, limited: true });
  expect(turn.state.preparedContext?.records.some(item => item.id === work.id)).toBe(true);
  expect(turn.state.preparedContext?.retrieval?.characters).toBeLessThanOrEqual(64_000);
  expect(turn.state.preparedContext?.records.length).toBeLessThanOrEqual(20);
});

test('short read handles resolve exact immutable records only in their own response and retain ordinary read/citation checks', async () => {
  const a = store.createMatter({ title: 'Aster' }), b = store.createMatter({ title: 'Boreal' });
  const original = source([a.id], 'An exact supporting passage.');
  const first = bundle(a.id), second = bundle(b.id);
  const read = await runToolDef(first.tools, 'counsel_read_record', { kind: 'source', id: original.latest.id, length: 8 }, 'workspace');
  const handle = (read.output as { readHandle: string }).readHandle;
  expect(handle).toMatch(/^R[a-f0-9]{8}-1$/);
  const repeat = await runToolDef(first.tools, 'counsel_read_record', { kind: 'source', id: handle, length: 8 }, 'workspace');
  expect(repeat.output).toMatchObject({ id: original.latest.id, readHandle: handle, text: 'An exact' });
  expect((await runToolDef(first.tools, 'counsel_cite_passage', { kind: 'source', id: handle, quote: original.latest.body!, start: 0 }, 'workspace')).isError).toBe(true);
  expect((await runToolDef(first.tools, 'counsel_cite_passage', { kind: 'source', id: handle, quote: 'An exact', start: 0 }, 'workspace')).isError).toBe(false);
  expect(first.turn.state.citations[0]?.target).toEqual({ kind: 'source', revisionId: original.latest.id });
  expect((await runToolDef(first.tools, 'counsel_read_record', { kind: 'work', id: handle }, 'workspace')).isError).toBe(true);
  expect((await runToolDef(second.tools, 'counsel_read_record', { kind: 'source', id: handle }, 'workspace')).isError).toBe(true);
  expect(second.turn.state.context).toEqual([]);
  // Unknown IDs are not described as proof that a formerly available file vanished.
  const wrong = await runToolDef(first.tools, 'counsel_read_record', { kind: 'source', id: crypto.randomUUID() }, 'workspace');
  expect(wrong.isError).toBe(true);
  expect(wrong.output).toContain('an incorrect ID does not mean a document was deleted');
  expect((await runToolDef(first.tools, 'counsel_read_record', { kind: 'source', id: 'S1' }, 'workspace')).isError).toBe(true);
});

test('natural-word search fallback ranks within scope without treating search snippets as reads', async () => {
  const a = store.createMatter({ title: 'Aster' }), b = store.createMatter({ title: 'Outside' });
  const wanted = source([a.id], 'The lender’s certificate is unsigned.');
  const replaced = source([a.id], 'The lender’s certificate is unsigned.');
  store.reviseSource(replaced.id, replaced.latest.id, { title: 'Replacement', body: 'Routine office housekeeping.', provenance: { origin: 'fixture' } });
  for (let i = 0; i < 40; i++) source([b.id], 'Transfer unsigned certificate lender.', 'PRIVATE-TITLE');
  const { tools, turn } = bundle(a.id);
  const search = await runToolDef(tools, 'counsel_search_records', { query: 'transfer unsigned certificate lender' }, 'workspace');
  expect(search.isError).toBe(false);
  const output = search.output as { matching: string; hits: Array<{ revisionId: string }>; truncated: boolean };
  expect(output.matching).toBe('ranked-topic-words');
  expect(output.hits.map(item => item.revisionId)).toEqual([wanted.latest.id]);
  expect(output.truncated).toBe(false);
  expect(JSON.stringify(search.output)).not.toContain('PRIVATE');
  expect(turn.state.context).toEqual([]);
  expect((await runToolDef(tools, 'counsel_cite_passage', { kind: 'source', id: wanted.latest.id, quote: wanted.latest.body!, start: 0 }, 'workspace')).isError).toBe(true);
  const exact = await runToolDef(tools, 'counsel_search_records', { query: 'unsigned certificate' }, 'workspace');
  expect(exact.output).toMatchObject({ matching: 'all-words' });
  // The general workspace search retains its explicit all-word semantics.
  expect(store.search({ query: 'transfer unsigned certificate lender', matterId: a.id }).hits).toEqual([]);
});

test('fallback keeps unreadable-text coverage and result bounds, without interpreting FTS operators', async () => {
  const a = store.createMatter({ title: 'Aster' });
  for (let i = 0; i < 34; i++) source([a.id], 'The lender’s certificate is unsigned.');
  const gap = store.createSource({ kind: 'document', matterIds: [a.id], revision: { title: 'Scanned certificate', body: null, textStatus: 'unavailable', provenance: { origin: 'fixture' } } });
  const { tools } = bundle(a.id);
  const found = await runToolDef(tools, 'counsel_search_records', { query: 'transfer unsigned certificate NOT nonexistent' }, 'workspace');
  expect(found.isError).toBe(false);
  expect(found.output).toMatchObject({ matching: 'ranked-topic-words', truncated: true, coverage: { complete: false, gaps: [{ revisionId: gap.latest.id }] } });
  expect((found.output as { hits: unknown[] }).hits).toHaveLength(30);
  const blank = await runToolDef(tools, 'counsel_search_records', { query: 'what is this?' }, 'workspace');
  expect(blank.output).toMatchObject({ matching: 'all-words', hits: [], coverage: { complete: false } });
});

test('evidence preparation stops at four additional reads and reports the remaining linked passages', async () => {
  const a = store.createMatter({ title: 'Aster' });
  const evidence = Array.from({ length: 9 }, (_, i) => {
    const item = source([a.id], `Certificate ${i} needs a signature.`);
    return link(item.latest.id, item.latest.body!);
  });
  store.recordWork({ matterId: a.id, title: 'Novation advice', request: 'Question', answer: 'Novation awaits required evidence.', evidence });
  const provider = new FakeModelProvider([{ text: 'Fixture.' }]), chat = new WorkspaceChat(store, () => provider);
  const start = chat.start(store.conversations.create({ scope: 'matter', matterId: a.id }).id, { clientId: crypto.randomUUID(), message: 'Explain the novation.' });
  await chat.idle();
  const turn = store.conversations.turn(start.id);
  expect(turn.status).toBe('complete');
  expect(turn.state.preparedContext?.retrieval?.evidenceReads).toHaveLength(4);
  expect(turn.state.preparedContext?.retrieval).toMatchObject({ omittedLinks: 5, limited: true });
  expect(turn.state.context.filter(item => item.kind === 'source')).toHaveLength(4);
});
