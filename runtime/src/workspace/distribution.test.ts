import { expect, test } from 'bun:test';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseWorkerInvocation, workspaceWorkerCommand } from './distribution';
import { pdfResourceKey, readPdfResource } from './pdf-resources';

test('packaged workers use only fixed dispatch modes; checkout commands remain supported', () => {
  const runtime = { executable: '/test/engine', packaged: true, sourceDirectory: '/test/source' };
  expect(workspaceWorkerCommand('extract', ['pdf'], runtime)).toEqual(['/test/engine', '--internal-worker', 'extract', 'pdf']);
  for (const kind of ['redline', 'rounds', 'clean', 'backup'] as const)
    expect(workspaceWorkerCommand(kind, [], runtime)).toEqual(['/test/engine', '--internal-worker', kind]);
  expect(workspaceWorkerCommand('backup', [], { ...runtime, packaged: false })).toEqual(['/test/engine', '/test/source/backup-worker.ts']);
  expect(workspaceWorkerCommand('extract', ['docx'], { ...runtime, packaged: false })).toEqual(['/test/engine', '/test/source/file-worker.ts', 'docx']);
  expect(() => workspaceWorkerCommand('backup', ['--demo'], runtime)).toThrow();
});
test('unknown, prototype, mixed and incomplete worker invocations fail rather than launch the app', () => {
  expect(parseWorkerInvocation(['--demo'])).toBeNull();
  expect(parseWorkerInvocation(['--internal-worker', 'extract', 'docx'])).toEqual({ kind: 'extract', args: ['docx'] });
  for (const args of [[], ['toString'], ['__proto__'], ['constructor'], ['unknown'], ['extract'], ['extract', 'txt'], ['extract', 'pdf', '--demo'], ['backup', '/tmp/input'], ['redline', '--database', 'test']])
    expect(() => parseWorkerInvocation(['--internal-worker', ...args])).toThrow();
});
test('PDF resource access is allowlisted and current bundled resources work in development', async () => {
  expect(pdfResourceKey('cMapUrl', 'Adobe-Japan1-UCS2.bcmap')).toBe('cmaps/Adobe-Japan1-UCS2.bcmap');
  for (const [kind, name] of [['file', 'secret.txt'], ['cMapUrl', '../secret'], ['standardFontDataUrl', '/tmp/a.pfb'], ['cMapUrl', 'a/b.bcmap'], ['cMapUrl', 'x\\y.bcmap']])
    expect(() => pdfResourceKey(kind!, name!)).toThrow();
  expect((await readPdfResource('cMapUrl', 'Adobe-Japan1-UCS2.bcmap')).length).toBeGreaterThan(100);
  expect((await readPdfResource('standardFontDataUrl', 'FoxitSerif.pfb')).length).toBeGreaterThan(100);
});
test('worker-only version/invalid entrypoints do not create default workspaces or load global side effects', async () => {
  const root = mkdtempSync(join(tmpdir(), 'counsel-worker-entry-'));
  try {
    const env = { HOME: root, PATH: '/usr/bin:/bin' };
    for (const args of [['--version'], ['--internal-worker', 'unknown'], ['--internal-worker', 'extract'], ['--internal-worker', 'backup', '--demo']]) {
      const proc = Bun.spawn([process.execPath, join(import.meta.dir, 'entry.ts'), ...args], { cwd: root, env, stdout: 'pipe', stderr: 'pipe' });
      const [out, err, exit] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
      expect(exit === 0).toBe(args[0] === '--version');
      expect(out + err).not.toContain('Open:'); expect(readdirSync(root)).toEqual([]);
    }
    const fetchBefore = globalThis.fetch, logBefore = console.log;
    await import('./file-worker'); await import('./redline-worker'); await import('./document-rounds-worker'); await import('./clean-proposal-worker'); await import('./backup-worker');
    expect(globalThis.fetch).toBe(fetchBefore); expect(console.log).toBe(logBefore); expect(readdirSync(root)).toEqual([]);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
