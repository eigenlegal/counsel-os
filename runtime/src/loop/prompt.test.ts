import { describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assembleSystemPrompt, HOST_PREAMBLE } from './prompt';
import type { AvailableTools } from './prompt';
import { readPrimitiveTool } from './primitives';
import { runToolDef } from '../core/fake-provider';
import type { VaultConfig } from '../vault/resolve-root';

const defaultCfg: VaultConfig = { entitiesPath: 'entities', mattersPath: 'matters', autoApplyLawUpdates: false, lawManagement: 'plugin' };

const allTools: AvailableTools = {
  available: [
    'vault_read', 'vault_write', 'vault_list', 'vault_search',
    'propose_update', 'read_primitive',
    'docket_sweep', 'extract_redlines', 'check_document', 'clean_format', 'apply_redlines', 'word_compare',
  ],
  unavailable: [],
};

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
      tools: {
        available: ['vault_read', 'vault_write', 'vault_list', 'vault_search', 'propose_update', 'read_primitive', 'docket_sweep'],
        unavailable: [
          { name: 'extract_redlines', needs: ['macos', 'linux', 'windows', 'hosted'] },
          { name: 'check_document', needs: ['macos', 'linux', 'windows', 'hosted'] },
          { name: 'clean_format', needs: ['macos', 'linux', 'windows', 'hosted'] },
          { name: 'apply_redlines', needs: ['macos', 'linux', 'windows', 'hosted'] },
          { name: 'word_compare', needs: ['macos'] },
        ],
      },
      cfg: defaultCfg,
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
      tools: { available: ['vault_read', 'vault_write', 'read_primitive'], unavailable: [] },
      cfg: defaultCfg,
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
      tools: { available: ['vault_read'], unavailable: [] },
      cfg: defaultCfg,
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
      {
        pluginRoot: '/fake/plugin',
        vaultRoot: '/fake/vault',
        platform: 'hosted',
        tools: { available: [], unavailable: [] },
        cfg: defaultCfg,
      },
      readFile,
    );

    expect(prompt).toContain('FAKE BODY');
    expect(prompt).not.toContain('name: counsel');
    expect(calls.some(p => p.includes('SKILL.md'))).toBe(true);
  });

  test('a non-ENOENT readFile error propagates instead of being treated as "file absent"', () => {
    const fakeSkill = '---\nname: counsel\n---\nBODY\n';
    const readFile = (path: string) => {
      if (path.endsWith('SKILL.md')) return fakeSkill;
      if (path.endsWith('profile.md')) throw Object.assign(new Error('permission denied'), { code: 'EACCES' });
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    };

    expect(() =>
      assembleSystemPrompt(
        {
          pluginRoot: '/fake/plugin',
          vaultRoot: '/fake/vault',
          platform: 'hosted',
          tools: { available: [], unavailable: [] },
          cfg: defaultCfg,
        },
        readFile,
      ),
    ).toThrow(/permission denied/);
  });

  test('prints the configured mattersPath and does not leak the default "matters/" when overridden', () => {
    const pluginRoot = makeFixturePluginRoot();
    const vaultRoot = makeFixtureVaultRoot();

    const prompt = assembleSystemPrompt({
      pluginRoot,
      vaultRoot,
      platform: 'macos',
      tools: { available: ['vault_read', 'vault_write'], unavailable: [] },
      cfg: { entitiesPath: 'clients', mattersPath: 'cases', autoApplyLawUpdates: false, lawManagement: 'plugin' },
    });

    expect(prompt).toContain('cases/');
    expect(prompt).toContain('clients/');
    expect(prompt).not.toContain('matters/');
    expect(prompt).not.toContain('entities/');
  });
});

