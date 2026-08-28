import { describe, expect, test } from 'bun:test';
import { buildProviders } from './index';

describe('buildProviders', () => {
  test('routes ids to the right provider class', () => {
    const ps = buildProviders({ ids: ['claude-sub/opus', 'codex-sub/gpt-5', 'ollama/qwen3'], vaultRoot: '/tmp/v' });
    expect(ps.map(p => `${p.id}:${p.kind}:${p.capabilities.auth}`)).toEqual([
      'claude-sub/opus:harness:subscription',
      'codex-sub/gpt-5:harness:subscription',
      'ollama/qwen3:direct:local',
    ]);
  });
  test('unknown vendor throws', () => {
    expect(() => buildProviders({ ids: ['nope/x'], vaultRoot: '/tmp/v' })).toThrow(/unknown/);
  });
});
