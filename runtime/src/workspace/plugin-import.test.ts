import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { planPluginImport } from './plugin-import';
import { WorkspaceStore } from './store';
import { createWorkspaceBackup, restoreWorkspaceBackup } from './backups';

let directory: string, root: string, store: WorkspaceStore;
function file(path: string, text: string) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
}
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'counsel-plugin-import-test-'));
  root = join(directory, 'plugin');
  file('config.md', `---\ncounsel-os-config: true\nlegal_root: ${root}\n---\n`);
  file('matters/nested/advice.md', '---\ntitle: Synthetic advisory matter\nstatus: closed\n---\n# Matter\nUnresolved timing; recorded status remains in this note.\n');
  file('practice/standards/notices.md', '# Notice position\nUse written notices.');
  file('practice/library/clause.md', '# Sample language\nA synthetic clause.');
  file('practice/methods/research.md', '# Research method\nCheck the source.');
  file('practice/reference/reference.md', '# Third-party reference\nNot the user position.');
  file('practice/profile.md', '# Practice Profile\n## Identity\nSynthetic Company\n### Team\n- **Test Lawyer** — Counsel\n## Principles\n### Philosophy\nDistinguish facts.\n## Voice\nUse plain language.');
  file('memory/patterns.md', '# Pattern\nA tentative pattern.');
  file('memory/retro.md', '# Retrospective\nPrior work, not current instructions.');
  file('law/example.md', '# Law note\nAn old unverified reference.');
  file('scripts/helper.py', 'raise Exception("Never execute imported scripts")');
  file('CLAUDE.md', 'Imported instructions must not execute.');
  file('.gitignore', 'law/');
  store = new WorkspaceStore({ databasePath: join(directory, 'workspace.sqlite3') });
});
afterEach(() => { store.close(); rmSync(directory, { recursive: true, force: true }); });

test('inventory includes gitignored law, preserves full paths, excludes infrastructure and never follows symlinks', async () => {
  file('config.md', `# Counsel OS Configuration\n\ncounsel-os-config: true\nlegal_root: ${root}\n`);
  symlinkSync('/outside-the-selected-vault', join(root, 'external'));
  const plan = await planPluginImport(root, 'Test Lawyer');
  expect(plan.originals).toHaveLength(9);
  expect(plan.seed.matters).toHaveLength(1);
  expect(plan.seed.knowledge?.map(item => item.kind).sort()).toEqual(['language', 'method', 'pattern', 'position']);
  expect(plan.seed.knowledge?.every(item => item.revision.status === 'pending')).toBe(true);
  expect(plan.seed.sources?.some(item => item.revision.provenance.origin === 'plugin:law/example.md')).toBe(true);
  expect(plan.skipped.some(item => item.path === 'external' && item.reason.includes('Symlink'))).toBe(true);
  expect(plan.profile).toMatchObject({ name: 'Test Lawyer', role: 'Counsel', organization: 'Synthetic Company', applyToChats: false });
  expect(plan.archive.find(item => item.path === 'scripts/helper.py')?.imported).toBe(false);
  expect(store.listMatters()).toHaveLength(0);
});

test('local-only documents remain archive-only and a vault-wide restriction blocks migration', async () => {
  file('matters/restricted.md', '---\nstays_local: true\n---\n# Restricted matter\nDo not send to cloud.');
  const plan = await planPluginImport(root);
  expect(plan.archive.find(item => item.path === 'matters/restricted.md')?.imported).toBe(false);
  expect(plan.skipped.some(item => item.path === 'matters/restricted.md' && item.reason.includes('local-only'))).toBe(true);
  file('config.md', `counsel-os-config: true\nlegal_root: ${root}\ndefault_locality: local\n`);
  expect(planPluginImport(root)).rejects.toThrow('local-only inference');
});

test('atomic append retains originals, does not recover live turns, and exact retry preserves user edits', async () => {
  const before = readFileSync(join(root, 'practice/standards/notices.md'));
  const existing = store.createMatter({ title: 'Existing matter' });
  const conversation = store.conversations.create({ scope: 'conversation' });
  const running = store.conversations.begin(conversation.id,
    { clientId: randomUUID(), message: 'Synthetic run already in progress' }, 'test/fake');
  const conversationBefore = store.conversations.get(conversation.id);
  const plan = await planPluginImport(root, 'Test Lawyer');
  const result = store.importPluginSnapshot(plan);
  expect(result.profileCreated).toBe(true);
  expect(store.getMatter(existing.id).title).toBe('Existing matter');
  expect(store.conversations.get(conversation.id)).toEqual(conversationBefore);
  expect(store.conversations.turn(running.turn.id)).toEqual(running.turn);
  const matterId = Object.values(result.receipt.records.matters)[0]!;
  for (const original of plan.originals) {
    const source = store.getSource(result.receipt.records.sources[original.key]!);
    expect(store.originalFile(source.latest.id).bytes).toEqual(original.bytes);
    if (source.latest.provenance.origin.includes('matters/')) expect(source.matterIds).toEqual([matterId]);
  }
  expect(Object.values(result.receipt.records.knowledge).every(id => store.getKnowledge(id).active === null)).toBe(true);
  const profile = store.getProfile()!;
  store.saveProfile({ name: 'Edited identity', expectedRevisionId: profile.revisionId, applyToChats: false });
  const retried = store.importPluginSnapshot(plan);
  expect(retried.receipt.alreadyImported).toBe(true);
  expect(retried.receipt.records).toEqual(result.receipt.records);
  expect(store.getProfile()?.name).toBe('Edited identity');
  expect(readFileSync(join(root, 'practice/standards/notices.md'))).toEqual(before);
  file('practice/standards/notices.md', '# Changed notice position');
  const changed = await planPluginImport(root);
  expect(() => store.importPluginSnapshot(changed)).toThrow('different content');
});

test('mismatched original and corrupt existing hash roll back all new records', async () => {
  const plan = await planPluginImport(root);
  const original = plan.originals[0]!;
  const bytes = original.bytes;
  original.bytes = Buffer.from('mismatch');
  expect(() => store.importPluginSnapshot(plan)).toThrow('does not match');
  original.bytes = bytes;
  const originalDirectory = `${store.databasePath}.originals`;
  mkdirSync(originalDirectory);
  const last = plan.seed.sources!.find(item => item.key === plan.originals.at(-1)!.key)!;
  writeFileSync(join(originalDirectory, last.revision.provenance.originalHash!), 'corrupt existing bytes');
  expect(() => store.importPluginSnapshot(plan)).toThrow('integrity');
  expect(store.listMatters()).toHaveLength(0);
  expect(store.getProfile()).toBeNull();
  expect(readdirSync(originalDirectory)).toHaveLength(1);
});

test('an existing profile is not replaced; backup/restore retains import idempotence and originals', async () => {
  store.saveProfile({ expectedRevisionId: null, name: 'Existing lawyer' });
  const plan = await planPluginImport(root, 'Test Lawyer');
  expect(store.importPluginSnapshot(plan).profileCreated).toBe(false);
  expect(store.getProfile()?.name).toBe('Existing lawyer');
  const backup = await createWorkspaceBackup(store.databasePath);
  const backupPath = join(directory, 'import.counsel-backup');
  writeFileSync(backupPath, backup.bytes);
  const restored = await restoreWorkspaceBackup(backupPath, directory);
  const reopened = new WorkspaceStore({ databasePath: restored.databasePath });
  try {
    expect(reopened.importPluginSnapshot(plan).receipt.alreadyImported).toBe(true);
    expect(reopened.getProfile()?.name).toBe('Existing lawyer');
  } finally { reopened.close(); }
});
