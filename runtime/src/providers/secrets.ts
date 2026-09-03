/**
 * Where API keys live (providers spec §5).
 *
 * A key is pasted once into the app and kept OUT of everything the runtime
 * otherwise writes: not `providers.yaml` (a map of endpoints and variable
 * names, 0600 but still a file a lawyer might paste into a support thread),
 * not the vault (synced, versioned, shared), not a log line, not a response.
 * The store is the one place it goes:
 *
 * - macOS: the login keychain, through the `security` CLI. Items are
 *   `counsel-os/<providerId>` under the account `counsel-os`, so they read
 *   as one group in Keychain Access. The `security` binary is what reads
 *   them back, so no other app's ACL prompt appears.
 * - Linux: `secret-tool` (libsecret) when it is on PATH.
 * - Otherwise: `<counselHome>/secrets.json`, mode 0600, written atomically.
 *   Settings says so in plain words.
 *
 * `COUNSEL_OS_SECRETS=file` forces the file store (headless, CI); the
 * `COUNSEL_OS_KEYCHAIN` path points the keychain store at a keychain file
 * other than the login one — what the tests use, so they never touch the
 * developer's real keychain.
 *
 * Values never appear in error text: every failure here is reported by
 * exit code and item id, and `redact` scrubs a value out of any message
 * that might carry one.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeFileAtomic } from '../core/atomic-write';
import { counselHome } from '../core/home';
import { prefixOf } from './vendors';

export type SecretStoreKind = 'keychain' | 'libsecret' | 'file';

export interface SecretStore {
  /** The stored value, or `null` when there is none. */
  get(id: string): string | null;
  set(id: string, value: string): void;
  /** Idempotent: removing what is not there is not an error. */
  delete(id: string): void;
  where(): SecretStoreKind;
}

/** What a store shells out with. Injected so the keychain and libsecret
 * stores are testable without the real tools. */
export interface CommandRunner {
  (cmd: string, args: string[], stdin?: string): { code: number; stdout: string; stderr: string };
}

export const defaultRunner: CommandRunner = (cmd, args, stdin) => {
  const proc = Bun.spawnSync([cmd, ...args], {
    stdin: stdin === undefined ? 'ignore' : new TextEncoder().encode(stdin),
    stdout: 'pipe',
    stderr: 'pipe',
  });
  return { code: proc.exitCode, stdout: proc.stdout.toString(), stderr: proc.stderr.toString() };
};

/** The keychain service name for a provider. One namespace, so a lawyer
 * looking in Keychain Access sees `counsel-os/openai` next to
 * `counsel-os/google`. */
export function serviceFor(id: string): string {
  return `counsel-os/${id}`;
}

const ACCOUNT = 'counsel-os';

/** `security find-generic-password` exits 44 for "not found". */
const SECURITY_NOT_FOUND = 44;

export function keychainStore(opts: { runner?: CommandRunner; keychainPath?: string } = {}): SecretStore {
  const run = opts.runner ?? defaultRunner;
  // The keychain file goes LAST on every command: `security` takes it as a
  // trailing positional argument.
  const tail = opts.keychainPath === undefined ? [] : [opts.keychainPath];
  return {
    where: () => 'keychain',
    get(id) {
      const r = run('security', ['find-generic-password', '-a', ACCOUNT, '-s', serviceFor(id), '-w', ...tail]);
      if (r.code === SECURITY_NOT_FOUND) return null;
      if (r.code !== 0) throw new Error(`keychain read failed for ${serviceFor(id)} (security exited ${r.code})`);
      // `-w` prints the value and a newline; a stored value never has one.
      return r.stdout.replace(/\r?\n$/, '');
    },
    set(id, value) {
      // `-U` updates an existing item in place instead of failing on it.
      // The value rides in argv — the `security` CLI offers no stdin form
      // for the password short of its interactive mode, whose quoting is
      // its own risk; the window is the process's lifetime, on this user's
      // own machine.
      const r = run('security', ['add-generic-password', '-U', '-a', ACCOUNT, '-s', serviceFor(id), '-w', value, ...tail]);
      if (r.code !== 0) throw new Error(`keychain write failed for ${serviceFor(id)} (security exited ${r.code})`);
    },
    delete(id) {
      const r = run('security', ['delete-generic-password', '-a', ACCOUNT, '-s', serviceFor(id), ...tail]);
      if (r.code !== 0 && r.code !== SECURITY_NOT_FOUND) throw new Error(`keychain delete failed for ${serviceFor(id)} (security exited ${r.code})`);
    },
  };
}

