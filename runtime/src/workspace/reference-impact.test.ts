import { afterEach, beforeEach, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { WorkspaceStore } from './store';
import { referenceImpact } from './reference-impact';
import { createWorkspaceBackup, restoreWorkspaceBackup } from './backups';
import { openWorkspaceDatabase } from './database';
import { workspaceHandler } from './http';
import { chatTools } from './chat-tools';
import { runToolDef } from '../core/fake-provider';
import type { EvidenceInput } from './types';

let root: string, store: WorkspaceStore;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'counsel-impact-test-')); store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') }); });
afterEach(() => { store.close(); rmSync(root, { recursive: true, force: true }); });
const source = () => store.createSource({ kind: 'authority', revision: { title: 'Synthetic source', body: 'Written notice.', provenance: { origin: 'fixture:source' } } });
const quote = (kind: 'source' | 'knowledge' | 'work', id: string, body: string): EvidenceInput => ({ target: kind === 'work' ? { kind, workId: id } : { kind, revisionId: id }, start: 0, quote: body });
const revise = (s: ReturnType<typeof source>) => store.reviseSource(s.id, s.latest.id, { title: 'Updated synthetic source', body: 'Written notice with a receipt.', provenance: { origin: 'fixture:update' } });

test('source changes reach advice through approved practice and prior work, preserving every historical version', async () => {
  const s = source(), support = [quote('source', s.latest.id, s.latest.body!)];
  const practice = store.createKnowledge({ kind: 'position', revision: { title: 'Notice position', body: 'Use written notice.', supportingEvidence: support } });
  const approved = store.reviewKnowledge(practice.id, practice.latest.id, 'approve', 'Synthetic Avery');
  expect(approved.active!.supportingEvidence?.[0]?.title).toBe('Synthetic source');
  expect(store.knowledgeEvidence(approved.active!.id)).toEqual(support);
  const advice = store.recordWork({ title: 'Earlier advice', request: 'How?', answer: 'Send written notice.', evidence: [quote('knowledge', approved.active!.id, approved.active!.body)] });
  const follow = store.recordWork({ title: 'Follow-up', request: 'What next?', answer: 'Follow the earlier advice.', evidence: [quote('work', advice.id, advice.answer)] });
  const pending = store.proposeKnowledgeUpdate(practice.id, { expectedRevisionId: approved.latest.id, title: 'Proposed notice', body: 'Consider tracked delivery.' });
  expect(store.referenceChanges(advice.id)).toEqual([]); // Pending text does not displace approval.
  revise(s);
  const impact = store.referenceImpact(follow.id);
  expect(impact.changes).toMatchObject([{ kind: 'source', recordId: s.id, citedRevisionId: s.latest.id, citedVersion: 1, currentVersion: 2,
    via: [{ kind: 'work', id: advice.id }, { kind: 'knowledge', id: approved.active!.id }] }]);
  expect(impact.coverage).toEqual({ visitedRecords: 4, unlinkedRecords: 0, truncated: false });
  expect(store.sourceHistory(s.id).affectedWork.map(w => w.id)).toEqual(expect.arrayContaining([advice.id, follow.id]));
  expect(store.getWork(advice.id)).toEqual(advice);
  expect(store.getKnowledge(practice.id).active!.id).toBe(approved.active!.id);
  expect(store.knowledgeEvidence(pending.latest.id)).toEqual(support);
  const adopted = store.reviewKnowledge(practice.id, pending.latest.id, 'approve', 'Synthetic Avery');
  expect(store.referenceChanges(advice.id).map(c => c.kind).sort()).toEqual(['knowledge', 'source']);
  expect(store.knowledgeEvidence(adopted.active!.id)).toEqual(support);
  const backup = await createWorkspaceBackup(store.databasePath), path = join(root, backup.name);
  await Bun.write(path, backup.bytes);
  const restored = await restoreWorkspaceBackup(path, root), copy = new WorkspaceStore({ databasePath: restored.databasePath });
  try { expect(copy.referenceImpact(follow.id)).toEqual(store.referenceImpact(follow.id)); expect(copy.getWork(advice.id)).toEqual(advice); }
  finally { copy.close(); }
});

