import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkspaceStore } from './store';
import { WORKSPACE_APPLICATION_ID, WORKSPACE_SCHEMA_VERSION } from './database';
import { WorkspaceConflictError, WorkspaceNotFoundError, type WorkspaceSeed } from './types';

let root: string;
let path: string;
let store: WorkspaceStore;
let now: string;
const clock = () => new Date(now);
const fixture = (): WorkspaceSeed => JSON.parse(readFileSync(join(import.meta.dir, 'fixtures/practice.json'), 'utf8')) as WorkspaceSeed;
const revision = (body: string) => ({ title: 'Reference', body, provenance: { origin: 'fixture:test' } });

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'counsel-workspace-test-'));
  path = join(root, 'workspace.sqlite3');
  now = '2026-09-04T10:00:00.000Z';
  store = new WorkspaceStore({ databasePath: path, clock });
});
afterEach(() => {
  store.close();
  rmSync(root, { recursive: true, force: true });
});
function reopen(): void {
  store.close();
  store = new WorkspaceStore({ databasePath: path, clock });
}

describe('matters, immutable evidence, and recall', () => {
  test('three kinds of legal work retain their sources and decisions after reopening', () => {
    const receipt = store.importSeed(fixture());
    const ids = receipt.records;
    expect(store.listMatters().map(m => m.kind).sort()).toEqual(['advisory', 'document', 'investigation']);
    const before = store.listWork();
    expect(before).toHaveLength(4);
    expect(store.getWork(ids.work.advice!).disposition).toBe('draft');
    expect(store.getWork(ids.work.decision!)).toMatchObject({ disposition: 'decision', decisionBy: 'fixture-lawyer' });
    const linked = store.getSource(ids.sources['monitoring-reference']!);
    expect(linked.matterIds.sort()).toEqual([ids.matters.monitoring!, ids.matters.investigation!].sort());
    const search = store.search({ query: 'monitoring', matterId: ids.matters.monitoring });
    expect(search.hits.some(hit => hit.recordId === ids.work.advice)).toBe(true);
    expect(search.hits.some(hit => hit.recordId === ids.knowledge['unreviewed-pattern'])).toBe(false);
    reopen();
    expect(store.listWork()).toEqual(before);
    expect(store.getSource(linked.id)).toEqual(linked);
    expect(store.search({ query: 'monitoring', matterId: ids.matters.monitoring })).toEqual(search);
    expect(store.importSeed(fixture())).toEqual({ ...receipt, alreadyImported: true });
  });

  test('a matter needs no document, and unassigned work can be attached without losing evidence', () => {
    const matter = store.createMatter({ title: 'General advice', kind: 'advisory' });
    const other = store.createMatter({ title: 'Other matter' });
    const source = store.createSource({ kind: 'reference', revision: revision('A useful reference.') });
    const work = store.recordWork({ title: 'Advice', request: 'A question', answer: 'An answer', evidence: [
      { target: { kind: 'source', revisionId: source.latest.id }, quote: 'useful reference', start: 2 },
    ] });
    expect(work.matterId).toBeNull();
    expect(store.listWork(matter.id)).toEqual([]);
    const assigned = store.assignWork(work.id, matter.id);
    expect(assigned).toEqual({ ...work, matterId: matter.id });
    expect(store.assignWork(work.id, matter.id)).toEqual(assigned);
    expect(() => store.assignWork(work.id, other.id)).toThrow(WorkspaceConflictError);
    expect(store.search({ query: 'answer', matterId: matter.id, kinds: ['work'] }).hits[0]?.recordId).toBe(work.id);
    reopen();
    expect(store.listWork(matter.id)).toEqual([assigned]);
  });

  test('revising a source changes current search but cannot rewrite an earlier citation', () => {
    const source = store.createSource({ kind: 'document', revision: revision('Original zebra text.') });
    const work = store.recordWork({ title: 'Assessment', request: 'Assess', answer: 'Draft answer', evidence: [
      { target: { kind: 'source', revisionId: source.latest.id }, quote: 'zebra', start: 9, locator: 'paragraph 1' },
    ] });
    now = '2026-09-04T11:00:00.000Z';
    const next = store.reviseSource(source.id, source.latest.id, revision('Revised antelope text.'));
    expect(next.number).toBe(2);
    expect(next.receivedAt).toBe(now);
    expect(next.contentHash).not.toBe(source.latest.contentHash);
    expect(() => store.reviseSource(source.id, source.latest.id, revision('stale'))).toThrow(WorkspaceConflictError);
    expect(store.search({ query: 'zebra', kinds: ['source'] }).hits).toEqual([]);
    expect(store.search({ query: 'zebra', kinds: ['source'], includeHistory: true }).hits[0]?.revisionId).toBe(source.latest.id);
    reopen();
    expect(store.getWork(work.id)).toEqual(work);
    expect(store.getSourceRevision(source.latest.id)).toEqual(source.latest);
    expect(store.getSource(source.id).latest).toEqual(next);
  });

  test('invalid or missing citation targets roll back work, evidence, and search together', () => {
    const source = store.createSource({ kind: 'reference', revision: revision('Exact text.') });
    const base = { title: 'RollbackMarker', request: 'check', answer: 'RollbackMarker' };
    expect(() => store.recordWork({ ...base, evidence: [
      { target: { kind: 'source', revisionId: source.latest.id }, quote: 'Exact', start: 0 },
      { target: { kind: 'source', revisionId: source.latest.id }, quote: 'Invented', start: 0 },
    ] })).toThrow('citation quote does not match');
    expect(() => store.recordWork({ ...base, evidence: [
      { target: { kind: 'knowledge', revisionId: crypto.randomUUID() }, quote: 'Missing', start: 0 },
    ] })).toThrow(WorkspaceNotFoundError);
    expect(store.listWork()).toEqual([]);
    expect(store.search({ query: 'RollbackMarker' }).hits).toEqual([]);
    reopen();
    expect(store.listWork()).toEqual([]);
  });

  test('citation offsets use exact UTF-16 text and reject unavailable text', () => {
    const source = store.createSource({ kind: 'reference', revision: revision('📄 café evidence') });
    const work = store.recordWork({ title: 'Unicode', request: 'inspect', answer: 'Draft', evidence: [
      { target: { kind: 'source', revisionId: source.latest.id }, quote: 'café', start: 3 },
    ] });
    expect(work.evidence[0]).toMatchObject({ start: 3, end: 7, quote: 'café' });
    const unavailable = store.createSource({ kind: 'document', revision: {
      title: 'Unavailable', body: null, textStatus: 'unavailable', provenance: { origin: 'fixture:unavailable' },
    } });
    expect(() => store.recordWork({ title: 'Bad', request: 'inspect', answer: '', evidence: [
      { target: { kind: 'source', revisionId: unavailable.latest.id }, quote: 'x', start: 0 },
    ] })).toThrow('citation quote does not match');
  });
});

