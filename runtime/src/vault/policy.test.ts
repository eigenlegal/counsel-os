import { describe, expect, test } from 'bun:test';
import type { VaultConfig } from './resolve-root';
import { attachmentPaths, matterFor, matterPolicy, policyForStep, type ReadText } from './policy';

const cfg: VaultConfig = { entitiesPath: 'entities', mattersPath: 'matters', autoApplyLawUpdates: false, lawManagement: 'plugin' };
const localVault: VaultConfig = { ...cfg, defaultLocality: 'local' };

function reader(files: Record<string, string>): ReadText {
  return async path => files[path] ?? null;
}

const files = {
  'matters/acme.md': '---\ntitle: Acme\nstays_local: true\n---\n# Acme\n',
  'matters/open.md': '---\ntitle: Open\nstays_local: false\n---\n# Open\n',
  'matters/silent.md': '---\ntitle: Silent\n---\n# Silent\n',
  'matters/folder/matter.md': '---\nstays_local: yes\n---\n# Folder\n',
  'matters/flat-folder.md': '---\nstays_local: true\n---\n# Flat with a folder of documents\n',
};

describe('matterFor', () => {
  test('a flat matter is its own file; a document in a folder is governed by its matter.md', async () => {
    expect(await matterFor('matters/acme.md', cfg, reader(files))).toBe('matters/acme.md');
    expect(await matterFor('matters/folder/nda.docx', cfg, reader(files))).toBe('matters/folder/matter.md');
  });

  test('a folder with no matter.md falls back to the flat matter of the same name', async () => {
    expect(await matterFor('matters/flat-folder/nda.docx', cfg, reader(files))).toBe('matters/flat-folder.md');
  });

  test('outside the matters directory, or a stray non-markdown file, governs nothing', async () => {
    expect(await matterFor('practice/standards/nda.md', cfg, reader(files))).toBeNull();
    expect(await matterFor('matters/loose.docx', cfg, reader(files))).toBeNull();
    expect(await matterFor('matters/ghost/x.docx', cfg, reader(files))).toBeNull();
  });
});

describe('matterPolicy', () => {
  test('the matter says so', async () => {
    expect(await matterPolicy('matters/acme.md', cfg, reader(files))).toEqual({ localOnly: true, source: 'matter', matter: 'matters/acme.md' });
    expect(await matterPolicy('matters/folder/matter.md', cfg, reader(files))).toEqual({ localOnly: true, source: 'matter', matter: 'matters/folder/matter.md' });
  });

  test('a matter that says false beats a vault default of local', async () => {
    expect(await matterPolicy('matters/open.md', localVault, reader(files))).toEqual({ localOnly: false, source: 'matter', matter: 'matters/open.md' });
  });

  test('a silent matter falls to the vault default; no default is none', async () => {
    expect(await matterPolicy('matters/silent.md', localVault, reader(files))).toEqual({ localOnly: true, source: 'vault' });
    expect(await matterPolicy('matters/silent.md', cfg, reader(files))).toEqual({ localOnly: false, source: 'none' });
    expect(await matterPolicy(null, cfg, reader(files))).toEqual({ localOnly: false, source: 'none' });
  });

  test('a matter file that is gone reads as silent', async () => {
    expect(await matterPolicy('matters/missing.md', localVault, reader(files))).toEqual({ localOnly: true, source: 'vault' });
  });
});

describe('attachmentPaths', () => {
  test('the trailing line of backticked paths, and nothing else', () => {
    expect(attachmentPaths('Review this.\n\n`matters/acme/nda.docx` `practice/standards/nda.md`')).toEqual(['matters/acme/nda.docx', 'practice/standards/nda.md']);
    expect(attachmentPaths('`matters/acme/nda.docx`\n')).toEqual(['matters/acme/nda.docx']);
    expect(attachmentPaths('Use `vault_read` on it')).toEqual([]);
    expect(attachmentPaths('plain question')).toEqual([]);
  });
});

describe('policyForStep', () => {
  test('the explicit matter link decides first', async () => {
    expect(await policyForStep({ matter: 'matters/acme.md', message: 'hi `matters/open.md`' }, cfg, reader(files))).toMatchObject({ localOnly: true, source: 'matter' });
    expect(await policyForStep({ matter: 'matters/open.md', message: 'hi' }, localVault, reader(files))).toMatchObject({ localOnly: false, source: 'matter' });
  });

  test('else the first attached path that belongs to a matter', async () => {
    expect(await policyForStep({ message: 'Review this.\n\n`practice/standards/nda.md` `matters/folder/nda.docx`' }, cfg, reader(files))).toEqual({ localOnly: true, source: 'matter', matter: 'matters/folder/matter.md' });
  });

  test('else the vault default', async () => {
    expect(await policyForStep({ message: 'hello' }, localVault, reader(files))).toEqual({ localOnly: true, source: 'vault' });
    expect(await policyForStep({ message: 'hello' }, cfg, reader(files))).toEqual({ localOnly: false, source: 'none' });
  });

  test('a malformed chip is prose', async () => {
    expect(await policyForStep({ message: '`../escape.md`' }, cfg, reader(files))).toEqual({ localOnly: false, source: 'none' });
  });
});
