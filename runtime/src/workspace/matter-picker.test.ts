import { expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkspaceStore } from './store';
import { workspaceHandler } from './http';

test('matter lookup searches beyond catalog limits, ranks actual activity, normalizes Unicode and returns only bounded metadata', async () => {
  const root = mkdtempSync(join(tmpdir(), 'counsel-matter-picker-test-'));
  const store = new WorkspaceStore({ databasePath: join(root, 'workspace.sqlite3') });
  try {
    const target = store.createMatter({ title: 'ÉCOLE — São Paulo / Notice %_ terms', summary: 'PRIVATE-SUMMARY-NOT-FOR-PICKER' });
    for (let i = 0; i < 510; i++) store.createMatter({ title: `Synthetic matter ${i}` });
    expect(store.catalog(200).matters.some(m => m.id === target.id)).toBe(false);
    expect(store.matterOptions('').items).toHaveLength(50);
    expect(store.matterOptions('').total).toBe(511);
    expect(store.matterOptions('sao ECOLE').items.map(m => m.id)).toEqual([target.id]);
    expect(store.matterOptions('%_').items.map(m => m.id)).toEqual([target.id]);
    expect(store.matterOptions("' OR 1=1").total).toBe(0);
    expect(store.matterOptions('nonexistent').items).toEqual([]);
    expect(() => store.matterOptions('x'.repeat(251))).toThrow();
    expect(() => store.matterOptions(Array(17).fill('x').join(' '))).toThrow();
    store.saveMatterBrief(target.id, { expectedRevisionId: null, status: 'closed', summary: 'PRIVATE-SUMMARY-NOT-FOR-PICKER', questions: '', nextActions: '' });
    expect(store.matterOptions('').items[0]).toMatchObject({ id: target.id, status: 'closed' });
    const output = JSON.stringify(store.matterOptions('ecole'));
    expect(output).not.toContain('PRIVATE-SUMMARY');
    const handler = workspaceHandler({ store, token: 'synthetic', origin: 'http://127.0.0.1:7458', distDir: root, demo: true });
    const url = 'http://127.0.0.1:7458/api/workspace/matters/picker?q=ecole';
    expect((await handler(new Request(url))).status).toBe(401);
    const response = await handler(new Request(url, { headers: { authorization: 'Bearer synthetic' } }));
    expect(response.status).toBe(200);
    expect((await response.json() as { items: { id: string }[] }).items[0]?.id).toBe(target.id);
    expect((await handler(new Request(url + 'x'.repeat(251), { headers: { authorization: 'Bearer synthetic' } }))).status).toBe(400);
    expect(store.listWork()).toHaveLength(0);
  } finally { store.close(); rmSync(root, { recursive: true, force: true }); }
});
