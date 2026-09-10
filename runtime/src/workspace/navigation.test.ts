import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Database } from 'bun:sqlite';
import { WorkspaceStore } from './store';
import { createWorkspaceBackupFile, restoreWorkspaceBackup } from './backups';
import { validateNavigation } from './navigation';

let store: WorkspaceStore, root: string, instant: number;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'counsel-navigation-')); instant = Date.parse('2026-01-01T00:00:00Z');
  store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3'), clock: () => new Date(instant) });
});
afterEach(() => { store.close(); rmSync(root, { recursive: true, force: true }); });
const visit = (kind: 'matter' | 'conversation', id: string) => { instant += 1000; return store.navigation.change({ action: 'visit', kind, id }); };
const pin = (kind: 'matter' | 'conversation', id: string, pinned = true) => store.navigation.change({ action: 'pin', kind, id, pinned });
const lifecycle = (id: string, action: 'rename' | 'archive' | 'trash' | 'restore', title?: string) => store.conversations.change(id, {
  action, expectedVersion: store.conversations.impact(id).version, ...(title ? { title } : {}),
});

test('recent matters reflect visits or saved work, not creation order or the bounded catalog', () => {
  const old = store.createMatter({ title: 'Old but useful matter' });
  for (let i = 0; i < 505; i++) store.createMatter({ title: `Unvisited ${i}` });
  expect(store.navigation.snapshot().recentMatters).toEqual([]);
  expect(visit('matter', old.id).recentMatters.map(m => m.id)).toEqual([old.id]);
  const worked = store.createMatter({ title: 'Worked-in matter' });
  instant += 1000;
  store.recordWork({ matterId: worked.id, title: 'A note', request: 'Question', answer: 'Working answer' });
  expect(store.navigation.snapshot().recentMatters.map(m => m.id)).toEqual([worked.id, old.id]);
  expect(pin('matter', old.id).pinned[0]?.id).toBe(old.id);
  expect(store.navigation.snapshot().recentMatters.map(m => m.id)).toEqual([worked.id]);
});

test('opening single-matter chats records recency without changing legal state or broadening scope', () => {
  const matter = store.createMatter({ title: 'Original matter' });
  const other = store.createMatter({ title: 'Other matter' });
  const chat = store.conversations.create({ scope: 'matter', matterId: matter.id, title: 'Original chat' });
  const original = store.conversations.get(chat.id);
  const result = visit('conversation', chat.id);
  expect(result.recentMatters[0]?.id).toBe(matter.id);
  expect(store.conversations.get(chat.id)).toEqual(original);
  expect(store.matterBrief(matter.id)).toBeNull();
  const multiple = store.conversations.create({ scope: 'matters', matterIds: [matter.id, other.id] });
  visit('conversation', multiple.id);
  expect(store.navigation.snapshot().recentMatters.map(m => m.id)).toEqual([matter.id]);
  expect(store.conversations.get(multiple.id).scope).toBe('matters');
});

test('pins resolve current names; archive and Trash hide shortcuts without destroying them', () => {
  const chat = store.conversations.create({ title: 'Original' });
  pin('conversation', chat.id); pin('conversation', chat.id);
  expect(store.navigation.snapshot().pinned).toHaveLength(1);
  lifecycle(chat.id, 'rename', 'Renamed');
  expect(store.navigation.snapshot().pinned[0]?.title).toBe('Renamed');
  for (const action of ['archive', 'trash'] as const) {
    lifecycle(chat.id, action);
    expect(store.navigation.snapshot().pinned).toEqual([]);
    expect(store.navigation.snapshot().recentChats).toEqual([]);
    expect(() => pin('conversation', chat.id)).toThrow('Restore');
    lifecycle(chat.id, 'restore');
    expect(store.navigation.snapshot().pinned[0]?.id).toBe(chat.id);
  }
  pin('conversation', chat.id, false);
  expect(store.navigation.snapshot().recentChats[0]?.id).toBe(chat.id);
});

test('atomic item commands merge across connections; navigation persists through reopen and streamed backup restore', async () => {
  const a = store.createMatter({ title: 'Matter A' }), b = store.createMatter({ title: 'Matter B' });
  const tab = new WorkspaceStore({ databasePath: store.databasePath });
  try {
    pin('matter', a.id);
    tab.navigation.change({ action: 'pin', kind: 'matter', id: b.id, pinned: true });
    visit('matter', b.id);
    tab.navigation.change({ action: 'collapse', section: 'matters', collapsed: true });
  } finally { tab.close(); }
  const expected = store.navigation.snapshot();
  expect(expected.pinned.map(p => p.id)).toEqual([a.id, b.id]);
  store.close(); store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') });
  expect(store.navigation.snapshot()).toEqual(expected);
  const backup = await createWorkspaceBackupFile(store.databasePath);
  try {
    const recovered = await restoreWorkspaceBackup(backup.path, root);
    const restored = new WorkspaceStore({ databasePath: recovered.databasePath });
    try { expect(restored.navigation.snapshot()).toEqual(expected); } finally { restored.close(); }
  } finally { backup.dispose(); }
});

test('strict bounded preferences reject forged visits and missing refs; GET does not create state', () => {
  const db = new Database(store.databasePath);
  try {
    store.navigation.snapshot();
    expect(db.query("SELECT * FROM workspace_settings WHERE key='workspace-navigation'").get()).toBeNull();
    expect(() => store.navigation.change({ action: 'visit', kind: 'matter', id: crypto.randomUUID() })).toThrow();
    const matter = store.createMatter({ title: 'A matter' });
    expect(() => store.navigation.change({ action: 'visit', kind: 'matter', id: matter.id, at: '2099-01-01T00:00:00Z' })).toThrow();
    expect(() => store.navigation.change({ action: 'collapse', section: 'arbitrary', collapsed: true })).toThrow();
    for (let i = 0; i < 24; i++) pin('matter', store.createMatter({ title: `Pin ${i}` }).id);
    expect(() => pin('matter', matter.id)).toThrow('24 pins');
    expect(() => validateNavigation(db, { version: 1, pins: [{ kind: 'matter', id: crypto.randomUUID() }], visits: [], collapsed: { pinned: false, chats: false, matters: false } })).toThrow('missing');
    expect(store.navigation.snapshot().pinned).toHaveLength(24);
  } finally { db.close(); }
});
