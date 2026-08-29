import { describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assembleSystemPrompt, HOST_PREAMBLE } from './prompt';
import { readPrimitiveTool } from './primitives';
import { runToolDef } from '../core/fake-provider';

function makeFixturePluginRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'plugin-'));
  mkdirSync(join(root, 'skills', 'counsel'), { recursive: true });
  writeFileSync(
    join(root, 'skills', 'counsel', 'SKILL.md'),
    '---\nname: counsel\ndescription: "test skill"\n---\n\n# Counsel OS\n\nBody text goes here.\n',
    'utf8',
  );
  mkdirSync(join(root, 'primitives'), { recursive: true });
  writeFileSync(join(root, 'primitives', 'draft.md'), '# draft\n\noriginal primitive content\n', 'utf8');
  return root;
}

function makeFixtureVaultRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'vault-'));
  mkdirSync(join(root, 'practice'), { recursive: true });
  writeFileSync(join(root, 'practice', 'profile.md'), 'Firm: Acme Legal\nAttorney: Jane Doe\n', 'utf8');
  mkdirSync(join(root, 'matters'), { recursive: true });
  writeFileSync(join(root, 'matters', 'acme-nda.md'), 'Matter: Acme NDA\nStatus: active\n', 'utf8');
  return root;
}

describe('assembleSystemPrompt', () => {
  test('assembles preamble + SKILL.md body (frontmatter stripped) + profile + matter', () => {
    const pluginRoot = makeFixturePluginRoot();
    const vaultRoot = makeFixtureVaultRoot();

    const prompt = assembleSystemPrompt({
      pluginRoot,
      vaultRoot,
      matterPath: 'matters/acme-nda.md',
      platform: 'macos',
      toolNames: ['vault_read', 'vault_write', 'vault_list', 'vault_search', 'propose_update', 'read_primitive', 'docket_sweep'],
    });

    // Frontmatter is gone; body content is present.
    expect(prompt).not.toContain('counsel-os-config');
    expect(prompt).not.toContain('name: counsel');
    expect(prompt).not.toContain('description: "test skill"');
    expect(prompt).toContain('# Counsel OS');
    expect(prompt).toContain('Body text goes here.');

    // The host preamble is present.
    expect(prompt).toContain('Host: Counsel OS runtime');
    expect(prompt).toContain('read_primitive');
    expect(prompt).toContain('propose_update');

    // Profile and matter sections are present, each under its own heading.
    expect(prompt).toContain('## Practice profile');
    expect(prompt).toContain('Firm: Acme Legal');
    expect(prompt).toContain('## Current matter');
    expect(prompt).toContain('Matter: Acme NDA');

    expect(prompt).toMatchSnapshot();
  });

  test('changing the fixture primitive does not change the output — primitives load lazily via read_primitive', () => {
    const pluginRoot = makeFixturePluginRoot();
    const vaultRoot = makeFixtureVaultRoot();
    const opts = {
      pluginRoot,
      vaultRoot,
      matterPath: 'matters/acme-nda.md',
      platform: 'macos' as const,
      toolNames: ['vault_read', 'vault_write', 'read_primitive'],
    };

    const before = assembleSystemPrompt(opts);
    writeFileSync(join(pluginRoot, 'primitives', 'draft.md'), '# draft\n\nCOMPLETELY DIFFERENT CONTENT\n', 'utf8');
    const after = assembleSystemPrompt(opts);

    expect(after).toBe(before);
    expect(after).not.toContain('COMPLETELY DIFFERENT CONTENT');
  });

  test('omits the profile/matter sections when the files are absent', () => {
    const pluginRoot = makeFixturePluginRoot();
    const vaultRoot = mkdtempSync(join(tmpdir(), 'vault-empty-'));

    const prompt = assembleSystemPrompt({
      pluginRoot,
      vaultRoot,
      platform: 'linux',
      toolNames: ['vault_read'],
    });

    expect(prompt).not.toContain('## Practice profile');
    expect(prompt).not.toContain('## Current matter');
  });

  test('is pure — reads only through the injected readFile', () => {
    const calls: string[] = [];
    const fakeSkill = '---\nname: counsel\n---\nFAKE BODY\n';
    const readFile = (path: string) => {
      calls.push(path);
      if (path.endsWith('SKILL.md')) return fakeSkill;
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    };

    const prompt = assembleSystemPrompt(
      { pluginRoot: '/fake/plugin', vaultRoot: '/fake/vault', platform: 'hosted', toolNames: [] },
      readFile,
    );

    expect(prompt).toContain('FAKE BODY');
    expect(prompt).not.toContain('name: counsel');
    expect(calls.some(p => p.includes('SKILL.md'))).toBe(true);
  });
});

describe('HOST_PREAMBLE', () => {
  test('lists available tools and unavailable script tools with a reason', () => {
    const preamble = HOST_PREAMBLE(['vault_read', 'read_primitive', 'docket_sweep'], 'linux');
    expect(preamble).toContain('vault_read');
    expect(preamble).toContain('word_compare');
    expect(preamble).toContain('requires Microsoft Word for Mac');
  });

  test('says every tool is available when nothing is missing', () => {
    const all = ['docket_sweep', 'extract_redlines', 'check_document', 'clean_format', 'apply_redlines', 'word_compare'];
    const preamble = HOST_PREAMBLE(all, 'macos');
    expect(preamble).toContain('every tool listed above is available on this platform');
  });

  test('tells the model not to run resolve_legal_root.sh', () => {
    const preamble = HOST_PREAMBLE([], 'macos');
    expect(preamble).toContain('resolve_legal_root.sh');
    expect(preamble).toMatch(/[Dd]o not run/);
  });
});

describe('readPrimitiveTool', () => {
  test('a known primitive name returns its file content', async () => {
    const pluginRoot = makeFixturePluginRoot();
    const tool = readPrimitiveTool(pluginRoot);
    const r = await runToolDef([tool], 'read_primitive', { name: 'draft' }, 'default');
    expect(r.isError).toBe(false);
    expect(r.output).toContain('original primitive content');
  });

  test('an unknown primitive name errors instead of reading arbitrary paths', async () => {
    const pluginRoot = makeFixturePluginRoot();
    const tool = readPrimitiveTool(pluginRoot);
    const r = await runToolDef([tool], 'read_primitive', { name: 'nonexistent' }, 'default');
    expect(r.isError).toBe(true);
    expect(String(r.output)).toMatch(/unknown primitive/);
  });

  test('path traversal is rejected, not resolved', async () => {
    const pluginRoot = makeFixturePluginRoot();
    const tool = readPrimitiveTool(pluginRoot);
    const r = await runToolDef([tool], 'read_primitive', { name: '../../../etc/passwd' }, 'default');
    expect(r.isError).toBe(true);
  });
});
