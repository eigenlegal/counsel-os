import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { WorkspaceStore } from './store';
import { WorkspaceChat } from './chat';
import { FakeModelProvider } from '../core/fake-provider';
import { Database } from 'bun:sqlite';
import { ImportChoice } from './import-types';
import { importLinkResolver, noteReferences, type LinkFile, type ImportLinkPreview } from './import-links';
import { createWorkspaceBackup, inspectWorkspaceBackup, restoreWorkspaceBackup } from './backups';
import { workspaceHandler } from './http';

let root: string, store: WorkspaceStore;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'counsel-import-links-')); store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') }); });
afterEach(() => { store.close(); rmSync(root, { recursive: true, force: true }); });
async function stage(files: Record<string, string>) {
  const batch = store.imports.create({ clientId: crypto.randomUUID(), label: 'Mixed roots', files: Object.entries(files).map(([path, body]) => ({ path, byteCount: Buffer.byteLength(body) })) });
  for (const entry of batch.entries) if (entry.status !== 'skipped') store.imports.receive(batch.id, entry.id, Buffer.from(files[entry.path]!).toString('base64'));
  await store.imports.idle(); return store.imports.get(batch.id);
}
function apply(id: string, preview: ImportLinkPreview, ids = preview.items.filter(item => item.canShare).map(item => item.id)) {
  return store.imports.applyLinks(id, { expectedRevisionId: preview.revisionId, expectedVersion: preview.expectedVersion, linkIds: ids, confirmAccessChanges: true });
}

test('explicit Markdown/wiki references are resolved across selected roots, never through filesystem traversal or instructions', () => {
  const body = '[Signed draft](../../Companies/Acme/Draft%20One.docx#section)\n[[Companies/Acme/background|company]]\n![[attachment.pdf]]\n[Reference][ref]\n\n[ref]: ../../Companies/Acme/background.md\n\n`[[inline-secret]]`\n\n```md\n[[code-secret]]\n```\n';
  const refs = noteReferences(body);
  expect(refs.items).toHaveLength(4);
  expect(refs.items.map(item => item.href)).not.toContain('inline-secret');
  expect(refs.items.map(item => item.href)).not.toContain('code-secret');
  expect(refs.items.every(item => body.includes(item.quote))).toBe(true);
  const file = (path: string): LinkFile => ({ id: crypto.randomUUID(), path, status: 'ready', choice: ImportChoice.parse({ title: path, destination: 'source' }) });
  const from = file('Counsel/notes/matter.md'), draft = file('Companies/Acme/Draft One.docx'), background = file('Companies/Acme/background.md');
  const resolve = importLinkResolver([from, draft, background, file('Other/attachment.pdf')]);
  expect(resolve(from, refs.items[0]!).targetId).toBe(draft.id);
  expect(resolve(from, refs.items[1]!).targetId).toBe(background.id);
  expect(resolve(from, refs.items[2]!).status).toBe('matched');
  for (const href of ['../../../secret.md', '/Users/private.txt', 'file:///private.txt', 'https://example.com/contract', 'javascript:alert(1)', '%00bad.txt'])
    expect(resolve(from, { href, form: 'markdown', quote: href }).status).toBe('outside');
});

test('ambiguous names, missing selected files, skipped/profile targets and stale reviews stay explicit', async () => {
  const matter = store.createMatter({ title: 'NDA' });
  const batch = await stage({ 'notes/brief.md': '[[agreement]]\n[[missing]]\n[[profile]]\n[legacy](../old.doc)\n[web](https://example.com)',
    'A/agreement.md': 'NDA A', 'B/agreement.md': 'NDA B', 'profile.md': '# Name\nPrivate profile', 'old.doc': 'Unsupported' });
  store.imports.edit(batch.id, batch.entries.find(item => item.path === 'notes/brief.md')!.id, { expectedRevisionId: batch.revisionId,
    choice: { ...batch.entries.find(item => item.path === 'notes/brief.md')!.choice, matterId: matter.id, matterTitle: null } });
  const preview = store.imports.links(batch.id);
  expect(preview.items.find(item => item.href === 'agreement')!.status).toBe('ambiguous');
  expect(preview.items.find(item => item.href === 'agreement')!.candidateCount).toBe(2);
  expect(preview.items.find(item => item.href === 'missing')!.status).toBe('missing');
  expect(preview.items.find(item => item.href === 'profile')!.status).toBe('excluded');
  expect(preview.items.find(item => item.href === '../old.doc')!.status).toBe('excluded');
  expect(preview.items.every(item => !item.canShare)).toBe(true);
  expect(() => apply(batch.id, preview, [preview.items[0]!.id])).toThrow('unresolved');
  const note = store.imports.get(batch.id).entries[0]!;
  store.imports.edit(batch.id, note.id, { expectedRevisionId: preview.revisionId, choice: { ...note.choice, title: 'Corrected' } });
  expect(() => apply(batch.id, preview, [preview.items[0]!.id])).toThrow('changed');
  expect(store.catalog().sources).toHaveLength(0);
});

