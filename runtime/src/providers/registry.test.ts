import { describe, expect, test } from 'bun:test';
import { mkdtempSync, writeFileSync } from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path';
import { loadRegistry, BUILTIN_DEFAULT } from './registry';

describe('loadRegistry', () => {
  test('no file → built-ins with the built-in default', () => {
    const r = loadRegistry({ file: '/nonexistent/providers.yaml', vaultRoot: '/v' });
    expect(r.defaultId).toBe(BUILTIN_DEFAULT);
    expect(r.providers.map(p => p.id)).toContain('claude-sub/claude-opus-5');
    expect(r.router.resolve().id).toBe(BUILTIN_DEFAULT);
  });
  test('file adds openai-compatible providers and overrides default + tasks', () => {
    const f = join(mkdtempSync(join(tmpdir(), 'reg-')), 'providers.yaml');
    writeFileSync(f, `default: openai-compatible/groq\nproviders:\n  - id: openai-compatible/groq\n    baseURL: https://api.groq.com/openai/v1\n    apiKeyEnv: GROQ_API_KEY\n    capabilities: { contextTokens: 128000 }\ntasks:\n  classify: { prefer: openai-compatible/groq }\n`);
    const r = loadRegistry({ file: f, vaultRoot: '/v', env: { GROQ_API_KEY: 'k' } });
    const groq = r.providers.find(p => p.id === 'openai-compatible/groq')!;
    expect(groq.capabilities.contextTokens).toBe(128000);
    expect(groq.capabilities.auth).toBe('apikey');
    expect(r.router.resolve('classify').id).toBe('openai-compatible/groq');
  });
  test('unknown id prefix fails at load time', () => {
    const f = join(mkdtempSync(join(tmpdir(), 'reg-')), 'providers.yaml');
    writeFileSync(f, `providers:\n  - id: nope/x\n`);
    expect(() => loadRegistry({ file: f, vaultRoot: '/v' })).toThrow(/unknown provider/);
  });
});
