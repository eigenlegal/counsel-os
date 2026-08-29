import { describe, expect, test } from 'bun:test';
import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path';
import { loadRegistry, writeRegistry, readRegistry, isAllowedBaseURL, BUILTIN_DEFAULT, type RegistryFileData } from './registry';

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
  test('stepTimeoutMs is read from the file, and absent without it', () => {
    const dir = mkdtempSync(join(tmpdir(), 'reg-'));
    const with_ = join(dir, 'providers.yaml');
    writeFileSync(with_, `stepTimeoutMs: 120000\n`);
    expect(loadRegistry({ file: with_, vaultRoot: '/v' }).stepTimeoutMs).toBe(120000);
    expect(loadRegistry({ file: '/nonexistent/providers.yaml', vaultRoot: '/v' }).stepTimeoutMs).toBeUndefined();
  });
  test('a non-positive stepTimeoutMs is rejected at load time', () => {
    const f = join(mkdtempSync(join(tmpdir(), 'reg-')), 'providers.yaml');
    writeFileSync(f, `stepTimeoutMs: 0\n`);
    expect(() => loadRegistry({ file: f, vaultRoot: '/v' })).toThrow();
  });
  test('unknown id prefix fails at load time', () => {
    const f = join(mkdtempSync(join(tmpdir(), 'reg-')), 'providers.yaml');
    writeFileSync(f, `providers:\n  - id: nope/x\n`);
    expect(() => loadRegistry({ file: f, vaultRoot: '/v' })).toThrow(/unknown provider/);
  });
});

describe('writeRegistry', () => {
  test('writes YAML that reads back equal', () => {
    const f = join(mkdtempSync(join(tmpdir(), 'reg-')), 'providers.yaml');
    const reg: RegistryFileData = {
      default: 'openai-compatible/groq',
      providers: [{ id: 'openai-compatible/groq', baseURL: 'https://api.groq.com/openai/v1', apiKeyEnv: 'GROQ_API_KEY', capabilities: { contextTokens: 128000 } }],
      tasks: { classify: { prefer: 'openai-compatible/groq' } },
      stepTimeoutMs: 120000,
    };
    writeRegistry(f, reg);
    expect(readRegistry(f)).toEqual(reg);
    // And the registry it builds is the one the YAML describes, not just a
    // structurally equal object.
    const r = loadRegistry({ file: f, vaultRoot: '/v', env: { GROQ_API_KEY: 'k' } });
    expect(r.defaultId).toBe('openai-compatible/groq');
    expect(r.stepTimeoutMs).toBe(120000);
  });

  test('creates the parent directory 0700 when it is missing', () => {
    const dir = join(mkdtempSync(join(tmpdir(), 'reg-')), 'nested');
    const f = join(dir, 'providers.yaml');
    writeRegistry(f, { default: 'ollama/gemma4:e4b' });
    expect(existsSync(f)).toBe(true);
    expect(statSync(dir).mode & 0o777).toBe(0o700);
    // The file names the env vars this runtime reads secrets from, and the
    // endpoints it sends them to.
    expect(statSync(f).mode & 0o777).toBe(0o600);
  });

  test('replaces an existing file and leaves no temp file behind', () => {
    const dir = mkdtempSync(join(tmpdir(), 'reg-'));
    const f = join(dir, 'providers.yaml');
    writeFileSync(f, 'default: ollama/gemma4:e4b\n');
    writeRegistry(f, { default: 'claude-sub/claude-opus-5' });
    expect(readRegistry(f).default).toBe('claude-sub/claude-opus-5');
    // 0600 even when it replaced a file that was not.
    expect(statSync(f).mode & 0o777).toBe(0o600);
    expect(readFileSync(f, 'utf8')).not.toContain('gemma4');
    expect(readdirSync(dir)).toEqual(['providers.yaml']);
  });
});

describe('readRegistry', () => {
  test('a missing file is an empty registry', () => {
    expect(readRegistry('/nonexistent/providers.yaml')).toEqual({});
  });
});

describe('baseURL bound', () => {
  test('https anywhere, http only to a loopback host', () => {
    expect(isAllowedBaseURL('https://api.groq.com/openai/v1')).toBe(true);
    expect(isAllowedBaseURL('http://127.0.0.1:11434/v1')).toBe(true);
    expect(isAllowedBaseURL('http://localhost:1234/v1')).toBe(true);
    expect(isAllowedBaseURL('http://[::1]:8080/v1')).toBe(true);

    expect(isAllowedBaseURL('http://attacker.example/v1')).toBe(false);
    // The host is compared whole — a prefix that only looks loopback is not.
    expect(isAllowedBaseURL('http://127.0.0.1.attacker.example/v1')).toBe(false);
    expect(isAllowedBaseURL('ftp://127.0.0.1/v1')).toBe(false);
    expect(isAllowedBaseURL('file:///etc/passwd')).toBe(false);
    expect(isAllowedBaseURL('not a url')).toBe(false);
    expect(isAllowedBaseURL('')).toBe(false);
  });

  test('a hand-edited file that violates it fails at startup, not silently', () => {
    const f = join(mkdtempSync(join(tmpdir(), 'reg-')), 'providers.yaml');
    writeFileSync(f, `providers:\n  - id: openai-compatible/x\n    baseURL: http://attacker.example/v1\n    apiKeyEnv: SECRET\n`);
    expect(() => loadRegistry({ file: f, vaultRoot: '/v', env: { SECRET: 'k' } })).toThrow(/baseURL must be https/);
  });

  test('a loopback http provider still loads', () => {
    const f = join(mkdtempSync(join(tmpdir(), 'reg-')), 'providers.yaml');
    writeFileSync(f, `providers:\n  - id: openai-compatible/local\n    baseURL: http://127.0.0.1:11434/v1\n`);
    const r = loadRegistry({ file: f, vaultRoot: '/v' });
    expect(r.providers.map(p => p.id)).toContain('openai-compatible/local');
  });
});

describe('tasks schema', () => {
  test('a route with the wrong shape is rejected, not carried into the router', () => {
    const f = join(mkdtempSync(join(tmpdir(), 'reg-')), 'providers.yaml');
    writeFileSync(f, `tasks:\n  classify: { prefer: 5 }\n`);
    expect(() => loadRegistry({ file: f, vaultRoot: '/v' })).toThrow();
  });

  test('a full route round-trips', () => {
    const f = join(mkdtempSync(join(tmpdir(), 'reg-')), 'providers.yaml');
    const reg: RegistryFileData = {
      tasks: { classify: { prefer: 'ollama/gemma4:e4b', require: { tools: true, contextTokens: 8000 }, allow_remote: false } },
    };
    writeRegistry(f, reg);
    expect(readRegistry(f)).toEqual(reg);
  });
});
