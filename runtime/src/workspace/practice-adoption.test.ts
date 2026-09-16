import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkspaceStore } from './store';
import { seedImportedStandards } from './fixtures/imported-standards';
import { seedPluginContext } from './fixtures/plugin-context';
import { importedPracticeTitle, practiceReadingParts, practicePreview } from './practice-presentation';
import { workspaceHandler } from './http';
import { chatTools } from './chat-tools';
import { runToolDef } from '../core/fake-provider';

let store: WorkspaceStore, root: string;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'counsel-practice-adoption-')); store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') }); });
afterEach(() => { store.close(); rmSync(root, { recursive: true, force: true }); });
const selection = () => store.importedStandards().records.map(item => ({ id: item.id, expectedRevisionId: item.revisionId }));
const input = () => ({ selections: selection(), expectedProfileRevisionId: store.getProfile()!.revisionId, confirm: true as const });

test('export IDs and stale import boilerplate are presentation only, before and after adoption', async () => {
  const [file] = await seedImportedStandards(store, 1);
  const initial = store.getKnowledge(file!.practiceId!), original = store.getSource(file!.sourceId).latest;
  expect(initial.latest.title).toContain('4ddf384e');
  expect(initial.displayTitle).toBe('Synthetic standard 1 — Position');
  expect(store.practiceLibrary({}).records[0]).toMatchObject({ title: initial.displayTitle, preview: 'Our standard: Keep a written record of synthetic decision 1.', use: 'proposed', needsReview: true });
  expect(store.practiceLibrary({ query: 'written record' }).total).toBe(1);
  store.saveProfile({ name: 'Synthetic Reviewer', expectedRevisionId: null });
  expect(store.adoptImportedStandards(input())).toEqual({ adopted: 1 });
  const reviewed = store.getKnowledge(initial.id);
  expect(reviewed.latest).toMatchObject({ number: 2, body: initial.latest.body, title: initial.latest.title, status: 'approved', approvedBy: 'Synthetic Reviewer' });
  expect(reviewed.active?.id).toBe(reviewed.latest.id);
  expect(reviewed.displayTitle).toBe(initial.displayTitle);
  expect(store.getKnowledgeRevision(initial.latest.id)).toEqual(initial.latest);
  expect(store.getSource(file!.sourceId).latest).toEqual(original);
  expect(store.practiceLibrary({}).records[0]).toMatchObject({ use: 'guidance', needsReview: false, preview: 'Our standard: Keep a written record of synthetic decision 1.' });
  expect(store.importedStandards().total).toBe(0);
});

test('cleanup preserves renamed titles, unrecognised suffixes, ordinary content and exact saved text', () => {
  const body = '# Actual title\n\nSaved review status: pending. Re-import does not carry over approval.\nSaved version: 1\n\n## Position\nDo not omit pending review in this substantive sentence.';
  const original = { title: 'Actual title - abcdef12', body, origin: 'import:batch/Actual title - abcdef12.md' };
  expect(importedPracticeTitle(original.title, original)).toBe('Actual title');
  expect(importedPracticeTitle('Renamed title abcdef12', original)).toBe('Renamed title abcdef12');
  expect(importedPracticeTitle(original.title, { ...original, body: 'Unrelated body' })).toBe(original.title);
  expect(importedPracticeTitle(original.title, { ...original, origin: 'upload' })).toBe(original.title);
  expect(practicePreview(body)).toBe('Do not omit pending review in this substantive sentence.');
  expect(practiceReadingParts('---\nA paragraph\n---\nKeep this.').body).toBe('---\nA paragraph\n---\nKeep this.');
  expect(practiceReadingParts('Saved review status: pending\nImportant condition.').body).toBe('Saved review status: pending\nImportant condition.');
});

