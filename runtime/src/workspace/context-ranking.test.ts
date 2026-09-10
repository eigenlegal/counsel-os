import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkspaceStore } from './store';
import { contextTerms, contextWindow } from './context-ranking';

let store: WorkspaceStore, root: string;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'counsel-ranking-')); store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') }); });
afterEach(() => { store.close(); rmSync(root, { recursive: true, force: true }); });

test('full-text ranking applies scope, active revisions and approval before the result limit; candidate IDs cannot grant access', () => {
  const a = store.createMatter({ title: 'A' }), b = store.createMatter({ title: 'B' });
  const source = (matterId: string, title: string) => store.createSource({ kind: 'reference', matterIds: [matterId], revision: { title, body: 'Heliotrope novation needs consent.', provenance: { origin: 'fixture' } } });
  const allowed = source(a.id, 'Older correspondence');
  const outdated = source(a.id, 'Old novation policy');
  store.reviseSource(outdated.id, outdated.latest.id, { title: 'Current policy', body: 'Routine billing information.', provenance: { origin: 'fixture:replacement' } });
  const pending = store.createKnowledge({ kind: 'position', revision: { title: 'Heliotrope novation', body: 'Unapproved proposal.' } });
  const baseline = store.createKnowledge({ kind: 'position', revision: { title: 'Baseline', body: 'Heliotrope novation needs consent.', status: 'approved', approvedBy: 'Synthetic Lawyer' } });
  store.reviseKnowledge(baseline.id, baseline.latest.id, { title: 'New baseline', body: 'Routine billing information.', status: 'approved', approvedBy: 'Synthetic Lawyer' });
  let outside = allowed;
  for (let i = 0; i < 40; i++) outside = source(b.id, 'Heliotrope novation');
  const boundary = { all: false, matterId: a.id, sourceRevisionIds: [], workIds: [] };
  const terms = contextTerms('What do we need for the Heliotrope novation?');
  expect(store.rankContext({ terms }, boundary, 1).map(item => item.id)).toEqual([allowed.latest.id]);
  expect(store.rankContext({ terms, ids: [outside.latest.id, outdated.latest.id, pending.latest.id, baseline.latest.id] }, boundary)).toEqual([]);
  // Explicit attachment permits exactly that historical version, not all files in B.
  expect(store.rankContext({ terms, ids: [outdated.latest.id] }, { ...boundary, sourceRevisionIds: [outdated.latest.id] }).map(item => item.id)).toEqual([outdated.latest.id]);
});

test('topical windows preserve exact Unicode offsets and support small read budgets', () => {
  const quote = 'Café novation requires consent.';
  const body = 'Unrelated 🧭 paragraph.\n'.repeat(1000) + quote + '\n' + 'Background.\n'.repeat(200);
  const terms = contextTerms('What does the café novation require?');
  expect(terms).toContain('cafe');
  for (const length of [200, 2000, 16_000]) {
    const start = contextWindow(body, terms, length);
    expect(start).toBeGreaterThan(0);
    expect(body.slice(start, start + length)).toContain(quote);
    expect(/[\uDC00-\uDFFF]/.test(body[start]!)).toBe(false);
  }
  expect(contextWindow(body, ['unmatched'], 200)).toBe(0);
  expect(() => contextWindow(body, terms, 0)).toThrow('length');
});
