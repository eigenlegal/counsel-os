import { describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { buildManifest, renderEmbeddedModule, renderManifestModule } from './generate';
import { MANIFEST } from './manifest';
import { repoContentSource } from './repo';
import { contentSourceFor, isShippedPath } from './source';

const REPO = resolve(import.meta.dir, '../../..');

describe('isShippedPath', () => {
  test('only plain paths under a shipped root', () => {
    expect(isShippedPath('knowledge/law/corporate/governance.md')).toBe(true);
    expect(isShippedPath('primitives/draft.md')).toBe(true);
    expect(isShippedPath('skills/counsel/SKILL.md')).toBe(true);
    expect(isShippedPath('skills/setup/SKILL.md')).toBe(false);
    expect(isShippedPath('scripts/release.sh')).toBe(false);
    expect(isShippedPath('/etc/passwd')).toBe(false);
    expect(isShippedPath('knowledge/law/../../package.json')).toBe(false);
    expect(isShippedPath('knowledge\\law\\x.md')).toBe(false);
    // Maintainer docs under a root are not content a vault receives.
    expect(isShippedPath('knowledge/law/FRONTMATTER.md')).toBe(false);
    expect(isShippedPath('knowledge/law/frontmatter-policy.json')).toBe(false);
  });
});

describe('repoContentSource over the checkout', () => {
  const source = repoContentSource(REPO);

  test('lists the shipped counts the setup skill promises', () => {
    expect(source.list('knowledge/law')).toHaveLength(196);
    expect(source.list('knowledge/law').some(p => p.endsWith('FRONTMATTER.md'))).toBe(false);
    expect(source.list('knowledge/practice-seed/standards')).toHaveLength(25);
    expect(source.list('knowledge/practice-seed/methods')).toHaveLength(36);
    expect(source.list('knowledge/practice-seed/library')).toHaveLength(22);
    expect(source.list('knowledge/practice-seed/reference')).toEqual(['knowledge/practice-seed/reference/_index.md']);
    expect(source.list('knowledge/practice-seed')).toContain('knowledge/practice-seed/profile.md');
    expect(source.list('templates/memory')).toEqual(['templates/memory/patterns.md']);
    expect(source.list('primitives').length).toBeGreaterThanOrEqual(6);
    expect(source.list('skills/counsel')).toContain('skills/counsel/SKILL.md');
    expect(source.list('skills/demo/assets')).toEqual(['skills/demo/assets/sample-mutual-nda.docx', 'skills/demo/assets/sample-mutual-nda.md']);
    expect(source.readBytes('skills/demo/assets/sample-mutual-nda.docx').subarray(0, 2)).toEqual(new Uint8Array([0x50, 0x4b]));
  });

  test('a prefix outside the roots lists nothing', () => {
    expect(source.list('scripts')).toEqual([]);
    expect(source.list('knowledge/law/no-such-area')).toEqual([]);
  });

  test('reads, refuses, and reports presence', () => {
    expect(source.read('skills/counsel/SKILL.md').startsWith('---')).toBe(true);
    expect(source.has('primitives/draft.md')).toBe(true);
    expect(source.has('primitives/nope.md')).toBe(false);
    expect(source.has('../package.json')).toBe(false);
    expect(() => source.read('package.json')).toThrow('not shipped content');
  });

  test('an injected reader is the only thing that touches disk for reads', () => {
    const seen: string[] = [];
    const fake = repoContentSource(REPO, { readFile: p => (seen.push(p), 'FAKE') });
    expect(fake.read('primitives/draft.md')).toBe('FAKE');
    expect(seen).toEqual([join(REPO, 'primitives', 'draft.md')]);
  });
});

describe('the generated manifest', () => {
  test('matches a fresh generation — regenerate with `bun run content:manifest` after a content change', () => {
    const fresh = buildManifest(REPO);
    expect(MANIFEST).toEqual(fresh);
  });

  test('records every shipped file and every recorded group', () => {
    expect(Object.keys(MANIFEST.files)).toHaveLength(repoContentSource(REPO).list('knowledge').length + repoContentSource(REPO).list('templates').length + repoContentSource(REPO).list('primitives').length + repoContentSource(REPO).list('skills').length);
    expect(Object.keys(MANIFEST.groups).length).toBeGreaterThanOrEqual(30);
    expect(MANIFEST.groups['law/corporate']!.contentVersion).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('renders a module that round-trips', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'content-gen-'));
    // A generate.ts stand-in so the rendered module's type import resolves.
    writeFileSync(join(dir, 'generate.ts'), 'export interface ContentManifest { version: string; files: Record<string, { hash: string }>; groups: Record<string, { contentVersion: string; hash: string }> }\n');
    const small = { version: '0.0.0', files: { 'primitives/draft.md': { hash: 'abc' } }, groups: { 'law/x': { contentVersion: '2026-01-01', hash: 'def' } } };
    writeFileSync(join(dir, 'manifest.ts'), renderManifestModule(small));
    const mod = (await import(join(dir, 'manifest.ts'))) as { MANIFEST: typeof small };
    expect(mod.MANIFEST).toEqual(small);
  });

  test('the embedded module is a seam, not a source, until the binary build wires it', () => {
    const text = renderEmbeddedModule(['primitives/draft.md', 'knowledge/law/corporate/governance.md']);
    expect(text).toContain("import f0 from '../../../primitives/draft.md' with { type: 'file' };");
    expect(text).toContain('export function embeddedContentSource');
    expect(() => contentSourceFor({ compiled: true, pluginRoot: REPO, repo: repoContentSource })).toThrow('not wired');
    expect(contentSourceFor({ compiled: false, pluginRoot: REPO, repo: repoContentSource }).kind).toBe('repo');
  });
});

describe('repoContentSource over a partial tree', () => {
  test('a tree without templates or primitives lists what it has and nothing more', () => {
    const root = mkdtempSync(join(tmpdir(), 'content-partial-'));
    mkdirSync(join(root, 'skills', 'counsel'), { recursive: true });
    writeFileSync(join(root, 'skills', 'counsel', 'SKILL.md'), '---\nname: counsel\n---\nBODY\n');
    const source = repoContentSource(root);
    expect(source.list('skills/counsel')).toEqual(['skills/counsel/SKILL.md']);
    expect(source.list('primitives')).toEqual([]);
    expect(source.list('knowledge/law')).toEqual([]);
  });
});
