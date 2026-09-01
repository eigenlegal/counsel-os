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

  test('the three TypeScript docx tools plus the three Python write-path scripts', () => {
    const tools = builtinTools({ vaultRoot: '/tmp/v', repoRoot: '/tmp/repo' });
    const names = tools.map(t => t.name).sort();
    expect(names).toEqual(['apply_redlines', 'check_document', 'clean_format', 'docket_sweep', 'docx_read', 'extract_redlines', 'word_compare']);
  });

  test('docx_read, extract_redlines, check_document, clean_format, apply_redlines run on all four platforms', () => {
    const tools = builtinTools({ vaultRoot: '/tmp/v', repoRoot: '/tmp/repo' });
    for (const name of ['docx_read', 'extract_redlines', 'check_document', 'clean_format', 'apply_redlines']) {
      const t = tools.find(x => x.name === name)!;
      expect([...t.platforms].sort()).toEqual(['hosted', 'linux', 'macos', 'windows']);
    }
  });

  test('word_compare is macOS only', () => {
    const tools = builtinTools({ vaultRoot: '/tmp/v', repoRoot: '/tmp/repo' });
    const wc = tools.find(t => t.name === 'word_compare')!;
    expect([...wc.platforms]).toEqual(['macos']);
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
