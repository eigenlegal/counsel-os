#!/usr/bin/env bun
/** Native local .app only. Never installs, signs with a developer identity,
 * notarizes, registers an updater, or opens an existing user workspace. */
import { createHash } from 'node:crypto';
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { buildWorkspace } from './build_workspace';
import { sourceFingerprint } from './workspace-release-check';
import { desktopPlist, readDesktopRelease } from './desktop_release';
import { desktopReleaseTag } from '../desktop/version';

export function desktopOptions(args: string[]) {
  let output: string | undefined, engine: string | undefined, help = false;
  const seen = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const flag = args[i]!; if (seen.has(flag)) throw new Error(`Repeated option: ${flag}`); seen.add(flag);
    if (flag === '--help') help = true;
    else if (['--outdir', '--engine-dir'].includes(flag) && args[i + 1] && !args[i + 1]!.startsWith('--')) {
      const value = resolve(args[++i]!); if (flag === '--outdir') output = value; else engine = value;
    } else throw new Error(`Unknown or incomplete option: ${flag}`);
  }
  return { output, engine, help };
}
export function verifyEngine(folder: string) {
  const manifest = JSON.parse(readFileSync(join(folder, 'manifest.json'), 'utf8'));
  const bytes = readFileSync(join(folder, 'counsel-workspace'));
  if (manifest.application !== 'Counsel workspace' || manifest.build?.target !== `bun-darwin-${process.arch}` ||
      manifest.executable?.sha256 !== createHash('sha256').update(bytes).digest('hex') || typeof manifest.build?.id !== 'string')
    throw new Error('Engine manifest/hash/architecture does not match this local macOS build.');
  return manifest;
}
export async function buildDesktop(args: string[]) {
  const opts = desktopOptions(args);
  if (opts.help) { console.log('bun run desktop:build [--outdir /new/folder] [--engine-dir /verified/engine/package]\nBuilds a local ad-hoc .app, not a signed/notarized release or installer. Default output is a new private temporary folder.'); return null }
  if (opts.output && existsSync(opts.output)) throw new Error('Choose a new output directory; existing builds are never overwritten.');
  if (process.platform !== 'darwin') throw new Error('The native shell currently builds on macOS only.');
  const repo = resolve(import.meta.dir, '..'), sourceBefore = await sourceFingerprint(repo);
  const release = readDesktopRelease(repo);
  const engineFolder = opts.engine ?? await buildWorkspace([]); if (!engineFolder) throw new Error('Engine not built.');
  const engine = verifyEngine(engineFolder);
  if (engine.source?.sha256 !== sourceBefore.sha256) throw new Error('Engine source differs from this checkout. Rebuild it before wrapping it.');
  const output = opts.output ?? mkdtempSync(join(tmpdir(), 'counsel-desktop-build-'));
  if (opts.output) mkdirSync(output, { mode: 0o700 }); chmodSync(output, 0o700);
  const app = join(output, 'Counsel OS.app'), macOS = join(app, 'Contents/MacOS'), resources = join(app, 'Contents/Resources');
  mkdirSync(macOS, { recursive: true }); mkdirSync(resources);
  copyFileSync(join(engineFolder, 'counsel-workspace'), join(macOS, 'counsel-workspace'));
  copyFileSync(join(engineFolder, 'manifest.json'), join(resources, 'engine-manifest.json'));
  for (const file of ['LICENSE', 'PDFJS-LICENSE', 'README.txt', 'THIRD-PARTY-NOTICES.txt', 'dependency-inventory.json']) copyFileSync(join(engineFolder, file), join(resources, file));
  writeFileSync(join(app, 'Contents/Info.plist'), desktopPlist(readFileSync(join(repo, 'desktop/macos/Info.plist'), 'utf8'), release), { flag: 'wx' });
  const command = async (argv: string[]) => {
    const child = Bun.spawn(argv, { cwd: repo, stdin: 'ignore', stdout: 'inherit', stderr: 'inherit' });
    if (await child.exited) throw new Error(`Desktop build step failed: ${argv[0]}`);
  };
  await command(['/usr/bin/xcrun', 'swiftc', '-swift-version', '5', '-O', '-target', `${process.arch === 'arm64' ? 'arm64' : 'x86_64'}-apple-macosx13.0`,
    'desktop/macos/EngineProcess.swift', 'desktop/macos/DesktopActions.swift', 'desktop/macos/WorkspaceWindow.swift', 'desktop/macos/main.swift', '-o', join(macOS, 'Counsel')]);
  const iconBuilder = join(output, 'icon-builder');
  await command(['/usr/bin/xcrun', 'swiftc', '-parse-as-library', 'desktop/macos/BuildIcon.swift', '-o', iconBuilder]);
  await command([iconBuilder, join(output, 'Counsel.iconset')]);
  await command(['/usr/bin/iconutil', '-c', 'icns', join(output, 'Counsel.iconset'), '-o', join(resources, 'Counsel.icns')]);
  chmodSync(join(macOS, 'Counsel'), 0o755); chmodSync(join(macOS, 'counsel-workspace'), 0o755);
  await command(['/usr/bin/plutil', '-lint', join(app, 'Contents/Info.plist')]);
  // Bun's embedded asset payload needs its final executable signature renewed
  // before sealing the enclosing bundle. Preserve the pre-signing identity.
  await command(['/usr/bin/codesign', '--force', '--sign', '-', join(macOS, 'counsel-workspace')]);
  const signedEngineHash = createHash('sha256').update(readFileSync(join(macOS, 'counsel-workspace'))).digest('hex');
  writeFileSync(join(resources, 'engine-manifest.json'), JSON.stringify({ ...engine,
    executable: { ...engine.executable, bytes: statSync(join(macOS, 'counsel-workspace')).size, sha256: signedEngineHash }, originalExecutableSha256: engine.executable.sha256,
    packagingSignature: 'local-ad-hoc' }, null, 2) + '\n', { mode: 0o600 });
  await command(['/usr/bin/codesign', '--force', '--sign', '-', app]);
  await command(['/usr/bin/codesign', '--verify', '--deep', '--strict', app]);
  const sourceAfter = await sourceFingerprint(repo);
  if (sourceAfter.sha256 !== sourceBefore.sha256) throw new Error('Source changed during the desktop build. Rebuild before qualification.');
  writeFileSync(join(output, 'desktop-build.json'), JSON.stringify({ format: 1, application: 'Counsel desktop', channel: 'local-unreleased',
    desktopRelease: release, releaseTag: desktopReleaseTag(release),
    builtAt: new Date().toISOString(), source: sourceAfter, engineBuild: engine.build,
    engineSha256: signedEngineHash, originalEngineSha256: engine.executable.sha256,
    shellSha256: createHash('sha256').update(readFileSync(join(macOS, 'Counsel'))).digest('hex'),
    signing: 'Local ad-hoc signature only. Not a Developer ID signature or notarization.',
    limitations: ['Local-test image only; signing, a trusted update channel and manual clean-machine acceptance remain release gates.', 'Chat and working-preference drafts recover locally; other unsaved forms still need saving before quit.',
      'First-run setup reuses existing connections; provider CLI installation/authentication remain external.', 'macOS only; deployment target is not a claim of tested OS-version coverage.'] }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(`Local desktop app: ${app}\nNot installed or opened. Local ad-hoc signature only; not notarized.`);
  return app;
}
if (import.meta.main) buildDesktop(process.argv.slice(2)).catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
