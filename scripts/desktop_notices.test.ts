import { afterEach, expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { packageOwner, licenseFiles, verifyDesktopNotices } from './desktop_notices';
const roots: string[] = [];
afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })));
test('inventory finds the exact nested package and real license files, not source/test files', () => {
  const root = mkdtempSync(join(tmpdir(), 'counsel-notice-test-')); roots.push(root);
  const pkg = join(root, 'node_modules/outer/node_modules/inner'); mkdirSync(join(pkg, 'dist'), { recursive: true });
  writeFileSync(join(pkg, 'package.json'), JSON.stringify({ name: 'inner', version: '1.0.0' }));
  writeFileSync(join(pkg, 'LICENSE'), 'Synthetic notice'); writeFileSync(join(pkg, 'NOTICE.txt'), 'Synthetic attribution'); writeFileSync(join(pkg, 'README.md'), 'Not a license file');
  expect(packageOwner(join(pkg, 'dist/index.js'))).toBe(pkg);
  expect(packageOwner(join(root, 'source.ts'))).toBeNull();
  expect(licenseFiles(pkg).map(x => x.name)).toEqual(['LICENSE', 'NOTICE.txt']);
});
test('tampered or missing notice bundle blocks packaging', () => {
  const root = mkdtempSync(join(tmpdir(), 'counsel-notice-test-')); roots.push(root);
  const text = 'Synthetic notice'; writeFileSync(join(root, 'THIRD-PARTY-NOTICES.txt'), text);
  writeFileSync(join(root, 'dependency-inventory.json'), JSON.stringify({ format: 1, components: [{ name: 'fixture' }], noticesSha256: createHash('sha256').update(text).digest('hex') }));
  expect(verifyDesktopNotices(root).components).toHaveLength(1);
  writeFileSync(join(root, 'THIRD-PARTY-NOTICES.txt'), 'changed'); expect(() => verifyDesktopNotices(root)).toThrow('do not match');
});
