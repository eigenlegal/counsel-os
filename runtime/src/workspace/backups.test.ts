import { afterEach, beforeEach, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { WorkspaceStore } from './store';
import { createWorkspaceBackup, createWorkspaceBackupFile, inspectWorkspaceBackup, restoreWorkspaceBackup } from './backups';
import { backupHash, decodeBackup, encodeBackup } from './backup-format';
import { workspaceHandler } from './http';
import { lockWorkspace } from './lock';
import { WorkspaceChat } from './chat';
import { FakeModelProvider } from '../core/fake-provider';

let root: string, store: WorkspaceStore;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'counsel-backup-test-'));
  store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') });
});
afterEach(() => {
  store.close();
  rmSync(root, { recursive: true, force: true });
});
async function sample() {
  const matter = store.createMatter({ title: 'Synthetic recovery matter' });
  const original = Buffer.from('Keep the exact original.\n');
  const source = await store.importDocument({
    name: 'Original.txt',
    base64: original.toString('base64'),
    matterId: matter.id,
  });
  const work = store.recordWork({
    title: 'Recovery advice',
    request: 'Synthetic question',
    answer: 'Retain the original.',
    matterId: matter.id,
    evidence: [
      {
        target: { kind: 'source', revisionId: source.latest.id },
        quote: 'Keep the exact original.',
        start: 0,
      },
    ],
  });
  const exported = await store.exports.create(work.id);
  const conversation = store.conversations.create({
    title: 'Still running',
    matterId: matter.id,
    scope: 'matter',
  });
  const { turn } = store.conversations.begin(
    conversation.id,
    { clientId: randomUUID(), message: 'Synthetic pending request' },
    'fixture',
  );
  store.setSetting('model-connection', { kind: 'openai-api', model: 'DO-NOT-CARRY-CONNECTION' });
  store.setSetting('unknown-private-setting', { secret: 'SECRET-FREE-PAGE-MARKER' });
  const profile = store.saveProfile({
    name: 'Synthetic Lawyer',
    voice: 'Plain language',
    expectedRevisionId: null,
  });
  const knowledge = store.createKnowledge({
    kind: 'method',
    revision: { title: 'Keep a copy', body: 'Retain the original.' },
  });
  store.reviewKnowledge(knowledge.id, knowledge.latest.id, 'approve', profile.name);
  return { matter, source, work, exported, original, conversation, turn };
}
test('live WAL backup restores records, exact originals and Word bytes in a separate workspace without reconnecting or resuming a model', async () => {
  const fixture = await sample();
  const liveBefore = store.conversations.turn(fixture.turn.id);
  const backup = await createWorkspaceBackup(store.databasePath);
  const path = join(root, backup.name);
  writeFileSync(path, backup.bytes);
  expect(backup.manifest.counts).toMatchObject({
    matters: 1,
    conversations: 1,
    messages: 1,
    sources: 1,
    knowledge: 1,
    work: 2,
    wordFiles: 1,
  });
  expect(backup.bytes.includes(Buffer.from('SECRET-FREE-PAGE-MARKER'))).toBe(false);
  expect(backup.bytes.includes(Buffer.from('DO-NOT-CARRY-CONNECTION'))).toBe(false);
  expect(await inspectWorkspaceBackup(path)).toEqual(backup.manifest);
  const restored = await restoreWorkspaceBackup(path, root);
  expect(restored.databasePath).not.toBe(store.databasePath);
  const recovered = new WorkspaceStore({ databasePath: restored.databasePath });
  try {
    expect(recovered.getMatter(fixture.matter.id)).toEqual(fixture.matter);
    expect(recovered.originalFile(fixture.source.latest.id).bytes).toEqual(fixture.original);
    expect(recovered.exports.download(fixture.exported.id).bytes).toEqual(
      store.exports.download(fixture.exported.id).bytes,
    );
    expect(recovered.getWork(fixture.work.id).evidence).toEqual(
      store.getWork(fixture.work.id).evidence,
    );
    expect(recovered.conversations.turn(fixture.turn.id).status).toBe('interrupted');
    expect(recovered.setting('model-connection')).toBeNull();
    expect(recovered.getProfile()).toEqual(store.getProfile());
    expect(recovered.catalog().totals.knowledge).toBe(store.catalog().totals.knowledge);
    expect(recovered.search({ query: 'original' }).hits.length).toBeGreaterThan(0);
    expect(statSync(restored.databasePath).mode & 0o777).toBe(0o600);
  } finally {
    recovered.close();
  }
  expect(store.conversations.turn(fixture.turn.id)).toEqual(liveBefore);
  expect(store.setting('model-connection')).not.toBeNull();
}, 30_000);