export function libsecretStore(opts: { runner?: CommandRunner } = {}): SecretStore {
  const run = opts.runner ?? defaultRunner;
  const attrs = (id: string): string[] => ['service', 'counsel-os', 'id', id];
  return {
    where: () => 'libsecret',
    get(id) {
      const r = run('secret-tool', ['lookup', ...attrs(id)]);
      // `lookup` exits 1 with nothing on stdout when there is no item.
      if (r.code !== 0 && r.stdout === '') return null;
      if (r.code !== 0) throw new Error(`secret-tool lookup failed for ${id} (exited ${r.code})`);
      return r.stdout.replace(/\r?\n$/, '');
    },
    set(id, value) {
      // `store` reads the secret from stdin, which keeps it out of argv.
      const r = run('secret-tool', ['store', `--label=counsel-os ${id}`, ...attrs(id)], value);
      if (r.code !== 0) throw new Error(`secret-tool store failed for ${id} (exited ${r.code})`);
    },
    delete(id) {
      const r = run('secret-tool', ['clear', ...attrs(id)]);
      if (r.code !== 0) throw new Error(`secret-tool clear failed for ${id} (exited ${r.code})`);
    },
  };
}

/** `<counselHome>/secrets.json`: the fallback. 0600 in a 0700 directory,
 * like `providers.yaml` and the token file beside it. */
export function secretsFilePath(env: NodeJS.ProcessEnv = process.env): string {
  return join(counselHome(env), 'secrets.json');
}

interface SecretsFile {
  version: 1;
  keys: Record<string, string>;
}

const FILE_WRITE = { mode: 0o600, dirMode: 0o700 } as const;

export function fileStore(file: string): SecretStore {
  const read = (): SecretsFile => {
    if (!existsSync(file)) return { version: 1, keys: {} };
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as Partial<SecretsFile>;
    return { version: 1, keys: typeof parsed.keys === 'object' && parsed.keys !== null ? parsed.keys : {} };
  };
  const write = (data: SecretsFile): void => writeFileAtomic(file, `${JSON.stringify(data, null, 2)}\n`, FILE_WRITE);
  return {
    where: () => 'file',
    get: id => read().keys[id] ?? null,
    set(id, value) {
      const data = read();
      data.keys[id] = value;
      write(data);
    },
    delete(id) {
      const data = read();
      if (!(id in data.keys)) return;
      delete data.keys[id];
      write(data);
    },
  };
}

/** An in-memory store for tests and for callers that must not persist. */
export function memoryStore(initial: Record<string, string> = {}): SecretStore {
  const keys = new Map(Object.entries(initial));
  return {
    where: () => 'file',
    get: id => keys.get(id) ?? null,
    set: (id, value) => void keys.set(id, value),
    delete: id => void keys.delete(id),
  };
}

export interface OpenSecretStoreOptions {
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
  /** Whether a command exists on PATH. Injected for tests. */
  available?: (cmd: string) => boolean;
  runner?: CommandRunner;
}

function onPath(cmd: string): boolean {
  return Bun.which(cmd) !== null;
}

/**
 * The store for this machine: the keychain on macOS, libsecret on Linux
 * when `secret-tool` is installed, the file otherwise — or the file when
 * `COUNSEL_OS_SECRETS=file` says so (headless use, CI).
 */