describe('knowledge is versioned and approval is explicit', () => {
  test('only the latest approved revision is active; pending and rejected updates stay historical', () => {
    const item = store.createKnowledge({ kind: 'position', revision: { title: 'Position', body: 'pendingword' } });
    expect(item.active).toBeNull();
    expect(store.search({ query: 'pendingword' }).hits).toEqual([]);
    expect(store.search({ query: 'pendingword', includeHistory: true }).hits[0]?.status).toBe('pending');
    const first = store.reviseKnowledge(item.id, item.latest.id, { title: 'Position', body: 'approvedfirst', status: 'approved', approvedBy: 'reviewer' });
    const pending = store.reviseKnowledge(item.id, first.id, { title: 'Position', body: 'pendingsecond' });
    const rejected = store.reviseKnowledge(item.id, pending.id, { title: 'Position', body: 'rejectedword', status: 'rejected' });
    expect(store.getKnowledge(item.id).active).toEqual(first);
    const second = store.reviseKnowledge(item.id, rejected.id, { title: 'Position', body: 'approvedsecond', status: 'approved', approvedBy: 'reviewer' });
    expect(store.search({ query: 'approvedfirst' }).hits).toEqual([]);
    expect(store.search({ query: 'approvedsecond' }).hits[0]?.revisionId).toBe(second.id);
    expect(store.search({ query: 'rejectedword' }).hits).toEqual([]);
    expect(store.search({ query: 'approvedfirst', includeHistory: true }).hits[0]?.revisionId).toBe(first.id);
    expect(() => store.reviseKnowledge(item.id, first.id, { title: 'Stale', body: 'clobber' })).toThrow(WorkspaceConflictError);
    reopen();
    expect(store.getKnowledge(item.id).active).toEqual(second);
  });

  test('an approval needs its actor, and pending knowledge cannot claim one', () => {
    expect(() => store.createKnowledge({ kind: 'position', revision: { title: 'Missing actor', body: '', status: 'approved' } })).toThrow();
    expect(() => store.createKnowledge({ kind: 'position', revision: { title: 'Pending', body: '', approvedBy: 'actor' } })).toThrow();
    expect(store.search({ query: 'missing', includeHistory: true }).hits).toEqual([]);
  });

  test('knowledge revisions cited by prior advice retain their body and approving actor', () => {
    const item = store.createKnowledge({ kind: 'method', revision: { title: 'Method', body: 'Old method.', status: 'approved', approvedBy: 'reviewer' } });
    const work = store.recordWork({ title: 'Advice', request: 'Advise', answer: 'Draft', evidence: [
      { target: { kind: 'knowledge', revisionId: item.latest.id }, quote: 'Old method.', start: 0 },
    ] });
    store.reviseKnowledge(item.id, item.latest.id, { title: 'New method', body: 'New method.', status: 'approved', approvedBy: 'other-reviewer' });
    reopen();
    expect(store.getWork(work.id)).toEqual(work);
    expect(store.getKnowledgeRevision(item.latest.id).approvedBy).toBe('reviewer');
  });
});

