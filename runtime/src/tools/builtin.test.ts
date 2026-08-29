import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { builtinTools, checkDocumentArgs, docketSweepArgs } from './builtin';

describe('builtinTools', () => {
  test('returns docket_sweep, available on all four platforms', () => {
    const tools = builtinTools({ vaultRoot: '/tmp/v', repoRoot: '/tmp/repo' });
    const sweep = tools.find(t => t.name === 'docket_sweep');
    expect(sweep).toBeDefined();
    expect([...sweep!.platforms].sort()).toEqual(['hosted', 'linux', 'macos', 'windows']);
  });

  test('adds the five docx script tools', () => {
    const tools = builtinTools({ vaultRoot: '/tmp/v', repoRoot: '/tmp/repo' });
    const names = tools.map(t => t.name).sort();
    expect(names).toEqual([
      'apply_redlines',
      'check_document',
      'clean_format',
      'docket_sweep',
      'extract_redlines',
      'word_compare',
    ]);
  });

  test('extract_redlines, check_document, clean_format, apply_redlines are available on all four platforms', () => {
    const tools = builtinTools({ vaultRoot: '/tmp/v', repoRoot: '/tmp/repo' });
    for (const name of ['extract_redlines', 'check_document', 'clean_format', 'apply_redlines']) {
      const t = tools.find(x => x.name === name)!;
      expect([...t.platforms].sort()).toEqual(['hosted', 'linux', 'macos', 'windows']);
    }
  });

  test('word_compare is macOS only', () => {
    const tools = builtinTools({ vaultRoot: '/tmp/v', repoRoot: '/tmp/repo' });
    const wc = tools.find(t => t.name === 'word_compare')!;
    expect([...wc.platforms]).toEqual(['macos']);
  });

  test('check_document takes a `file` field, accepts non-docx, and always runs --json', async () => {
    const tools = builtinTools({ vaultRoot: '/tmp/v', repoRoot: '/tmp/repo' });
    const check = tools.find(t => t.name === 'check_document')!;
    const parsed = check.inputSchema.parse({ file: 'draft.md' });
    expect(parsed).toEqual({ file: 'draft.md' });
    expect(check.description).toContain('.md');
    expect(check.description).toContain('.txt');
    expect(check.description).toContain('--json');
  });
});

describe('checkDocumentArgs', () => {
  test('always appends --json', () => {
    expect(checkDocumentArgs('draft.docx')).toEqual(['draft.docx', '--json']);
    expect(checkDocumentArgs('draft.md')).toEqual(['draft.md', '--json']);
  });
});

describe('docketSweepArgs', () => {
  test('builds the subprocess args from vaultRoot and days', () => {
    expect(docketSweepArgs('/tmp/v', 30)).toEqual([join('/tmp/v', 'matters'), '--window', '30', '--format', 'json']);
  });
});
