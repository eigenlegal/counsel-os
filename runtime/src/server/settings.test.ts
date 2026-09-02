import { beforeEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FakeModelProvider } from '../core/fake-provider';
import type { ModelProvider } from '../core/types';
import { DEFAULT_STEP_TIMEOUT_MS } from '../loop/counsel-loop';
import { readRegistry, type RegistryFileData } from '../providers/registry';
import { memoryStore, type SecretStore } from '../providers/secrets';
import { ThreadStore } from '../threads/store';
import { FsVaultStore } from '../vault/fs-store';
import { createApp, type App } from './routes';
import { runtimeState } from './serve';

const TOKEN = 'test-token-0123456789';

let vaultRoot: string;
let pluginRoot: string;
let vault: FsVaultStore;
let store: ThreadStore;

beforeEach(() => {
  vaultRoot = mkdtempSync(join(tmpdir(), 'settings-vault-'));
  pluginRoot = mkdtempSync(join(tmpdir(), 'settings-plugin-'));
  mkdirSync(join(pluginRoot, 'skills', 'counsel'), { recursive: true });
  writeFileSync(join(pluginRoot, 'skills', 'counsel', 'SKILL.md'), '---\nname: counsel\n---\n\nBODY.\n', 'utf8');
  mkdirSync(join(pluginRoot, 'primitives'), { recursive: true });
  writeFileSync(join(pluginRoot, 'primitives', 'draft.md'), 'DRAFT.\n', 'utf8');
  vault = new FsVaultStore(vaultRoot);
  store = new ThreadStore(vaultRoot, { codexHomeRoot: mkdtempSync(join(tmpdir(), 'settings-codex-')) });
});

interface Harness {
  app: App;
  /** The registry file the app reads and writes. */
  file: string;
  fake: FakeModelProvider;
  secrets?: SecretStore;
}

/**
 * A server whose live state comes from a registry file in a throwaway home.
 * `fake: true` is `serve --fake`: the canned provider is an override, so it
 * has to survive every reload the settings API does.
 */
function harness(opts: { fake?: boolean; contents?: string; script?: ConstructorParameters<typeof FakeModelProvider>[0]; secrets?: SecretStore | null; env?: NodeJS.ProcessEnv } = {}): Harness {
  const home = mkdtempSync(join(tmpdir(), 'settings-home-'));
  const file = join(home, 'providers.yaml');
  if (opts.contents !== undefined) writeFileSync(file, opts.contents, 'utf8');
  const fake = new FakeModelProvider(opts.script ?? [{ text: 'OK', usage: { inputTokens: 7, outputTokens: 1 } }]);
  const overrides: { extraProviders?: ModelProvider[]; defaultId?: string } = opts.fake
    ? { extraProviders: [fake], defaultId: fake.id }
    : {};
  // A memory store by default (providers spec §5); `null` = a runtime with
  // no store at all. Never the developer's keychain.
  const secrets = opts.secrets === null ? undefined : (opts.secrets ?? memoryStore());
  const env = opts.env ?? {};
  const runtime = runtimeState({ vaultRoot, registryFile: file, env, ...overrides, ...(secrets === undefined ? {} : { secrets }) });
  const app = createApp({
    token: TOKEN,
    tenant: 'default',
    vaultRoot,
    pluginRoot,
    vault,
    store,
    platform: 'macos',
    state: runtime.state,
    settings: { file, reload: runtime.reload, env, ...(secrets === undefined ? {} : { secrets }) },
  });
  return { app, file, fake, ...(secrets === undefined ? {} : { secrets }) };
}

