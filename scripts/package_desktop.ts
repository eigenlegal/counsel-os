#!/usr/bin/env bun
/** A local-test disk image. No installation, publication or updater registration. */
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { buildDesktop } from './build_desktop';
import { sourceFingerprint } from './workspace-release-check';

export function packageOptions(args: string[]) {
  let app: string | undefined, output: string | undefined, help = false;
  const seen = new Set<string>();
  for (let i=0;i<args.length;i++) {
    const flag=args[i]!; if (seen.has(flag)) throw new Error(`Repeated option: ${flag}`); seen.add(flag);
    if (flag==='--help') help=true;
    else if (['--app','--outdir'].includes(flag) && args[i+1] && !args[i+1]!.startsWith('--')) {
      const value=resolve(args[++i]!); if(flag==='--app') app=value; else output=value;
    } else throw new Error(`Unknown or incomplete option: ${flag}`);
  }
  return {app,output,help};
}
export async function packageDesktop(args: string[]) {
  const opts=packageOptions(args);
  if(opts.help) { console.log('bun run desktop:package [--app /current/build/Counsel.app] [--outdir /new/folder]\nCreates a local-test DMG, checksums and build receipt. Not notarized, published, installed or auto-updatable.'); return null; }
  if(process.platform!=='darwin') throw new Error('The desktop disk image currently builds on macOS only.');
  if(opts.output && existsSync(opts.output)) throw new Error('Choose a new output directory. Existing outputs are never replaced.');
  const repo=resolve(import.meta.dir,'..'), app=opts.app ?? await buildDesktop([]);
  if(!app) throw new Error('Desktop app was not built.');
  const build=JSON.parse(readFileSync(join(dirname(app),'desktop-build.json'),'utf8'));
  if(build.source?.sha256!==(await sourceFingerprint(repo)).sha256) throw new Error('The desktop app does not match this source checkout. Rebuild before packaging.');
  const sha=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
  if(build.engineSha256!==sha(join(app,'Contents/MacOS/counsel-workspace')) || build.shellSha256!==sha(join(app,'Contents/MacOS/Counsel')))
    throw new Error('The desktop app differs from its build receipt.');
  const run=async(argv:string[])=>{const child=Bun.spawn(argv,{stdin:'ignore',stdout:'inherit',stderr:'inherit'});if(await child.exited)throw new Error(`Packaging step failed: ${argv[0]}`);};
  await run(['/usr/bin/codesign','--verify','--deep','--strict',app]);
  const output=opts.output ?? mkdtempSync(join(tmpdir(),'counsel-desktop-package-')); if(opts.output)mkdirSync(output,{mode:0o700});
  const stage=mkdtempSync(join(tmpdir(),'counsel-disk-image-'));
  await run(['/usr/bin/ditto',app,join(stage,'Counsel.app')]); symlinkSync('/Applications',join(stage,'Applications'));
  writeFileSync(join(stage,'Read me.txt'),'Counsel — local test build\n\nDrag Counsel to Applications to install, then open it. Installation is manual.\nThis development build has only an ad-hoc signature, not Developer ID notarization.\nIt is not ready for public distribution. macOS may refuse downloaded copies.\n\nYour workspace lives outside the app in ~/.counsel/workspaces/personal.\nReplacing the app does not remove your workspace. Back it up before testing updates.\nChoose your own AI connection in setup. Provider CLIs are installed and signed in separately.\nThis image contains no personal workspace, provider credentials, or private documents.\nNo automatic update service is connected.\n',{flag:'wx',mode:0o600});
  const image=join(output,`Counsel-local-test-${process.arch}.dmg`);
  await run(['/usr/bin/hdiutil','create','-volname','Counsel — Local test','-srcfolder',stage,'-format','UDZO','-fs','HFS+',image]);
  await run(['/usr/bin/hdiutil','verify',image]);
  copyFileSync(join(dirname(app),'desktop-build.json'),join(output,'desktop-build.json'));
  writeFileSync(join(output,'package.json'),JSON.stringify({format:1,application:'Counsel desktop',channel:'local-test',artifact:image.split('/').at(-1),sha256:sha(image),source:build.source,
    desktopRelease:build.desktopRelease,
    signing:'ad-hoc only',notarized:false,published:false,installed:false,updates:false,limitations:['Developer ID signing/notarization and a signed update channel are required before public distribution.','Full third-party notice review and clean-machine/manual native-panel qualification remain release gates.']},null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(`Verified local-test disk image: ${image}\nNot installed, notarized, or published.`); return image;
}
if(import.meta.main)packageDesktop(process.argv.slice(2)).catch(e=>{console.error(e instanceof Error?e.message:String(e));process.exitCode=1;});
