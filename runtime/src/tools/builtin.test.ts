import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { builtinTools, docketSweepArgs } from './builtin';

describe('builtinTools', () => {
  test('returns docket_sweep, available on all four platforms', () => {
    const tools = builtinTools({ vaultRoot: '/tmp/v', repoRoot: '/tmp/repo' });
    const sweep = tools.find(t => t.name === 'docket_sweep');
    expect(sweep).toBeDefined();
    expect([...sweep!.platforms].sort()).toEqual(['hosted', 'linux', 'macos', 'windows']);
  });

  test('the six TypeScript docx tools plus the two remaining scripts', () => {
    const tools = builtinTools({ vaultRoot: '/tmp/v', repoRoot: '/tmp/repo' });
    const names = tools.map(t => t.name).sort();
    expect(names).toEqual(['apply_redlines', 'check_document', 'clean_format', 'diff_rounds', 'docket_sweep', 'docx_compare', 'docx_read', 'extract_redlines']);
  });

  test('apply_redlines is the TypeScript tool: vault-relative paths, items or edits, no subprocess', () => {
    const t = builtinTools({ vaultRoot: '/tmp/v', repoRoot: '/tmp/repo' }).find(x => x.name === 'apply_redlines')!;
    expect(t.inputSchema.parse({ original: 'a.docx', items: [{ current: 'x', proposed: 'y' }], track: true })).toMatchObject({ original: 'a.docx', track: true });
    expect(t.description).toContain('never overwriting');
    expect(t.description).not.toContain('local file paths');
  });

  test('docx_read, extract_redlines, check_document, clean_format, apply_redlines run on all four platforms', () => {
    const tools = builtinTools({ vaultRoot: '/tmp/v', repoRoot: '/tmp/repo' });
    for (const name of ['docx_read', 'extract_redlines', 'check_document', 'clean_format', 'apply_redlines']) {
      const t = tools.find(x => x.name === name)!;
      expect([...t.platforms].sort()).toEqual(['hosted', 'linux', 'macos', 'windows']);
    }
  });

  test('docx_compare and diff_rounds run everywhere — Word Compare is gone', () => {
    const tools = builtinTools({ vaultRoot: '/tmp/v', repoRoot: '/tmp/repo' });
    expect(tools.find(t => t.name === 'word_compare')).toBeUndefined();
    for (const name of ['docx_compare', 'diff_rounds']) expect([...tools.find(t => t.name === name)!.platforms].sort()).toEqual(['hosted', 'linux', 'macos', 'windows']);
    expect(tools.find(t => t.name === 'diff_rounds')!.inputSchema.parse({ ours: 'a.docx', theirs: 'b.docx' })).toEqual({ ours: 'a.docx', theirs: 'b.docx' });
  });

  test('check_document takes a `file` field and accepts non-docx', () => {
    const tools = builtinTools({ vaultRoot: '/tmp/v', repoRoot: '/tmp/repo' });
    const check = tools.find(t => t.name === 'check_document')!;
    expect(check.inputSchema.parse({ file: 'draft.md' })).toEqual({ file: 'draft.md' });
    expect(check.description).toContain('.md');
    expect(check.description).toContain('.txt');
  });

  test('extract_redlines keeps its `docx` field; docx_read takes `path`', () => {
    const tools = builtinTools({ vaultRoot: '/tmp/v', repoRoot: '/tmp/repo' });
    expect(tools.find(t => t.name === 'extract_redlines')!.inputSchema.parse({ docx: 'a.docx' })).toEqual({ docx: 'a.docx' });
    expect(tools.find(t => t.name === 'docx_read')!.inputSchema.parse({ path: 'a.docx' })).toEqual({ path: 'a.docx', changes: 'all' });
  });
});

describe('docketSweepArgs', () => {
  test('builds the subprocess args from vaultRoot and days', () => {
    expect(docketSweepArgs('/tmp/v', 30)).toEqual([join('/tmp/v', 'matters'), '--window', '30', '--format', 'json']);
  });
});
