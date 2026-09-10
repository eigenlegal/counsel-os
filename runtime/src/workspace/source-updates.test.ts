import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { WorkspaceStore } from './store';
import { workspaceHandler } from './http';
import { chatTools } from './chat-tools';
import { runToolDef } from '../core/fake-provider';
import { syntheticPdf } from './fixtures/documents';
import { buildDocx } from '../docx/test/builder';

let root: string, store: WorkspaceStore;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'counsel-source-update-'));
  store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') });
});
afterEach(() => {
  store.close();
  rmSync(root, { recursive: true, force: true });
});
const file = (body: string, name = 'Notice.txt') => ({
  name,
  base64: Buffer.from(body).toString('base64'),
});
const ref = () =>
  store.createSource({
    kind: 'reference',
    revision: {
      title: 'Saved reference',
      body: 'Oral notice is permitted.',
      provenance: { origin: 'fixture:reference' },
    },
  });

test('a revised upload preserves source identity, matter links, old originals, exact citations and exports', async () => {
  const matter = store.createMatter({ title: 'Synthetic matter' });
  const source = await store.importDocument({
    ...file('Oral notice is permitted.'),
    matterId: matter.id,
  });
  const work = store.recordWork({
    title: 'Earlier advice',
    request: 'How to notify?',
    answer: 'Give oral notice.',
    matterId: matter.id,
    evidence: [
      {
        target: { kind: 'source', revisionId: source.latest.id },
        start: 0,
        quote: 'Oral notice is permitted.',
      },
    ],
  });
  const exported = await store.exports.create(work.id),
    originalExport = store.exports.download(exported.id).bytes;
  const request = { ...file('Written notice is required.'), expectedRevisionId: source.latest.id };
  const updated = await store.updateSourceFile(source.id, request);
  expect(updated.id).toBe(source.id);
  expect(updated.matterIds).toEqual([matter.id]);
  expect(updated.latest.number).toBe(2);
  expect(store.originalFile(source.latest.id).bytes.toString()).toBe('Oral notice is permitted.');
  expect(store.originalFile(updated.latest.id).bytes.toString()).toBe(
    'Written notice is required.',
  );
  expect(store.getWork(work.id)).toEqual(work);
  expect(store.exports.download(exported.id).bytes).toEqual(originalExport);
  expect(await store.exports.create(work.id)).toEqual(exported);
  expect(await store.updateSourceFile(source.id, request)).toEqual(updated);
  expect(
    await store.updateSourceFile(source.id, { ...request, expectedRevisionId: updated.latest.id }),
  ).toEqual(updated);
  expect(store.sourceHistory(source.id)).toMatchObject({
    totalVersions: 2,
    totalAffectedWork: 1,
    affectedWork: [{ id: work.id }],
  });
  expect(store.sourceChanges(work.id)).toMatchObject([{ citedVersion: 1, currentVersion: 2 }]);
  expect(store.search({ query: 'Oral', kinds: ['source'] }).hits).toHaveLength(0);
  expect(store.search({ query: 'Written', kinds: ['source'] }).hits[0]?.revisionId).toBe(
    updated.latest.id,
  );
  expect(
    store.search({ query: 'Oral', kinds: ['source'], includeHistory: true }).hits[0]?.revisionId,
  ).toBe(source.latest.id);
});

test('stale or cross-source updates fail without orphan files; exact concurrent retries produce one version', async () => {
  const source = await store.importDocument(file('First version.'));
  const updated = await store.updateSourceFile(source.id, {
    ...file('Second version.'),
    expectedRevisionId: source.latest.id,
  });
  const before = readdirSync(join(root, 'workspace.sqlite3.originals'));
  await expect(
    store.updateSourceFile(source.id, {
      ...file('Stale third version.'),
      expectedRevisionId: source.latest.id,
    }),
  ).rejects.toThrow('changed');
  await expect(
    store.updateSourceFile(source.id, {
      ...file('Other source.'),
      expectedRevisionId: ref().latest.id,
    }),
  ).rejects.toThrow('different source');
  expect(readdirSync(join(root, 'workspace.sqlite3.originals'))).toEqual(before);
  const request = { ...file('Third version.'), expectedRevisionId: updated.latest.id };
  const [a, b] = await Promise.all([
    store.updateSourceFile(source.id, request),
    store.updateSourceFile(source.id, request),
  ]);
  expect(a).toEqual(b);
  expect(store.sourceHistory(source.id).totalVersions).toBe(3);
});

test('Word/PDF revision extraction keeps both originals and coverage notes; malformed files cannot advance the source', async () => {
  const source = await store.importDocument(file('Original text.'));
  const word = buildDocx({ blocks: [{ runs: ['Revised Word text.', { drawing: true }] }] });
  const input = {
    name: 'Updated.docx',
    base64: Buffer.from(word).toString('base64'),
    expectedRevisionId: source.latest.id,
  };
  const [a, b] = await Promise.all([
    store.updateSourceFile(source.id, input),
    store.updateSourceFile(source.id, input),
  ]);
  expect(a).toEqual(b);
  expect(a.latest).toMatchObject({ number: 2, textStatus: 'partial' });
  expect(store.originalFile(a.latest.id).bytes.equals(Buffer.from(word))).toBe(true);
  const pdf = syntheticPdf(['Updated PDF evidence.', '']);
  const c = await store.updateSourceFile(source.id, {
    name: 'Updated.pdf',
    base64: Buffer.from(pdf).toString('base64'),
    expectedRevisionId: a.latest.id,
  });
  expect(c.latest.number).toBe(3);
  expect(c.latest.extraction?.notes.join(' ')).toContain('pages 2');
  expect(c.latest.body).toContain('Updated PDF evidence.');
  expect(store.originalFile(c.latest.id).bytes.equals(Buffer.from(pdf))).toBe(true);
  const before = readdirSync(join(root, 'workspace.sqlite3.originals'));
  await expect(
    store.updateSourceFile(source.id, {
      name: 'Broken.pdf',
      base64: Buffer.from('not PDF').toString('base64'),
      expectedRevisionId: c.latest.id,
    }),
  ).rejects.toThrow();
  expect(store.getSource(source.id).latest.id).toBe(c.latest.id);
  expect(readdirSync(join(root, 'workspace.sqlite3.originals'))).toEqual(before);
});