describe('scoped search and honest coverage', () => {
  test('filters scope before LIMIT and includes global knowledge, excluding other matters', () => {
    const first = store.createMatter({ title: 'First' });
    const second = store.createMatter({ title: 'Second' });
    for (let i = 0; i < 5; i++) store.createSource({ kind: 'reference', matterIds: [second.id], revision: revision('needle') });
    const own = store.createSource({ kind: 'reference', matterIds: [first.id], revision: revision('needle') });
    const global = store.createKnowledge({ kind: 'position', revision: { title: 'Global', body: 'needle', status: 'approved', approvedBy: 'reviewer' } });
    store.createKnowledge({ kind: 'position', matterId: second.id, revision: { title: 'Other', body: 'needle', status: 'approved', approvedBy: 'reviewer' } });
    store.recordWork({ title: 'Other', request: 'needle', answer: 'needle', matterId: second.id });
    const result = store.search({ query: 'needle', matterId: first.id, limit: 1, kinds: ['source'] });
    expect(result.hits.map(hit => hit.recordId)).toEqual([own.id]);
    expect(result.truncated).toBe(false);
    expect(store.search({ query: 'needle', matterId: first.id }).hits.map(hit => hit.recordId).sort()).toEqual([own.id, global.id].sort());
    expect(store.search({ query: 'needle', limit: 1 }).truncated).toBe(true);
    expect(() => store.search({ query: 'needle', matterId: crypto.randomUUID() })).toThrow(WorkspaceNotFoundError);
  });

  test('one reference can appear in two matter searches without being duplicated', () => {
    const one = store.createMatter({ title: 'One' });
    const two = store.createMatter({ title: 'Two' });
    const source = store.createSource({ kind: 'reference', revision: revision('shared reference'), matterIds: [one.id] });
    store.linkSource(two.id, source.id);
    store.linkSource(two.id, source.id);
    expect(store.getSource(source.id).matterIds).toHaveLength(2);
    expect(store.search({ query: 'shared', matterId: one.id }).hits[0]?.revisionId).toBe(source.latest.id);
    expect(store.search({ query: 'shared', matterId: two.id }).hits[0]?.revisionId).toBe(source.latest.id);
    expect(store.search({ query: 'shared' }).hits).toHaveLength(1);
  });

  test('partial and unavailable text are reported even when nothing matches, within the requested scope', () => {
    const first = store.createMatter({ title: 'First' });
    const second = store.createMatter({ title: 'Second' });
    const partial = store.createSource({ kind: 'document', matterIds: [first.id], revision: { ...revision('Only some text'), textStatus: 'partial' } });
    store.createSource({ kind: 'document', matterIds: [second.id], revision: {
      title: 'Missing extraction', body: null, textStatus: 'unavailable', provenance: { origin: 'fixture:unavailable' },
    } });
    const result = store.search({ query: 'nomatch', matterId: first.id });
    expect(result.hits).toEqual([]);
    expect(result.coverage).toEqual({ complete: false, gaps: [
      { sourceId: partial.id, revisionId: partial.latest.id, title: 'Reference', textStatus: 'partial' },
    ] });
    expect(store.search({ query: 'nomatch' }).coverage.gaps).toHaveLength(2);
    store.reviseSource(partial.id, partial.latest.id, revision('The full text now available'));
    expect(store.search({ query: 'nomatch', matterId: first.id }).coverage.complete).toBe(true);
    expect(store.search({ query: '', matterId: first.id, includeHistory: true }).coverage.complete).toBe(false);
    expect(store.search({ query: 'nomatch', kinds: ['work'] }).coverage.complete).toBe(true);
  });

  test('treats user input as plain terms and supports punctuation and Unicode without query errors', () => {
    store.createSource({ kind: 'reference', revision: revision('Café monitoring, non-disclosure and witness evidence.') });
    expect(store.search({ query: 'café' }).hits).toHaveLength(1);
    expect(store.search({ query: 'non-disclosure' }).hits).toHaveLength(1);
    expect(store.search({ query: 'monitoring evidence' }).hits).toHaveLength(1);
    expect(store.search({ query: '" OR * NOT ( -' }).hits).toEqual([]);
    expect(store.search({ query: "'; DROP TABLE matters; --" }).hits).toEqual([]);
    expect(store.search({ query: '***' }).hits).toEqual([]);
    expect(store.listMatters()).toEqual([]);
    expect(() => store.search({ query: 'word '.repeat(65) })).toThrow('at most 64 words');
  });
});