function call(app: App, method: string, path: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = { authorization: `Bearer ${TOKEN}` };
  if (body !== undefined) headers['content-type'] = 'application/json';
  return app(
    new Request(`http://127.0.0.1:7431${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
  );
}

interface SettingsBody {
  file: string;
  registry: RegistryFileData;
  effective: { default: string | null; stepTimeoutMs: number; providers: Array<{ id: string; kind: string; auth: string; capabilities: Record<string, unknown> }> };
}

async function settings(app: App): Promise<SettingsBody> {
  const res = await call(app, 'GET', '/settings');
  expect(res.status).toBe(200);
  return (await res.json()) as SettingsBody;
}

async function health(app: App): Promise<{ default: string | null; stepTimeoutMs: number; providers: Array<{ id: string }> }> {
  const res = await call(app, 'GET', '/health');
  expect(res.status).toBe(200);
  return (await res.json()) as { default: string | null; stepTimeoutMs: number; providers: Array<{ id: string }> };
}

describe('GET /settings', () => {
  test('reports the file, its parsed contents, and the effective runtime', async () => {
    const { app, file } = harness({
      contents: 'default: ollama/gemma4:e4b\nstepTimeoutMs: 120000\n',
    });
    const body = await settings(app);
    expect(body.file).toBe(file);
    expect(body.registry).toEqual({ default: 'ollama/gemma4:e4b', stepTimeoutMs: 120000 });
    expect(body.effective.default).toBe('ollama/gemma4:e4b');
    expect(body.effective.stepTimeoutMs).toBe(120000);
    expect(body.effective.providers.map(p => p.id)).toContain('ollama/gemma4:e4b');
    const gemma = body.effective.providers.find(p => p.id === 'ollama/gemma4:e4b')!;
    expect(gemma.kind).toBe('direct');
    expect(gemma.auth).toBe('local');
    expect(gemma.capabilities.contextTokens).toEqual(expect.any(Number));
  });

  test('an absent file is an empty registry, not an error', async () => {
    const body = await settings(harness().app);
    expect(body.registry).toEqual({});
    expect(body.effective.stepTimeoutMs).toBe(DEFAULT_STEP_TIMEOUT_MS);
    expect(body.effective.providers.length).toBeGreaterThan(0);
  });

  test('needs the bearer token', async () => {
    const { app } = harness();
    expect((await app(new Request('http://127.0.0.1:7431/settings'))).status).toBe(401);
    expect((await app(new Request('http://127.0.0.1:7431/settings/test', { method: 'POST' }))).status).toBe(401);
  });
});

describe('PUT /settings', () => {
  test('writes the file and takes effect immediately', async () => {
    const { app, file } = harness();
    const next: RegistryFileData = { default: 'ollama/gemma4:e4b', stepTimeoutMs: 90_000 };
    const res = await call(app, 'PUT', '/settings', next);
    expect(res.status).toBe(200);
    const body = (await res.json()) as SettingsBody;
    expect(body.registry).toEqual(next);
    expect(body.effective.default).toBe('ollama/gemma4:e4b');

    // On disk, and read back by a fresh reader.
    expect(readRegistry(file)).toEqual(next);
    // And live: no restart between the PUT and this request.
    const h = await health(app);
    expect(h.default).toBe('ollama/gemma4:e4b');
    expect(h.stepTimeoutMs).toBe(90_000);
  });

  test('a provider added by PUT is usable by the very next step', async () => {
    const { app, file } = harness();
    const before = await health(app);
    expect(before.providers.map(p => p.id)).not.toContain('openai-compatible/groq');

    const res = await call(app, 'PUT', '/settings', {
      providers: [{ id: 'openai-compatible/groq', baseURL: 'https://api.groq.com/openai/v1' }],
    });
    expect(res.status).toBe(200);
    expect(readRegistry(file).providers?.[0]?.id).toBe('openai-compatible/groq');
    expect((await health(app)).providers.map(p => p.id)).toContain('openai-compatible/groq');
  });

  test('a body the schema rejects is 400, and the file is untouched', async () => {
    const { app, file } = harness({ contents: 'default: ollama/gemma4:e4b\n' });
    const res = await call(app, 'PUT', '/settings', { stepTimeoutMs: 'soon' });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; issues?: unknown[] };
    expect(body.issues?.length).toBeGreaterThan(0);
    expect(readFileSync(file, 'utf8')).toBe('default: ollama/gemma4:e4b\n');
    expect((await health(app)).default).toBe('ollama/gemma4:e4b');
  });

  test('a registry that does not build is 422, and the previous file is restored', async () => {
    const contents = 'default: ollama/gemma4:e4b\n';
    const { app, file } = harness({ contents });
    // `openai-compatible` with no baseURL parses fine and then fails to
    // construct — the whole reason 422 is a different answer from 400.
    const res = await call(app, 'PUT', '/settings', { providers: [{ id: 'openai-compatible/x' }] });
    expect(res.status).toBe(422);
    expect(((await res.json()) as { error: string }).error).toContain('baseURL');
    expect(readFileSync(file, 'utf8')).toBe(contents);
    // The live runtime never moved.
    expect((await health(app)).default).toBe('ollama/gemma4:e4b');
  });

  test('a failed PUT with no file to begin with leaves no file behind', async () => {
    const { app, file } = harness();
    expect(existsSync(file)).toBe(false);
    expect((await call(app, 'PUT', '/settings', { providers: [{ id: 'openai-compatible/x' }] })).status).toBe(422);
    expect(existsSync(file)).toBe(false);
  });

  test('a baseURL outside the bound is 400, and the file is untouched', async () => {
    const contents = 'default: ollama/gemma4:e4b\n';
    const { app, file } = harness({ contents });
    const res = await call(app, 'PUT', '/settings', {
      providers: [{ id: 'openai-compatible/x', baseURL: 'http://attacker.example/v1', apiKeyEnv: 'SECRET' }],
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; issues?: Array<{ message: string }> };
    expect(body.issues?.some(i => i.message.includes('baseURL must be https'))).toBe(true);
    expect(readFileSync(file, 'utf8')).toBe(contents);
  });

  test('https and loopback http baseURLs are accepted', async () => {
    const { app } = harness();
    const res = await call(app, 'PUT', '/settings', {
      providers: [
        { id: 'openai-compatible/groq', baseURL: 'https://api.groq.com/openai/v1' },
        { id: 'openai-compatible/local', baseURL: 'http://127.0.0.1:11434/v1' },
      ],
    });
    expect(res.status).toBe(200);
    const ids = (await health(app)).providers.map(p => p.id);
    expect(ids).toContain('openai-compatible/groq');
    expect(ids).toContain('openai-compatible/local');
  });

  test('a task route with the wrong shape is 400', async () => {
    const { app } = harness();
    const res = await call(app, 'PUT', '/settings', { tasks: { classify: { prefer: 5 } } });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { issues?: unknown[] }).issues?.length).toBeGreaterThan(0);
  });

  test('a rejected PUT restores the previous file byte for byte', async () => {
    const { app, file } = harness();
    // Not valid UTF-8: a lone 0x80 continuation byte, inside a YAML comment
    // so the file still parses. A restore that decoded to a string would put
    // U+FFFD back and call it unchanged.
    const raw = Buffer.concat([Buffer.from('# \u00ff'), Buffer.from([0x80]), Buffer.from('\ndefault: ollama/gemma4:e4b\n')]);
    writeFileSync(file, raw);
    expect((await call(app, 'PUT', '/settings', { providers: [{ id: 'openai-compatible/x' }] })).status).toBe(422);
    expect(readFileSync(file).equals(raw)).toBe(true);
  });

  test('the file it writes is 0600', async () => {
    const { app, file } = harness();
    expect((await call(app, 'PUT', '/settings', { default: 'ollama/gemma4:e4b' })).status).toBe(200);
    expect(statSync(file).mode & 0o777).toBe(0o600);
  });

  test('overlapping PUTs do not interleave: the valid one is what survives', async () => {
    const { app, file } = harness({ contents: 'default: claude-sub/claude-opus-5\n' });
    const [good, bad] = await Promise.all([
      call(app, 'PUT', '/settings', { default: 'ollama/gemma4:e4b' }),
      call(app, 'PUT', '/settings', { providers: [{ id: 'openai-compatible/x' }] }),
    ]);
    expect(good.status).toBe(200);
    expect(bad.status).toBe(422);
    // The rejected PUT restored what IT found, not what it never saw: the
    // file and the live runtime agree, and they agree on the valid write.
    //
    // This pins the OUTCOME, not the mechanism. `applySettings` has no
    // `await` inside it today, so there is no yield point for two PUTs to
    // interleave at and the assertion holds with the lock removed. It is the
    // regression guard for the day the write or the reload becomes async —
    // when it does, this test is what fails.
    expect(readRegistry(file)).toEqual({ default: 'ollama/gemma4:e4b' });
    expect((await health(app)).default).toBe('ollama/gemma4:e4b');
  });

  test('--fake survives a reload', async () => {
    const { app } = harness({ fake: true });
    expect((await health(app)).default).toBe('fake/fake');
    expect((await call(app, 'PUT', '/settings', { default: 'ollama/gemma4:e4b' })).status).toBe(200);
    const h = await health(app);
    // The override beats the file it was never written to.
    expect(h.providers.map(p => p.id)).toContain('fake/fake');
    expect(h.default).toBe('fake/fake');
  });
});

describe('POST /settings/test', () => {
  test('runs one step on a scratch thread and reports usage', async () => {
    const { app, fake } = harness({ fake: true });
    const res = await call(app, 'POST', '/settings/test', { provider: 'fake/fake' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; usage?: { inputTokens: number }; error?: string; ms: number };
    expect(body.ok).toBe(true);
    expect(body.usage?.inputTokens).toBe(7);
    expect(body.error).toBeUndefined();
    expect(body.ms).toEqual(expect.any(Number));

    expect(fake.lastRequest?.messages.at(-1)?.content).toContain('Reply with the single word OK.');
    // The scratch thread is gone: a test must not leave a thread in the list.
    expect(await store.list('default')).toEqual([]);
  });

  test('a provider that fails is ok:false with the message, and still cleans up', async () => {
    const { app } = harness({ fake: true, script: [{ error: 'no credentials' }] });
    const res = await call(app, 'POST', '/settings/test', { provider: 'fake/fake' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; error?: string };
    expect(body.ok).toBe(false);
    expect(body.error).toContain('no credentials');
    expect(await store.list('default')).toEqual([]);
  });

  test('an unknown provider id is 404 and creates no thread', async () => {
    const { app } = harness({ fake: true });
    const res = await call(app, 'POST', '/settings/test', { provider: 'nope/nope' });
    expect(res.status).toBe(404);
    expect(((await res.json()) as { error: string }).error).toContain('nope/nope');
    expect(await store.list('default')).toEqual([]);
  });

  test('a missing provider field is 400', async () => {
    const { app } = harness({ fake: true });
    expect((await call(app, 'POST', '/settings/test', {})).status).toBe(400);
  });
});

describe('runtimeState', () => {
  test('reload installs the file that is on disk now', () => {
    const home = mkdtempSync(join(tmpdir(), 'settings-home-'));
    const file = join(home, 'providers.yaml');
    const runtime = runtimeState({ vaultRoot, registryFile: file, env: {} });
    const first = runtime.state();
    writeFileSync(file, 'default: ollama/gemma4:e4b\nstepTimeoutMs: 45000\n', 'utf8');
    runtime.reload();
    expect(runtime.state().defaultId).toBe('ollama/gemma4:e4b');
    expect(runtime.state().stepTimeoutMs).toBe(45_000);
    expect(runtime.state()).not.toBe(first);
  });

  test('a file that does not build throws and leaves the live state alone', () => {
    const home = mkdtempSync(join(tmpdir(), 'settings-home-'));
    const file = join(home, 'providers.yaml');
    const runtime = runtimeState({ vaultRoot, registryFile: file, env: {} });
    const before = runtime.state();
    writeFileSync(file, 'providers:\n  - id: openai-compatible/x\n', 'utf8');
    expect(() => runtime.reload()).toThrow(/baseURL/);
    expect(runtime.state()).toBe(before);
  });

  test('an explicit step timeout beats the file, on every reload', () => {
    const home = mkdtempSync(join(tmpdir(), 'settings-home-'));
    const file = join(home, 'providers.yaml');
    const runtime = runtimeState({ vaultRoot, registryFile: file, env: {}, stepTimeoutMs: 11_000 });
    expect(runtime.state().stepTimeoutMs).toBe(11_000);
    writeFileSync(file, 'stepTimeoutMs: 45000\n', 'utf8');
    runtime.reload();
    expect(runtime.state().stepTimeoutMs).toBe(11_000);
  });
});

describe('provider keys (providers spec §5)', () => {
  const GOOGLE = 'providers:\n  - id: google/gemini-2.5-pro\n';

  test('PUT stores the key, reloads, and never echoes it; GET /settings and /health report keySet and where', async () => {
    const h = harness({ contents: GOOGLE });
    const before = await settings(h.app);
    const g = before.effective.providers.find(p => p.id === 'google/gemini-2.5-pro') as { keySet?: unknown } | undefined;
    expect(g?.keySet).toBe(false);
    expect((before as unknown as { secrets: { where: string } }).secrets).toEqual({ where: 'file' });

    const put = await call(h.app, 'PUT', '/providers/google/gemini-2.5-pro/key', { value: '  AIza-test-value-1  ' });
    expect(put.status).toBe(204);
    expect(await put.text()).toBe('');
    expect(h.secrets?.get('google/gemini-2.5-pro')).toBe('AIza-test-value-1');

    const after = await settings(h.app);
    const text = JSON.stringify(after);
    expect(text).not.toContain('AIza-test-value-1');
    expect((after.effective.providers.find(p => p.id === 'google/gemini-2.5-pro') as { keySet?: unknown }).keySet).toBe(true);
    const hp = (await (await call(h.app, 'GET', '/health')).json()) as { providers: Array<{ id: string; keySet?: unknown }> };
    expect(JSON.stringify(hp)).not.toContain('AIza-test-value-1');
    expect(hp.providers.find(p => p.id === 'google/gemini-2.5-pro')?.keySet).toBe(true);
    // A provider that takes no key carries no keySet at all.
    expect('keySet' in (hp.providers.find(p => p.id === 'claude-sub/claude-opus-5') ?? {})).toBe(false);

    const del = await call(h.app, 'DELETE', '/providers/google/gemini-2.5-pro/key');
    expect(del.status).toBe(204);
    expect((await call(h.app, 'DELETE', '/providers/google/gemini-2.5-pro/key')).status).toBe(204);
    expect((await settings(h.app)).effective.providers.find(p => p.id === 'google/gemini-2.5-pro')).toMatchObject({ keySet: false });
  });

  test('a key from the environment reads as env; a stored one beats it', async () => {
    const h = harness({ contents: GOOGLE, env: { GOOGLE_GENERATIVE_AI_API_KEY: 'AIza-env' } });
    expect((await settings(h.app)).effective.providers.find(p => p.id === 'google/gemini-2.5-pro')).toMatchObject({ keySet: 'env' });
    expect((await call(h.app, 'PUT', '/providers/google/gemini-2.5-pro/key', { value: 'AIza-app' })).status).toBe(204);
    expect((await settings(h.app)).effective.providers.find(p => p.id === 'google/gemini-2.5-pro')).toMatchObject({ keySet: true });
  });

  test('validation: empty and oversized values are 400; a keyless or unknown provider is 404; a slashed id resolves', async () => {
    const h = harness({ contents: GOOGLE });
    expect((await call(h.app, 'PUT', '/providers/google/gemini-2.5-pro/key', { value: '   ' })).status).toBe(400);
    expect((await call(h.app, 'PUT', '/providers/google/gemini-2.5-pro/key', { value: 'x'.repeat(5000) })).status).toBe(400);
    expect((await call(h.app, 'PUT', '/providers/google/gemini-2.5-pro/key', {})).status).toBe(400);
    expect((await call(h.app, 'PUT', '/providers/claude-sub/claude-opus-5/key', { value: 'k' })).status).toBe(404);
    expect((await call(h.app, 'PUT', '/providers/ollama/gemma4:e4b/key', { value: 'k' })).status).toBe(404);
    expect((await call(h.app, 'PUT', '/providers/nope/x/key', { value: 'k' })).status).toBe(404);
    expect((await call(h.app, 'PUT', '/providers/openrouter/anthropic/claude-x/key', { value: 'or-key' })).status).toBe(204);
    expect(h.secrets?.get('openrouter/anthropic/claude-x')).toBe('or-key');
  });

  test('a runtime with no store answers 503 and reports secrets: null', async () => {
    const h = harness({ contents: GOOGLE, secrets: null });
    expect((await call(h.app, 'PUT', '/providers/google/gemini-2.5-pro/key', { value: 'k' })).status).toBe(503);
    expect((await call(h.app, 'DELETE', '/providers/google/gemini-2.5-pro/key')).status).toBe(503);
    expect((await settings(h.app) as unknown as { secrets: unknown }).secrets).toBeNull();
  });

  test('the key routes need the bearer token', async () => {
    const h = harness({ contents: GOOGLE });
    const res = await h.app(new Request('http://127.0.0.1:7431/providers/google/gemini-2.5-pro/key', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ value: 'k' }) }));
    expect(res.status).toBe(401);
  });
});
