import { describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertFreePort, boundedLog, directoryFingerprint, fingerprintFiles, options, packagedUiIdentity, receiptPassed, REQUIRED_CHECKS, runCommand, sanitize, type Receipt } from './workspace-release-check';
import { createHash } from 'node:crypto';

describe('local release qualification', () => {
  test('packaged UI checks exact delivered names and bytes without accepting omitted or changed assets', () => {
    const root=mkdtempSync(join(tmpdir(),'counsel-packaged-ui-'));
    try {
      writeFileSync(join(root,'workspace.html'),'synthetic'); writeFileSync(join(root,'index.html'),'legacy'); writeFileSync(join(root,'source.map'),'debug');
      const entries=[{name:'workspace.html',sha256:createHash('sha256').update('synthetic').digest('hex')}];
      const result=packagedUiIdentity(root,entries); expect(result.fresh).toEqual(result.delivered);
      expect(()=>packagedUiIdentity(root,[])).toThrow(); expect(()=>packagedUiIdentity(root,[...entries,...entries])).toThrow();
      writeFileSync(join(root,'workspace.html'),'changed'); expect(()=>packagedUiIdentity(root,entries)).toThrow();
    } finally {rmSync(root,{recursive:true,force:true});}
  });
  test('execution and native Word are opt-in; no live provider or arbitrary target flags', () => {
    expect(options([])).toEqual({ run: false, python: 'python3', nativeWord: false });
    expect(options(['--help']).run).toBe(false);
    expect(options(['--run', '--python', '/test/python', '--native-word'])).toEqual({ run: true, python: '/test/python', nativeWord: true });
    for (const args of [['--run', '--plan'], ['--run', '--run'], ['--native-word'], ['--python'], ['--live'], ['--database', '/test/data']])
      expect(() => options(args)).toThrow();
  });
  test('logs remove capability URLs, authorization and common credential shapes', () => {
    const log = sanitize('Open: http://localhost/#token=synthetic-login\nAuthorization: Bearer synthetic-bearer\n{"access_token":"synthetic-access", "apiKey":"synthetic-key"}\nANTHROPIC_API_KEY=synthetic-env\nsecret: synthetic-secret');
    for (const value of ['synthetic-login', 'synthetic-bearer', 'synthetic-access', 'synthetic-key', 'synthetic-env', 'synthetic-secret']) expect(log).not.toContain(value);
    expect(log).toContain('[redacted]');
    expect(boundedLog('x'.repeat(300_000) + '\nPASS')).toEndWith('PASS');
    expect(boundedLog('x'.repeat(300_000)).length).toBeLessThan(120_100);
  });
  test('fingerprints include exact names/content and reject symlinks and escapes', () => {
    const root = mkdtempSync(join(tmpdir(), 'counsel-release-fingerprint-'));
    try {
      writeFileSync(join(root, 'a'), 'one'); writeFileSync(join(root, 'b'), 'two');
      const first = fingerprintFiles(root, ['a', 'b']);
      expect(fingerprintFiles(root, ['b', 'a', 'a'])).toEqual(first);
      writeFileSync(join(root, 'a'), 'changed');
      expect(fingerprintFiles(root, ['a', 'b']).sha256).not.toBe(first.sha256);
      expect(directoryFingerprint(root).files).toBe(2);
      writeFileSync(join(root, 'debug.js.map'), 'output-relative paths');
      expect(directoryFingerprint(root).files).toBe(3);
      expect(directoryFingerprint(root, true)).toEqual(fingerprintFiles(root, ['a', 'b']));
      expect(() => fingerprintFiles(root, ['../outside'])).toThrow();
      symlinkSync(join(root, 'a'), join(root, 'link'));
      expect(() => directoryFingerprint(root)).toThrow();
      mkdirSync(join(root, 'folder')); writeFileSync(join(root, 'folder', 'file'), 'private');
      symlinkSync(join(root, 'folder'), join(root, 'linked-folder'));
      expect(() => fingerprintFiles(root, ['linked-folder/file'])).toThrow();
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
  test('a local pass requires every check, a stable source, and matching tested/launcher assets', () => {
    const receipt: Receipt = { format: 1, status: 'running', startedAt: 'test', scope: 'synthetic', runtime: { bun: 'test', arch: 'test', platform: 'test' },
      sourceBefore: { sha256: 'source', files: 3 }, sourceAfter: { sha256: 'source', files: 3 },
      build: { sha256: 'temporary build with relative maps', files: 3 }, launcherBuild: { sha256: 'launcher build with relative maps', files: 3 },
      runtimeAssets: { sha256: 'runtime', files: 2 }, launcherRuntimeAssets: { sha256: 'runtime', files: 2 },
      checks: REQUIRED_CHECKS.map(id => ({ id, status: 'passed', exitCode: 0, durationMs: 1 })), limitations: ['Not live qualification'] };
    expect(receiptPassed(receipt)).toBe(true);
    expect(receiptPassed({ ...receipt, checks: receipt.checks.slice(1) })).toBe(false);
    expect(receiptPassed({ ...receipt, error: 'interrupted' })).toBe(false);
    expect(receiptPassed({ ...receipt, sourceAfter: { sha256: 'other', files: 3 } })).toBe(false);
    expect(receiptPassed({ ...receipt, launcherRuntimeAssets: { sha256: 'stale', files: 2 } })).toBe(false);
    expect(receiptPassed({ ...receipt, checks: [...receipt.checks, { id: 'native', status: 'failed', exitCode: 1, durationMs: 2 }] })).toBe(false);
  });
  test('occupied fixture ports fail without stopping their owner', async () => {
    const server = createServer();
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address() as { port: number };
    try { await expect(assertFreePort(address.port)).rejects.toThrow('occupied'); expect(server.listening).toBe(true); }
    finally { await new Promise<void>(resolve => server.close(() => resolve())); }
    await expect(assertFreePort(address.port)).resolves.toBeUndefined();
  });
  test('records failures, missing executables and bounded output without losing exit status', async () => {
    const base = { id: 'synthetic', cwd: process.cwd(), timeoutMs: 5000 };
    const passed = await runCommand({ ...base, argv: [process.execPath, '-e', 'console.log("x".repeat(300000)); console.log("Bearer synthetic-secret");'] });
    expect(passed.status).toBe('passed'); expect(passed.log.length).toBeLessThan(120_100); expect(passed.log).not.toContain('synthetic-secret');
    const failed = await runCommand({ ...base, argv: [process.execPath, '-e', 'console.error("expected failure"); process.exit(7)'] });
    expect(failed.status).toBe('failed'); expect(failed.exitCode).toBe(7); expect(failed.log).toContain('expected failure');
    expect((await runCommand({ ...base, argv: ['/no-such-counsel-qualification-command'] })).status).toBe('failed');
  });
  test('cancels before spawn, and times out only its owned child process group', async () => {
    const root = mkdtempSync(join(tmpdir(), 'counsel-release-timeout-'));
    try {
      const canary = join(root, 'must-not-exist');
      const controller = new AbortController(); controller.abort();
      const command = { id: 'never-started', argv: [process.execPath, '-e', `require('fs').writeFileSync(${JSON.stringify(canary)}, 'bad')`], cwd: root, timeoutMs: 1000 };
      expect((await runCommand(command, controller.signal)).status).toBe('cancelled');
      expect(existsSync(canary)).toBe(false);
      const pidFile = join(root, 'child.pid');
      // Grandchild ignores TERM; KILL must clean the group after the grace time.
      const grandchild = `process.on('SIGTERM',()=>{}); setInterval(()=>{},100)`;
      const parent = `const {spawn}=require('child_process'); const c=spawn(process.execPath,['-e',${JSON.stringify(grandchild)}],{stdio:'inherit'}); require('fs').writeFileSync(${JSON.stringify(pidFile)}, String(c.pid)); setInterval(()=>{},100);`;
      const result = await runCommand({ id: 'timeout', argv: [process.execPath, '-e', parent], cwd: root, timeoutMs: 700 });
      expect(result.status).toBe('timed-out');
      const pid = Number(readFileSync(pidFile, 'utf8'));
      expect(() => process.kill(pid, 0)).toThrow();
    } finally { rmSync(root, { recursive: true, force: true }); }
  }, 8000);
  test('cancellation during execution is not reported as a pass', async () => {
    const controller = new AbortController();
    const running = runCommand({ id: 'cancel-running', argv: [process.execPath, '-e', 'console.log("ready"); setInterval(()=>{},100)'],
      cwd: process.cwd(), timeoutMs: 5000 }, controller.signal, chunk => { if (chunk.includes('ready')) controller.abort(); });
    expect((await running).status).toBe('cancelled');
  });
});
