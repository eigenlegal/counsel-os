import { afterEach, describe, expect, test } from 'bun:test';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const repoRoot = path.resolve(import.meta.dir, '../..');
const backupScript = path.join(repoRoot, 'backup');
const restoreScript = path.join(repoRoot, 'restore');

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()!();
  }
});

function makeTempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  cleanups.push(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function makeVault(dir: string): void {
  fs.writeFileSync(
    path.join(dir, 'config.md'),
    `counsel-os-config: true\nlegal_root: ${dir}\n`,
  );
}

function runScript(
  script: string,
  args: string[],
  home: string,
  vault: string,
  stdin = '',
) {
  return spawnSync('bash', [script, ...args], {
    cwd: home,
    encoding: 'utf8',
    input: stdin,
    env: { ...process.env, HOME: home, COUNSEL_OS_LEGAL_ROOT: vault },
  });
}

function backupsDir(home: string): string {
  return path.join(home, '.counsel-os', 'backups');
}

function listBackups(home: string): string[] {
  const dir = backupsDir(home);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).sort();
}

function writeManifest(backupPath: string, files: number): void {
  fs.writeFileSync(
    path.join(backupPath, 'manifest.json'),
    JSON.stringify(
      {
        format: 'full-root',
        timestamp: path.basename(backupPath),
        version: 'test',
        source: '/tmp/somewhere',
        files,
      },
      null,
      2,
    ) + '\n',
  );
}