test('backups refuse missing/corrupt originals and saved Word artifacts, instead of claiming success', async () => {
  const { source, exported } = await sample();
  const original = store.originalFile(source.latest.id).bytes;
  const path = join(root, 'workspace.sqlite3.originals', backupHash(original));
  writeFileSync(path, 'corrupted');
  await expect(createWorkspaceBackup(store.databasePath)).rejects.toThrow('integrity');
  writeFileSync(path, original);
  const db = new Database(store.databasePath);
  db.run('UPDATE work_exports SET content_hash = ? WHERE id = ?', ['0'.repeat(64), exported.id]);
  db.close();
  await expect(createWorkspaceBackup(store.databasePath)).rejects.toThrow('Word file');
});

test('restore retries create separate copies and never touch unrelated or existing workspace files', async () => {
  const backup = await createWorkspaceBackup(store.databasePath);
  const path = join(root, backup.name);
  writeFileSync(path, backup.bytes);
  const a = await restoreWorkspaceBackup(path, root),
    b = await restoreWorkspaceBackup(path, root);
  expect(a.databasePath).not.toBe(b.databasePath);
  expect(readFileSync(path).equals(backup.bytes)).toBe(true);
  expect(store.catalog().totals.matters).toBe(0);
  expect(statSync(join(a.databasePath, '..')).mode & 0o777).toBe(0o700);
});

test('recovery preserves pending and reviewed matter suggestions with their original context and retry identity', async () => {
  const matter = store.createMatter({
    title: 'Review recovery',
    summary: 'The interview is outstanding.',
  });
  const chat = new WorkspaceChat(
    store,
    () =>
      new FakeModelProvider([
        {
          toolCalls: [
            {
              name: 'counsel_propose_matter_brief',
              input: {
                needsReview: true,
                status: 'open',
                summary: 'The interview is complete; timing remains unresolved.',
                questions: 'What does the contemporaneous record show?',
                nextActions: 'Compare accounts.',
                reason: 'The interview has been completed.',
              },
            },
          ],
          text: 'The suggested update is ready for review.',
        },
      ]),
  );
  const pending = chat.start(
    store.conversations.create({ scope: 'matter', matterId: matter.id }).id,
    { clientId: randomUUID(), message: 'Update the brief.' },
  );
  const applied = chat.start(
    store.conversations.create({ scope: 'matter', matterId: matter.id }).id,
    { clientId: randomUUID(), message: 'Update the brief.' },
  );
  await chat.idle();
  const pendingBefore = store.conversations.turn(pending.id);
  const appliedInput = {
    proposalId: store.conversations.turn(applied.id).state.briefProposal!.id,
    action: 'apply' as const,
  };
  const appliedBefore = store.reviewBriefProposal(applied.id, appliedInput);
  const briefBefore = store.matterBrief(matter.id);
  const backup = await createWorkspaceBackup(store.databasePath);
  const path = join(root, backup.name);
  writeFileSync(path, backup.bytes);
  const restored = await restoreWorkspaceBackup(path, root);
  const recovered = new WorkspaceStore({ databasePath: restored.databasePath });
  try {
    expect(recovered.conversations.turn(pending.id)).toEqual(pendingBefore);
    expect(recovered.conversations.turn(applied.id)).toEqual(appliedBefore);
    expect(recovered.reviewBriefProposal(applied.id, appliedInput)).toEqual(appliedBefore);
    expect(() =>
      recovered.reviewBriefProposal(pending.id, {
        proposalId: pendingBefore.state.briefProposal!.id,
        action: 'apply',
      }),
    ).toThrow('changed');
    expect(recovered.matterBrief(matter.id)).toEqual(briefBefore);
  } finally {
    recovered.close();
  }
});