test('adoption is atomic, records normal approval history, and a later proposal leaves approved guidance active', async () => {
  const files = await seedImportedStandards(store);
  store.saveProfile({ name: 'Synthetic Reviewer', expectedRevisionId: null });
  const before = input();
  const changed = store.getKnowledge(files[1]!.practiceId!);
  store.proposeKnowledgeUpdate(changed.id, { expectedRevisionId: changed.latest.id, title: changed.latest.title, body: 'A new AI or human proposal.' });
  expect(() => store.adoptImportedStandards(before)).toThrow('Nothing was adopted');
  expect(store.getKnowledge(files[0]!.practiceId!).active).toBeNull();
  expect(store.getKnowledge(files[2]!.practiceId!).active).toBeNull();
  expect(store.adoptImportedStandards(input())).toEqual({ adopted: 2 });
  const k = store.getKnowledge(files[0]!.practiceId!);
  expect(store.knowledgeHistory(k.id).totalVersions).toBe(2);
  expect(store.catalog().work.filter(w => w.title.startsWith('Approved:'))).toHaveLength(2);
  store.proposeKnowledgeUpdate(k.id, { expectedRevisionId: k.latest.id, title: k.latest.title, body: 'Proposed replacement' });
  expect(store.getKnowledge(k.id).active?.id).toBe(k.latest.id);
  expect(store.practiceLibrary({ status: 'review' }).records.find(r => r.id === k.id)?.use).toBe('guidance');
  expect(store.importedStandards().total).toBe(0);
});

test('receipt eligibility excludes ad hoc proposals, direct plugin baselines, later edits and trashed originals', async () => {
  const files = await seedImportedStandards(store);
  seedPluginContext(store);
  const proposal = store.createKnowledge({ kind: 'position', revision: { title: 'Imported-looking AI proposal', body: 'Imported from plugin:practice/standards/fake.md. Pending review; no approval inferred.' } });
  expect(store.importedStandards().records.some(r => r.id === proposal.id)).toBe(false);
  store.saveProfile({ name: 'Synthetic Reviewer', expectedRevisionId: null });
  const before = input();
  store.changeRecord('source', files[1]!.sourceId, { action: 'trash', confirm: true, expectedVersion: store.recordImpact('source', files[1]!.sourceId).version });
  expect(store.importedStandards().total).toBe(2);
  expect(() => store.adoptImportedStandards(before)).toThrow('Nothing was adopted');
  expect(store.getKnowledge(files[0]!.practiceId!).active).toBeNull();
  expect(() => store.adoptImportedStandards({ ...input(), selections: [{ id: proposal.id, expectedRevisionId: proposal.latest.id }] })).toThrow('Nothing was adopted');
  const beforeSourceChange = input(), source = store.getSource(files[0]!.sourceId);
  store.reviseSource(source.id, source.latest.id, { title: source.latest.title, body: 'A newer original needs its own review.', provenance: source.latest.provenance });
  expect(store.importedStandards().total).toBe(1);
  expect(() => store.adoptImportedStandards(beforeSourceChange)).toThrow('Nothing was adopted');
  expect(store.getKnowledge(files[2]!.practiceId!).active).toBeNull();
});

test('batch requires current profile, explicit confirmation, nonempty unique selections and current revisions', async () => {
  await seedImportedStandards(store, 1);
  const choices = selection();
  expect(() => store.adoptImportedStandards({ selections: choices, expectedProfileRevisionId: crypto.randomUUID(), confirm: true })).toThrow('Set up your profile');
  const profile = store.saveProfile({ name: 'Synthetic Reviewer', expectedRevisionId: null });
  const before = input();
  store.saveProfile({ name: 'Different identity', expectedRevisionId: profile.revisionId });
  expect(() => store.adoptImportedStandards(before)).toThrow('Your profile changed');
  expect(() => store.adoptImportedStandards({ ...input(), selections: [] })).toThrow();
  expect(() => store.adoptImportedStandards({ ...input(), selections: [...choices, ...choices] })).toThrow();
  store.adoptImportedStandards(input());
  expect(() => store.adoptImportedStandards({ ...before, expectedProfileRevisionId: store.getProfile()!.revisionId })).toThrow('Nothing was adopted');
  expect(store.knowledgeHistory(choices[0]!.id).totalVersions).toBe(2);
});

test('matter-specific methods and concessions cannot be batch adopted as practice-wide material', async () => {
  const matter = store.createMatter({ title: 'Synthetic negotiation' });
  for (const destination of ['method', 'position'] as const) {
    const body = 'Synthetic matter concession or working method.';
    let batch = store.imports.create({ clientId: crypto.randomUUID(), label: 'Synthetic scoped import', files: [{ path: `${destination}.md`, byteCount: Buffer.byteLength(body) }] });
    await store.imports.upload(batch.id, batch.entries[0]!.id, Buffer.from(body).toString('base64'));
    await store.imports.idle(); batch = store.imports.get(batch.id);
    batch = store.imports.edit(batch.id, batch.entries[0]!.id, { expectedRevisionId: batch.revisionId, choice: { title: `Synthetic ${destination}`, destination, matterId: matter.id } });
    const committed = store.imports.commit(batch.id, { expectedRevisionId: batch.revisionId });
    const item = store.getKnowledge(committed.receipt!.items[0]!.practiceId!);
    expect(item.latest.status).toBe('pending');
    expect(store.importedStandards().records.some(candidate => candidate.id === item.id)).toBe(false);
  }
  expect(store.importedStandards().total).toBe(0);
});

