import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { allVendors, vendorFor } from './vendors';
import {
  decodeSecretFields,
  defaultRunner,
  encodeSecretFields,
  fileStore,
  keyIdFor,
  keyStateFor,
  readKey,
  readSecretFields,
  writeSecretFields,
  keychainStore,
  libsecretStore,
  memoryStore,
  openSecretStore,
  redact,
  secretsFilePath,
  serviceFor,
  type CommandRunner,
} from './secrets';

describe('fileStore', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'secrets-'));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  test('round-trips at 0600 in a 0700 directory, and forgets on delete', () => {
    const file = join(dir, 'home', 'secrets.json');
    const store = fileStore(file);
    expect(store.get('google/gemini-2.5-pro')).toBeNull();
    store.set('google/gemini-2.5-pro', 'sk-google-1');
    store.set('openai/gpt-5.6', 'sk-openai-1');
    expect(store.get('google/gemini-2.5-pro')).toBe('sk-google-1');
    expect(statSync(file).mode & 0o777).toBe(0o600);
    expect(statSync(join(dir, 'home')).mode & 0o777).toBe(0o700);
    // Replacing keeps the other key.
    store.set('google/gemini-2.5-pro', 'sk-google-2');
    expect(store.get('google/gemini-2.5-pro')).toBe('sk-google-2');
    expect(store.get('openai/gpt-5.6')).toBe('sk-openai-1');
    store.delete('google/gemini-2.5-pro');
    store.delete('google/gemini-2.5-pro'); // idempotent
    expect(store.get('google/gemini-2.5-pro')).toBeNull();
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual({ version: 1, keys: { 'openai/gpt-5.6': 'sk-openai-1' } });
    expect(store.where()).toBe('file');
  });

  test('secretsFilePath follows COUNSEL_OS_HOME', () => {
    expect(secretsFilePath({ COUNSEL_OS_HOME: '/x/home' })).toBe('/x/home/secrets.json');
  });
});

/** A fake `security` / `secret-tool` that records argv and never sees a
 * shell. */
function fakeRunner(behaviour: (cmd: string, args: string[], stdin?: string) => { code: number; stdout?: string }): { runner: CommandRunner; calls: Array<{ cmd: string; args: string[]; stdin?: string }> } {
  const calls: Array<{ cmd: string; args: string[]; stdin?: string }> = [];
  const runner: CommandRunner = (cmd, args, stdin) => {
    calls.push({ cmd, args, ...(stdin === undefined ? {} : { stdin }) });
    const r = behaviour(cmd, args, stdin);
    return { code: r.code, stdout: r.stdout ?? '', stderr: '' };
  };
  return { runner, calls };
}

describe('keychainStore (argv shape, over a fake security)', () => {
  test('find / add -U / delete with the account, the service, and the keychain path last', () => {
    const items = new Map<string, string>();
    const { runner, calls } = fakeRunner((_cmd, args) => {
      const service = args[args.indexOf('-s') + 1]!;
      if (args[0] === 'find-generic-password') {
        const v = items.get(service);
        return v === undefined ? { code: 44 } : { code: 0, stdout: `${v}\n` };
      }
      if (args[0] === 'add-generic-password') {
        items.set(service, args[args.indexOf('-w') + 1]!);
        return { code: 0 };
      }
      if (args[0] === 'delete-generic-password') return items.delete(service) ? { code: 0 } : { code: 44 };
      return { code: 1 };
    });
    const store = keychainStore({ runner, keychainPath: '/tmp/t.keychain-db' });
    expect(store.get('openai/gpt-5.6')).toBeNull();
    store.set('openai/gpt-5.6', 'sk-1');
    expect(store.get('openai/gpt-5.6')).toBe('sk-1');
    store.delete('openai/gpt-5.6');
    store.delete('openai/gpt-5.6');
    expect(store.get('openai/gpt-5.6')).toBeNull();
    expect(serviceFor('openai/gpt-5.6')).toBe('counsel-os/openai/gpt-5.6');
    for (const c of calls) {
      expect(c.cmd).toBe('security');
      expect(c.args).toContain('counsel-os/openai/gpt-5.6');
      expect(c.args[c.args.length - 1]).toBe('/tmp/t.keychain-db');
    }
    expect(calls[1]!.args.slice(0, 2)).toEqual(['add-generic-password', '-U']);
  });

  test('an unexpected exit is an error that names the item, never the value', () => {
    const { runner } = fakeRunner(() => ({ code: 36 }));
    const store = keychainStore({ runner });
    expect(() => store.set('x/y', 'sk-secret')).toThrow(/counsel-os\/x\/y.*36/);
    expect(() => store.set('x/y', 'sk-secret')).not.toThrow(/sk-secret/);
  });
});

