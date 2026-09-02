import { afterEach, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { registerEmbedded, resetEmbeddedForTests } from '../core/embedded';
import { EMBEDDED_EXTRAS, buildManifest, renderEmbeddedModule } from './generate';
import { assertShippedContent, ShippedContentError } from './guard';
import { repoContentSource } from './repo';
import { shippedContent } from './shipped';
import { contentSourceFor, SHIPPED_ROOTS, type ContentSource } from './source';

const REPO = resolve(import.meta.dir, '../../..');

afterEach(resetEmbeddedForTests);

describe('the embedded content module', () => {
  test('is generated from the manifest and reads back the same paths and text as the repo source', async () => {
    // Write the generated module INTO the repo tree (a temp file beside the
    // real generated dir) so its relative imports resolve, then import it.
    const repo = repoContentSource(REPO);
    const manifest = buildManifest(REPO, repo);
    const paths = Object.keys(manifest.files);
    expect(paths.length).toBeGreaterThan(200);
    const dir = resolve(REPO, 'runtime', 'src', 'generated');
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `content-embed.test-${process.pid}.ts`);
    writeFileSync(file, renderEmbeddedModule(paths), 'utf8');
    try {
      const mod = (await import(file)) as { content: ContentSource; extras: Record<string, string> };
      for (const root of SHIPPED_ROOTS) expect(mod.content.list(root)).toEqual(repo.list(root));
      for (const p of paths.slice(0, 20)) expect(mod.content.read(p)).toBe(repo.read(p));
      expect(mod.content.readBytes('skills/demo/assets/sample-mutual-nda.docx').length).toBe(repo.readBytes('skills/demo/assets/sample-mutual-nda.docx').length);
      for (const extra of EMBEDDED_EXTRAS) expect(mod.extras[extra]).toBeDefined();
      expect(mod.content.has('knowledge/law/frontmatter-policy.json')).toBe(false);
    } finally {
      const { rmSync } = await import('node:fs');
      rmSync(file, { force: true });
    }
  });

  test('renderEmbeddedModule emits one file import per path and one per extra', () => {
    const src = renderEmbeddedModule(['primitives/read.md'], ['knowledge/law/frontmatter-policy.json']);
    expect(src).toContain("import f0 from '../../../primitives/read.md' with { type: 'file' };");
    expect(src).toContain("import x0 from '../../../knowledge/law/frontmatter-policy.json' with { type: 'file' };");
    expect(src).toContain('export const content: ContentSource');
  });
});

describe('contentSourceFor / shippedContent', () => {
  const fake: ContentSource = { kind: 'embedded', list: () => ['primitives/read.md'], has: () => true, read: () => 'x', readBytes: () => new Uint8Array() };

  test('a checkout reads the repo; a compiled runtime reads the registry; a compiled runtime with nothing registered is a build error', () => {
    expect(contentSourceFor({ compiled: false, pluginRoot: REPO, repo: repoContentSource }).kind).toBe('repo');
    expect(contentSourceFor({ compiled: true, pluginRoot: REPO, repo: repoContentSource, embedded: () => fake })).toBe(fake);
    expect(() => contentSourceFor({ compiled: true, pluginRoot: REPO, repo: repoContentSource, embedded: () => null })).toThrow(/no embedded content/);
  });

  test('shippedContent follows the registry', () => {
    expect(shippedContent(REPO).kind).toBe('repo');
    registerEmbedded({ content: fake });
    expect(shippedContent(REPO)).toBe(fake);
  });
});

describe('assertShippedContent', () => {
  test('the checkout passes; an empty source and a short source refuse with a sentence', () => {
    expect(() => assertShippedContent(repoContentSource(REPO))).not.toThrow();
    const empty = repoContentSource(mkdtempSync(join(tmpdir(), 'empty-plugin-')));
    expect(() => assertShippedContent(empty)).toThrow(ShippedContentError);
    expect(() => assertShippedContent(empty)).toThrow(/0 files where the manifest lists/);
    const short: ContentSource = { kind: 'embedded', list: p => (p === 'primitives' ? ['primitives/read.md'] : []), has: () => true, read: () => '', readBytes: () => new Uint8Array() };
    expect(() => assertShippedContent(short)).toThrow(/incomplete/);
    // A repo subset is allowed: a fixture or a relocated plugin is not a lost build.
    const subset: ContentSource = { ...short, kind: 'repo' };
    expect(() => assertShippedContent(subset)).not.toThrow();
  });
});