test('after positions are approved, other imported kinds remain reviewable across successive batches with their roles intact', async () => {
  store.saveProfile({ name: 'Synthetic Reviewer', expectedRevisionId: null });
  await seedImportedStandards(store, 2);
  store.adoptImportedStandards(input());
  const kinds = ['method', 'language', 'pattern'] as const;
  const files = await seedImportedStandards(store, 69, [...kinds]);
  const pending = store.importedStandards();
  expect(pending.total).toBe(69); expect(pending.records).toHaveLength(50);
  expect(new Set(pending.records.map(item => item.category))).toEqual(new Set(kinds));
  expect(store.adoptImportedStandards(input()).adopted).toBe(50);
  expect(store.importedStandards().total).toBe(19);
  expect(store.adoptImportedStandards(input()).adopted).toBe(19);
  expect(store.importedStandards().total).toBe(0);
  const conversation = store.conversations.create({});
  const turn = store.conversations.begin(conversation.id, { clientId: crypto.randomUUID(), message: 'Read my practice material', attachments: [] }, 'fixture').turn;
  const tools = chatTools({ store, conversation, turn, attachments: [], signal: new AbortController().signal, save: () => store.conversations.save(turn) }).tools;
  for (let i = 0; i < 3; i++) {
    const item = store.getKnowledge(files[i]!.practiceId!);
    expect(item.kind).toBe(kinds[i]!); expect(item.active?.status).toBe('approved');
    const response = await runToolDef(tools, 'counsel_read_record', { kind: 'knowledge', id: item.active!.id }, 'workspace');
    expect(response.isError).not.toBe(true);
    const text = JSON.stringify(response);
    expect(text).toContain(i === 0 ? 'Approved working method' : i === 1 ? 'starting language, not a standing position' : 'historical context, not a standing position');
    expect(store.getSource(files[i]!.sourceId).latest.body).toBe(item.active!.body);
  }
});

test('eligible candidates paginate beyond fifty without dropping or automatically selecting any positions', async () => {
  await seedImportedStandards(store, 53);
  const first = store.importedStandards(), second = store.importedStandards(1);
  expect(first.total).toBe(53); expect(first.hasMore).toBe(true); expect(first.records).toHaveLength(50);
  expect(second.records).toHaveLength(3); expect(second.hasMore).toBe(false);
  expect(new Set([...first.records, ...second.records].map(r => r.id)).size).toBe(53);
  expect(store.practiceLibrary({ status: 'in-use' }).total).toBe(0);
});

test('human HTTP endpoints require authentication, same-origin writes and schema confirmation', async () => {
  await seedImportedStandards(store, 1);
  store.saveProfile({ name: 'Synthetic Reviewer', expectedRevisionId: null });
  const handler = workspaceHandler({ store, token: 'fixture', origin: 'http://127.0.0.1:7432', distDir: root, demo: false });
  const call = (path: string, body?: unknown, auth = true, origin = 'http://127.0.0.1:7432') => handler(new Request('http://127.0.0.1:7432/api/workspace' + path, { method: body === undefined ? 'GET' : 'POST', headers: { ...(auth ? { authorization: 'Bearer fixture' } : {}), origin, 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }));
  expect((await call('/practice-library/imported-standards', undefined, false)).status).toBe(401);
  expect((await call('/practice-library/imported-standards?page=-1')).status).toBe(400);
  expect((await call('/practice-library/adopt', input(), false)).status).toBe(401);
  expect((await call('/practice-library/adopt', input(), true, 'https://evil.invalid')).status).toBe(403);
  expect((await call('/practice-library/adopt', { ...input(), confirm: false })).status).toBe(400);
  expect((await call('/practice-library/adopt', { ...input(), actor: 'Forged identity' })).status).toBe(400);
  expect(store.importedStandards().total).toBe(1);
  expect((await call('/practice-library/adopt', input())).status).toBe(200);
});
