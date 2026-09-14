import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkspaceStore } from './store';
import { WorkspaceChat } from './chat';
import { FakeModelProvider } from '../core/fake-provider';
import { buildDocx, simpleDocx } from '../docx/test/builder';
import { openDocx } from '../docx/package';
import { modelOf, textOf } from '../docx/model';
import { generateRedline, RedlineInput } from './redlines';
import { createWorkspaceBackup, restoreWorkspaceBackup } from './backups';
import { unzipSync, zipSync } from 'fflate';

let store: WorkspaceStore, root: string;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'counsel-redline-test-')); store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') }); });
afterEach(() => { store.close(); rmSync(root, { recursive: true, force: true }); });
const edits = [{ current: 'orally', proposed: 'in writing', comment: 'Use the agreed written-notice requirement.' }];
test('the isolated worker handles embedded fonts, hyperlinks and displayed bullets without a partial copy', async () => {
  const font = new Uint8Array(5_500_000).map((_, i) => i % 251);
  const bytes = zipSync(unzipSync(buildDocx({ blocks: [
    { runs: ['The ', { text: 'online terms', hyperlink: 'rId9' }, ' apply.'] },
    { numId: '1', runs: ['Uptime: 99.9%'] },
  ], numbering: { '1': [{ numFmt: 'bullet', lvlText: '•' }] }, rawParts: { 'word/fonts/font1.odttf': font } })), { level: 6 });
  const result = await generateRedline(bytes, { sourceRevisionId: crypto.randomUUID(), edits: [
    { current: 'The online terms apply.', proposed: 'The signed schedule applies.', comment: 'Use the negotiated version.' },
    { current: '- Uptime: 99.9%', proposed: '- Uptime: 99.95% each month.' },
  ] }, new AbortController().signal, 'Synthetic Counsel');
  expect(result.report.applied).toHaveLength(2);
  expect(result.bytes.length).toBeLessThan(100_000);
  const pkg = openDocx(result.bytes);
  expect(modelOf(pkg).paragraphs.map(p => textOf(p, 'accept'))).toEqual(['The signed schedule applies.', 'Uptime: 99.95% each month.']);
  expect(modelOf(pkg).paragraphs.map(p => textOf(p, 'reject'))).toEqual(['The online terms apply.', 'Uptime: 99.9%']);
  expect(pkg.partBytes('word/fonts/font1.odttf')).toEqual(font);
  expect(pkg.partText('word/comments.xml')).toContain('Synthetic Counsel');
});
test('whole-section insertions use read anchors and saved attribution, retain exact receipts and restore unchanged', async () => {
  const source = await original(buildDocx({ blocks: [{ style: 'Heading1', runs: ['Notices'] }, { runs: ['Notices must be in writing.'] },
    { style: 'Heading1', runs: ['Signatures'] }], header: [{ runs: ['Preserved header'] }] }));
  store.saveWorkingPreferences({ expectedRevisionId: null, authorMode: 'custom', customAuthor: 'Synthetic Avery' });
  const insertions = [{ anchor: 'Signatures', position: 'before' as const, paragraphs: [
    { text: 'Electronic copies', styleFrom: 'Notices' }, { text: 'The parties may exchange electronic copies.', styleFrom: 'Notices must be in writing.' },
  ], comment: 'Explain this requested addition.' }];
  const conversation = store.conversations.create({});
  const model = new FakeModelProvider([{ toolCalls: [{ name: 'counsel_prepare_redline', input: { sourceRevisionId: source.latest.id, insertions } }], text: 'Prepared the requested new section.' }]);
  const chat = new WorkspaceChat(store, () => model);
  const started = chat.start(conversation.id, { clientId: crypto.randomUUID(), message: 'Insert the requested electronic copies section before signatures.', attachments: [source.latest.id] });
  await chat.idle();
  const turn = store.conversations.turn(started.id), file = turn.state.redline!.file!;
  expect(turn.state.redline!.insertions).toEqual(insertions);
  expect(file.template).toBe('counsel-redline-v2');
  const bytes = store.exports.download(file.id).bytes;
  expect(modelOf(openDocx(bytes)).paragraphs.map(p => textOf(p, 'accept'))).toEqual(['Notices', 'Notices must be in writing.', 'Electronic copies', 'The parties may exchange electronic copies.', 'Signatures']);
  expect(openDocx(bytes).partText('word/document.xml')).toContain('w:author="Synthetic Avery"');
  const backup = await createWorkspaceBackup(store.databasePath), path = join(root, backup.name);
  await Bun.write(path, backup.bytes);
  const restored = await restoreWorkspaceBackup(path, root), copy = new WorkspaceStore({ databasePath: restored.databasePath });
  try { expect(copy.conversations.turn(started.id).state.redline).toEqual(turn.state.redline); expect(copy.exports.download(file.id).bytes).toEqual(bytes); }
  finally { copy.close(); }
  expect(store.getSource(source.id).latest.id).toBe(source.latest.id);
});
test('insertion bounds, unsupported anchors and unsafe text never yield a partial replacement artifact', async () => {
  const sourceRevisionId = crypto.randomUUID(), signal = new AbortController().signal;
  const paragraph = { text: 'New paragraph.', styleFrom: 'Notices may be given orally.' };
  expect(RedlineInput.safeParse({ sourceRevisionId, edits: [] }).success).toBe(false);
  expect(RedlineInput.safeParse({ sourceRevisionId, insertions: [{ anchor: 'A', position: 'after', paragraphs: [{ ...paragraph, text: 'one\ntwo' }] }] }).success).toBe(false);
  expect(RedlineInput.safeParse({ sourceRevisionId, insertions: Array.from({ length: 4 }, () => ({ anchor: 'A', position: 'after', paragraphs: Array(20).fill(paragraph) })) }).success).toBe(false);
  const bytes = simpleDocx('Notices may be given orally.');
  await expect(generateRedline(bytes, { sourceRevisionId, edits, insertions: [{ anchor: 'Missing anchor.', position: 'after', paragraphs: [paragraph] }] }, signal)).rejects.toThrow('unique paragraph');
  await expect(generateRedline(bytes, { sourceRevisionId, edits: [], insertions: [{ anchor: paragraph.styleFrom, position: 'after', paragraphs: [{ ...paragraph, text: 'Bad\u0000text' }] }] }, signal)).rejects.toThrow('cannot store');
});
test('Word changes and comments use the pinned user author and filename convention without rewriting earlier authors', async () => {
  const source = await original(buildDocx({ blocks: [{ runs: ['Notices may be given orally.'] },
    { runs: [{ text: 'Earlier tracked insertion', ins: { author: 'Earlier reviewer', date: '2025-01-01T00:00:00Z' } }] }] }));
  const prefs = store.saveWorkingPreferences({ expectedRevisionId: null, authorMode: 'custom', customAuthor: 'Synthetic Avery & Co', filenamePattern: '{document}_{variant}_{author}' });
  const { chat, turn } = start(source.latest.id);
  store.saveWorkingPreferences({ expectedRevisionId: prefs.revisionId, authorMode: 'custom', customAuthor: 'Later name', filenamePattern: 'Later file' });
  await chat.idle();
  const saved = store.conversations.turn(turn.id), file = saved.state.redline!.file!;
  expect(file.name).toBe('Notice_redline_Synthetic Avery & Co.docx');
  const pkg = openDocx(store.exports.download(file.id).bytes);
  expect(pkg.partText('word/document.xml')).toContain('w:author="Synthetic Avery &amp; Co"');
  expect(pkg.partText('word/comments.xml')).toContain('w:author="Synthetic Avery &amp; Co"');
  expect(pkg.partText('word/document.xml')).toContain('w:author="Earlier reviewer"');
  expect(pkg.partText('word/document.xml')).not.toContain('Later name');
  const answer = await store.exports.create(saved.workId!);
  expect(answer.name).toEndWith('_draft_Synthetic Avery & Co.docx');
});
async function original(bytes = simpleDocx('Notice', 'Notices may be given orally.')) {
  return store.importDocument({ name: 'Notice.docx', base64: Buffer.from(bytes).toString('base64') });
}
test('custom output labels are pinned for real redlines and drafts and survive backup without renaming saved files', async () => {
  const source = await original();
  const prefs = store.saveWorkingPreferences({expectedRevisionId:null, filenamePattern:'{document} ({variant} {date})', redlineLabel:'ExampleCo redline', draftLabel:'Draft'});
  const {chat, turn} = start(source.latest.id);
  store.saveWorkingPreferences({expectedRevisionId:prefs.revisionId, filenamePattern:'{document}', redlineLabel:'Changed redline', draftLabel:'Changed draft'});
  await chat.idle();
  const saved = store.conversations.turn(turn.id);
  const file = saved.state.redline!.file!;
  expect(file.name).toBe(`Notice (ExampleCo redline ${file.createdAt.slice(0,10)}).docx`);
  const draft = await store.exports.create(saved.workId!);
  expect(draft.name).toContain('(Draft ');
  expect(draft.name).not.toContain('Changed');
  expect(await store.exports.create(saved.workId!)).toEqual(draft);
  expect(store.exports.download(file.id).record).toEqual(file);
  const backup = await createWorkspaceBackup(store.databasePath), path = join(root, backup.name);
  await Bun.write(path, backup.bytes);
  const restored = await restoreWorkspaceBackup(path, root), copy = new WorkspaceStore({databasePath:restored.databasePath});
  try {
    expect(copy.getWorkingPreferences()!.redlineLabel).toBe('Changed redline');
    expect(copy.conversations.turn(turn.id).state.workingPreferences?.word.redlineLabel).toBe('ExampleCo redline');
    expect(copy.exports.download(file.id)).toEqual(store.exports.download(file.id));
    expect(await copy.exports.create(saved.workId!)).toEqual(draft);
  } finally {copy.close();}
});
function start(id: string, attachments = [id], delayMs = 0) {
  const conversation = store.conversations.create({});
  const provider = new FakeModelProvider([{ toolCalls: [{ name: 'counsel_prepare_redline', input: { sourceRevisionId: id, edits } }], text: 'Prepared the requested draft redline.', delayMs }]);
  const chat = new WorkspaceChat(store, () => provider);
  const turn = chat.start(conversation.id, { clientId: crypto.randomUUID(), message: 'Redline the attached notice clause to require written notices.', attachments });
  return { chat, turn };
}
test('chat retains a real native Word redline and comments, exact original and source version, and survives backup', async () => {
  const bytes = buildDocx({ blocks: [{ runs: ['Notice'] }, { runs: ['Notices may be given ', { text: 'orally', bold: true }, '.'] }], header: [{ runs: ['Synthetic heading retained'] }] });
  const source = await original(bytes);
  const { chat, turn } = start(source.latest.id); await chat.idle();
  const saved = store.conversations.turn(turn.id);
  expect(saved.status).toBe('complete');
  expect(saved.state.redline?.status).toBe('saved');
  const file = saved.state.redline!.file!;
  const downloaded = store.exports.download(file.id);
  expect(file.template).toBe('counsel-redline-v1');
  const result = openDocx(downloaded.bytes), initial = openDocx(bytes);
  expect(modelOf(result).paragraphs.map(p => textOf(p, 'accept')).join('\n')).toContain('Notices may be given in writing.');
  expect(modelOf(result).paragraphs.map(p => textOf(p, 'reject')).join('\n')).toContain('Notices may be given orally.');
  expect(result.partText('word/document.xml')).toContain('w:ins');
  expect(result.partText('word/document.xml')).toContain('w:del');
  expect(result.partText('word/comments.xml')).toContain(edits[0]!.comment);
  expect(result.partText('word/header1.xml')).toBe(initial.partText('word/header1.xml'));
  expect(store.originalFile(source.latest.id).bytes).toEqual(Buffer.from(bytes));
  expect(store.getSource(source.id).latest.id).toBe(source.latest.id);
  expect(store.exports.list(saved.workId!)).toHaveLength(1);
  const backup = await createWorkspaceBackup(store.databasePath), path = join(root, backup.name);
  await Bun.write(path, backup.bytes);
  const restored = await restoreWorkspaceBackup(path, root), copy = new WorkspaceStore({ databasePath: restored.databasePath });
  try { expect(copy.exports.download(file.id).bytes).toEqual(downloaded.bytes); expect(copy.conversations.turn(turn.id).state.redline).toEqual(saved.state.redline); }
  finally { copy.close(); }
});
test('ambiguous edits and unsupported nested revisions fail as a whole without a misleading partial artifact', async () => {
  const signal = new AbortController().signal, sourceRevisionId = crypto.randomUUID();
  await expect(generateRedline(simpleDocx('Notices orally.', 'Another notice orally.'), { sourceRevisionId, edits }, signal)).rejects.toThrow('not every edit');
  const tracked = buildDocx({ blocks: [{ runs: [{ text: 'orally', ins: { author: 'Earlier reviewer', date: '2025-01-01T00:00:00Z' } }] }] });
  await expect(generateRedline(tracked, { sourceRevisionId, edits }, signal)).rejects.toThrow('not every edit');
  await expect(generateRedline(Buffer.from('not a document'), { sourceRevisionId, edits }, signal)).rejects.toThrow();
});
test('redlining requires a scoped retained original and source reads', async () => {
  const source = await original();
  const outOfScope = start(source.latest.id, []); await outOfScope.chat.idle();
  expect(store.conversations.turn(outOfScope.turn.id).state.redline).toBeUndefined();
  expect(store.conversations.turn(outOfScope.turn.id).state.activity.some(a => a.name === 'counsel_prepare_redline' && a.status === 'failed')).toBe(true);
  const text = store.createSource({ kind: 'document', revision: { title: 'Text only', body: 'Notices may be given orally.', provenance: { origin: 'fixture' } } });
  const missing = start(text.latest.id); await missing.chat.idle();
  expect(store.conversations.turn(missing.turn.id).state.redline).toBeUndefined();
  expect(store.conversations.turn(missing.turn.id).state.activity.at(-1)!.output).toContain('retained Word');
});
test('a source change during the response prevents saving a stale redline but preserves the answer', async () => {
  const source = await original();
  const { chat, turn } = start(source.latest.id, [source.latest.id], 120);
  for (let n = 0; n < 100; n++) {
    if (store.conversations.turn(turn.id).state.activity.some(a => a.name === 'counsel_prepare_redline' && a.status === 'complete')) break;
    await Bun.sleep(5);
  }
  store.reviseSource(source.id, source.latest.id, { title: source.latest.title, body: 'A newer source version.', provenance: { origin: 'fixture revision' } });
  await chat.idle();
  const saved = store.conversations.turn(turn.id);
  expect(saved.status).toBe('complete');
  expect(saved.state.redline?.status).toBe('source-changed');
  expect(store.exports.list(saved.workId!)).toHaveLength(0);
});
test('completion failure rolls the generated bytes back with work; cancellation yields no saved redline', async () => {
  const source = await original(), save = store.conversations.save.bind(store.conversations);
  store.conversations.save = turn => { if (turn.status === 'complete') throw new Error('Synthetic finalization failure'); return save(turn); };
  const { chat, turn } = start(source.latest.id); await chat.idle();
  expect(store.conversations.turn(turn.id).status).toBe('failed');
  expect(store.listWork()).toHaveLength(0);
  store.conversations.save = save;
  const stopped = start(source.latest.id, [source.latest.id], 100);
  stopped.chat.cancel(stopped.turn.conversationId, stopped.turn.id); await stopped.chat.idle();
  expect(store.conversations.turn(stopped.turn.id).state.redline).toBeUndefined();
  expect(store.listWork()).toHaveLength(0);
});