const hasSecurity = process.platform === 'darwin' && Bun.which('security') !== null;

describe.if(hasSecurity)('keychainStore against a temporary keychain (macOS)', () => {
  let dir: string;
  let keychain: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'kc-'));
    keychain = join(dir, 'test.keychain-db');
    expect(defaultRunner('security', ['create-keychain', '-p', 'pw', keychain]).code).toBe(0);
    expect(defaultRunner('security', ['unlock-keychain', '-p', 'pw', keychain]).code).toBe(0);
  });
  afterEach(() => {
    defaultRunner('security', ['delete-keychain', keychain]);
    rmSync(dir, { recursive: true, force: true });
  });

  test('set, replace, get, delete on the temp keychain only', () => {
    const store = keychainStore({ keychainPath: keychain });
    expect(store.get('google/gemini-2.5-pro')).toBeNull();
    store.set('google/gemini-2.5-pro', 'AIza-test-1');
    expect(store.get('google/gemini-2.5-pro')).toBe('AIza-test-1');
    store.set('google/gemini-2.5-pro', 'AIza-test-2');
    expect(store.get('google/gemini-2.5-pro')).toBe('AIza-test-2');
    store.delete('google/gemini-2.5-pro');
    expect(store.get('google/gemini-2.5-pro')).toBeNull();
  });
});

describe('libsecretStore (over a fake secret-tool)', () => {
  test('store reads the value from stdin; lookup and clear by attributes', () => {
    const items = new Map<string, string>();
    const { runner, calls } = fakeRunner((_cmd, args, stdin) => {
      const id = args[args.indexOf('id') + 1]!;
      if (args[0] === 'store') {
        items.set(id, stdin ?? '');
        return { code: 0 };
      }
      if (args[0] === 'lookup') {
        const v = items.get(id);
        return v === undefined ? { code: 1 } : { code: 0, stdout: v };
      }
      if (args[0] === 'clear') {
        items.delete(id);
        return { code: 0 };
      }
      return { code: 1 };
    });
    const store = libsecretStore({ runner });
    expect(store.get('mistral/x')).toBeNull();
    store.set('mistral/x', 'sk-m');
    expect(store.get('mistral/x')).toBe('sk-m');
    store.delete('mistral/x');
    expect(store.get('mistral/x')).toBeNull();
    // The value never rides in argv.
    for (const c of calls) expect(c.args).not.toContain('sk-m');
    expect(calls[1]!.stdin).toBe('sk-m');
    expect(store.where()).toBe('libsecret');
  });
});

describe('openSecretStore', () => {
  test('macOS with security → keychain; COUNSEL_OS_KEYCHAIN aims it at a file', () => {
    const { runner, calls } = fakeRunner(() => ({ code: 44 }));
    const store = openSecretStore({ env: { COUNSEL_OS_KEYCHAIN: '/tmp/k.db' }, platform: 'darwin', available: () => true, runner });
    expect(store.where()).toBe('keychain');
    store.get('a/b');
    expect(calls[0]!.args[calls[0]!.args.length - 1]).toBe('/tmp/k.db');
  });

  test('linux with secret-tool → libsecret; without it → file', () => {
    expect(openSecretStore({ env: { COUNSEL_OS_HOME: '/tmp/h' }, platform: 'linux', available: cmd => cmd === 'secret-tool' }).where()).toBe('libsecret');
    expect(openSecretStore({ env: { COUNSEL_OS_HOME: '/tmp/h' }, platform: 'linux', available: () => false }).where()).toBe('file');
  });

  test('COUNSEL_OS_SECRETS=file wins everywhere', () => {
    expect(openSecretStore({ env: { COUNSEL_OS_SECRETS: 'file', COUNSEL_OS_HOME: '/tmp/h' }, platform: 'darwin', available: () => true }).where()).toBe('file');
  });
});

