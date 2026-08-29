import { describe, expect, test } from 'bun:test';
import { buildProviders } from './index';
import type { ClaudeHarnessProvider } from './claude-harness';
import type { CodexHarnessProvider } from './codex-harness';

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
  test('threads claudeCwd to the Claude provider and codexHomeDir to the Codex provider', () => {
    const [claude, codex] = buildProviders({
      ids: ['claude-sub/opus', 'codex-sub/gpt-5'],
      vaultRoot: '/tmp/v',
      claudeCwd: '/pinned/cwd',
      codexHomeDir: '/pinned/codex-home',
    });
    expect((claude as ClaudeHarnessProvider).cwd).toBe('/pinned/cwd');
    expect((codex as CodexHarnessProvider).homeDir).toBe('/pinned/codex-home');
  });
  test('omits cwd/homeDir on the providers when claudeCwd/codexHomeDir are not given', () => {
    const [claude, codex] = buildProviders({ ids: ['claude-sub/opus', 'codex-sub/gpt-5'], vaultRoot: '/tmp/v' });
    expect((claude as ClaudeHarnessProvider).cwd).toBeUndefined();
    expect((codex as CodexHarnessProvider).homeDir).toBeUndefined();
  });
});
