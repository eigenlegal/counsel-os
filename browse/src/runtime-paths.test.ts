import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  browsePort,
  ensureRuntimeDir,
  instanceSuffix,
  logFilePath,
  runtimeDir,
  stateFilePath,
  writeFileExclusive,
} from './runtime-paths';

describe('runtime paths', () => {
  test('default runtime dir is per-user under ~/.counsel-os, not /tmp', () => {
    const dir = runtimeDir({});
    expect(dir).toBe(path.join(os.homedir(), '.counsel-os', 'browse'));
    expect(dir.startsWith('/tmp')).toBe(false);
  });

  test('BROWSE_RUNTIME_DIR overrides the runtime dir for state and logs', () => {
    const env = { BROWSE_RUNTIME_DIR: '/custom/run' };
    expect(stateFilePath(env)).toBe('/custom/run/browse-server.json');
    expect(logFilePath('console', env)).toBe('/custom/run/browse-console.log');
  });

  test('BROWSE_STATE_FILE still overrides the state file path directly', () => {
    expect(stateFilePath({ BROWSE_STATE_FILE: '/elsewhere/state.json' })).toBe('/elsewhere/state.json');
  });

  test('instance suffix follows BROWSE_PORT and CONDUCTOR_PORT', () => {
    expect(instanceSuffix({})).toBe('');
    expect(instanceSuffix({ BROWSE_PORT: '9401' })).toBe('-9401');
    expect(browsePort({ CONDUCTOR_PORT: '55040' })).toBe(9440);
    expect(stateFilePath({ BROWSE_RUNTIME_DIR: '/r', BROWSE_PORT: '9401' })).toBe('/r/browse-server-9401.json');
    expect(logFilePath('network', { BROWSE_RUNTIME_DIR: '/r', BROWSE_PORT: '9401' })).toBe('/r/browse-network-9401.log');
  });
});

describe('runtime dir + state file permissions', () => {
  let base: string;

  beforeEach(() => {
    base = fs.mkdtempSync(path.join(os.tmpdir(), 'browse-rt-test-'));
  });

  afterEach(() => {
    fs.rmSync(base, { recursive: true, force: true });
  });

  test('ensureRuntimeDir creates the dir owner-only (0700)', () => {
    const dir = path.join(base, 'fresh');
    ensureRuntimeDir({ BROWSE_RUNTIME_DIR: dir });
    expect((fs.statSync(dir).mode & 0o777)).toBe(0o700);
  });

  test('ensureRuntimeDir re-tightens a pre-existing loosened dir', () => {
    const dir = path.join(base, 'loose');
    fs.mkdirSync(dir, { mode: 0o755 });
    ensureRuntimeDir({ BROWSE_RUNTIME_DIR: dir });
    expect((fs.statSync(dir).mode & 0o777)).toBe(0o700);
  });

  test('writeFileExclusive creates a fresh 0600 file', () => {
    const file = path.join(base, 'state.json');
    writeFileExclusive(file, '{"token":"s3cret"}');
    expect((fs.statSync(file).mode & 0o777)).toBe(0o600);
    expect(fs.readFileSync(file, 'utf-8')).toBe('{"token":"s3cret"}');
  });

  test('writeFileExclusive never truncates into a pre-created file (mode stays ours)', () => {
    // Attacker pre-creates a world-readable file at the predictable path,
    // hoping the daemon O_TRUNCs the token into it.
    const file = path.join(base, 'state.json');
    fs.writeFileSync(file, 'attacker-owned', { mode: 0o644 });

    writeFileExclusive(file, '{"token":"s3cret"}');

    expect((fs.statSync(file).mode & 0o777)).toBe(0o600);
    expect(fs.readFileSync(file, 'utf-8')).toBe('{"token":"s3cret"}');
  });

  test('writeFileExclusive does not write through a planted symlink', () => {
    const victim = path.join(base, 'victim.txt');
    fs.writeFileSync(victim, 'victim-content');
    const file = path.join(base, 'state.json');
    fs.symlinkSync(victim, file);

    writeFileExclusive(file, '{"token":"s3cret"}');

    // Symlink was replaced by a real file; the target was never touched.
    expect(fs.lstatSync(file).isSymbolicLink()).toBe(false);
    expect(fs.readFileSync(file, 'utf-8')).toBe('{"token":"s3cret"}');
    expect(fs.readFileSync(victim, 'utf-8')).toBe('victim-content');
  });
});
