import { describe, expect, test } from 'bun:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FsVaultStore } from './fs-store';
import { guardedVaultTools, vaultTools } from './vault-tools';
import { runToolDef } from '../core/fake-provider';
import type { VaultConfig } from './resolve-root';

const defaultCfg: VaultConfig = { entitiesPath: 'entities', mattersPath: 'matters' };

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

  test('every path/dir tool states that paths are vault-relative — models otherwise open with '
    + '`{"dir": "/"}` and burn a call recovering from `path outside vault: /` (spike 9.3-D)', () => {
    const tools = vaultTools(new FsVaultStore(mkdtempSync(join(tmpdir(), 'vt-'))));
    for (const name of ['vault_read', 'vault_write', 'vault_list']) {
      const t = tools.find(x => x.name === name)!;
      expect(t.description).toContain('relative to the vault root');
      expect(t.description).toContain('use `.` for the root');
    }
  });
});

describe('guardedVaultTools', () => {
  test('exposes the same four tools as vaultTools', () => {
    const store = new FsVaultStore(mkdtempSync(join(tmpdir(), 'gvt-')));
    const tools = guardedVaultTools(store, defaultCfg);
    expect(tools.map(t => t.name).sort()).toEqual(['vault_list', 'vault_read', 'vault_search', 'vault_write']);
  });

  test('vault_write to a knowledge-system path is refused with a propose_update pointer', async () => {
    const store = new FsVaultStore(mkdtempSync(join(tmpdir(), 'gvt-')));
    const tools = guardedVaultTools(store, defaultCfg);
    const r = await runToolDef(tools, 'vault_write', { path: 'practice/standards/x.md', content: 'hi' }, 'default');
    expect(r.isError).toBe(true);
    expect(String(r.output)).toMatch(/propose_update/);

    const readBack = await store.version('default', 'practice/standards/x.md');
    expect(readBack).toBeNull();
  });

  test('vault_write to a matter path still writes directly', async () => {
    const store = new FsVaultStore(mkdtempSync(join(tmpdir(), 'gvt-')));
    const tools = guardedVaultTools(store, defaultCfg);
    const r = await runToolDef(tools, 'vault_write', { path: 'matters/a.md', content: 'hi' }, 'default');
    expect(r.isError).toBe(false);
    expect(await store.read('default', 'matters/a.md')).toBe('hi');
  });

  test('vault_read/vault_list/vault_search are unaffected by the guard', async () => {
    const store = new FsVaultStore(mkdtempSync(join(tmpdir(), 'gvt-')));
    await store.write('default', 'practice/profile.md', 'profile content');
    const tools = guardedVaultTools(store, defaultCfg);
    const r = await runToolDef(tools, 'vault_read', { path: 'practice/profile.md' }, 'default');
    expect(r.isError).toBe(false);
    expect((r.output as any).content).toBe('profile content');
  });

  test('vault_write description states the gate and names the real knowledge-system dirs', () => {
    const store = new FsVaultStore(mkdtempSync(join(tmpdir(), 'gvt-')));
    const tools = guardedVaultTools(store, { entitiesPath: 'clients', mattersPath: 'deals' });
    const write = tools.find(t => t.name === 'vault_write')!;
    expect(write.description).toMatch(/propose_update/);
    expect(write.description).toContain('practice/');
    expect(write.description).toContain('memory/');
    expect(write.description).toContain('law/');
    expect(write.description).toContain('clients/');
  });

  describe('a spelled-around knowledge path does not bypass the gate', () => {
    for (const spelling of ['./practice/standards/x.md', 'matters/../practice/x.md', './/practice/x.md']) {
      test(`vault_write to "${spelling}" is refused with a propose_update pointer`, async () => {
        const store = new FsVaultStore(mkdtempSync(join(tmpdir(), 'gvt-')));
        const tools = guardedVaultTools(store, defaultCfg);
        const r = await runToolDef(tools, 'vault_write', { path: spelling, content: 'hi' }, 'default');
        expect(r.isError).toBe(true);
        expect(String(r.output)).toMatch(/propose_update/);
        expect(await store.version('default', 'practice/standards/x.md')).toBeNull();
        expect(await store.version('default', 'practice/x.md')).toBeNull();
      });
    }

    test('vault_write to "matters/../matters/a.md" is still allowed — it normalizes to a matter path', async () => {
      const store = new FsVaultStore(mkdtempSync(join(tmpdir(), 'gvt-')));
      const tools = guardedVaultTools(store, defaultCfg);
      const r = await runToolDef(tools, 'vault_write', { path: 'matters/../matters/a.md', content: 'hi' }, 'default');
      expect(r.isError).toBe(false);
      expect(await store.read('default', 'matters/a.md')).toBe('hi');
    });

    test('vault_write to a backslash-separated path is an error result, not a silent write outside the gate', async () => {
      // On a Windows host, `practice\x.md` would resolve *inside* `practice/`
      // via `path.win32`, while `posix.normalize` would see it as a single
      // opaque filename and never trip the knowledge-path check. Vault paths
      // are forward-slash only precisely so this can't happen.
      const store = new FsVaultStore(mkdtempSync(join(tmpdir(), 'gvt-')));
      const tools = guardedVaultTools(store, defaultCfg);
      const r = await runToolDef(tools, 'vault_write', { path: 'practice\\x.md', content: 'hi' }, 'default');
      expect(r.isError).toBe(true);
      expect(String(r.output)).toMatch(/backslash/);
    });
  });

  test('vault_read normalizes its path before hitting the store, same as vault_write', async () => {
    const store = new FsVaultStore(mkdtempSync(join(tmpdir(), 'gvt-')));
    await store.write('default', 'matters/a.md', 'hi');
    const tools = guardedVaultTools(store, defaultCfg);
    const r = await runToolDef(tools, 'vault_read', { path: 'matters/../matters/a.md' }, 'default');
    expect(r.isError).toBe(false);
    expect((r.output as any).content).toBe('hi');
  });
});