test('invalid support rolls back and explicit support removal is versioned rather than erasing history', () => {
  const s = source();
  expect(() => store.createKnowledge({ kind: 'method', revision: { title: 'Bad quote', body: 'A.', supportingEvidence: [quote('source', s.latest.id, 'Invented quote')] } })).toThrow('does not match');
  expect(store.catalog().knowledge).toHaveLength(0);
  const item = store.createKnowledge({ kind: 'method', revision: { title: 'Method', body: 'A.', supportingEvidence: [quote('source', s.latest.id, s.latest.body!)] } });
  const updated = store.proposeKnowledgeUpdate(item.id, { expectedRevisionId: item.latest.id, title: 'Method', body: 'A.', supportingEvidence: [] });
  expect(updated.latest.number).toBe(2);
  expect(store.knowledgeEvidence(updated.latest.id)).toEqual([]);
  expect(store.knowledgeEvidence(item.latest.id)).toHaveLength(1);
  expect(store.proposeKnowledgeUpdate(item.id, { expectedRevisionId: item.latest.id, title: 'Method', body: 'A.', supportingEvidence: [] }).latest.id).toBe(updated.latest.id);
});

test('cycles terminate, missing evidence is visible, and indirect impact includes no unrelated work', () => {
  const s = source(), a = store.createKnowledge({ kind: 'method', revision: { title: 'A', body: 'A.' } }), b = store.createKnowledge({ kind: 'method', revision: { title: 'B', body: 'B.' } });
  const work = store.recordWork({ title: 'Dependent', request: '?', answer: 'A.', evidence: [quote('knowledge', a.latest.id, 'A.')] });
  const unrelated = store.recordWork({ title: 'Unrelated', request: '?', answer: 'No citations.' });
  const db = new Database(store.databasePath);
  try {
    db.query('INSERT INTO knowledge_evidence(revision_id,position,knowledge_revision_id,quote,start_offset,end_offset) VALUES (?,?,?,?,0,2)').run(a.latest.id, 0, b.latest.id, 'B.');
    db.query('INSERT INTO knowledge_evidence(revision_id,position,knowledge_revision_id,quote,start_offset,end_offset) VALUES (?,?,?,?,0,2)').run(b.latest.id, 0, a.latest.id, 'A.');
    db.query('INSERT INTO knowledge_evidence(revision_id,position,source_revision_id,quote,start_offset,end_offset) VALUES (?,?,?,?,0,15)').run(a.latest.id, 1, s.latest.id, 'Written notice.');
    revise(s);
    expect(store.referenceImpact(work.id).coverage).toEqual({ visitedRecords: 4, unlinkedRecords: 0, truncated: false });
    expect(store.sourceHistory(s.id).affectedWork.map(w => w.id)).toContain(work.id);
    expect(store.sourceHistory(s.id).affectedWork.map(w => w.id)).not.toContain(unrelated.id);
    expect(store.referenceImpact(unrelated.id).coverage.unlinkedRecords).toBe(1);
  } finally { db.close(); }
});

test('graph traversal is bounded even with a very broad legacy evidence record', () => {
  const s = source(), work = store.recordWork({ title: 'Broad', request: '?', answer: 'A.' }), db = new Database(store.databasePath);
  try {
    db.transaction(() => {
      for (let i = 0; i < 1001; i++) {
        const id = crypto.randomUUID();
        db.query('INSERT INTO source_revisions SELECT ?, source_id, ?, title, body, text_status, content_hash, provenance_json, received_at FROM source_revisions WHERE id=?').run(id, i + 2, s.latest.id);
        db.query('INSERT INTO evidence(id,work_id,position,source_revision_id,quote,start_offset,end_offset) VALUES (?,?,?,?,?,0,15)').run(crypto.randomUUID(), work.id, i, id, 'Written notice.');
      }
    })();
    const result = referenceImpact(db, { kind: 'work', id: work.id });
    expect(result.coverage.truncated).toBe(true); expect(result.coverage.visitedRecords).toBe(1000);
  } finally { db.close(); }
});