test('unfinished restore marker prevents both launcher and store from opening partial data', () => {
  const partial = join(root, 'partial');
  mkdirSync(partial);
  writeFileSync(join(partial, '.restore-in-progress'), 'incomplete');
  const path = join(partial, 'workspace.sqlite3');
  expect(() => lockWorkspace(path)).toThrow('incomplete');
  expect(() => new WorkspaceStore({ databasePath: path })).toThrow('incomplete');
  expect(readdirSync(partial)).toEqual(['.restore-in-progress']);
});

test('verification refuses symlinks and manifest/record mismatches; only one operation can run at a time', async () => {
  const backup = await createWorkspaceBackup(store.databasePath);
  const path = join(root, backup.name),
    link = join(root, 'linked.counsel-backup');
  writeFileSync(path, backup.bytes);
  symlinkSync(path, link);
  await expect(inspectWorkspaceBackup(link)).rejects.toThrow('regular files');
  const decoded = decodeBackup(backup.bytes);
  const bad = encodeBackup(
    { ...decoded.manifest, counts: { ...decoded.manifest.counts, matters: 100 } },
    decoded.database,
    decoded.originals,
  );
  await expect(inspectWorkspaceBackup(bad)).rejects.toThrow('manifest');
  const first = createWorkspaceBackup(store.databasePath);
  await expect(createWorkspaceBackup(store.databasePath)).rejects.toThrow('already running');
  await first;
});

test('backup HTTP routes require authentication, strict requests, same-origin access and bounded binary verification', async () => {
  const origin = 'http://127.0.0.1:7469',
    token = 'backup-test-only';
  const handler = workspaceHandler({ store, token, origin, distDir: root, demo: false });
  const req = (path: string, body: string | Buffer = '{}', headers: Record<string, string> = {}) =>
    handler(
      new Request(origin + '/api/workspace' + path, {
        method: 'POST',
        headers: {
          authorization: 'Bearer ' + token,
          'content-type': 'application/json',
          ...headers,
        },
        body: typeof body === 'string' ? body : new Uint8Array(body),
      }),
    );
  expect((await req('/backups', '{}', { authorization: '' })).status).toBe(401);
  expect((await req('/backups', '{}', { origin: 'https://external.test' })).status).toBe(403);
  expect((await req('/backups', JSON.stringify({ path: '/arbitrary' }))).status).toBe(400);
  const response = await req('/backups');
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(response.headers.get('content-disposition')).toContain('.counsel-backup');
  const bytes = Buffer.from(await response.arrayBuffer());
  const verify = await req('/backups/verify', bytes, {
    'content-type': 'application/octet-stream',
  });
  expect(verify.status).toBe(200);
  expect(((await verify.json()) as { counts: { matters: number } }).counts.matters).toBe(0);
  expect((await req('/backups/verify', '{}')).status).toBe(415);
  expect(
    (
      await req('/backups/verify', '{}', {
        'content-type': 'application/octet-stream',
        'content-length': '10000000001',
      })
    ).status,
  ).toBe(413);
  expect((await req('/matters', '{}', { 'content-length': '2300000' })).status).toBe(413);
});

