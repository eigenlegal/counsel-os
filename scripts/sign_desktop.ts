/** Produces a signed TEST artifact, never publishes or installs. Requires the
 * owner's checked-in identity confirmation and separately provisioned credentials. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { z } from 'zod';
import { verifyDesktopNotices } from './desktop_notices';
import { sourceFingerprint } from './workspace-release-check';

export const ReleaseIdentity = z.object({ confirmed: z.literal(true), publisher: z.string().min(1).max(160), teamId: z.string().regex(/^[A-Z0-9]{10}$/), bundleId: z.string().regex(/^[a-zA-Z][a-zA-Z0-9-]*(?:\.[a-zA-Z0-9-]+){2,}$/) }).strict();
export function signingOptions(args: string[]) {
  if (args.length === 1 && args[0] === '--help') return null;
  const values: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]!;
    if (!['--app', '--outdir', '--identity', '--notary-profile'].includes(key) || values[key] || !args[i + 1] || args[i + 1]!.startsWith('--')) throw new Error('Use --app, --outdir, --identity and --notary-profile exactly once.');
    values[key] = args[i + 1]!;
  }
  if (Object.keys(values).length !== 4) throw new Error('Signing requires explicit input/output, Developer ID identity and notary keychain profile.');
  return { app: resolve(values['--app']!), output: resolve(values['--outdir']!), identity: values['--identity']!, profile: values['--notary-profile']! };
}
export function validateSigningIdentity(raw: unknown, certificate: string) {
  const identity = ReleaseIdentity.parse(raw);
  if (identity.bundleId.endsWith('.local') || certificate !== `Developer ID Application: ${identity.publisher} (${identity.teamId})`) throw new Error('The signing certificate must match the owner-confirmed release identity.');
  return identity;
}
export async function signDesktop(args: string[]) {
  const opts = signingOptions(args);
  if (!opts) { console.log('bun scripts/sign_desktop.ts --app /verified/Counsel.app --outdir /new/folder --identity "Developer ID Application: Publisher (TEAMID)" --notary-profile profile\nRequires owner-confirmed desktop/release-identity.json and a provisioned keychain. Produces an unpublished signed test DMG.'); return; }
  const repo = resolve(import.meta.dir, '..');
  const identity = validateSigningIdentity(JSON.parse(readFileSync(join(repo, 'desktop/release-identity.json'), 'utf8')), opts.identity);
  if (process.platform !== 'darwin' || process.arch !== 'arm64') throw new Error('Signing qualification currently requires Apple silicon macOS.');
  if (existsSync(opts.output)) throw new Error('Choose a new output folder. Signing never modifies the input app.');
  const source = await sourceFingerprint(repo), receipt = JSON.parse(readFileSync(join(dirname(opts.app), 'desktop-build.json'), 'utf8'));
  const sha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
  if (receipt.source?.sha256 !== source.sha256 || receipt.engineSha256 !== sha(join(opts.app, 'Contents/MacOS/counsel-workspace')) || receipt.shellSha256 !== sha(join(opts.app, 'Contents/MacOS/Counsel'))) throw new Error('The input app does not match this checkout and build receipt.');
  const notices = verifyDesktopNotices(join(opts.app, 'Contents/Resources'));
  const run = async (command: string[], capture = false) => {
    const child = Bun.spawn(command, { stdin: 'ignore', stdout: capture ? 'pipe' : 'ignore', stderr: 'ignore' });
    const result = capture ? await new Response(child.stdout).text() : '';
    if (await child.exited) throw new Error(`Signing step failed: ${command[0]}. Inspect the protected runner; no credentials or raw signing output were logged.`);
    return result;
  };
  await run(['/usr/bin/codesign', '--verify', '--deep', '--strict', opts.app]);
  mkdirSync(opts.output, { mode: 0o700 });
  const app = join(opts.output, 'Counsel.app'), resources = join(app, 'Contents/Resources'), engine = join(app, 'Contents/MacOS/counsel-workspace');
  await run(['/usr/bin/ditto', opts.app, app]);
  await run(['/usr/bin/plutil', '-replace', 'CFBundleIdentifier', '-string', identity.bundleId, join(app, 'Contents/Info.plist')]);
  await run(['/usr/bin/plutil', '-replace', 'NSHumanReadableCopyright', '-string', identity.publisher, join(app, 'Contents/Info.plist')]);
  await run(['/usr/bin/codesign', '--force', '--options', 'runtime', '--timestamp', '--sign', opts.identity, '--identifier', `${identity.bundleId}.engine`, '--entitlements', join(repo, 'desktop/macos/engine-entitlements.plist'), engine]);
  const manifest = JSON.parse(readFileSync(join(resources, 'engine-manifest.json'), 'utf8'));
  writeFileSync(join(resources, 'engine-manifest.json'), JSON.stringify({ ...manifest, executable: { ...manifest.executable, bytes: statSync(engine).size, sha256: sha(engine) }, packagingSignature: 'Developer ID test' }, null, 2));
  await run(['/usr/bin/codesign', '--force', '--options', 'runtime', '--timestamp', '--sign', opts.identity, '--entitlements', join(repo, 'desktop/macos/shell-entitlements.plist'), app]);
  await run(['/usr/bin/codesign', '--verify', '--deep', '--strict', '-R', `anchor apple generic and certificate leaf[subject.OU] = "${identity.teamId}" and identifier "${identity.bundleId}"`, app]);
  const zip = join(opts.output, 'notarization.zip');
  await run(['/usr/bin/ditto', '-c', '-k', '--keepParent', app, zip]);
  const notarize = async (path: string) => {
    const result = JSON.parse(await run(['/usr/bin/xcrun', 'notarytool', 'submit', path, '--keychain-profile', opts.profile, '--wait', '--timeout', '30m', '--output-format', 'json'], true));
    if (result.status !== 'Accepted') throw new Error('Apple did not accept the notarization. No release was created.');
    const log = JSON.parse(await run(['/usr/bin/xcrun', 'notarytool', 'log', result.id, '--keychain-profile', opts.profile], true));
    if (log.status !== 'Accepted' || (log.issues?.length ?? 0) > 0) throw new Error('Notarization reported issues. Review the private Apple log before qualification.');
    await run(['/usr/bin/xcrun', 'stapler', 'staple', path]); await run(['/usr/bin/xcrun', 'stapler', 'validate', path]); return result.id as string;
  };
  const result = JSON.parse(await run(['/usr/bin/xcrun', 'notarytool', 'submit', zip, '--keychain-profile', opts.profile, '--wait', '--timeout', '30m', '--output-format', 'json'], true));
  if (result.status !== 'Accepted') throw new Error('Apple did not accept app notarization. No release was created.');
  const appLog = JSON.parse(await run(['/usr/bin/xcrun', 'notarytool', 'log', result.id, '--keychain-profile', opts.profile], true));
  if (appLog.status !== 'Accepted' || (appLog.issues?.length ?? 0) > 0) throw new Error('App notarization reported issues. Review the private Apple log before qualification.');
  await run(['/usr/bin/xcrun', 'stapler', 'staple', app]); await run(['/usr/bin/xcrun', 'stapler', 'validate', app]);
  await run(['/usr/sbin/spctl', '--assess', '--type', 'execute', app]);
  writeFileSync(join(opts.output, 'desktop-build.json'), JSON.stringify({ ...receipt, engineSha256: sha(engine), shellSha256: sha(join(app, 'Contents/MacOS/Counsel')), signing: 'Developer ID signed test; public release not approved.', identity }, null, 2), { flag: 'wx', mode: 0o600 });
  const stage = mkdtempSync(join(tmpdir(), 'counsel-signed-image-'));
  await run(['/usr/bin/ditto', app, join(stage, 'Counsel.app')]); symlinkSync('/Applications', join(stage, 'Applications'));
  writeFileSync(join(stage, 'Read me.txt'), 'Counsel — signed test build. Not approved for public distribution.\nSave a workspace backup, quit Counsel, then drag the app into Applications.\nWorkspace data is outside the app. A newer database must not be opened by an older app.\n');
  const image = join(opts.output, 'Counsel-signed-test-arm64.dmg');
  await run(['/usr/bin/hdiutil', 'create', '-srcfolder', stage, '-volname', 'Counsel', '-format', 'UDZO', image]);
  await run(['/usr/bin/codesign', '--sign', opts.identity, '--timestamp', image]);
  const notaryId = await notarize(image);
  await run(['/usr/bin/hdiutil', 'verify', image]);
  if ((await sourceFingerprint(repo)).sha256 !== source.sha256) throw new Error('Source changed during signing. Rebuild before qualification.');
  writeFileSync(join(opts.output, 'signed-test.json'), JSON.stringify({ format: 1, identity, source, desktopRelease: receipt.desktopRelease, artifact: 'Counsel-signed-test-arm64.dmg', sha256: sha(image), notaryId,
    engineSha256: sha(engine), shellSha256: sha(join(app, 'Contents/MacOS/Counsel')), published: false, publicDistributionApproved: false, remaining: [...notices.reviewRequired, 'Clean-machine acceptance of this exact signed image', 'Owner-approved update channel and public promotion'] }, null, 2));
  console.log('Signed test image verified. Not installed or published; public release gates remain closed.');
}
if (import.meta.main) signDesktop(process.argv.slice(2)).catch(e => { console.error(e instanceof Error ? e.message : 'Signing failed'); process.exitCode = 1; });
