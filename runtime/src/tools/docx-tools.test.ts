import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildDocx } from '../docx/test/builder';
import { docxTools, resolveVaultFile, VaultPathError } from './docx-tools';

const AT = '2026-08-28T10:00:00Z';
let vault: string;

beforeAll(() => {
  vault = mkdtempSync(join(tmpdir(), 'docx-tools-'));
  mkdirSync(join(vault, 'matters', 'acme'), { recursive: true });
  mkdirSync(join(vault, '.counsel'), { recursive: true });
  writeFileSync(
    join(vault, 'matters', 'acme', 'nda.docx'),
    buildDocx({
      blocks: [
        { style: 'Heading1', runs: ['1. Term'] },
        { runs: ['Lasts ', { text: 'two', del: { author: 'R', date: AT } }, { text: 'one', ins: { author: 'R', date: AT } }, ' year. See Section 9.'] },
        { style: 'Heading1', runs: ['2. Fees'] },
      ],
    }),
  );
  writeFileSync(join(vault, 'matters', 'acme', 'notes.md'), '# Notes\n\nSee Section 4.\n');
  writeFileSync(join(vault, '.counsel', 'secret.docx'), buildDocx({ blocks: [{ runs: ['secret'] }] }));
});

afterAll(() => rmSync(vault, { recursive: true, force: true }));

function tool(name: string) {
  return docxTools({ vaultRoot: vault }).find(t => t.name === name)!;
}

const ctx = { tenant: 'default' } as never;

describe('resolveVaultFile', () => {
  test('vault-relative, and absolute inside the vault', () => {
    expect(resolveVaultFile(vault, 'matters/acme/nda.docx').rel).toBe('matters/acme/nda.docx');
    expect(resolveVaultFile(vault, join(vault, 'matters/acme/nda.docx')).rel).toBe('matters/acme/nda.docx');
  });

  test('refuses escapes, the runtime dir, backslashes, the root itself, and absolute paths elsewhere', () => {
    expect(() => resolveVaultFile(vault, '../x.docx')).toThrow(VaultPathError);
    expect(() => resolveVaultFile(vault, '.counsel/secret.docx')).toThrow(VaultPathError);
    expect(() => resolveVaultFile(vault, '.Counsel/secret.docx')).toThrow(VaultPathError);
    expect(() => resolveVaultFile(vault, 'matters\\acme\\nda.docx')).toThrow(VaultPathError);
    expect(() => resolveVaultFile(vault, '')).toThrow(VaultPathError);
    expect(() => resolveVaultFile(vault, '.')).toThrow(VaultPathError);
    expect(() => resolveVaultFile(vault, '/etc/passwd')).toThrow(VaultPathError);
  });
});

describe('docx_read', () => {
  test('returns markdown with inline changes, and the vault-relative path', async () => {
    const out = (await tool('docx_read').execute({ path: 'matters/acme/nda.docx', changes: 'all' }, ctx)) as { path: string; markdown: string; warnings: string[] };
    expect(out.path).toBe('matters/acme/nda.docx');
    expect(out.markdown).toBe('# 1. Term\n\nLasts {--two--}{++one++} year. See Section 9.\n\n# 2. Fees\n');
    expect(out.warnings).toEqual([]);
  });

  test('accept view, and the schema default', async () => {
    const t = tool('docx_read');
    const out = (await t.execute(t.inputSchema.parse({ path: 'matters/acme/nda.docx', changes: 'accept' }), ctx)) as { markdown: string };
    expect(out.markdown).toContain('Lasts one year.');
    expect(t.inputSchema.parse({ path: 'x.docx' })).toEqual({ path: 'x.docx', changes: 'all' });
  });

  test('a missing file, a non-docx, and a path outside the vault are plain errors', async () => {
    const t = tool('docx_read');
    await expect(t.execute({ path: 'matters/acme/none.docx', changes: 'all' }, ctx)).rejects.toThrow(/no such file/);
    await expect(t.execute({ path: 'matters/acme/notes.md', changes: 'all' }, ctx)).rejects.toThrow(/\.docx files only/);
    await expect(t.execute({ path: '../nda.docx', changes: 'all' }, ctx)).rejects.toThrow(/outside vault/);
    await expect(t.execute({ path: '.counsel/secret.docx', changes: 'all' }, ctx)).rejects.toThrow(/reserved/);
  });
});

describe('extract_redlines and check_document', () => {
  test('extract returns the JSON with the vault-relative file name', async () => {
    const out = (await tool('extract_redlines').execute({ docx: 'matters/acme/nda.docx' }, ctx)) as { file: string; summary: { changed_paragraphs: number } };
    expect(out.file).toBe('matters/acme/nda.docx');
    expect(out.summary.changed_paragraphs).toBe(1);
  });

  test('check handles docx and markdown by extension', async () => {
    const docx = (await tool('check_document').execute({ file: 'matters/acme/nda.docx' }, ctx)) as { format: string; findings: Array<{ detail: string }> };
    expect(docx.format).toBe('docx');
    expect(docx.findings.map(f => f.detail)).toEqual(['9']);
    const md = (await tool('check_document').execute({ file: 'matters/acme/notes.md' }, ctx)) as { format: string; findings: Array<{ detail: string }>; notes: string[] };
    expect(md.format).toBe('markdown');
    // One heading only, so the auto-numbering guard speaks instead.
    expect(md.findings).toEqual([]);
    expect(md.notes[0]).toContain('auto-generated');
  });

  test('every tool runs on all four platforms', () => {
    for (const t of docxTools({ vaultRoot: vault })) expect([...t.platforms].sort()).toEqual(['hosted', 'linux', 'macos', 'windows']);
  });
});