test('truncation, trailing data, altered bytes and unsupported schema are rejected before restoring a folder', async () => {
  const backup = await createWorkspaceBackup(store.databasePath);
  const changed = Buffer.from(backup.bytes);
  changed[changed.length - 1] = changed[changed.length - 1]! ^ 1;
  for (const bytes of [
    backup.bytes.subarray(0, backup.bytes.length - 1),
    Buffer.concat([backup.bytes, Buffer.from('extra')]),
    changed,
  ]) {
    await expect(inspectWorkspaceBackup(bytes)).rejects.toThrow();
  }
  const decoded = decodeBackup(backup.bytes);
  const database = join(root, 'modified.sqlite3');
  writeFileSync(database, decoded.database);
  const db = new Database(database);
  db.exec('CREATE VIEW unexpected AS SELECT * FROM matters;');
  db.close();
  const altered = readFileSync(database);
  const bytes = encodeBackup(
    { ...decoded.manifest, database: { hash: backupHash(altered), byteCount: altered.length } },
    altered,
    decoded.originals,
  );
  const path = join(root, 'invalid.counsel-backup');
  writeFileSync(path, bytes);
  const before = readdirSync(root);
  await expect(restoreWorkspaceBackup(path, root)).rejects.toThrow('schema');
  expect(readdirSync(root)).toEqual(before);
});

test('native downloads use an expiring single-use file capability without exposing a workspace token', async () => {
  const origin = 'http://127.0.0.1:7469', token = 'download-test-only';
  const handler = workspaceHandler({ store, origin, token, distDir: root, demo: false });
  const prepare = (auth = token) => handler(new Request(origin + '/api/workspace/backups/prepare', {
    method: 'POST', headers: { authorization: 'Bearer ' + auth, 'content-type': 'application/json' }, body: '{}',
  }));
  expect((await prepare('wrong')).status).toBe(401);
  const response = await prepare();
  expect(response.status).toBe(200);
  const info = await response.json() as { name: string; byteCount: number; downloadUrl: string };
  expect(info.downloadUrl).toMatch(/^\/api\/workspace\/backups\/[a-f0-9]{64}\/download$/);
  expect(info.downloadUrl).not.toContain(token);
  const get = (url = info.downloadUrl, headers: Record<string, string> = {}) => handler(new Request(origin + url, { headers }));
  expect((await get(info.downloadUrl, { 'sec-fetch-site': 'cross-site' })).status).toBe(403);
  expect((await get(info.downloadUrl, { origin: 'https://external.test' })).status).toBe(403);
  expect((await get('/api/workspace/backups/' + '0'.repeat(64) + '/download')).status).toBe(404);
  const file = await get();
  expect(file.status).toBe(200);
  expect(Number(file.headers.get('content-length'))).toBe(info.byteCount);
  expect(file.headers.get('cache-control')).toBe('no-store');
  const bytes = Buffer.from(await file.arrayBuffer());
  expect(bytes.length).toBe(info.byteCount);
  expect((await inspectWorkspaceBackup(bytes)).schemaVersion).toBe(19);
  expect((await get()).status).toBe(404);
});

test('file-backed backup and restore preserve more than 250 MB of durable queued originals', async () => {
  store.imports.stop();
  const bytes = Buffer.alloc(25_000_000, 65);
  const batch = store.imports.create({ clientId: randomUUID(), label: 'Large synthetic recovery', files: Array.from({ length: 11 }, (_, i) => ({ path: `queued-${i}.pdf`, byteCount: bytes.length })) });
  for (const entry of batch.entries) store.imports.receive(batch.id, entry.id, bytes.toString('base64'));
  const file = await createWorkspaceBackupFile(store.databasePath);
  try {
    expect(file.byteCount).toBeGreaterThan(250_000_000);
    expect(statSync(file.path).mode & 0o777).toBe(0o600);
    expect((await inspectWorkspaceBackup(Bun.file(file.path).stream())).counts.stagedFiles).toBe(11);
    const recovered = await restoreWorkspaceBackup(file.path, root);
    const db = new Database(recovered.databasePath, { readonly: true });
    try {
      expect(db.query('SELECT count(*) AS n, sum(length(bytes)) AS size FROM import_entries').get()).toEqual({ n: 11, size: 275_000_000 });
      for (const entry of db.query('SELECT bytes FROM import_entries').iterate() as Iterable<{ bytes: Uint8Array }>) expect(backupHash(entry.bytes)).toBe(backupHash(bytes));
    } finally { db.close(); }
  } finally { file.dispose(); }
  expect(() => statSync(file.path)).toThrow();
  file.dispose();
}, 90_000);