export function openSecretStore(opts: OpenSecretStoreOptions = {}): SecretStore {
  const env = opts.env ?? process.env;
  const platform = opts.platform ?? process.platform;
  const available = opts.available ?? onPath;
  if (env.COUNSEL_OS_SECRETS === 'file') return fileStore(secretsFilePath(env));
  if (platform === 'darwin' && available('security')) {
    return keychainStore({ ...(opts.runner === undefined ? {} : { runner: opts.runner }), ...(env.COUNSEL_OS_KEYCHAIN === undefined ? {} : { keychainPath: env.COUNSEL_OS_KEYCHAIN }) });
  }
  if (platform === 'linux' && available('secret-tool')) return libsecretStore(opts.runner === undefined ? {} : { runner: opts.runner });
  return fileStore(secretsFilePath(env));
}

/** Scrubs `value` out of `text`, for any message that might have carried
 * it (an SDK error echoing a request, a stack). */
export function redact(text: string, value: string | null | undefined): string {
  if (value === undefined || value === null || value === '') return text;
  return text.split(value).join('[redacted]');
}

/**
 * A vendor that needs several secrets (Azure's key, AWS's access key and
 * secret, a Google service account) keeps them as ONE item under the
 * provider's id — never one keychain item per field — as a JSON envelope.
 * A value that is not the envelope reads as a plain key, so the two shapes
 * share the store without ambiguity.
 */
export interface SecretFields {
  v: 1;
  fields: Record<string, string>;
}

export function encodeSecretFields(fields: Record<string, string>): string {
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) if (typeof v === 'string' && v !== '') clean[k] = v;
  return JSON.stringify({ v: 1, fields: clean } satisfies SecretFields);
}

/** The fields in a stored value, or `null` when it is absent or a plain key. */
export function decodeSecretFields(value: string | null): Record<string, string> | null {
  if (value === null || !value.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(value) as Partial<SecretFields>;
    if (parsed.v !== 1 || typeof parsed.fields !== 'object' || parsed.fields === null) return null;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed.fields)) if (typeof v === 'string') out[k] = v;
    return out;
  } catch {
    return null;
  }
}

export function readSecretFields(store: SecretStore | undefined, id: string): Record<string, string> | null {
  // Filed under the vendor, like a single key — one AWS account, one Azure
  // resource. The full-id read is the fallback for an older install.
  return decodeSecretFields(readKey(store, id));
}

export function writeSecretFields(store: SecretStore, id: string, fields: Record<string, string>): void {
  store.set(keyIdFor(id), encodeSecretFields(fields));
}

/** What `/settings` and `/health` say about a provider's key: set in the
 * store, taken from the environment, found by the vendor SDK's own default
 * credential chain (an AWS profile, gcloud's Application Default
 * Credentials), or absent. Never the value. */
export type KeyState = true | false | 'env' | 'default-chain';

export function keyStateFor(id: string, keyEnv: string | undefined, store: SecretStore | undefined, env: NodeJS.ProcessEnv): KeyState {
  // An unreadable store reads as "not set": the page then offers to paste a
  // key, which is the right next step either way.
  if (readKey(store, id) !== null) return true;
  if (keyEnv !== undefined && env[keyEnv] !== undefined && env[keyEnv] !== '') return 'env';
  return false;
}

/**
 * What a key is filed under: the VENDOR, never the vendor and the model.
 *
 * One key opens every model a vendor sells. Filed under the full id, a
 * second OpenAI model asked for the OpenAI key a second time, as if it were
 * a different account — and deleting one model's key left the other's
 * behind. `prefixOf` is the same split the ids use everywhere else.
 */
export function keyIdFor(id: string): string {
  return prefixOf(id);
}

/**
 * A provider's key: the vendor's item, then the per-model item an older
 * install wrote. The fallback is what keeps a key pasted before this change
 * working, and it costs one keychain read on a miss.
 */
export function readKey(store: SecretStore | undefined, id: string): string | null {
  if (store === undefined) return null;
  const vendorId = keyIdFor(id);
  try {
    const own = store.get(vendorId);
    if (own !== null) return own;
    return vendorId === id ? null : store.get(id);
  } catch {
    return null;
  }
}
