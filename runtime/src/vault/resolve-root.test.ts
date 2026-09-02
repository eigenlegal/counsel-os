import { describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readVaultConfig, resolveLegalRoot } from './resolve-root';

function tmpDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

function markRoot(dir: string, legalRoot?: string): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'config.md'),
    `# Counsel OS Configuration\n\ncounsel-os-config: true\nlegal_root: ${legalRoot ?? dir}\n`,
    'utf8',
  );
}

function unmarkedDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'config.md'), '# just a markdown file, not a Counsel OS config\n', 'utf8');
}

describe('resolveLegalRoot', () => {
  test('(a) COUNSEL_OS_LEGAL_ROOT set to a marked dir resolves ok', () => {
    const root = tmpDir('root-');
    markRoot(root);
    const result = resolveLegalRoot({
      env: { COUNSEL_OS_LEGAL_ROOT: root },
      cwd: tmpDir('cwd-'),
      home: tmpDir('home-'),
      conventional: [],
    });
    expect(result).toEqual({ ok: true, root });
  });

  test('(a) COUNSEL_OS_LEGAL_ROOT set to an unmarked dir is code 1, no fallthrough', () => {
    const root = tmpDir('root-');
    unmarkedDir(root);
    // A separately marked root sits in the cwd walk and the conventional list,
    // proving the invalid env var short-circuits rather than falling through.
    const cwd = tmpDir('cwd-');
    markRoot(cwd);
    const home = tmpDir('home-');
    const conventionalRoot = tmpDir('conv-');
    markRoot(conventionalRoot);
    const result = resolveLegalRoot({
      env: { COUNSEL_OS_LEGAL_ROOT: root },
      cwd,
      home,
      conventional: [conventionalRoot],
    });
    expect(result).toEqual({ ok: false, code: 1, candidates: [] });
  });

  test('(b) pointer file at <home>/.counsel-os/legal-root resolves ok', () => {
    const home = tmpDir('home-');
    const root = tmpDir('root-');
    markRoot(root);
    mkdirSync(join(home, '.counsel-os'), { recursive: true });
    writeFileSync(join(home, '.counsel-os', 'legal-root'), root, 'utf8');
    const result = resolveLegalRoot({ env: {}, cwd: tmpDir('cwd-'), home, conventional: [] });
    expect(result).toEqual({ ok: true, root });
  });

  test('(b) an unmarked pointer target falls through to further search', () => {
    const home = tmpDir('home-');
    const bogus = tmpDir('bogus-');
    unmarkedDir(bogus);
    mkdirSync(join(home, '.counsel-os'), { recursive: true });
    writeFileSync(join(home, '.counsel-os', 'legal-root'), bogus, 'utf8');
    const cwd = tmpDir('cwd-');
    markRoot(cwd);
    const result = resolveLegalRoot({ env: {}, cwd, home, conventional: [] });
    expect(result).toEqual({ ok: true, root: cwd });
  });

  test('(c) cwd three levels below a marked root resolves ok', () => {
    const root = tmpDir('root-');
    markRoot(root);
    const cwd = join(root, 'a', 'b', 'c');
    mkdirSync(cwd, { recursive: true });
    const result = resolveLegalRoot({ env: {}, cwd, home: tmpDir('home-'), conventional: [] });
    expect(result).toEqual({ ok: true, root });
  });

  test('(c) cwd four levels below a marked root is not found', () => {
    const root = tmpDir('root-');
    markRoot(root);
    const cwd = join(root, 'a', 'b', 'c', 'd');
    mkdirSync(cwd, { recursive: true });
    const result = resolveLegalRoot({ env: {}, cwd, home: tmpDir('home-'), conventional: [] });
    expect(result).toEqual({ ok: false, code: 1, candidates: [] });
  });

  test('(d) two marked roots in the conventional list is code 2 with both candidates', () => {
    const base = tmpDir('conv-');
    const rootA = join(base, 'vault-a');
    const rootB = join(base, 'vault-b');
    markRoot(rootA);
    markRoot(rootB);
    const result = resolveLegalRoot({
      env: {},
      cwd: tmpDir('cwd-'),
      home: tmpDir('home-'),
      conventional: [base],
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.code).toBe(2);
    expect(result.candidates.slice().sort()).toEqual([rootA, rootB].sort());
  });

  test('scans the conventional list up to three levels deep, not four', () => {
    // find -maxdepth 3 caps at base/a/b/config.md (three path components below
    // base); base/a/b/c/config.md is a fourth component and is excluded.
    const base = tmpDir('conv-');
    const shallow = join(base, 'a', 'b');
    const deep = join(base, 'a', 'b', 'c');
    markRoot(shallow);
    markRoot(deep);
    const result = resolveLegalRoot({
      env: {},
      cwd: tmpDir('cwd-'),
      home: tmpDir('home-'),
      conventional: [base],
    });
    expect(result).toEqual({ ok: true, root: shallow });
  });

  test('no marked root anywhere is code 1 with no candidates', () => {
    const result = resolveLegalRoot({
      env: {},
      cwd: tmpDir('cwd-'),
      home: tmpDir('home-'),
      conventional: [tmpDir('conv-')],
    });
    expect(result).toEqual({ ok: false, code: 1, candidates: [] });
  });
});

describe('readVaultConfig', () => {
  test('defaults to entities/ and matters/ when config.md has no overrides', () => {
    const root = tmpDir('root-');
    markRoot(root);
    expect(readVaultConfig(root)).toEqual({ entitiesPath: 'entities', mattersPath: 'matters', autoApplyLawUpdates: false, lawManagement: 'plugin' });
  });

  test('honors entities_path and matters_path overrides in config.md', () => {
    const root = tmpDir('root-');
    mkdirSync(root, { recursive: true });
    writeFileSync(
      join(root, 'config.md'),
      `counsel-os-config: true\nlegal_root: ${root}\nentities_path: clients\nmatters_path: deals\n`,
      'utf8',
    );
    expect(readVaultConfig(root)).toEqual({ entitiesPath: 'clients', mattersPath: 'deals', autoApplyLawUpdates: false, lawManagement: 'plugin' });
  });

  test('ignores commented-out override lines', () => {
    const root = tmpDir('root-');
    mkdirSync(root, { recursive: true });
    writeFileSync(
      join(root, 'config.md'),
      `counsel-os-config: true\nlegal_root: ${root}\n# entities_path: entities\n# matters_path: matters\n`,
      'utf8',
    );
    expect(readVaultConfig(root)).toEqual({ entitiesPath: 'entities', mattersPath: 'matters', autoApplyLawUpdates: false, lawManagement: 'plugin' });
  });

  test('defaults when config.md is missing entirely', () => {
    const root = tmpDir('root-');
    mkdirSync(root, { recursive: true });
    expect(readVaultConfig(root)).toEqual({ entitiesPath: 'entities', mattersPath: 'matters', autoApplyLawUpdates: false, lawManagement: 'plugin' });
  });

  test('trims a trailing slash from entities_path and matters_path', () => {
    const root = tmpDir('root-');
    mkdirSync(root, { recursive: true });
    writeFileSync(
      join(root, 'config.md'),
      `counsel-os-config: true\nlegal_root: ${root}\nentities_path: entities/\nmatters_path: cases/\n`,
      'utf8',
    );
    expect(readVaultConfig(root)).toEqual({ entitiesPath: 'entities', mattersPath: 'cases', autoApplyLawUpdates: false, lawManagement: 'plugin' });
  });
});

describe('readVaultConfig law flags', () => {
  test('auto_apply_law_updates and law_management, quoted or bare, any case', () => {
    const root = tmpDir('root-');
    mkdirSync(root, { recursive: true });
    writeFileSync(join(root, 'config.md'), 'counsel-os-config: true\nlegal_root: /x\nauto_apply_law_updates: "TRUE"\nlaw_management: user\n', 'utf8');
    const cfg = readVaultConfig(root);
    expect(cfg.autoApplyLawUpdates).toBe(true);
    expect(cfg.lawManagement).toBe('user');
  });

  test('anything but true / user is the default', () => {
    const root = tmpDir('root-');
    mkdirSync(root, { recursive: true });
    writeFileSync(join(root, 'config.md'), 'counsel-os-config: true\nlegal_root: /x\nauto_apply_law_updates: yes\nlaw_management: plugin\n', 'utf8');
    const cfg = readVaultConfig(root);
    expect(cfg.autoApplyLawUpdates).toBe(false);
    expect(cfg.lawManagement).toBe('plugin');
  });
});

describe('readVaultConfig default_locality (providers spec §7)', () => {
  test('local is read; anything else is absent', () => {
    const root = mkdtempSync(join(tmpdir(), 'cfg-'));
    writeFileSync(join(root, 'config.md'), 'counsel-os-config: true\nlegal_root: x\ndefault_locality: local\n', 'utf8');
    expect(readVaultConfig(root).defaultLocality).toBe('local');
    writeFileSync(join(root, 'config.md'), 'counsel-os-config: true\nlegal_root: x\ndefault_locality: any\n', 'utf8');
    expect(readVaultConfig(root).defaultLocality).toBeUndefined();
    writeFileSync(join(root, 'config.md'), 'counsel-os-config: true\nlegal_root: x\n', 'utf8');
    expect(readVaultConfig(root).defaultLocality).toBeUndefined();
  });
});
