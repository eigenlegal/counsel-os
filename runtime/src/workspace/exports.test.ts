import { DROP_UPKEEP } from './fixtures/legacy-upkeep';
import { beforeEach, afterEach, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { WorkspaceStore } from './store';
import { openDocx } from '../docx/package';
import { parseXml } from '../docx/safety';
import { docxToMarkdown } from '../docx/markdown';
import { workspaceHandler } from './http';
import { exportSnapshot, type WordExport } from './exports';
import { renderWord } from './word-output';
let root: string, store: WorkspaceStore;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'counsel-exports-test-'));
  store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') });
});
afterEach(() => {
  store.close();
  rmSync(root, { recursive: true, force: true });
});
function example(
  answer = '## Assessment\n\nGive **written** notice. [S7]\n\n3. Confirm the recipient.\n4. Send notice.\n\n| Question | Position |\n| --- | --- |\n| Form | Written |',
) {
  const source = store.createSource({
    kind: 'document',
    revision: {
      title: 'Saved agreement',
      body: 'Give written notice.',
      provenance: { origin: '/private/client/DO-NOT-EXPORT.docx' },
    },
  });
  const work = store.recordWork({
    title: 'Notice assessment',
    request: 'Do not export this hidden question.',
    answer,
    evidence: [
      {
        target: { kind: 'source', revisionId: source.latest.id },
        quote: 'Give written notice.',
        start: 0,
        locator: 'Page 2',
      },
    ],
  });
  return { source, work };
}

test('Word contains editable headings, numbered lists, tables, status and verified reference anchors; no hidden context or paths', async () => {
  const { work } = example();
  const snapshot = exportSnapshot(
    work,
    [{ ...work.evidence[0]!, key: 'S7', category: 'document', version: 1 }],
    new Map(),
  );
  const { bytes, warnings } = await renderWord(snapshot);
  const pkg = openDocx(bytes);
  for (const name of pkg.partNames().filter((n) => /\.(xml|rels)$/.test(n)))
    parseXml(pkg.partText(name), name);
  const xml = pkg.partText('word/document.xml');
  expect(xml).toContain('w:anchor="source_1"');
  expect(xml).toContain('w:name="source_1"');
  expect(xml).toContain('w:pStyle w:val="Heading1"');
  expect(xml).toContain('<w:tbl>');
  expect(xml).toContain('<w:tblHeader');
  expect(xml).toContain('<w:numPr>');
  expect(xml).toContain('Draft · Not approved');
  expect(xml).toContain('Page 2');
  expect(xml).toContain(
    work.evidence[0]!.target.kind === 'source' ? work.evidence[0]!.target.revisionId : 'impossible',
  );
  expect(pkg.partText('word/numbering.xml')).toContain('w:start w:val="3"');
  const all = pkg
    .partNames()
    .filter((n) => /\.(xml|rels)$/.test(n))
    .map((n) => pkg.partText(n))
    .join('\n');
  expect(all).not.toContain('DO-NOT-EXPORT');
  expect(all).not.toContain('hidden question');
  expect(all).not.toContain('TargetMode="External"');
  expect(warnings).toEqual([]);
});

test('export retries and concurrent clicks reuse exact bytes; source revisions and restart do not rewrite old artifacts', async () => {
  const { source, work } = example();
  const [first, retry] = await Promise.all([
    store.exports.create(work.id),
    store.exports.create(work.id),
  ]);
  expect(first).toEqual(retry);
  const original = store.exports.download(first.id).bytes;
  store.reviseSource(source.id, source.latest.id, {
    title: 'Changed source',
    body: 'Different text.',
    provenance: { origin: 'later' },
  });
  expect(await store.exports.create(work.id)).toEqual(first);
  store.saveOutput(work.id, { title: 'Named assessment', kind: 'assessment' });
  const named = await store.exports.create(work.id);
  expect(named.id).not.toBe(first.id);
  expect(named.name).toBe('Named assessment.docx');
  expect(store.exports.list(work.id)).toHaveLength(2);
  const path = store.databasePath;
  store.close();
  store = new WorkspaceStore({ databasePath: path });
  expect(store.exports.download(first.id).bytes).toEqual(original);
  expect(await store.exports.create(work.id)).toEqual(named);
  expect(store.listWork()).toHaveLength(1);
  expect(store.getWork(work.id).disposition).toBe('draft');
});

test('unverified markers, inert HTML/images, wide tables and incomplete sources are visible, not silently dropped', async () => {
  const { work } = example(
    'Unverified [S99]. Inline `[S7]`.\n\n![Evidence image](https://example.invalid/secret.png)\n\n<script>alert(1)</script>\n\n[Link](javascript:alert%281%29)\n\n| A | B | C | D | E | F | G |\n| - | - | - | - | - | - | - |\n| one | two | three | four | five | six | seven |',
  );
  const snapshot = exportSnapshot(
    work,
    [],
    new Map([
      [
        work.evidence[0]!.target.kind === 'source' ? work.evidence[0]!.target.revisionId : '',
        'Incomplete source extraction.',
      ],
    ]),
  );
  const result = await renderWord(snapshot);
  const pkg = openDocx(result.bytes),
    xml = pkg.partText('word/document.xml');
  expect(xml).toContain('[unverified S99]');
  expect(xml).toContain('[S7]');
  expect(xml).toContain('&lt;script&gt;');
  expect(xml).toContain('Evidence image');
  expect(xml).toContain('seven');
  expect(result.warnings).toHaveLength(5);
  expect(pkg.partNames().some((n) => n.includes('/media/'))).toBe(false);
  expect(pkg.partText('word/_rels/document.xml.rels')).not.toContain('TargetMode="External"');
});

