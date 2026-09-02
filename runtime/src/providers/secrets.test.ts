import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  decodeSecretFields,
  defaultRunner,
  encodeSecretFields,
  fileStore,
  keyStateFor,
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
  test('round trip through a store: one item under the id, the empty fields dropped', () => {
    const store = memoryStore();
    writeSecretFields(store, 'bedrock/m', { accessKeyId: 'A', secretAccessKey: 'B', sessionToken: '' });
    expect(readSecretFields(store, 'bedrock/m')).toEqual({ accessKeyId: 'A', secretAccessKey: 'B' });
    // One item, and it is the envelope — never a keychain entry per field.
    expect(store.get('bedrock/m')).toBe('{"v":1,"fields":{"accessKeyId":"A","secretAccessKey":"B"}}');
    expect(store.get('bedrock/m/accessKeyId')).toBeNull();
    store.delete('bedrock/m');
    expect(readSecretFields(store, 'bedrock/m')).toBeNull();
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