describe('redact and keyStateFor', () => {
  test('redact scrubs every occurrence and tolerates nothing to scrub', () => {
    expect(redact('key sk-1 refused; retry with sk-1', 'sk-1')).toBe('key [redacted] refused; retry with [redacted]');
    expect(redact('plain', null)).toBe('plain');
    expect(redact('plain', '')).toBe('plain');
  });

  test('the store wins, then the environment, then nothing', () => {
    const store = memoryStore({ 'openai/gpt-5.6': 'sk' });
    expect(keyStateFor('openai/gpt-5.6', 'OPENAI_API_KEY', store, {})).toBe(true);
    expect(keyStateFor('google/g', 'GOOGLE_KEY', store, { GOOGLE_KEY: 'x' })).toBe('env');
    expect(keyStateFor('google/g', 'GOOGLE_KEY', store, { GOOGLE_KEY: '' })).toBe(false);
    expect(keyStateFor('google/g', undefined, undefined, {})).toBe(false);
    const broken = { ...store, get: () => { throw new Error('locked'); } };
    expect(keyStateFor('openai/gpt-5.6', 'OPENAI_API_KEY', broken, {})).toBe(false);
  });

  test('a temp file store used through the chooser never lands in the real home', () => {
    const dir = mkdtempSync(join(tmpdir(), 'secrets-home-'));
    const store = openSecretStore({ env: { COUNSEL_OS_SECRETS: 'file', COUNSEL_OS_HOME: dir }, platform: 'darwin', available: () => true });
    store.set('a/b', 'v');
    expect(existsSync(join(dir, 'secrets.json'))).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('secret fields — several secrets as ONE store item (providers spec §3 step 5)', () => {
  test('round trip through a store: one item under the ROW, the empty fields dropped', () => {
    const store = memoryStore();
    writeSecretFields(store, 'bedrock/m', { accessKeyId: 'A', secretAccessKey: 'B', sessionToken: '' });
    expect(readSecretFields(store, 'bedrock/m')).toEqual({ accessKeyId: 'A', secretAccessKey: 'B' });
    // Per ROW, not per vendor: an enterprise row carries its own account —
    // an AWS region and keys, an Azure resource, a GCP project — so two
    // rows are two accounts and must never share one item.
    expect(store.get('bedrock/m')).toBe('{"v":1,"fields":{"accessKeyId":"A","secretAccessKey":"B"}}');
    expect(store.get('bedrock')).toBeNull();
    expect(store.get('bedrock/m/accessKeyId')).toBeNull();
    expect(readSecretFields(store, 'bedrock/anthropic.claude-3')).toBeNull();
    store.delete('bedrock/m');
    expect(readSecretFields(store, 'bedrock/m')).toBeNull();
  });

  test('a key is filed under the vendor only when the row cannot move the endpoint', () => {
    // Shared: the catalog fixes where OpenAI is, so one key opens every
    // model it sells.
    expect(keyIdFor('openai/gpt-5.6')).toBe('openai');
    expect(keyIdFor('groq/llama-3.3-70b')).toBe('groq');
    expect(keyIdFor('openrouter/anthropic/claude-x')).toBe('openrouter');

    // Per row, because the ROW decides where the key goes or whose account
    // it is. Sharing these would send one tenant's credential to another
    // tenant's host.
    expect(keyIdFor('openai-compatible/llama-70b')).toBe('openai-compatible/llama-70b');
    expect(keyIdFor('cloudflare/llama')).toBe('cloudflare/llama');
    expect(keyIdFor('bedrock/m')).toBe('bedrock/m');
    expect(keyIdFor('azure/deployment')).toBe('azure/deployment');
    expect(keyIdFor('vertex/gemini-3-pro')).toBe('vertex/gemini-3-pro');
    // A row pointing somewhere ELSE: a region, a proxy, a private gateway.
    // DashScope's own note says its keys are per region.
    expect(keyIdFor('dashscope/qwen-max', { baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1' })).toBe('dashscope/qwen-max');
    expect(keyIdFor('openai/gpt-5.6', { baseURL: '' })).toBe('openai');
  });

  test('the preset URL the catalog prefills is not an override — a key set up on a row is still there after it saves', () => {
    // `catalogRow` prefills every preset row with the vendor's OWN address.
    // Counting that as "the row moved the endpoint" filed the key under the
    // bare prefix while the row was pending and under the full id the moment
    // it saved: pasted, accepted, then unreadable, and the same key had to
    // be pasted again.
    const preset = vendorFor('moonshot')!.defaultBaseURL!;
    expect(preset).not.toBe('');
    expect(keyIdFor('moonshot/', {})).toBe('moonshot');
    expect(keyIdFor('moonshot/kimi-k2', { baseURL: preset })).toBe('moonshot');
    // Trailing slashes are the same address.
    expect(keyIdFor('moonshot/kimi-k2', { baseURL: `${preset}/` })).toBe('moonshot');
    // Somewhere else really is somewhere else.
    expect(keyIdFor('moonshot/kimi-k2', { baseURL: 'https://proxy.example/v1' })).toBe('moonshot/kimi-k2');

    // The round trip a lawyer actually makes: paste on the pending row,
    // then save the row.
    const store = memoryStore();
    store.set(keyIdFor('moonshot/', {}), 'sk-moonshot');
    expect(readKey(store, 'moonshot/kimi-k2', { baseURL: preset })).toBe('sk-moonshot');
  });

  test('every preset the catalog prefills survives that round trip', () => {
    // One test rather than nine: any preset vendor whose row is created with
    // its own base URL must read its key back after the save.
    const store = memoryStore();
    for (const vendor of allVendors()) {
      if (vendor.defaultBaseURL === undefined || vendor.auth !== 'apikey') continue;
      if (vendor.fields !== undefined || vendor.baseURLFields !== undefined || vendor.locality === 'by-baseURL') continue;
      store.set(keyIdFor(`${vendor.prefix}/`, {}), `sk-${vendor.prefix}`);
      expect(readKey(store, `${vendor.prefix}/a-model`, { baseURL: vendor.defaultBaseURL })).toBe(`sk-${vendor.prefix}`);
    }
  });

  test('two OpenAI-compatible rows on different hosts never share a key', () => {
    // The failure this guards: paste the firm's key on one row, a vendor's
    // key on the other, and a shared item would send the firm's key to the
    // vendor — or the vendor's to the firm.
    const store = memoryStore();
    const firm = { baseURL: 'https://llm.myfirm.example/v1' };
    const other = { baseURL: 'https://api.vendor-b.example/v1' };
    store.set(keyIdFor('openai-compatible/a', firm), 'sk-firm');
    store.set(keyIdFor('openai-compatible/b', other), 'sk-vendor');
    expect(readKey(store, 'openai-compatible/a', firm)).toBe('sk-firm');
    expect(readKey(store, 'openai-compatible/b', other)).toBe('sk-vendor');
  });

  test('a key an older install filed under the model is still found', () => {
    // Keys were filed under `<vendor>/<model>` before providers became
    // provider-shaped. Nobody re-pastes a key because we changed our minds.
    const store = memoryStore({ 'openai/gpt-5.6': 'sk-old' });
    expect(readKey(store, 'openai/gpt-5.6')).toBe('sk-old');
    // The vendor's own item wins once it exists.
    store.set('openai', 'sk-new');
    expect(readKey(store, 'openai/gpt-5.6')).toBe('sk-new');
    // And it answers for a model that never had an item of its own.
    expect(readKey(store, 'openai/gpt-5.6-mini')).toBe('sk-new');
    expect(readKey(undefined, 'openai/gpt-5.6')).toBeNull();
  });

  test('a plain key is not fields; a malformed envelope reads as none; no store reads as none', () => {
    expect(decodeSecretFields('sk-plain')).toBeNull();
    expect(decodeSecretFields('{"v":2,"fields":{}}')).toBeNull();
    expect(decodeSecretFields('{not json')).toBeNull();
    expect(decodeSecretFields(null)).toBeNull();
    expect(decodeSecretFields(encodeSecretFields({ apiKey: 'k', n: 5 as unknown as string }))).toEqual({ apiKey: 'k' });
    expect(readSecretFields(undefined, 'x')).toBeNull();
    const broken = { ...memoryStore(), get: () => { throw new Error('locked'); } };
    expect(readSecretFields(broken, 'x')).toBeNull();
  });

  test('redact scrubs every field value out of a message', () => {
    const msg = 'request to https://x failed with key A and secret B';
    const fields = { accessKeyId: 'A', secretAccessKey: 'B' };
    const out = Object.values(fields).reduce((t, v) => redact(t, v), msg);
    expect(out).not.toContain(' A ');
    expect(out).toContain('[redacted]');
  });
});
