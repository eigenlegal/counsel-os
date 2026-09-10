import { expect, test } from 'bun:test';
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildOptions, buildWorkspace, regularFiles, renderWorkspaceEmbed } from './build_workspace';

test('packaging options refuse unknown/missing flags and never overwrite an output folder', async () => {
  expect(buildOptions(['--help']).help).toBe(true);
  for (const args of [['--database', '/somewhere'], ['--outdir'], ['--target', 'win32'], ['--target', 'bun-darwin-arm64', '--target', 'bun-linux-x64']])
    expect(() => buildOptions(args)).toThrow();
  const root = mkdtempSync(join(tmpdir(), 'counsel-build-options-'));
  try { await expect(buildWorkspace(['--outdir', root])).rejects.toThrow('never overwritten'); }
  finally { rmSync(root, { recursive: true, force: true }); }
});
test('embed generation uses exact escaped assets and the current entry, never the legacy CLI', () => {
  const result = renderWorkspaceEmbed([{ key: 'workspace.html', path: '/test/a space/workspace.html' }],
    [{ key: 'cmaps/test.bcmap', path: '/test/quoted"asset.bcmap' }], { id: 'test' }, '/test/distribution.ts', '/test/workspace/entry.ts');
  expect(result).toContain('with { type: \'file\' }');
  expect(result).toContain('"cmaps/test.bcmap": asset1');
  expect(result).toContain('await import("/test/workspace/entry.ts")');
  expect(result).toContain('quoted\\"asset');
  expect(result).not.toContain("../cli");
});
test('asset enumeration refuses symlinks', () => {
  const root = mkdtempSync(join(tmpdir(), 'counsel-build-input-'));
  try {
    writeFileSync(join(root, 'asset'), 'synthetic'); expect(regularFiles(root)).toEqual([join(root, 'asset')]);
    symlinkSync(join(root, 'asset'), join(root, 'link')); expect(() => regularFiles(root)).toThrow('symlink');
  } finally { rmSync(root, { recursive: true, force: true }); }
});