test('schema 13 upgrades without fabricating evidence and HTTP impact remains authenticated', async () => {
  const old = openWorkspaceDatabase(':memory:', 13), path = join(root, 'old.sqlite3');
  old.query('VACUUM INTO ?').run(path); old.close();
  const migrated = new WorkspaceStore({ databasePath: path });
  try { expect(migrated.catalog().knowledge).toHaveLength(0); }
  finally { migrated.close(); }
  const s = source(), work = store.recordWork({ title: 'Direct', request: '?', answer: 'A.', evidence: [quote('source', s.latest.id, s.latest.body!)] });
  revise(s);
  const handler = workspaceHandler({ store, token: 'fixture', origin: 'http://127.0.0.1', distDir: root, demo: false });
  const url = `http://127.0.0.1/api/workspace/work/${work.id}/reference-impact`;
  expect((await handler(new Request(url))).status).toBe(401);
  const response = await handler(new Request(url, { headers: { Authorization: 'Bearer fixture' } }));
  expect(response.status).toBe(200); expect((await response.json() as { changes: Array<{ currentVersion: number }> }).changes[0]!.currentVersion).toBe(2);
});

test('chat proposals can retain only already verified supporting citation keys', async () => {
  const s = source(), conversation = store.conversations.create({});
  const turn = store.conversations.begin(conversation.id, { clientId: crypto.randomUUID(), message: 'Make this my notice position.', attachments: [s.latest.id] }, 'fixture').turn;
  const kit = chatTools({ store, conversation, turn, attachments: [s.latest.id], signal: new AbortController().signal, save: () => {} });
  const input = { title: 'Notice position', body: 'Use written notice.', scope: 'practice', kind: 'position', supportingCitations: ['S1'] };
  expect((await runToolDef(kit.tools, 'counsel_propose_knowledge', input, 'workspace')).isError).toBe(true);
  await runToolDef(kit.tools, 'counsel_read_record', { kind: 'source', id: s.latest.id }, 'workspace');
  await runToolDef(kit.tools, 'counsel_cite_passage', { kind: 'source', id: s.latest.id, start: 0, quote: s.latest.body }, 'workspace');
  expect((await runToolDef(kit.tools, 'counsel_propose_knowledge', input, 'workspace')).isError).not.toBe(true);
  expect(kit.proposals[0]!.revision.supportingEvidence).toEqual([quote('source', s.latest.id, s.latest.body!)]);
});

test('a practice dependency notice does not reveal or grant access to an out-of-scope matter source', async () => {
  const matter = store.createMatter({ title: 'Private matter' });
  const s = store.createSource({ kind: 'document', matterIds: [matter.id], revision: { title: 'PRIVATE TITLE', body: 'PRIVATE BASIS', provenance: { origin: 'fixture:private' } } });
  const item = store.createKnowledge({ kind: 'method', revision: { title: 'Shared method', body: 'Use written notice.', status: 'approved', approvedBy: 'Synthetic Avery', supportingEvidence: [quote('source', s.latest.id, s.latest.body!)] } });
  store.reviseSource(s.id, s.latest.id, { title: 'PRIVATE NEW TITLE', body: 'PRIVATE NEW BASIS', provenance: { origin: 'fixture:private' } });
  const conversation = store.conversations.create({});
  const turn = store.conversations.begin(conversation.id, { clientId: crypto.randomUUID(), message: 'Read our method.' }, 'fixture').turn;
  const kit = chatTools({ store, conversation, turn, attachments: [], signal: new AbortController().signal, save: () => {} });
  const read = await runToolDef(kit.tools, 'counsel_read_record', { kind: 'knowledge', id: item.active!.id }, 'workspace');
  expect(JSON.stringify(read.output)).toContain('hasNewerCitedSources');
  expect(JSON.stringify(read.output)).not.toContain('PRIVATE');
  expect(JSON.stringify(read.output)).not.toContain(s.latest.id);
  expect((await runToolDef(kit.tools, 'counsel_read_record', { kind: 'source', id: s.latest.id }, 'workspace')).isError).toBe(true);
});

test('backup validation rejects altered supporting quotes, not merely valid foreign keys', async () => {
  const s = source();
  store.createKnowledge({ kind: 'method', revision: { title: 'Method', body: 'A.', supportingEvidence: [quote('source', s.latest.id, s.latest.body!)] } });
  const db = new Database(store.databasePath);
  db.query('UPDATE knowledge_evidence SET quote=?').run('Altered quote'); db.close();
  await expect(createWorkspaceBackup(store.databasePath)).rejects.toThrow('evidence integrity');
});