describe('HOST_PREAMBLE', () => {
  test('lists available tools and unavailable tools with what platform they need', () => {
    const tools: AvailableTools = {
      available: ['vault_read', 'read_primitive', 'docket_sweep'],
      unavailable: [{ name: 'word_compare', needs: ['macos'] }],
    };
    const preamble = HOST_PREAMBLE(tools, 'linux', defaultCfg);
    expect(preamble).toContain('vault_read');
    expect(preamble).toContain('word_compare');
    expect(preamble).toContain('needs macos');
  });

  test('says every tool is available when nothing is missing', () => {
    const preamble = HOST_PREAMBLE(allTools, 'macos', defaultCfg);
    expect(preamble).toContain('every tool listed above is available on this platform');
  });

  test('tells the model not to run resolve_legal_root.sh', () => {
    const preamble = HOST_PREAMBLE({ available: [], unavailable: [] }, 'macos', defaultCfg);
    expect(preamble).toContain('resolve_legal_root.sh');
    expect(preamble).toMatch(/[Dd]o not run/);
  });

  test('translates {legal_root}/x/y.md paths and states matters/entities live at the configured dirs', () => {
    const preamble = HOST_PREAMBLE(allTools, 'macos', { entitiesPath: 'clients', mattersPath: 'cases', autoApplyLawUpdates: false, lawManagement: 'plugin' });
    expect(preamble).toContain('{legal_root}/x/y.md');
    expect(preamble.toLowerCase()).toContain('drop');
    expect(preamble).toContain('cases/');
    expect(preamble).toContain('clients/');
  });

  test('tells the model not to improvise when no tool covers a methodology step', () => {
    const preamble = HOST_PREAMBLE(allTools, 'macos', defaultCfg);
    expect(preamble).toMatch(/do not improvise/i);
    expect(preamble).toMatch(/tell the user what you cannot do/i);
  });

  test('the apply_redlines mapping row matches the script\'s own usage text', () => {
    const preamble = HOST_PREAMBLE(allTools, 'macos', defaultCfg);
    expect(preamble).toContain('<redlines.json>');
  });

  test('the check_document mapping row reflects the file field and --json', () => {
    const preamble = HOST_PREAMBLE(allTools, 'macos', defaultCfg);
    expect(preamble).toContain('`file`');
    expect(preamble).toContain('--json');
  });

  test('states the typed-answer rule for requests carrying an output schema', () => {
    const preamble = HOST_PREAMBLE(allTools, 'macos', defaultCfg);
    expect(preamble).toContain(
      'If the request carries an output schema, do the work with the primitives first, ' +
        'then give the final answer in exactly that structure — nothing else in the final answer.',
    );
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

describe('the content source (spec 2026-09-01 §3)', () => {
  const fakeSource = {
    kind: 'embedded' as const,
    list: (prefix: string) => (prefix === 'primitives' ? ['primitives/draft.md', 'primitives/notes.txt'] : []),
    has: (path: string) => path === 'skills/counsel/SKILL.md' || path === 'primitives/draft.md',
    readBytes: () => new Uint8Array(),
    read: (path: string) => {
      if (path === 'skills/counsel/SKILL.md') return '---\nname: counsel\n---\n\n# From the source\n';
      if (path === 'primitives/draft.md') return 'DRAFT FROM THE SOURCE\n';
      throw new Error(`not shipped content: ${path}`);
    },
  };

  test('assembleSystemPrompt reads the skill through an injected source, never the plugin root', () => {
    const prompt = assembleSystemPrompt(
      { pluginRoot: '/nowhere', content: fakeSource, vaultRoot: '/nowhere-vault', platform: 'linux', tools: { available: [], unavailable: [] }, cfg: defaultCfg },
      path => {
        if (path.startsWith('/nowhere-vault')) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
        throw new Error(`unexpected read: ${path}`);
      },
    );
    expect(prompt).toContain('# From the source');
    expect(prompt).not.toContain('name: counsel');
  });

  test('read_primitive lists and reads through the source; only .md files directly under primitives/ count', async () => {
    const tools = [readPrimitiveTool(fakeSource)];
    expect(await runToolDef(tools, 'read_primitive', { name: 'draft' }, 'default')).toEqual({ output: 'DRAFT FROM THE SOURCE\n', isError: false });
    const notes = await runToolDef(tools, 'read_primitive', { name: 'notes' }, 'default');
    expect(notes.isError).toBe(true);
    expect(String(notes.output)).toContain('unknown primitive: notes. Available: draft');
    expect((await runToolDef(tools, 'read_primitive', { name: '../skills/counsel/SKILL' }, 'default')).isError).toBe(true);
  });
});
