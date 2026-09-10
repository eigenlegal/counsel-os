/** Repeatable, synthetic-only local qualification. A passing local gate is NOT
 * a signed release, live-account qualification, or a document quality verdict. */
import { spawn, type ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { arch, platform, tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { locateCli } from '../runtime/src/providers/cli-locate';

export interface Options { run: boolean; python: string; nativeWord: boolean; desktopApp?: string }
export function options(args: string[]): Options {
  const result: Options = { run: false, python: 'python3', nativeWord: false };
  const seen = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (seen.has(arg)) throw new Error(`Repeated option: ${arg}`);
    seen.add(arg);
    if (arg === '--run') result.run = true;
    else if (arg === '--native-word') result.nativeWord = true;
    else if (arg === '--python' && args[i + 1] && !args[i + 1]!.startsWith('--')) result.python = args[++i]!;
    else if (arg === '--desktop-app' && args[i + 1] && !args[i + 1]!.startsWith('--')) result.desktopApp = resolve(args[++i]!);
    else if (arg !== '--plan' && arg !== '--help') throw new Error(`Unknown or incomplete option: ${arg}`);
  }
  if (result.run && (seen.has('--plan') || seen.has('--help'))) throw new Error('Choose --run or --plan/--help, not both.');
  if (result.nativeWord && !result.run) throw new Error('--native-word requires --run.');
  return result;
}

const LOG_LIMIT = 120_000;
// Defense in depth. The runner never dumps its environment or credentials.
export function sanitize(value: string): string {
  return value.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
    .replace(/\bBearer\s+[^\s"',;]+/gi, 'Bearer [redacted]')
    .replace(/([#?&](?:token|access_token|key)=)[^\s&#"']+/gi, '$1[redacted]')
    .replace(/(["']?\b[\w-]{0,64}(?:token|secret|api[_-]?key|password)["']?\s*[:=]\s*["']?)[^\s,"'}]+/gi, '$1[redacted]')
    .replace(/\bsk-[a-zA-Z0-9_-]{12,}/g, '[redacted]');
}
export function boundedLog(value: string): string {
  const clean = sanitize(value);
  return clean.length <= LOG_LIMIT ? clean : '[earlier output omitted]\n' + clean.slice(-LOG_LIMIT);
}

export interface Command { id: string; argv: string[]; cwd: string; timeoutMs: number; env?: NodeJS.ProcessEnv }
export interface Result { id: string; status: 'passed' | 'failed' | 'timed-out' | 'cancelled'; exitCode: number | null; durationMs: number; log: string }

function signalGroup(child: ChildProcess, signal: NodeJS.Signals): void {
  if (!child.pid) return;
  try { process.kill(process.platform === 'win32' ? child.pid : -child.pid, signal); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error; }
}

/** Own process group: timeout/cancel may stop this check's descendants, never
 * an existing app, port owner, Word instance or unrelated CLI. */
export function runCommand(command: Command, signal?: AbortSignal, onOutput?: (text: string) => void): Promise<Result> {
  if (signal?.aborted) return Promise.resolve({ id: command.id, status: 'cancelled', exitCode: null, durationMs: 0, log: '' });
  return new Promise(resolveResult => {
    const start = Date.now();
    let output = '', reason: 'timed-out' | 'cancelled' | undefined, killTimer: ReturnType<typeof setTimeout> | undefined;
    const child = spawn(command.argv[0]!, command.argv.slice(1), {
      cwd: command.cwd, env: command.env ?? process.env, stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32',
    });
    const add = (chunk: string) => { output = (output + chunk).slice(-(LOG_LIMIT * 2)); onOutput?.(chunk); };
    child.stdout!.setEncoding('utf8').on('data', add);
    child.stderr!.setEncoding('utf8').on('data', add);
    const stop = (why: typeof reason) => {
      if (reason) return;
      reason = why;
      signalGroup(child, 'SIGTERM');
      killTimer = setTimeout(() => signalGroup(child, 'SIGKILL'), 1500);
    };
    const abort = () => stop('cancelled');
    const timer = setTimeout(() => stop('timed-out'), command.timeoutMs);
    signal?.addEventListener('abort', abort, { once: true });
    child.on('error', error => add(`\n${error.message}`));
    child.on('close', code => {
      clearTimeout(timer); if (killTimer) clearTimeout(killTimer);
      signal?.removeEventListener('abort', abort);
      // The direct child can exit before a descendant closes its inherited
      // pipes. On normal completion also reap any remaining owned descendants.
      signalGroup(child, 'SIGKILL');
      resolveResult({ id: command.id, status: reason ?? (code === 0 ? 'passed' : 'failed'), exitCode: code,
        durationMs: Date.now() - start, log: boundedLog(output) });
    });
  });
}

export interface Fingerprint { sha256: string; files: number }
export function fingerprintFiles(root: string, paths: string[]): Fingerprint {
  const hash = createHash('sha256');
  const sorted = [...new Set(paths)].sort();
  for (const name of sorted) {
    const path = resolve(root, name), rel = relative(root, path);
    if (rel.startsWith('..') || resolve(path) === resolve(root)) throw new Error('Fingerprint path must be inside its root.');
    // Refuse symlinks at every level: a test receipt must not hash outside data.
    let cursor = path;
    while (cursor !== resolve(root)) {
      if (lstatSync(cursor).isSymbolicLink()) throw new Error(`Symlink in qualification inputs: ${name}`);
      cursor = dirname(cursor);
    }
    const bytes = readFileSync(path);
    hash.update(JSON.stringify([name, bytes.length])); hash.update('\0'); hash.update(bytes); hash.update('\0');
  }
  return { sha256: hash.digest('hex'), files: sorted.length };
}
export function directoryFingerprint(root: string, runtimeAssetsOnly = false): Fingerprint {
  const paths: string[] = [];
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error('Build contains a symlink.');
      if (entry.isDirectory()) visit(path);
      else if (!runtimeAssetsOnly || !entry.name.endsWith('.map')) paths.push(relative(root, path));
    }
  };
  visit(root);
  if (!paths.length) throw new Error('Build is empty.');
  return fingerprintFiles(root, paths);
}

export function packagedUiIdentity(root: string, embedded: Array<{name:string;sha256:string}>) {
  const files: string[] = [];
  const visit = (dir:string) => { for (const item of readdirSync(dir,{withFileTypes:true})) {
    if(item.isSymbolicLink()) throw new Error('UI build contains a symlink.');
    const path=join(dir,item.name); if(item.isDirectory()) visit(path);
    else if(!item.name.endsWith('.map') && relative(root,path)!=='index.html') files.push(relative(root,path));
  }}; visit(root);
  const identity=(items:Array<{name:string;sha256:string}>):Fingerprint => ({files:items.length,sha256:createHash('sha256').update(JSON.stringify([...items].sort((a,b)=>a.name.localeCompare(b.name)))).digest('hex')});
  const fresh=files.map(name=>({name,sha256:createHash('sha256').update(readFileSync(join(root,name))).digest('hex')}));
  const expected=identity(fresh), delivered=identity(embedded);
  if(expected.sha256!==delivered.sha256) throw new Error('Packaged UI differs from the fresh source build. Rebuild the desktop app.');
  return {fresh:expected,delivered};
}

export async function sourceFingerprint(repo: string): Promise<Fingerprint> {
  // Include untracked task work as well as committed files, excluding generated
  // builds, screenshots, node_modules and private vault data via .gitignore.
  const child = Bun.spawn(['git', 'ls-files', '-co', '--exclude-standard', '-z', '--',
    'runtime/src', 'runtime/ui/src', 'runtime/ui/*.html', 'runtime/ui/*.json', 'runtime/ui/bun.lock', 'runtime/ui/vite.config.ts',
    'runtime/tsconfig.json', 'desktop', 'scripts', 'e2e/*.ts', 'e2e/*.py', 'e2e/fixtures', 'package.json', 'bun.lock', '.gitignore'], { cwd: repo, stdout: 'pipe', stderr: 'pipe' });
  const [out, error, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  if (code) throw new Error(`Cannot fingerprint source: ${sanitize(error)}`);
  const paths = out.split('\0').filter(Boolean).filter(path => existsSync(join(repo, path)));
  if (!paths.length) throw new Error('No qualification source files found.');
  return fingerprintFiles(repo, paths);
}

export async function assertFreePort(port: number): Promise<void> {
  await new Promise<void>((resolvePort, reject) => {
    const server = createServer();
    server.once('error', () => reject(new Error(`Test port ${port} is occupied; no existing process was stopped.`)));
    server.listen(port, '127.0.0.1', () => server.close(error => error ? reject(error) : resolvePort()));
  });
}

export interface Receipt {
  format: 1; startedAt: string; completedAt?: string; status: 'running' | 'passed' | 'failed' | 'cancelled';
  scope: string; runtime: { bun: string; platform: string; arch: string };
  sourceBefore?: Fingerprint; sourceAfter?: Fingerprint; build?: Fingerprint; launcherBuild?: Fingerprint;
  runtimeAssets?: Fingerprint; launcherRuntimeAssets?: Fingerprint;
  launcherMode?: 'source' | 'desktop-package'; liveBuildBefore?: Fingerprint; liveBuildAfter?: Fingerprint;
  checks: (Omit<Result, 'log'> & { argv?: string[]; cwd?: string })[]; limitations: string[]; error?: string;
}
export const REQUIRED_CHECKS = ['codex-version', 'claude-version', 'python-playwright', 'runtime-types', 'ui-types',
  'release-runner-tests', 'backend-tests', 'ui-tests', 'isolated-ui-build', 'synthetic-workflows', 'codex-transport',
  'codex-no-tools', 'claude-transport', 'launcher-restart', 'browser-documents', 'browser-import-preferences', 'browser-recall', 'word-package',
  'codex-version-after', 'claude-version-after'];
export function receiptPassed(receipt: Receipt): boolean {
  return REQUIRED_CHECKS.every(id => receipt.checks.some(check => check.id === id))
    && receipt.checks.every(check => check.status === 'passed') && !receipt.error
    && !!receipt.sourceBefore && receipt.sourceBefore.sha256 === receipt.sourceAfter?.sha256
    && !!receipt.build && !!receipt.launcherBuild && !!receipt.runtimeAssets
    && receipt.runtimeAssets.sha256 === receipt.launcherRuntimeAssets?.sha256;
}

export async function qualify(opts: Options, repo: string): Promise<string> {
  if (!opts.run) throw new Error('Execution requires --run.');
  if (process.platform === 'win32') throw new Error('This local runner requires POSIX process-group cleanup; Windows qualification is not implemented.');
  if (opts.nativeWord && process.platform !== 'darwin') throw new Error('--native-word requires Microsoft Word for macOS.');
  const root = mkdtempSync(join(tmpdir(), 'counsel-release-check-')); chmodSync(root, 0o700);
  const receipt: Receipt = { format: 1, startedAt: new Date().toISOString(), status: 'running',
    scope: 'Local source/build, synthetic workflows and installed-CLI transport checks only; no live model calls.',
    runtime: { bun: Bun.version, platform: platform(), arch: arch() }, checks: [], limitations: [
      'No live subscription/API model inference, real token renewal or logout qualification. CLI catalogs do not establish model entitlement.',
      'Claude subscription account metadata isolation remains an open upstream limitation; a fake Messages endpoint does not test it.',
      'Document package/round-trip success is not visual approval. Inspect all native PDFs and validate the retained OOXML independently.',
      'Synthetic corpus only: broader legal/source coverage, complex documents and arbitrary real migrations remain unqualified.',
      'No installer, signing/notarization, clean-machine onboarding, update/rollback or other-platform qualification.',
      'Dependency lockfiles are fingerprinted, but installed dependencies are not certified; use a clean frozen-lockfile environment for release.',
    ] };
  const controller = new AbortController();
  const cancel = () => controller.abort();
  process.once('SIGINT', cancel); process.once('SIGTERM', cancel);
  const persist = () => {
    writeFileSync(join(root, 'report.json.tmp'), JSON.stringify(receipt, null, 2) + '\n', { mode: 0o600 });
    renameSync(join(root, 'report.json.tmp'), join(root, 'report.json'));
  };
  const save = (result: Result, argv: string[], cwd: string) => {
    const { log, ...check } = result;
    writeFileSync(join(root, `${result.id}.log`), log, { mode: 0o600 });
    receipt.checks.push({ ...check, argv: argv.map(sanitize), cwd: relative(repo, cwd) || '.' }); persist();
    console.log(`${result.status.toUpperCase()} ${result.id} (${(result.durationMs / 1000).toFixed(1)}s)`);
  };
  const run = async (id: string, argv: string[], timeoutMs = 120_000, cwd = repo, env?: NodeJS.ProcessEnv) => {
    console.log(`CHECK ${id}`);
    const result = await runCommand({ id, argv, cwd, timeoutMs, env }, controller.signal);
    save(result, argv, cwd);
    if (result.status !== 'passed') throw new Error(`${id}: ${result.status}; see ${id}.log`);
    return result;
  };
  const bun = process.execPath;
  try {
    persist(); console.log(`Private qualification report: ${join(root, 'report.json')}`);
    receipt.sourceBefore = await sourceFingerprint(repo); persist();
    // Preflight before expensive work. No --version invocation receives a
    // prompt, and the actual transport probes use their own synthetic homes.
    const cliVersions = new Map<string, { path: string; version: string }>();
    for (const name of ['codex', 'claude'] as const) {
      const path = locateCli(name);
      if (!path) throw new Error(`Install ${name} to qualify its transport; a missing check is not a pass.`);
      const version = await run(`${name}-version`, [path, '--version'], 15_000);
      cliVersions.set(name, { path, version: version.log });
    }
    await run('python-playwright', [opts.python, '-c', 'import sys; from importlib.metadata import version; from playwright.sync_api import sync_playwright\nprint(sys.version); print("playwright", version("playwright"))\nwith sync_playwright() as p:\n b = p.chromium.launch(headless=True); print("chromium", b.version); b.close()'], 30_000);
    for (const port of [7459, 7460, 7461]) await assertFreePort(port);
    if (!opts.desktopApp && !existsSync(join(repo, 'runtime/ui/dist/workspace.html'))) throw new Error('Build the launcher UI first; this runner never overwrites a running app’s assets.');
    receipt.launcherMode = opts.desktopApp ? 'desktop-package' : 'source';
    if (existsSync(join(repo,'runtime/ui/dist'))) receipt.liveBuildBefore=directoryFingerprint(join(repo,'runtime/ui/dist'));
    await run('runtime-types', [bun, 'run', 'typecheck:runtime']);
    await run('ui-types', [bun, 'run', 'typecheck:ui']);
    await run('release-runner-tests', [bun, 'test', 'scripts/workspace-release-check.test.ts', 'scripts/build_workspace.test.ts', 'scripts/build_desktop.test.ts', 'scripts/package_desktop.test.ts']);
    await run('backend-tests', [bun, 'test', 'runtime/src/workspace', 'runtime/src/docx', 'runtime/src/providers'], 180_000);
    await run('ui-tests', [bun, 'test'], 180_000, join(repo, 'runtime/ui'));
    const build = join(root, 'ui'); mkdirSync(build);
    await run('isolated-ui-build', [bun, join(repo, 'runtime/ui/node_modules/vite/bin/vite.js'), 'build', '--outDir', build], 120_000, join(repo, 'runtime/ui'));
    receipt.build = directoryFingerprint(build);
    receipt.launcherBuild = directoryFingerprint(opts.desktopApp ?? join(repo, 'runtime/ui/dist'));
    // Vite source maps encode paths relative to outDir, so an isolated build's
    // maps differ even when all executable assets are byte-identical. Retain
    // each full fingerprint for stability; compare non-map assets across roots.
    receipt.runtimeAssets = directoryFingerprint(build, true);
    receipt.launcherRuntimeAssets = opts.desktopApp ? undefined : directoryFingerprint(join(repo, 'runtime/ui/dist'), true);
    let packagedEngine: string | undefined, uiManifest: string | undefined;
    if (opts.desktopApp) {
      const packaged=JSON.parse(readFileSync(join(opts.desktopApp,'Contents/Resources/engine-manifest.json'),'utf8'));
      const desktop=JSON.parse(readFileSync(join(dirname(opts.desktopApp),'desktop-build.json'),'utf8'));
      packagedEngine=join(opts.desktopApp,'Contents/MacOS/counsel-workspace');
      const sha=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
      if(packaged.source?.sha256!==receipt.sourceBefore?.sha256 || desktop.source?.sha256!==receipt.sourceBefore?.sha256
        || packaged.executable?.sha256!==sha(packagedEngine) || desktop.engineSha256!==sha(packagedEngine)
        || desktop.shellSha256!==sha(join(opts.desktopApp,'Contents/MacOS/Counsel'))) throw new Error('Desktop package identity differs from the tested source or receipt.');
      const identities=packagedUiIdentity(build,packaged.embeddedUI);
      receipt.runtimeAssets=identities.fresh; receipt.launcherRuntimeAssets=identities.delivered;
      uiManifest=join(root,'expected-ui.json');writeFileSync(uiManifest,JSON.stringify(packaged.embeddedUI),{mode:0o600});
    }
    persist();
    if (receipt.runtimeAssets.sha256 !== receipt.launcherRuntimeAssets?.sha256) throw new Error('Launcher runtime assets differ from the fresh build. Update them when the app is stopped, then rerun. No live assets were replaced.');
    await run('synthetic-workflows', [bun, 'runtime/src/workspace/qualification.ts', '--fixture']);
    await run('codex-transport', [bun, 'e2e/workspace-codex-preflight.ts'], 45_000);
    await run('codex-no-tools', [bun, 'e2e/workspace-codex-preflight.ts', '--no-tools'], 45_000);
    await run('claude-transport', [bun, 'e2e/workspace-claude-preflight.ts'], 45_000);
    await assertFreePort(7460);
    await run('launcher-restart', [opts.python, 'e2e/workspace-launch-smoke.py'], 90_000, repo,
      packagedEngine ? {...process.env,WORKSPACE_TEST_ENGINE:packagedEngine,WORKSPACE_TEST_UI_MANIFEST:uiManifest} : undefined);

    // Each browser suite gets a fresh synthetic server. Readiness comes from
    // that exact child, not a health request that might hit a different app.
    for (const suite of [
      { id: 'documents', args: ['--chat'], port: 7461, screenshots: ['pdf-extraction.png'] },
      { id: 'import-preferences', args: ['--empty'], port: 7459, screenshots: [1440, 390, 320].map(width => `import-preferences-${width}.png`) },
      { id: 'recall', args: ['--chat', '--recall'], port: 7461, screenshots: [1440, 390, 320].map(width => `recall-${width}.png`) },
    ]) {
      await assertFreePort(suite.port);
      const serverController = new AbortController();
      const stopServer = () => serverController.abort();
      controller.signal.addEventListener('abort', stopServer, { once: true });
      let readyResolve!: () => void;
      const ready = new Promise<void>(resolveReady => { readyResolve = resolveReady; });
      let serverOutput = '';
      const server = runCommand({ id: `${suite.id}-fixture`, argv: [bun, 'e2e/workspace-server.ts', ...suite.args], cwd: repo,
        timeoutMs: 180_000, env: { ...process.env, WORKSPACE_TEST_DIST: build } }, serverController.signal, chunk => {
        serverOutput = (serverOutput + chunk).slice(-4000);
        if (serverOutput.includes(`Synthetic workspace browser fixture on ${suite.port}`)) readyResolve();
      });
      let readinessTimer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([ready, server.then(() => { throw new Error(`${suite.id} fixture exited before/during readiness.`); }),
          new Promise<never>((_, reject) => { readinessTimer = setTimeout(() => reject(new Error(`${suite.id} fixture did not become ready.`)), 15_000); })]);
        clearTimeout(readinessTimer);
        const browserStarted = Date.now();
        await run(`browser-${suite.id}`, [opts.python, `e2e/workspace-${suite.id}-smoke.py`], 150_000);
        for (const name of suite.screenshots) {
          const path = join(repo, 'e2e/.tmp/workspace', name);
          const stat = lstatSync(path);
          if (!stat.isFile() || stat.isSymbolicLink() || stat.mtimeMs < browserStarted - 1000)
            throw new Error(`Missing fresh screenshot: ${name}`);
          copyFileSync(path, join(root, name)); chmodSync(join(root, name), 0o600);
        }
      } finally {
        clearTimeout(readinessTimer); serverController.abort();
        const result = await server;
        // Normal fixture shutdown is intentional cancellation, not a failed
        // browser check. Retain its log separately for diagnosis.
        writeFileSync(join(root, `${suite.id}-fixture.log`), result.log, { mode: 0o600 });
        controller.signal.removeEventListener('abort', stopServer);
        if (result.status !== 'cancelled' || result.exitCode !== 0)
          throw new Error(`${suite.id} fixture exited unexpectedly or required forced shutdown; see its fixture log.`);
      }
    }
    await run('word-package', [bun, 'e2e/workspace-word-roundtrip-check.ts']);
    if (opts.nativeWord) await run('word-native-roundtrip', [bun, 'e2e/workspace-word-roundtrip-check.ts', '--native'], 150_000);
    else receipt.limitations.push('Native Microsoft Word was not invoked; use --run --native-word on macOS and review every rendered page.');
    for (const [name, previous] of cliVersions) {
      if (locateCli(name as 'codex' | 'claude') !== previous.path) throw new Error(`${name} executable changed during qualification.`);
      const current = await run(`${name}-version-after`, [previous.path, '--version'], 15_000);
      if (current.log !== previous.version) throw new Error(`${name} version changed during qualification.`);
    }
    receipt.sourceAfter = await sourceFingerprint(repo);
    if (receipt.sourceBefore.sha256 !== receipt.sourceAfter.sha256) throw new Error('Source inputs changed during qualification. Rerun for one consistent build.');
    const finalBuild = directoryFingerprint(opts.desktopApp ?? join(repo, 'runtime/ui/dist'));
    if (receipt.liveBuildBefore) {
      receipt.liveBuildAfter=directoryFingerprint(join(repo,'runtime/ui/dist'));
      if(receipt.liveBuildBefore.sha256!==receipt.liveBuildAfter.sha256) throw new Error('Live browser assets changed during qualification.');
    }
    if (finalBuild.sha256 !== receipt.launcherBuild.sha256 || directoryFingerprint(build).sha256 !== receipt.build.sha256)
      throw new Error('UI assets changed during qualification. Rerun for one consistent build.');
    if (controller.signal.aborted) throw new Error('Qualification cancelled.');
    receipt.status = receiptPassed(receipt) ? 'passed' : 'failed';
  } catch (error) {
    receipt.status = controller.signal.aborted ? 'cancelled' : 'failed';
    receipt.error = sanitize(error instanceof Error ? error.message : String(error));
  } finally {
    receipt.completedAt = new Date().toISOString(); persist();
    process.removeListener('SIGINT', cancel); process.removeListener('SIGTERM', cancel);
  }
  console.log(`${receipt.status.toUpperCase()}: local qualification only. Manual/live/release gates remain in report.json.`);
  if (receipt.error) console.error(receipt.error);
  if (receipt.status !== 'passed') process.exitCode = 1;
  return join(root, 'report.json');
}

if (import.meta.main) {
  try {
    const opts = options(process.argv.slice(2));
    if (!opts.run) console.log(`Local release qualification — plan only; no checks or model calls made.
Run: bun run workspace:check --run [--python /path/to/python] [--native-word] [--desktop-app /current/build/Counsel.app]
Checks: typechecks, backend/UI/runner tests, isolated fresh build, synthetic workflows,
installed Codex/Claude local transport probes, launcher restart, document/import/recall
browser checks, and Word package checks. Native Word is a separate opt-in.
Requires: Bun/dependencies, Git checkout, built UI, Codex and Claude CLIs, Python with
Playwright/Chromium, free loopback ports 7459/7460/7461. POSIX only.
Does not overwrite the live UI, access an existing workspace or call a vendor model.
Retains a private temporary report, bounded sanitized logs and a tested build.
A pass is not live-provider, visual-document, installer or all-platform approval.`);
    else await qualify(opts, resolve(dirname(fileURLToPath(import.meta.url)), '..'));
  } catch (error) { console.error(sanitize(error instanceof Error ? error.message : String(error))); process.exitCode = 1; }
}