describe('seed import and database ownership', () => {
  test('a repeated seed preserves subsequent user revisions; altered input and unsupported format fail', () => {
    const seed = fixture();
    const receipt = store.importSeed(seed);
    const source = store.getSource(receipt.records.sources['monitoring-reference']!);
    const changed = store.reviseSource(source.id, source.latest.id, revision('User update'));
    expect(store.importSeed(seed).alreadyImported).toBe(true);
    expect(store.getSource(source.id).latest).toEqual(changed);
    const altered = fixture();
    altered.matters![0]!.title = 'Changed fixture';
    expect(() => store.importSeed(altered)).toThrow(WorkspaceConflictError);
    expect(() => store.importSeed({ ...seed, version: 2 })).toThrow(WorkspaceConflictError);
    expect(() => store.importSeed({ ...seed, schemaVersion: 2 })).toThrow();
    expect(store.listMatters()).toHaveLength(3);
  });

  test('semantically identical seed objects keep the same receipt regardless of optional undefined fields', () => {
    const first = store.importSeed(fixture());
    const equivalent = fixture();
    equivalent.sources![1]!.revision.provenance.author = undefined;
    expect(store.importSeed(equivalent)).toEqual({ ...first, alreadyImported: true });
  });

  test('a late seed failure rolls back every record, full-text entry, and import receipt', () => {
    const seed = fixture();
    seed.work!.push({ key: 'bad', title: 'Bad', request: 'Missing evidence', answer: 'Bad', evidence: [
      { target: { kind: 'source', key: 'absent' }, quote: 'x', start: 0 },
    ] });
    expect(() => store.importSeed(seed)).toThrow('unknown seed source key');
    expect(store.listMatters()).toEqual([]);
    expect(store.listWork()).toEqual([]);
    expect(store.search({ query: 'monitoring', includeHistory: true }).hits).toEqual([]);
    reopen();
    expect(store.importSeed(fixture()).alreadyImported).toBe(false);
    expect(store.listMatters()).toHaveLength(3);
  });

  test('duplicate seed keys and dangling matter links cannot create partial records', () => {
    const seed = fixture();
    seed.matters!.push({ ...seed.matters![0]! });
    expect(() => store.importSeed(seed)).toThrow('duplicate seed matters key');
    expect(store.listMatters()).toEqual([]);
    expect(() => store.createSource({ kind: 'reference', revision: revision('DanglingMarker'), matterIds: [crypto.randomUUID()] })).toThrow(WorkspaceNotFoundError);
    expect(store.search({ query: 'DanglingMarker' }).hits).toEqual([]);
  });

  test('creates a private, identifiable versioned database with enforced foreign keys', () => {
    expect(statSync(path).mode & 0o777).toBe(0o600);
    const db = new Database(path);
    expect(db.query('PRAGMA application_id').get()).toEqual({ application_id: WORKSPACE_APPLICATION_ID });
    expect(db.query('PRAGMA user_version').get()).toEqual({ user_version: WORKSPACE_SCHEMA_VERSION });
    expect(db.query('PRAGMA integrity_check').all()).toEqual([{ integrity_check: 'ok' }]);
    expect(db.query('PRAGMA foreign_key_check').all()).toEqual([]);
    db.close();
    expect(() => store.createKnowledge({ kind: 'position', matterId: crypto.randomUUID(), revision: { title: 'Bad', body: 'bad' } })).toThrow();
  });

  test('refuses a foreign/legacy database without taking ownership or modifying its rows', () => {
    const foreignPath = join(root, 'legacy.sqlite3');
    const db = new Database(foreignPath, { create: true });
    db.exec("CREATE TABLE legacy (value TEXT); INSERT INTO legacy VALUES ('keep'); PRAGMA user_version = 1;");
    db.close();
    const before = readFileSync(foreignPath);
    expect(() => new WorkspaceStore({ databasePath: foreignPath })).toThrow('explicit importer');
    expect(readFileSync(foreignPath)).toEqual(before);
  });

  test('refuses a future schema, and a second connection observes complete commits', () => {
    const other = new WorkspaceStore({ databasePath: path, clock });
    try {
      const matter = store.createMatter({ title: 'Shared process fixture' });
      expect(other.getMatter(matter.id)).toEqual(matter);
      const source = store.createSource({ kind: 'reference', revision: revision('original') });
      other.reviseSource(source.id, source.latest.id, revision('updated'));
      expect(() => store.reviseSource(source.id, source.latest.id, revision('stale'))).toThrow(WorkspaceConflictError);
    } finally { other.close(); }
    store.close();
    const db = new Database(path);
    db.exec('PRAGMA user_version = 99');
    db.close();
    expect(() => new WorkspaceStore({ databasePath: path })).toThrow('newer than supported');
  });
});