test('reference edits preserve old text, no-op/retry identities and pending coverage; document text cannot masquerade as a revised original', async () => {
  const source = ref();
  const input = {
    expectedRevisionId: source.latest.id,
    title: 'Revised reference',
    body: 'Written notice is required.',
    origin: 'fixture:updated',
    textStatus: 'partial' as const,
  };
  const updated = store.updateSourceText(source.id, input);
  expect(store.getSourceRevision(source.latest.id).body).toBe('Oral notice is permitted.');
  expect(updated.latest).toMatchObject({ number: 2, textStatus: 'partial', body: input.body });
  expect(store.updateSourceText(source.id, input)).toEqual(updated);
  expect(() => store.updateSourceText(source.id, { ...input, body: 'Stale edit.' })).toThrow(
    'changed',
  );
  const doc = await store.importDocument(file('Original file.'));
  expect(() =>
    store.updateSourceText(doc.id, { ...input, expectedRevisionId: doc.latest.id }),
  ).toThrow('Upload a new document');
});

test('running chats can still cite an already authorized passage after an update, without granting access to unread history or new cross-matter data', async () => {
  const matter = store.createMatter({ title: 'Permitted matter' });
  const source = await store.importDocument({ ...file('First version.'), matterId: matter.id });
  const conversation = store.conversations.create({ scope: 'matter', matterId: matter.id });
  const turn = store.conversations.begin(
    conversation.id,
    { clientId: randomUUID(), message: 'Read this source.' },
    'fixture',
  ).turn;
  const { tools } = chatTools({
    store,
    conversation,
    turn,
    attachments: [],
    signal: new AbortController().signal,
    save: () => store.conversations.save(turn),
  });
  expect(
    (
      await runToolDef(
        tools,
        'counsel_read_record',
        { kind: 'source', id: source.latest.id },
        'workspace',
      )
    ).isError,
  ).toBeFalsy();
  const updated = await store.updateSourceFile(source.id, {
    ...file('Second version.'),
    expectedRevisionId: source.latest.id,
  });
  const read = await runToolDef(
    tools,
    'counsel_read_record',
    { kind: 'source', id: source.latest.id },
    'workspace',
  );
  expect(read.output).toMatchObject({ text: 'First version.', newerVersionAvailable: true });
  expect(
    (
      await runToolDef(
        tools,
        'counsel_cite_passage',
        { kind: 'source', id: source.latest.id, quote: 'First version.', start: 0 },
        'workspace',
      )
    ).isError,
  ).toBeFalsy();
  const other = store.conversations.create({});
  const otherTurn = store.conversations.begin(
    other.id,
    { clientId: randomUUID(), message: 'Read attached version.' },
    'fixture',
  ).turn;
  const otherTools = chatTools({
    store,
    conversation: other,
    turn: otherTurn,
    attachments: [source.latest.id],
    signal: new AbortController().signal,
    save: () => {},
  }).tools;
  const pinned = await runToolDef(
    otherTools,
    'counsel_read_record',
    { kind: 'source', id: source.latest.id },
    'workspace',
  );
  expect(pinned.output).toMatchObject({ newerVersionAvailable: true });
  expect(JSON.stringify(pinned.output)).not.toContain(updated.latest.id);
  expect(JSON.stringify(pinned.output)).not.toContain('Second version.');
  expect(
    (
      await runToolDef(
        otherTools,
        'counsel_read_record',
        { kind: 'source', id: updated.latest.id },
        'workspace',
      )
    ).isError,
  ).toBe(true);
});

test('source history and update HTTP routes authenticate, validate strict payloads and expose direct-citation changes only', async () => {
  const source = ref(),
    origin = 'http://127.0.0.1:7470',
    token = 'source-update-test';
  const handler = workspaceHandler({ store, token, origin, distDir: root, demo: false });
  const call = (path: string, data?: unknown, auth = true) =>
    handler(
      new Request(origin + '/api/workspace' + path, {
        method: data ? 'POST' : 'GET',
        headers: {
          'content-type': 'application/json',
          ...(auth ? { authorization: 'Bearer ' + token } : {}),
        },
        ...(data ? { body: JSON.stringify(data) } : {}),
      }),
    );
  const update = {
    expectedRevisionId: source.latest.id,
    title: 'Updated',
    body: 'New reference.',
    origin: 'fixture:new',
  };
  expect((await call(`/sources/${source.id}/revisions`, update, false)).status).toBe(401);
  expect(
    (await call(`/sources/${source.id}/revisions`, { ...update, approved: true })).status,
  ).toBe(400);
  expect((await call(`/sources/${source.id}/revisions`, update)).status).toBe(200);
  const history = await call(`/sources/${source.id}/history`);
  expect(await history.json()).toMatchObject({ totalVersions: 2, totalAffectedWork: 0 });
  expect(
    (
      await call(`/sources/${source.id}/files`, {
        ...file('test'),
        expectedRevisionId: source.latest.id,
        matterId: randomUUID(),
      })
    ).status,
  ).toBe(400);
  expect((await call(`/work/${randomUUID()}/source-changes`)).status).toBe(404);
});