test('empty, oversized, invalid XML and overly nested exports leave no artifact rows; human decisions preserve attribution', async () => {
  for (const answer of ['', 'x'.repeat(250_001), 'Invalid\u0000text', '> '.repeat(30) + 'Deep']) {
    const work = store.recordWork({ title: 'Invalid', request: 'Q', answer });
    await expect(store.exports.create(work.id)).rejects.toThrow();
    expect(store.exports.list(work.id)).toEqual([]);
  }
  const work = store.recordWork({
    title: '../Unsafe/file',
    request: 'Q',
    answer: 'Proceed.',
    decisionBy: 'Historical name',
  });
  const file = await store.exports.create(work.id);
  expect(file.name).not.toContain('/');
  expect(store.catalog().savedWork.find((w) => w.id === work.id)?.outputKind).toBeNull();
  expect(docxToMarkdown(openDocx(store.exports.download(file.id).bytes)).markdown).toContain(
    'Recorded decision · Historical name',
  );
});

test('Markdown entities and auto-links preserve readable text; source excerpts remain literal', async () => {
  const { work } = example('R&amp;D &#167; 9. <https://example.invalid>\n\n`&amp;`');
  const { bytes } = await renderWord(exportSnapshot(work, [], new Map()));
  const xml = openDocx(bytes).partText('word/document.xml');
  expect(xml).toContain('R&amp;D § 9.');
  expect(xml.match(/https:\/\/example.invalid/g)).toHaveLength(1);
  expect(xml).toContain('&amp;amp;');
});

test('download filenames are Unicode-safe and bounded in bytes', async () => {
  const work = store.recordWork({ title: '📄'.repeat(60), request: 'Q', answer: 'Readable.' });
  const file = await store.exports.create(work.id);
  expect(() => encodeURIComponent(file.name)).not.toThrow();
  expect(Buffer.byteLength(file.name)).toBeLessThanOrEqual(165);
});

test('version-four migration preserves records and adds an empty export table; hash mismatch prevents downloads', async () => {
  const { work } = example();
  const path = store.databasePath;
  store.close();
  const db = new Database(path);
  db.exec(DROP_UPKEEP + 'DROP TABLE import_organization_results; DROP TABLE import_organization_jobs; DROP TABLE knowledge_evidence; DROP INDEX evidence_source; DROP INDEX evidence_knowledge; DROP INDEX evidence_work; DROP INDEX import_queue_pending; DROP TABLE import_entry_metadata; DROP TABLE import_queue; DROP TABLE conversation_matters; DROP TABLE source_lifecycle; DROP TABLE work_lifecycle; DROP TABLE conversation_lifecycle; DROP TABLE conversation_clients; DROP TABLE matter_clients; DROP TABLE clients; DROP TABLE source_placements; DROP TABLE import_entries; DROP TABLE import_batches; DROP TABLE template_revisions; DROP TABLE practice_templates; DROP TABLE work_exports; PRAGMA user_version = 4;');
  db.close();
  store = new WorkspaceStore({ databasePath: path });
  expect(store.getWork(work.id).answer).toBe(work.answer);
  expect(store.exports.list(work.id)).toEqual([]);
  const file = await store.exports.create(work.id);
  const tamper = new Database(path);
  tamper.run('UPDATE work_exports SET content_hash = ? WHERE id = ?', ['0'.repeat(64), file.id]);
  tamper.close();
  expect(() => store.exports.download(file.id)).toThrow('integrity');
  await expect(store.exports.create(work.id)).rejects.toThrow('integrity');
});

test('HTTP export, listing and exact download require authentication; callers cannot supply source content or paths', async () => {
  const { work } = example();
  const origin = 'http://127.0.0.1:7465';
  const handler = workspaceHandler({ store, origin, token: 'fixture', distDir: root, demo: false });
  const url = `${origin}/api/workspace/work/${work.id}/exports`;
  const headers = { authorization: 'Bearer fixture', 'content-type': 'application/json' };
  expect((await handler(new Request(url))).status).toBe(401);
  expect(
    (await handler(new Request(url, { method: 'POST', headers, body: '{"path":"/private"}' })))
      .status,
  ).toBe(400);
  const created = await handler(new Request(url, { method: 'POST', headers, body: '{}' }));
  expect(created.status).toBe(200);
  const file = (await created.json()) as WordExport;
  const list = await handler(new Request(url, { headers }));
  expect(await list.json()).toEqual([file]);
  const download = `${origin}/api/workspace/exports/${file.id}/download`;
  expect((await handler(new Request(download))).status).toBe(401);
  const response = await handler(new Request(download, { headers }));
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toContain('wordprocessingml');
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(response.headers.get('content-disposition')).toContain('attachment;');
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(
    new Uint8Array(store.exports.download(file.id).bytes),
  );
  expect(store.listWork()).toHaveLength(1);
});
