import { describe, expect, test } from 'bun:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FsVaultStore } from './fs-store';
import { vaultTools } from './vault-tools';
import { runToolDef } from '../core/fake-provider';

describe('vault tools', () => {
  test('exposes four tools and round-trips through runToolDef', async () => {
    const store = new FsVaultStore(mkdtempSync(join(tmpdir(), 'vt-')));
    const tools = vaultTools(store);
    expect(tools.map(t => t.name).sort()).toEqual(['vault_list', 'vault_read', 'vault_search', 'vault_write']);

    const w = await runToolDef(tools, 'vault_write', { path: 'a.md', content: 'hi' }, 'default');
    expect(w.isError).toBe(false);
    const r = await runToolDef(tools, 'vault_read', { path: 'a.md' }, 'default');
    expect((r.output as any).content).toBe('hi');
    expect((r.output as any).version).toBe((w.output as any).version);

    const stale = await runToolDef(tools, 'vault_write', { path: 'a.md', content: 'x', expectedVersion: 'deadbeef' }, 'default');
    expect(stale.isError).toBe(true);
    expect(String(stale.output)).toMatch(/conflict/);
  });
});