function makeHandBuiltBackup(
  home: string,
  name: string,
  payloadFiles: Record<string, string>,
  manifestFiles: number | null,
): string {
  const backupPath = path.join(backupsDir(home), name);
  for (const [rel, content] of Object.entries(payloadFiles)) {
    const target = path.join(backupPath, 'root', rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  if (manifestFiles !== null) {
    writeManifest(backupPath, manifestFiles);
  }
  return backupPath;
}

const markedConfig = 'counsel-os-config: true\nlegal_root: /tmp/original\n';

describe('backup', () => {
  test('completes atomically: final dir has a manifest and no .partial is left', () => {
    const home = makeTempDir('counsel-backup-home-');
    const vault = makeTempDir('counsel-backup-vault-');
    makeVault(vault);
    fs.mkdirSync(path.join(vault, 'matters'));
    fs.writeFileSync(path.join(vault, 'matters', 'a.md'), 'matter a\n');

    const result = runScript(backupScript, [], home, vault);
    expect(result.status).toBe(0);

    const backups = listBackups(home);
    expect(backups.length).toBe(1);
    const name = backups[0]!;
    expect(name).not.toEndWith('.partial');

    const backupPath = path.join(backupsDir(home), name);
    expect(fs.existsSync(path.join(backupPath, 'manifest.json'))).toBe(true);
    expect(fs.existsSync(path.join(backupPath, 'root', 'config.md'))).toBe(true);
    expect(
      fs.readFileSync(path.join(backupPath, 'root', 'matters', 'a.md'), 'utf8'),
    ).toBe('matter a\n');
  });

  test('dereferences symlinked vault dirs instead of saving bare links', () => {
    const home = makeTempDir('counsel-backup-home-');
    const vault = makeTempDir('counsel-backup-vault-');
    const shared = makeTempDir('counsel-backup-shared-');
    makeVault(vault);
    fs.writeFileSync(path.join(shared, 'nda.md'), 'shared matter content\n');
    fs.symlinkSync(shared, path.join(vault, 'matters'));

    const result = runScript(backupScript, [], home, vault);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('matters is a symlink');

    const backups = listBackups(home);
    expect(backups.length).toBe(1);
    const copied = path.join(backupsDir(home), backups[0]!, 'root', 'matters');
    expect(fs.lstatSync(copied).isSymbolicLink()).toBe(false);
    expect(fs.lstatSync(copied).isDirectory()).toBe(true);
    expect(fs.readFileSync(path.join(copied, 'nda.md'), 'utf8')).toBe(
      'shared matter content\n',
    );
  });

  test('a failed copy leaves NO directory that restore could pick up', () => {
    const home = makeTempDir('counsel-backup-home-');
    const vault = makeTempDir('counsel-backup-vault-');
    makeVault(vault);
    fs.mkdirSync(path.join(vault, 'matters'));
    fs.writeFileSync(path.join(vault, 'matters', 'a.md'), 'matter a\n');
    // An unreadable directory sorted last in the glob makes cp fail AFTER
    // config.md and matters/ were already copied — the exact shape of a
    // partial backup that used to pass restore's config.md-only check.
    const locked = path.join(vault, 'zz-locked');
    fs.mkdirSync(locked);
    fs.writeFileSync(path.join(locked, 'secret.md'), 'x\n');
    fs.chmodSync(locked, 0o000);
    cleanups.push(() => fs.chmodSync(locked, 0o755));

    const result = runScript(backupScript, [], home, vault);
    expect(result.status).not.toBe(0);

    // The staged .partial dir must be cleaned up: nothing in the backups
    // dir means nothing for restore's newest-backup pick to find.
    expect(listBackups(home)).toEqual([]);

    const restore = runScript(restoreScript, [], home, vault);
    expect(restore.status).not.toBe(0);
    expect(restore.stdout + restore.stderr).toContain('No backups found');
  });
});

describe('restore backup selection', () => {
  test('prefers the newest COMPLETE backup over a newer manifest-less one', () => {
    const home = makeTempDir('counsel-restore-home-');
    const vault = makeTempDir('counsel-restore-vault-');
    makeVault(vault);

    // Older, complete backup: manifest present, count matches (2 files).
    makeHandBuiltBackup(
      home,
      '2026-01-01-000000',
      { 'config.md': markedConfig, 'matters/good.md': 'from complete backup\n' },
      2,
    );
    // Newer directory that looks like an interrupted backup: config.md
    // made it, matters/ did not, no manifest. Before the fix this was the
    // auto-picked restore candidate.
    const partial = makeHandBuiltBackup(
      home,
      '2026-01-02-000000',
      { 'config.md': markedConfig },
      null,
    );
    const future = new Date(Date.now() + 60_000);
    fs.utimesSync(partial, future, future);

    const result = runScript(restoreScript, [], home, vault);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('2026-01-01-000000');
    expect(
      fs.readFileSync(path.join(vault, 'matters', 'good.md'), 'utf8'),
    ).toBe('from complete backup\n');
  });

  test('never auto-picks a .partial staging directory', () => {
    const home = makeTempDir('counsel-restore-home-');
    const vault = makeTempDir('counsel-restore-vault-');
    makeVault(vault);

    makeHandBuiltBackup(
      home,
      '2026-01-03-000000.partial',
      { 'config.md': markedConfig, 'matters/bad.md': 'from partial\n' },
      2,
    );

    const result = runScript(restoreScript, [], home, vault);
    expect(result.status).not.toBe(0);
    expect(result.stdout + result.stderr).toContain('No backups found');
  });

  test('refuses a truncated backup (manifest count mismatch) unless confirmed', () => {
    const home = makeTempDir('counsel-restore-home-');
    const vault = makeTempDir('counsel-restore-vault-');
    makeVault(vault);
    fs.mkdirSync(path.join(vault, 'matters'));
    fs.writeFileSync(path.join(vault, 'matters', 'live.md'), 'live content\n');

    // Manifest says 5 files; only config.md is actually there.
    makeHandBuiltBackup(
      home,
      '2026-01-01-000000',
      { 'config.md': markedConfig },
      5,
    );

    const result = runScript(
      restoreScript,
      ['2026-01-01-000000'],
      home,
      vault,
      'n\n',
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('INCOMPLETE');
    expect(result.stdout).toContain('Restore cancelled');
    expect(
      fs.readFileSync(path.join(vault, 'matters', 'live.md'), 'utf8'),
    ).toBe('live content\n');
  });

  test('warns on an explicitly named manifest-less full-root backup', () => {
    const home = makeTempDir('counsel-restore-home-');
    const vault = makeTempDir('counsel-restore-vault-');
    makeVault(vault);
    fs.mkdirSync(path.join(vault, 'matters'));
    fs.writeFileSync(path.join(vault, 'matters', 'live.md'), 'live content\n');

    makeHandBuiltBackup(
      home,
      '2026-01-01-000000',
      { 'config.md': markedConfig },
      null,
    );

    const result = runScript(
      restoreScript,
      ['2026-01-01-000000'],
      home,
      vault,
      'n\n',
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('no manifest.json');
    expect(result.stdout).toContain('Restore cancelled');
    expect(
      fs.readFileSync(path.join(vault, 'matters', 'live.md'), 'utf8'),
    ).toBe('live content\n');
  });
});