test('one company background can support two separate matters, only after reviewed links and final import', async () => {
  const nda = store.createMatter({ title: 'Acme NDA' }), employment = store.createMatter({ title: 'Acme employment dispute' }), outside = store.createMatter({ title: 'Unrelated client' });
  const batch = await stage({ 'Practice/notes/nda.md': 'NDA file. [Background](../../Companies/Acme/background.md)',
    'Practice/notes/employment.md': 'Employment file. [[Companies/Acme/background]]',
    'Companies/Acme/background.md': 'COMPANYCANARY address history. Nothing here grants signing authority.' });
  store.imports.editChoices(batch.id, { expectedRevisionId: batch.revisionId, changes: batch.entries.filter(e => e.path.includes('/notes/')).map(e => ({ entryId: e.id,
    choice: { ...e.choice, matterId: e.path.includes('/nda') ? nda.id : employment.id, matterTitle: null } })) });
  const preview = store.imports.links(batch.id); expect(preview.shareable).toBe(2);
  const reviewed = apply(batch.id, preview);
  expect(reviewed.selection.linkedMatters).toBe(2);
  expect(store.imports.links(batch.id).items.every(item => item.alreadyShared)).toBe(true);
  expect(store.catalog().sources).toHaveLength(0); expect(store.clients.list()).toHaveLength(0);
  const committed = store.imports.commit(batch.id, { expectedRevisionId: reviewed.revisionId });
  expect(committed.receipt!.matterIds).toHaveLength(0);
  const companyId = committed.receipt!.items.find(item => item.entryId === batch.entries.find(e => e.path.endsWith('background.md'))!.id)!.sourceId;
  expect(store.getSource(companyId).matterIds.sort()).toEqual([nda.id, employment.id].sort());
  expect(store.search({ matterId: nda.id, query: 'COMPANYCANARY' }).hits).toHaveLength(1);
  expect(store.search({ matterId: employment.id, query: 'COMPANYCANARY' }).hits).toHaveLength(1);
  expect(store.search({ matterId: outside.id, query: 'COMPANYCANARY' }).hits).toHaveLength(0);
  expect(store.catalog().knowledge).toHaveLength(0); expect(store.clients.list()).toHaveLength(0);
  expect(store.imports.undoPreview(batch.id).items.find(item => item.sourceId === companyId)!.canUndo).toBe(true);
  const provider = new FakeModelProvider([{ text: 'Synthetic answer for retrieval qualification only.' }]);
  const chat = new WorkspaceChat(store, () => provider);
  try {
    const conversation = store.conversations.create({ scope: 'matter', matterId: nda.id });
    const turn = chat.start(conversation.id, { clientId: crypto.randomUUID(), message: 'What company address history do we have?' });
    await chat.idle();
    expect(store.conversations.turn(turn.id).status).toBe('complete');
    expect(store.conversations.turn(turn.id).state.context.some(record => record.kind === 'source' && record.id === store.getSource(companyId).latest.id && record.ranges.length > 0)).toBe(true);
    expect(provider.lastRequest!.system).toContain('COMPANYCANARY');
    expect(store.imports.undoPreview(batch.id).items.find(item => item.sourceId === companyId)!.canUndo).toBe(false);
  } finally { chat.stop(); await chat.idle(); }
  const source = store.getSource(companyId);
  const links = store.sourceMatters(companyId);
  store.changeSourceMatter(companyId, { action: 'unlink', matterId: employment.id, expectedVersion: links.version, confirm: true });
  expect(store.getSource(companyId).latest.id).toBe(source.latest.id);
  expect(store.search({ matterId: employment.id, query: 'COMPANYCANARY' }).hits).toHaveLength(0);
  store.close(); store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') });
  expect(store.search({ matterId: nda.id, query: 'COMPANYCANARY' }).hits).toHaveLength(1);
  expect(store.search({ matterId: employment.id, query: 'COMPANYCANARY' }).hits).toHaveLength(0);
});

