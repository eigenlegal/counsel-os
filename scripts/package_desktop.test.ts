import { expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { packageOptions, packageDesktop } from './package_desktop';
test('local packaging accepts only explicit build/output options and never installs or publishes', () => {
  expect(packageOptions(['--help']).help).toBe(true);
  for(const args of [['--app'],['--install'],['--publish'],['--sign','identity'],['--app','/a','--app','/b']]) expect(()=>packageOptions(args)).toThrow();
});
test('packaging refuses an existing output before reading an app or creating artifacts', async () => {
  const root=mkdtempSync(join(tmpdir(),'counsel-package-options-'));
  try{await expect(packageDesktop(['--outdir',root])).rejects.toThrow('never replaced');}finally{rmSync(root,{recursive:true,force:true});}
});
