import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildDocx } from '../docx/test/builder';
import { WorkspaceStore } from './store';
import { WorkspaceChat } from './chat';
import { FakeModelProvider, runToolDef } from '../core/fake-provider';
import { chatTools } from './chat-tools';
import { DocumentRoundInput, compareDocumentRounds, type RoundDocument } from './document-rounds';
import { hashBytes } from './exports';
import { createWorkspaceBackup, restoreWorkspaceBackup } from './backups';

let root: string, store: WorkspaceStore;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'counsel-rounds-test-')); store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') }); });
afterEach(() => { store.close(); rmSync(root, { recursive: true, force: true }); });
const marked = (text: string, kind: 'ins' | 'del') => ({ text, [kind]: { author: 'Synthetic reviewer', date: '2026-01-01T00:00:00Z' } });
const doc = (role: RoundDocument['role'], bytes: Uint8Array) => ({ role, bytes, revisionId: crypto.randomUUID(), title: `${role}.docx`, version: 1, contentHash: hashBytes(bytes) });
const baseline = () => buildDocx({ blocks: [{ runs: ['Payment net 30.'] }, { runs: ['Notices may be oral.'] }] });
const sent = () => buildDocx({ blocks: [{ runs: ['Payment net ', marked('30', 'del'), marked('45', 'ins'), '.'] }, { runs: ['Notices may be oral.'] }] });
const returned = () => buildDocx({ blocks: [{ runs: ['Payment net 45.'] }, { runs: ['Notices must be written.'] }] });
const signal = () => new AbortController().signal;
async function originals() {
  const sources = [];
  for (const [role, bytes] of [['baseline', baseline()], ['sent', sent()], ['returned', returned()]] as const)
    sources.push(await store.importDocument({ name: `${role}.docx`, base64: Buffer.from(bytes).toString('base64') }));
  return sources;
}

test('three-way text comparison attributes retained edits and new asks without changing originals', async () => {
  const documents = [doc('sent', sent()), doc('returned', returned()), doc('baseline', baseline())];
  const copies = documents.map(d => Buffer.from(d.bytes));
  const report = await compareDocumentRounds(documents, signal());
  expect(report.summary).toMatchObject({ accepted: 1, new: 1, findings: 2 });
  expect(report.documents.map(d => d.role)).toEqual(['sent', 'returned', 'baseline']);
  expect(report.findings.map(f => f.classification)).toEqual(['ACCEPTED', 'NEW']);
  expect(report.warnings.join(' ')).toContain('not agreement');
  expect(report.limited).toBe(false);
  expect(documents.map(d => Buffer.from(d.bytes))).toEqual(copies);
});

test('missing baseline, shortened reports, invalid inputs, unsupported packages and cancellation stay explicit', async () => {
  const two = await compareDocumentRounds([doc('sent', sent()), doc('returned', returned())], signal());
  expect(two.warnings.join(' ')).toContain('No pre-edit baseline');
  const same = crypto.randomUUID();
  expect(DocumentRoundInput.safeParse({ sentRevisionId: same, returnedRevisionId: same }).success).toBe(false);
  const old = buildDocx({ blocks: Array.from({ length: 50 }, (_, i) => ({ runs: [`Clause ${i} requires ${i} days notice.`] })) });
  const next = buildDocx({ blocks: Array.from({ length: 50 }, (_, i) => ({ runs: [`Clause ${i} requires ${i + 2} days notice.`] })) });
  const shortened = await compareDocumentRounds([doc('sent', old), doc('returned', next), doc('baseline', old)], signal());
  expect(shortened.limited).toBe(true);
  expect(shortened.findings).toHaveLength(40);
  expect(shortened.summary.findings).toBe(50);
  await expect(compareDocumentRounds([doc('sent', new Uint8Array([1, 2])), doc('returned', next)], signal())).rejects.toThrow();
  const large = buildDocx({ blocks: Array.from({ length: 601 }, () => ({ runs: ['A.'] })) });
  await expect(compareDocumentRounds([doc('sent', large), doc('returned', next)], signal())).rejects.toThrow('600 paragraphs');
  const controller = new AbortController();
  const running = compareDocumentRounds([doc('sent', old), doc('returned', next)], controller.signal);
  controller.abort();
  await expect(running).rejects.toThrow();
});

test('comparison receipts, exact roles and hashes survive chat completion, reopen and verified backup', async () => {
  const sources = await originals(), [base, ours, theirs] = sources;
  const input = { sentRevisionId: ours!.latest.id, returnedRevisionId: theirs!.latest.id, baselineRevisionId: base!.latest.id };
  const conversation = store.conversations.create({});
  const chat = new WorkspaceChat(store, () => new FakeModelProvider([{ toolCalls: [{ name: 'counsel_compare_document_rounds', input }], text: 'Our payment edit remains; the notice clause changed. These are text findings, not approvals.' }]));
  const started = chat.start(conversation.id, { clientId: crypto.randomUUID(), message: 'Compare the sent and returned drafts against the baseline.', attachments: sources.map(s => s.latest.id) });
  await chat.idle();
  const turn = store.conversations.turn(started.id);
  expect(turn.status).toBe('complete');
  expect(turn.state.documentRound!.summary.accepted).toBe(1);
  expect(turn.state.proposalIds).toHaveLength(0);
  expect(turn.state.redline).toBeUndefined();
  for (const source of sources) expect(store.getSource(source.id).latest.id).toBe(source.latest.id);
  const backup = await createWorkspaceBackup(store.databasePath), path = join(root, backup.name);
  await Bun.write(path, backup.bytes);
  const restored = await restoreWorkspaceBackup(path, root), copy = new WorkspaceStore({ databasePath: restored.databasePath });
  try { expect(copy.conversations.turn(turn.id).state.documentRound).toEqual(turn.state.documentRound); }
  finally { copy.close(); }
  store.close(); store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') });
  expect(store.conversations.turn(turn.id).state.documentRound).toEqual(turn.state.documentRound);
});

test('the comparison tool cannot read an unselected matter or non-Word originals', async () => {
  const sources = await originals(), conversation = store.conversations.create({});
  const turn = store.conversations.begin(conversation.id, { clientId: crypto.randomUUID(), message: 'Compare these.', attachments: [sources[1]!.latest.id] }, 'fixture').turn;
  const kit = chatTools({ store, conversation, turn, attachments: turn.attachments, signal: signal(), save: () => store.conversations.save(turn) });
  const denied = await runToolDef(kit.tools, 'counsel_compare_document_rounds', { sentRevisionId: sources[1]!.latest.id, returnedRevisionId: sources[2]!.latest.id }, 'workspace');
  expect(denied.isError).toBe(true);
  expect(turn.state.documentRound).toBeUndefined();
  expect(JSON.stringify(denied.output)).toContain('scope');
  const text = store.createSource({ kind: 'document', revision: { title: 'No original', body: 'Extracted only.', provenance: { origin: 'fixture' } } });
  const more = chatTools({ store, conversation, turn, attachments: [sources[1]!.latest.id, text.latest.id], signal: signal(), save: () => store.conversations.save(turn) });
  const missing = await runToolDef(more.tools, 'counsel_compare_document_rounds', { sentRevisionId: sources[1]!.latest.id, returnedRevisionId: text.latest.id }, 'workspace');
  expect(missing.isError).toBe(true);
  expect(JSON.stringify(missing.output)).toContain('retained Word');
});
