import { afterEach, beforeEach, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkspaceStore } from './store';
import { generateRedline } from './redlines';
import { hashBytes } from './exports';
import { simpleDocx, buildDocx } from '../docx/test/builder';
import { openDocx } from '../docx/package';
import { createWorkspaceBackup, restoreWorkspaceBackup } from './backups';
import { workspaceHandler } from './http';
import { changeRecord, recordImpact } from './record-lifecycle';
let root: string, store: WorkspaceStore;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'counsel-clean-test-')); store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') }); });
afterEach(() => { store.close(); rmSync(root, { recursive: true, force: true }); });
async function fixture(bytes = simpleDocx('Notice', 'Notices may be given orally.'), pattern = '{document} ({variant} {author})') {
  const source = await store.importDocument({ name: 'Notice.docx', base64: Buffer.from(bytes).toString('base64') });
  const input = { sourceRevisionId: source.latest.id, edits: [{ current: 'orally', proposed: 'in writing', comment: 'Use written notice.' }] };
  const generated = await generateRedline(bytes, input, new AbortController().signal, 'Avery');
  const work = store.recordWork({ title: 'Review notice', request: 'Review', answer: 'Proposed notice change.' });
  const redline = store.exports.retainRedline(work.id, { input, sourceTitle: source.latest.title, sourceVersion: 1, sourceHash: hashBytes(bytes), name: 'Notice.docx',
    bytes: generated.bytes, report: generated.report, wordPreferences: { author: 'Avery', filenamePattern: pattern } });
  return { source, work, redline, bytes, request: { expectedContentHash: redline.contentHash, confirmProposal: true as const } };
}
test('explicit clean proposals persist separately, retry once, preserve originals/status and survive backup/reopen', async () => {
  const f = await fixture();
  expect(store.exports.cleanProposal(f.redline.id)).toBeNull();
  expect(store.exports.list(f.work.id)).toHaveLength(1);
  const signal = new AbortController().signal;
  const [first, retry] = await Promise.all([store.exports.createCleanProposal(f.redline.id, f.request, signal), store.exports.createCleanProposal(f.redline.id, f.request, signal)]);
  expect(first).toEqual(retry);
  expect(first.name).toBe('Notice (clean proposal Avery).docx');
  expect(first.warnings.join(' ')).toContain('Comments and their authors are retained');
  expect(store.exports.list(f.work.id)).toHaveLength(2);
  const clean = store.exports.download(first.id).bytes;
  expect(openDocx(clean).partText('word/document.xml')).not.toMatch(/<w:(ins|del)\b/);
  expect(openDocx(clean).partText('word/comments.xml')).toContain('Avery');
  expect(store.originalFile(f.source.latest.id).bytes).toEqual(Buffer.from(f.bytes));
  expect(store.exports.download(f.redline.id).record).toEqual(f.redline);
  expect(store.getWork(f.work.id)).toEqual(f.work);
  expect(store.getSource(f.source.id).latest.id).toBe(f.source.latest.id);
  const backup = await createWorkspaceBackup(store.databasePath), path = join(root, backup.name);
  await Bun.write(path, backup.bytes);
  const restored = await restoreWorkspaceBackup(path, root), copy = new WorkspaceStore({ databasePath: restored.databasePath });
  try { expect(copy.exports.cleanProposal(f.redline.id)).toEqual(first); expect(await copy.exports.createCleanProposal(f.redline.id, f.request, signal)).toEqual(first); expect(copy.exports.download(first.id).bytes).toEqual(clean); }
  finally { copy.close(); }
});
test('earlier revisions and unconfirmed, stale or non-redline requests leave no clean artifact', async () => {
  const f = await fixture(buildDocx({ blocks: [{ runs: ['Notices may be given orally.'] }, { runs: [{ text: 'Earlier', ins: { author: 'Avery', date: '2026-01-01T00:00:00Z' } }] }] }));
  const signal = new AbortController().signal;
  await expect(store.exports.createCleanProposal(f.redline.id, f.request, signal)).rejects.toThrow('original already contains');
  await expect(store.exports.createCleanProposal(f.redline.id, { expectedContentHash: f.redline.contentHash }, signal)).rejects.toThrow();
  await expect(store.exports.createCleanProposal(f.redline.id, { ...f.request, expectedContentHash: '0'.repeat(64) }, signal)).rejects.toThrow('changed');
  const answer = await store.exports.create(f.work.id);
  await expect(store.exports.createCleanProposal(answer.id, { ...f.request, expectedContentHash: answer.contentHash }, signal)).rejects.toThrow('saved Counsel redline');
  expect(store.exports.list(f.work.id)).toHaveLength(2);
});
test('abort and corrupt snapshots fail closed; filename remains distinct without a variant token', async () => {
  const f = await fixture(undefined, '{document}');
  const abort = new AbortController(); abort.abort();
  await expect(store.exports.createCleanProposal(f.redline.id, f.request, abort.signal)).rejects.toThrow();
  const db = new Database(store.databasePath), snapshot = (db.query('SELECT snapshot_json AS s FROM work_exports WHERE id = ?').get(f.redline.id) as { s: string }).s;
  db.run('UPDATE work_exports SET snapshot_json = ? WHERE id = ?', ['{}', f.redline.id]);
  await expect(store.exports.createCleanProposal(f.redline.id, f.request, new AbortController().signal)).rejects.toThrow('integrity');
  db.run('UPDATE work_exports SET snapshot_json = ? WHERE id = ?', [snapshot, f.redline.id]); db.close();
  expect(store.exports.list(f.work.id)).toHaveLength(1);
  const clean = await store.exports.createCleanProposal(f.redline.id, f.request, new AbortController().signal);
  expect(clean.name).toBe('Notice - clean proposal.docx');
  const unicode = await fixture(undefined, '📄'.repeat(40));
  const named = await store.exports.createCleanProposal(unicode.redline.id, unicode.request, new AbortController().signal);
  expect(named.name).not.toBe(unicode.redline.name);
  expect(named.name).toEndWith(' - clean proposal.docx');
  expect(Buffer.byteLength(named.name)).toBeLessThan(185);
});
test('HTTP preview is read-only and both operations authenticate; client cannot substitute bytes or authority', async () => {
  const f = await fixture(), origin = 'http://127.0.0.1:7471', handler = workspaceHandler({ store, origin, token: 'fixture', distDir: root, demo: false });
  const url = `${origin}/api/workspace/exports/${f.redline.id}/clean-proposal`, headers = { authorization: 'Bearer fixture', 'content-type': 'application/json' };
  expect((await handler(new Request(url))).status).toBe(401);
  expect((await handler(new Request(url, { method: 'POST', body: JSON.stringify(f.request) }))).status).toBe(401);
  expect(await (await handler(new Request(url, { headers }))).json()).toBeNull();
  expect(store.exports.list(f.work.id)).toHaveLength(1);
  expect((await handler(new Request(url, { method: 'POST', headers, body: JSON.stringify({ ...f.request, bytes: 'injected' }) }))).status).toBe(400);
  const result = await handler(new Request(url, { method: 'POST', headers, body: JSON.stringify(f.request) }));
  expect(result.status).toBe(200);
  expect(await (await handler(new Request(url, { headers }))).json()).toEqual(await result.json());
});
test('source or parent moved to Trash during preparation prevents the artifact commit', async () => {
  for (const kind of ['source', 'work'] as const) {
    const f = await fixture(), db = new Database(store.databasePath);
    const job = store.exports.createCleanProposal(f.redline.id, f.request, new AbortController().signal);
    const id = kind === 'source' ? f.source.id : f.work.id;
    changeRecord(db, kind, id, { action: 'trash', expectedVersion: recordImpact(db, kind, id).version, confirm: true }, () => new Date().toISOString());
    await expect(job).rejects.toThrow('Trash');
    expect((db.query('SELECT count(*) AS n FROM work_exports WHERE work_id = ?').get(f.work.id) as { n: number }).n).toBe(1);
    changeRecord(db, kind, id, { action: 'restore', expectedVersion: recordImpact(db, kind, id).version, confirm: true }, () => new Date().toISOString());
    db.close();
    expect(await store.exports.createCleanProposal(f.redline.id, f.request, new AbortController().signal)).toBeTruthy();
  }
});
