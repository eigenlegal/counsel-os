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
});

describe('docketSweepArgs', () => {
  test('builds the subprocess args from vaultRoot and days', () => {
    expect(docketSweepArgs('/tmp/v', 30)).toEqual([join('/tmp/v', 'matters'), '--window', '30', '--format', 'json']);
  });
});
