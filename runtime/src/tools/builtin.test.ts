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
});

describe('docketSweepArgs', () => {
  test('builds the subprocess args from vaultRoot and days', () => {
    expect(docketSweepArgs('/tmp/v', 30)).toEqual([join('/tmp/v', 'matters'), '--window', '30', '--format', 'json']);
  });
});
