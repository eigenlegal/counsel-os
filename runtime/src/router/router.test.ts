import { describe, expect, test } from 'bun:test';
import { Router, parseRouterConfig } from './router';
import { MatterStaysLocalError, RouterError } from '../core/types';
import type { ModelProvider } from '../core/types';

function p(id: string, caps: Partial<ModelProvider['capabilities']> = {}): ModelProvider {
  return {
    id, kind: 'direct',
    capabilities: { tools: true, caching: false, thinking: false, contextTokens: 200_000, auth: 'apikey', ...caps },
    async *run() { yield { type: 'done', output: null, usage: { inputTokens: 0, outputTokens: 0 } }; },
  };
}

const yaml = `
default: anthropic/claude-opus-5
tasks:
  long_read: { prefer: anthropic/claude-opus-5, require: { contextTokens: 200000 } }
  classify:  { prefer: anthropic/claude-haiku-4-5 }
  privacy:   { prefer: ollama/qwen3, allow_remote: false }
  huge:      { prefer: ollama/qwen3, require: { contextTokens: 1000000 } }
`;

describe('Router', () => {
  const providers = [
    p('anthropic/claude-opus-5'),
    p('anthropic/claude-haiku-4-5', { contextTokens: 100_000 }),
    p('ollama/qwen3', { auth: 'local', contextTokens: 32_000 }),
  ];
  const router = new Router(parseRouterConfig(yaml), providers);

  test('no task → default', () => expect(router.resolve().id).toBe('anthropic/claude-opus-5'));
  test('task with satisfiable prefer → prefer', () => expect(router.resolve('classify').id).toBe('anthropic/claude-haiku-4-5'));
  test('unknown task → default', () => expect(router.resolve('nope').id).toBe('anthropic/claude-opus-5'));
  test('privacy requires a local provider', () => expect(router.resolve('privacy').id).toBe('ollama/qwen3'));
  test('unsatisfiable require is a hard error, no silent downgrade', () => {
    expect(() => router.resolve('huge')).toThrow(RouterError);
  });
  test('missing default provider is a hard error', () => {
    expect(() => new Router({ default: 'x/y' }, providers).resolve()).toThrow(RouterError);
  });
});

describe('Router, a matter that stays local (providers spec §7)', () => {
  const local = p('ollama/qwen3', { auth: 'local', contextTokens: 32_000 });
  const localBig = p('ollama/big', { auth: 'local', contextTokens: 128_000, tools: false });
  const cloud = p('anthropic/claude-opus-5');

  test('ignores a cloud default and picks the best local provider — tools first, then context', () => {
    const router = new Router({ default: cloud.id }, [cloud, localBig, local]);
    expect(router.resolve(undefined, { localOnly: true }).id).toBe('ollama/qwen3');
    const noTools = new Router({ default: cloud.id }, [cloud, localBig]);
    expect(noTools.resolve(undefined, { localOnly: true }).id).toBe('ollama/big');
  });

  test('honours a local preference and a local default', () => {
    const router = new Router({ default: local.id, tasks: { draft: { prefer: localBig.id } } }, [cloud, localBig, local]);
    expect(router.resolve('draft', { localOnly: true }).id).toBe('ollama/big');
    expect(router.resolve('other', { localOnly: true }).id).toBe('ollama/qwen3');
  });

  test('a cloud preference is skipped, never used', () => {
    const router = new Router({ default: cloud.id, tasks: { review: { prefer: cloud.id } } }, [cloud, local]);
    expect(router.resolve('review', { localOnly: true }).id).toBe('ollama/qwen3');
  });

  test('no local provider is a typed error, not a cloud fallback', () => {
    const router = new Router({ default: cloud.id }, [cloud]);
    expect(() => router.resolve(undefined, { localOnly: true })).toThrow(MatterStaysLocalError);
    expect(() => router.resolve(undefined, { localOnly: true })).toThrow('no local model is loaded');
  });

  test('without the option nothing changes', () => {
    const router = new Router({ default: cloud.id }, [cloud, local]);
    expect(router.resolve().id).toBe(cloud.id);
  });
});