test('reviewed new-matter links survive backup, reuse a single matter and can be removed before import', async () => {
  const batch = await stage({ 'note.md': '[[support]]', 'support.md': 'Shared supporting facts' });
  store.imports.edit(batch.id, batch.entries[0]!.id, { expectedRevisionId: batch.revisionId, choice: { ...batch.entries[0]!.choice, matterTitle: 'New engagement' } });
  const reviewed = apply(batch.id, store.imports.links(batch.id));
  const backup = await createWorkspaceBackup(store.databasePath); expect((await inspectWorkspaceBackup(backup.bytes)).schemaVersion).toBe(20);
  const backupPath = join(root, 'fixture.counsel-backup'); writeFileSync(backupPath, backup.bytes);
  const restored = await restoreWorkspaceBackup(backupPath, join(root, 'restored'));
  const copy = new WorkspaceStore({ databasePath: restored.databasePath });
  try {
    expect(copy.imports.links(batch.id).items[0]!.alreadyShared).toBe(true);
    const committed = copy.imports.commit(batch.id, { expectedRevisionId: reviewed.revisionId });
    expect(committed.receipt!.matterIds).toHaveLength(1);
    expect(copy.search({ matterId: committed.receipt!.matterIds[0]!, query: 'supporting' }).hits).toHaveLength(1);
  } finally { copy.close(); }
  const target = reviewed.entries.find(item => item.path === 'support.md')!;
  store.imports.edit(batch.id, target.id, { expectedRevisionId: reviewed.revisionId, choice: { ...target.choice, linkedMatters: [] } });
  const unshared = store.imports.get(batch.id);
  expect(unshared.selection.linkedMatters).toBeUndefined();
  expect(store.imports.links(batch.id).items[0]!.canShare).toBe(true);
});

test('link review is paged and rechecks matter renames, invalid IDs, active AI and explicit consent', async () => {
  const matter = store.createMatter({ title: 'Project matter' });
  const files = Object.fromEntries(Array.from({ length: 61 }, (_, index) => [`docs/${index}.txt`, `Fact ${index}`]));
  const batch = await stage({ 'note.md': Object.keys(files).map(path => `[[${path}]]`).join('\n'), ...files });
  store.imports.edit(batch.id, batch.entries[0]!.id, { expectedRevisionId: batch.revisionId, choice: { ...batch.entries[0]!.choice, matterId: matter.id } });
  let preview = store.imports.links(batch.id); expect(preview.total).toBe(61); expect(preview.items).toHaveLength(50);
  const page = store.imports.links(batch.id, { offset: 50 }); expect(page.items).toHaveLength(11);
  expect(() => apply(batch.id, preview, ['0'.repeat(64)])).toThrow('unresolved');
  const handler = workspaceHandler({ store, token: 'fixture', origin: 'http://localhost', distDir: join(root, 'none'), demo: false });
  const request = (body: unknown, auth = true) => new Request(`http://localhost/api/workspace/imports/${batch.id}/links`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer fixture' } : {}) }, body: JSON.stringify(body) });
  const input = { expectedRevisionId: preview.revisionId, expectedVersion: preview.expectedVersion, linkIds: [page.items[0]!.id], confirmAccessChanges: true };
  expect((await handler(request(input, false))).status).toBe(401);
  expect((await handler(request({ ...input, confirmAccessChanges: false }))).status).toBe(400);
  const other = new Database(store.databasePath);
  other.run('UPDATE matters SET title=? WHERE id=?', ['Renamed project', matter.id]); other.close();
  expect(() => apply(batch.id, preview, [page.items[0]!.id])).toThrow('matter names changed');
  preview = store.imports.links(batch.id); input.expectedVersion = preview.expectedVersion;
  store.imports.organization.start(batch.id, { requestId: crypto.randomUUID(), expectedRevisionId: preview.revisionId,
    shareForSuggestions: true, modelChoice: { kind: 'codex', model: 'synthetic' } });
  expect(() => apply(batch.id, preview)).toThrow('Pause AI');
  const job = store.imports.organization.get(batch.id)!;
  store.imports.organization.control(batch.id, { action: 'pause', expectedRevisionId: job.revisionId });
  expect((await handler(request(input))).status).toBe(200);
  preview = store.imports.links(batch.id); expect(preview.shareable).toBe(60);
  expect(store.imports.get(batch.id).entries.find(item => item.id === page.items[0]!.targetId)!.choice.linkedMatters).toHaveLength(1);
  expect(store.catalog().sources).toHaveLength(0);
});

test('link coverage is explicit, relative Markdown targets do not guess at another folder, and case collisions stay ambiguous', () => {
  const file = (path: string): LinkFile => ({ id: crypto.randomUUID(), path, status: 'ready', choice: ImportChoice.parse({ title: path, destination: 'source' }) });
  const from = file('notes/brief.md'), resolve = importLinkResolver([from, file('Other/Agreement.md'), file('Elsewhere/AGREEMENT.md')]);
  expect(resolve(from, { href: 'Agreement.md', form: 'markdown', quote: 'link' }).status).toBe('missing');
  expect(resolve(from, { href: 'agreement', form: 'wiki', quote: 'link' }).status).toBe('ambiguous');
  const long = noteReferences(Array.from({ length: 120 }, (_, i) => `[[doc-${i}]]`).join('\n'));
  expect(long.items).toHaveLength(100); expect(long.truncated).toBe(true);
});
