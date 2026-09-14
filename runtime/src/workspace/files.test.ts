import { beforeEach, afterEach, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { WorkspaceStore } from './store';
import { buildDocx, simpleDocx } from '../docx/test/builder';
import { syntheticPdf } from './fixtures/documents';
import { workspaceHandler } from './http';
import { chatTools } from './chat-tools';
import { runToolDef } from '../core/fake-provider';
let root: string, store: WorkspaceStore;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'counsel-files-test-'));
  store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') });
});
afterEach(() => {
  store.close();
  rmSync(root, { recursive: true, force: true });
});
const file = (name: string, bytes: Uint8Array) => ({
  name,
  base64: Buffer.from(bytes).toString('base64'),
});

test('Word body, numbering, tables and tracked changes are retained as inspectable text; originals stay exact', async () => {
  const bytes = buildDocx({
    blocks: [
      { runs: ['Synthetic notice assessment.'] },
      {
        runs: [
          { text: 'oral', del: { author: 'Synthetic', date: '2026-09-04' } },
          { text: 'written', ins: { author: 'Synthetic', date: '2026-09-04' } },
        ],
      },
      {
        table: {
          rows: [
            [{ paragraphs: [{ runs: ['Recipient'] }] }, { paragraphs: [{ runs: ['Counsel OS'] }] }],
          ],
        },
      },
    ],
  });
  const m = store.createMatter({ title: 'Assessment' });
  const source = await store.importDocument({ ...file('Notice.docx', bytes), matterId: m.id });
  expect(source.matterIds).toEqual([m.id]);
  expect(source.latest.body).toContain('{--oral--}{++written++}');
  expect(source.latest.body).toContain('Recipient');
  expect(source.latest.extraction?.parser).toBe('counsel-docx-v1');
  expect(store.originalFile(source.latest.id).bytes).toEqual(Buffer.from(bytes));
  expect(store.search({ query: 'Recipient' }).hits[0]?.recordId).toBe(source.id);
  const path = store.databasePath;
  store.close();
  store = new WorkspaceStore({ databasePath: path });
  expect(store.getSource(source.id)).toEqual(source);
});

test('Word omissions and image-only documents are flagged, not described as complete extraction', async () => {
  const partial = await store.importDocument(
    file(
      'With-image.docx',
      buildDocx({
        blocks: [{ runs: ['Text', { drawing: true }] }],
        header: [{ runs: ['Not in body'] }],
      }),
    ),
  );
  expect(partial.latest.textStatus).toBe('partial');
  expect(partial.latest.extraction?.notes.join(' ')).toContain('Headers');
  const blank = await store.importDocument(
    file('Empty.docx', buildDocx({ blocks: [{ runs: [{ drawing: true }] }] })),
  );
  expect(blank.latest.textStatus).toBe('unavailable');
  expect(blank.latest.body).toBeNull();
  expect(store.search({ query: 'no match' }).coverage.gaps).toHaveLength(2);
});

test('PDF text has page locators and exact originals; blank pages remain coverage gaps', async () => {
  const bytes = syntheticPdf([
    'Synthetic notice evidence.',
    '',
    'The recipient remains unresolved.',
  ]);
  const source = await store.importDocument(file('Evidence.pdf', bytes));
  expect(source.latest.body).toContain('Page 3\nThe recipient remains unresolved.');
  expect(source.latest.textStatus).toBe('partial');
  expect(source.latest.extraction?.notes.join(' ')).toContain('pages 2');
  expect(source.latest.extraction?.pages).toBe(3);
  expect(store.originalFile(source.latest.id).bytes).toEqual(Buffer.from(bytes));
  const blank = await store.importDocument(file('Scanned-or-blank.pdf', syntheticPdf([''])));
  expect(blank.latest.body).toBeNull();
  expect(blank.latest.textStatus).toBe('unavailable');
});

test('citations use extracted-page offsets and cannot invent source text', async () => {
  const source = await store.importDocument(
    file('Citation.pdf', syntheticPdf(['Exact synthetic evidence.'])),
  );
  const c = store.conversations.create({});
  const { turn } = store.conversations.begin(
    c.id,
    { clientId: crypto.randomUUID(), message: 'Read', attachments: [source.latest.id] },
    'synthetic',
  );
  const { tools } = chatTools({
    store,
    conversation: c,
    turn,
    attachments: [source.latest.id],
    signal: new AbortController().signal,
    save: () => {},
  });
  await runToolDef(
    tools,
    'counsel_read_record',
    { kind: 'source', id: source.latest.id },
    'workspace',
  );
  const quote = 'Exact synthetic evidence.';
  const result = await runToolDef(
    tools,
    'counsel_cite_passage',
    { kind: 'source', id: source.latest.id, quote, start: source.latest.body!.indexOf(quote) },
    'workspace',
  );
  expect(result.isError).not.toBe(true);
  expect(turn.state.citations[0]?.locator).toBe('Page 1');
});

test('unsupported formats, malformed containers, hostile XML and oversized documents leave no records', async () => {
  const bad = [
    file('Legacy.doc', Buffer.from('old')),
    file('../escape.pdf', syntheticPdf(['x'])),
    file('Fake.docx', Buffer.from('%PDF-1.4 wrong type')),
    file('Fake.pdf', Buffer.from('not a PDF')),
    file(
      'Entity.docx',
      buildDocx({
        blocks: [],
        rawParts: {
          'word/document.xml':
            '<!DOCTYPE x [<!ENTITY secret SYSTEM "file:///private">]><x>&secret;</x>',
        },
      }),
    ),
    file(
      'Bomb.docx',
      buildDocx({ blocks: [], rawParts: { 'word/huge.xml': 'x'.repeat(13_000_000) } }),
    ),
    file('Oversized.pdf', new Uint8Array(25_000_001)),
  ];
  for (const input of bad) await expect(store.importDocument(input)).rejects.toThrow();
  expect(store.catalog().totals.sources).toBe(0);
});

test('original download is authenticated, pinned to a revision, and integrity checked', async () => {
  const bytes = simpleDocx('Synthetic original.');
  const source = await store.importDocument(file('Original.docx', bytes));
  store.reviseSource(source.id, source.latest.id, {
    title: 'Later extracted revision',
    body: 'Different',
    provenance: { origin: 'fixture' },
  });
  const origin = 'http://127.0.0.1:7465';
  const handler = workspaceHandler({
    store,
    origin,
    token: 'synthetic',
    distDir: root,
    demo: false,
  });
  const url = `${origin}/api/workspace/source-revisions/${source.latest.id}/original`;
  expect((await handler(new Request(url))).status).toBe(401);
  const response = await handler(
    new Request(url, { headers: { authorization: 'Bearer synthetic' } }),
  );
  expect(response.headers.get('content-disposition')).toContain('attachment;');
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array(bytes));
  const path = join(root, 'workspace.sqlite3.originals', source.latest.provenance.originalHash!);
  expect(readFileSync(path)).toEqual(Buffer.from(bytes));
  writeFileSync(path, 'changed synthetic fixture');
  expect(() => store.originalFile(source.latest.id)).toThrow('integrity');
});
