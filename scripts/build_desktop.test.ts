import { expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { desktopOptions, verifyEngine, buildDesktop } from './build_desktop';

test('desktop build options cannot install, publish or overwrite an existing output', async () => {
  expect(desktopOptions(['--help']).help).toBe(true);
  for (const args of [['--outdir'], ['--install'], ['--sign', 'Developer ID'], ['--outdir', '/x', '--outdir', '/y']]) expect(() => desktopOptions(args)).toThrow();
  const root = mkdtempSync(join(tmpdir(), 'counsel-desktop-build-test-'));
  try { await expect(buildDesktop(['--outdir', root])).rejects.toThrow(); }
  finally { rmSync(root, { recursive: true, force: true }); }
});
test('desktop wrapping rejects changed or unrecognized engines', () => {
  const root = mkdtempSync(join(tmpdir(), 'counsel-engine-hash-'));
  try {
    writeFileSync(join(root, 'counsel-workspace'), 'synthetic');
    writeFileSync(join(root, 'manifest.json'), JSON.stringify({ application: 'Counsel workspace', build: { id: 'fixture', target: `bun-darwin-${process.arch}` }, executable: { sha256: 'wrong' } }));
    expect(() => verifyEngine(root)).toThrow('manifest/hash/architecture');
  } finally { rmSync(root, { recursive: true, force: true }); }
});
