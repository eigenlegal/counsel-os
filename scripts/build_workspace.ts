#!/usr/bin/env bun
/** Local, unsigned current-workspace distribution. Does not alter the legacy
 * CLI/plugin build, live UI assets, installed app or any existing workspace. */
import { createHash, randomUUID } from 'node:crypto';
import { chmodSync, copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { sourceFingerprint } from './workspace-release-check';
import { createDesktopNotices } from './desktop_notices';

export function buildOptions(args: string[]) {
  let output: string | undefined, target = `bun-${process.platform}-${process.arch}`, help = false;
  const seen = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const flag = args[i]!;
    if (seen.has(flag)) throw new Error(`Repeated option: ${flag}`);
    seen.add(flag);
    if (flag === '--help') help = true;
    else if ((flag === '--outdir' || flag === '--target') && args[i + 1] && !args[i + 1]!.startsWith('--')) {
      const value = args[++i]!;
      if (flag === '--outdir') output = resolve(value); else target = value;
    } else throw new Error(`Unknown or incomplete option: ${flag}`);
  }
  if (!/^bun-(darwin|linux)-(arm64|x64)$/.test(target)) throw new Error('This build supports POSIX targets only; cross-built outputs still require target-machine qualification.');
  return { output, target, help };
}

export function regularFiles(root: string): string[] {
  const result: string[] = [];
  function visit(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Build input contains a symlink: ${full}`);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile()) result.push(full);
      else throw new Error('Build inputs must be regular files.');
    }
  }
  visit(root); return result;
}

export function renderWorkspaceEmbed(ui: Array<{ key: string; path: string }>, pdf: Array<{ key: string; path: string }>,
  build: object, distributionModule: string, entryModule: string): string {
  const files = [...ui, ...pdf];
  const imports = files.map((file, i) => `import asset${i} from ${JSON.stringify(file.path)} with { type: 'file' };`).join('\n');
  const entries = (values: typeof files, offset: number) => values.map((file, i) => `${JSON.stringify(file.key)}: asset${i + offset}`).join(',\n');
  return `// Generated workspace build entry. Contains only explicit UI/PDF resources, never user data.
import { registerWorkspaceDistribution } from ${JSON.stringify(distributionModule)};
${imports}
registerWorkspaceDistribution({ ui: { kind: 'embedded', files: { ${entries(ui, 0)} } },
 pdfResources: { ${entries(pdf, ui.length)} }, build: ${JSON.stringify(build)} });
try { await (await import(${JSON.stringify(entryModule)})).workspaceEntry(); }
catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
`;
}

async function command(argv: string[], cwd: string): Promise<void> {
  const child = Bun.spawn(argv, { cwd, stdin: 'ignore', stdout: 'inherit', stderr: 'inherit' });
  if (await child.exited) throw new Error(`Build step failed: ${argv[1] ?? argv[0]}`);
}

export async function buildWorkspace(args: string[]): Promise<string | null> {
  const opts = buildOptions(args);
  if (opts.help) {
    console.log('bun run workspace:build [--outdir /new/output/folder] [--target bun-darwin-arm64]\nBuilds a local unsigned current-workspace executable, embedded UI/PDF resources and manifest. Default output is a new temporary folder. Existing outputs/live assets are never overwritten. Provider CLIs are not bundled.');
    return null;
  }
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const sourceBefore = await sourceFingerprint(repo);
  const output = opts.output ?? mkdtempSync(join(tmpdir(), 'counsel-workspace-package-'));
  if (opts.output) {
    if (existsSync(output)) throw new Error('Choose a new output folder; existing builds are never overwritten.');
    mkdirSync(output, { recursive: false, mode: 0o700 });
  }
  chmodSync(output, 0o700);
  // Keep generated files outside both the repository and the delivered folder.
  const stage = mkdtempSync(join(tmpdir(), 'counsel-workspace-build-')); chmodSync(stage, 0o700);
  console.log(`Local package: ${output}\nBuild staging: ${stage}`);
  const build = { id: randomUUID(), sourceVersion: JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8')).version as string,
    builtAt: new Date().toISOString(), target: opts.target, bun: Bun.version };
  const uiRoot = join(stage, 'ui');
  await command([process.execPath, join(repo, 'runtime/ui/node_modules/vite/bin/vite.js'), 'build', '--outDir', uiRoot], join(repo, 'runtime/ui'));
  const uiInputs = JSON.parse(readFileSync(join(uiRoot, 'bundled-modules.json'), 'utf8')) as string[];
  const ui = regularFiles(uiRoot).filter(path => !path.endsWith('.map') && !['index.html', 'bundled-modules.json'].includes(relative(uiRoot, path)))
    .map(path => ({ key: relative(uiRoot, path).split('\\').join('/'), path }));
  if (!ui.some(file => file.key === 'workspace.html')) throw new Error('Current workspace UI missing.');
  const pdfRoot = realpathSync(dirname(fileURLToPath(import.meta.resolve('pdfjs-dist/package.json'))));
  const pdf = ['cmaps', 'standard_fonts'].flatMap(folder => regularFiles(join(pdfRoot, folder)))
    .map(path => ({ key: relative(pdfRoot, path).split('\\').join('/'), path }));
  if (!pdf.some(file => file.key.endsWith('.bcmap')) || !pdf.some(file => /\.(pfb|ttf)$/.test(file.key))) throw new Error('Required PDF resources are missing.');
  const entry = join(stage, 'entry.ts');
  writeFileSync(entry, renderWorkspaceEmbed(ui, pdf, build,
    join(repo, 'runtime/src/workspace/distribution.ts'), join(repo, 'runtime/src/workspace/entry.ts')), { flag: 'wx', mode: 0o600 });
  const executable = join(output, 'counsel-workspace');
  await command([process.execPath, 'build', '--compile', `--target=${opts.target}`, '--env=disable',
    '--no-compile-autoload-dotenv', '--no-compile-autoload-bunfig', '--no-compile-autoload-tsconfig', '--no-compile-autoload-package-json',
    entry, '--outfile', executable, `--metafile=${join(stage, 'engine-inputs.json')}`], repo);
  chmodSync(executable, 0o700);
  const inputs = Object.keys(JSON.parse(readFileSync(join(stage, 'engine-inputs.json'), 'utf8')).inputs);
  const notices = createDesktopNotices(repo, output, inputs, uiInputs, pdfRoot);
  const sourceAfter = await sourceFingerprint(repo);
  if (sourceBefore.sha256 !== sourceAfter.sha256) throw new Error('Source changed during compilation. This output is unqualified; build again in a new folder.');
  const sha256 = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
  const manifest = { format: 1, application: 'Counsel workspace', channel: 'local-unreleased', build,
    executable: { name: 'counsel-workspace', bytes: lstatSync(executable).size, sha256: sha256(executable) },
    embeddedUI: ui.map(file => ({ name: file.key, sha256: sha256(file.path) })),
    embeddedPdfResources: pdf.map(file => ({ name: file.key, sha256: sha256(file.path) })),
    source: sourceAfter, notices,
    lockfiles: ['bun.lock', 'runtime/ui/bun.lock'].map(name => ({ name, sha256: sha256(join(repo, name)) })),
    externalConnections: ['Installed and separately authenticated Codex or Claude CLI, or an explicitly configured API connection.'],
    limitations: ['Unsigned local build; not notarized, a desktop shell or an installer.', 'No live-provider or target-platform qualification inferred from compilation.',
      'Complete third-party distribution notices/signing/update review remain release work. No private workspace is included.'] };
  writeFileSync(join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  copyFileSync(join(repo, 'LICENSE'), join(output, 'LICENSE'));
  copyFileSync(join(pdfRoot, 'LICENSE'), join(output, 'PDFJS-LICENSE'));
  writeFileSync(join(output, 'README.txt'), `Counsel workspace — local unsigned build\n\nLaunch: ./counsel-workspace\nHelp: ./counsel-workspace --help\nBuild identity: ./counsel-workspace --version\n\nNo source checkout, Bun, Node or Python is needed for the core workspace.\nYour selected AI connection is configured separately; provider CLIs are not bundled.\nNo workspace or legal files are included. Default personal/example workspaces use\nthe existing ~/.counsel/workspaces locations, outside this package. Use --database\nwith a new explicit path for testing. Do not open an in-use workspace.\n\nThis is not a signed/notarized desktop installer. See manifest.json limitations.\n`, { flag: 'wx', mode: 0o600 });
  console.log(`Built ${executable} (${(manifest.executable.bytes / 1024 / 1024).toFixed(1)} MB)\nSHA-256 ${manifest.executable.sha256}\nLocal unsigned build only; qualify outside the checkout before use.`);
  return output;
}
if (import.meta.main) buildWorkspace(process.argv.slice(2)).catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
