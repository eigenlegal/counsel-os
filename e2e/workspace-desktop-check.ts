/** Native WebKit/lifecycle checks; only newly generated workspaces are opened. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { sourceFingerprint } from '../scripts/workspace-release-check';

assert.equal(process.platform, 'darwin'); assert.equal(process.argv.length, 3, 'Pass one newly built Counsel.app path.');
const app = resolve(process.argv[2]!), repo = resolve(import.meta.dir, '..');
const build = JSON.parse(readFileSync(join(dirname(app), 'desktop-build.json'), 'utf8'));
const sha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
assert.equal(build.shellSha256, sha(join(app, 'Contents/MacOS/Counsel')));
assert.equal(build.engineSha256, sha(join(app, 'Contents/MacOS/counsel-workspace')));
assert.equal(build.source.sha256, (await sourceFingerprint(repo)).sha256, 'Build must match tested source.');
const root = realpathSync(mkdtempSync(join(tmpdir(), 'counsel-native-qualification-'))); chmodSync(root, 0o700);
const qa = join(root, 'NativeSmoke');
const compile = Bun.spawn(['/usr/bin/xcrun', 'swiftc', '-swift-version', '5', '-target', `${process.arch === 'arm64' ? 'arm64' : 'x86_64'}-apple-macosx13.0`,
  'desktop/macos/EngineProcess.swift', 'desktop/macos/WorkspaceWindow.swift', 'desktop/macos/Smoke.swift', '-o', qa], { cwd: repo, stdout: 'pipe', stderr: 'pipe' });
const errors = await new Response(compile.stderr).text(); assert.equal(await compile.exited, 0, errors);
const profile = `(version 1)(allow default)(deny file-read* (subpath ${JSON.stringify(realpathSync(repo))}))`;
console.log(`Native synthetic qualification: ${root}`);
const workspace = join(root, 'workspace'), crash = join(root, 'crash'); for (const path of [workspace, crash]) mkdirSync(path, { mode: 0o700 });
const command = (folder: string, extra: string[] = []) => ['/usr/bin/sandbox-exec', '-p', profile, qa, app, folder, ...extra];
const child = Bun.spawn(command(workspace), { cwd: root, env: { HOME: root, PATH: '', TMPDIR: root }, stdout: 'pipe', stderr: 'pipe' });
const timeout = setTimeout(() => child.kill('SIGKILL'), 120_000);
try {
  const [out, err, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  // WK diagnostics can be noisy. Preserve them privately, not in task output.
  writeFileSync(join(root, 'native-diagnostics.txt'), err.slice(-40_000), { mode: 0o600 });
  assert.equal(code, 0, err.match(/FAIL native desktop:[^\n]*/)?.[0] ?? 'Native test failed; inspect private diagnostics.');
  assert.ok(out.includes('PASS native desktop')); console.log('PASS native window, guarded navigation, upload/download delegates and reopen');
} finally { clearTimeout(timeout); if (child.exitCode === null) child.kill('SIGKILL'); await child.exited; }
const lease = Bun.spawn(command(crash, ['--crash-fixture']), { cwd: root, env: { HOME: root, PATH: '', TMPDIR: root }, stdout: 'ignore', stderr: 'ignore' });
try {
  const ready = join(crash, 'lease-ready.json');
  for (let i = 0; i < 200 && !existsSync(ready); i++) { assert.equal(lease.exitCode, null); await Bun.sleep(100); }
  assert.ok(existsSync(ready), 'Crash fixture did not start');
  const engine = JSON.parse(readFileSync(ready, 'utf8'));
  lease.kill('SIGKILL'); await lease.exited;
  let stopped = false;
  for (let i = 0; i < 100; i++) {
    try { process.kill(engine.pid, 0); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ESRCH') { stopped = true; break; } throw error; }
    await Bun.sleep(100);
  }
  assert.ok(stopped, 'Owned engine must stop after abrupt parent death');
  await assert.rejects(fetch(engine.origin + '/api/workspace'));
  console.log('PASS abrupt shell death closes its engine; existing servers untouched');
} finally { if (lease.exitCode === null) lease.kill('SIGKILL'); await lease.exited; }
writeFileSync(join(root, 'result.json'), JSON.stringify({ status: 'passed', build, repositoryReadsDenied: true, nativeWindow: true, parentCrash: true, liveModelCalls: 0 }, null, 2), { mode: 0o600 });
console.log(`PASS desktop qualification: ${root}`);
