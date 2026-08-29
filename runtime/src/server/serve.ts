import { randomBytes } from 'node:crypto';
import { chmodSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { counselHome } from '../core/home';
import { DEFAULT_TENANT } from '../core/types';
import { loadRegistry } from '../providers/registry';
import { ThreadStore } from '../threads/store';
import { FsVaultStore } from '../vault/fs-store';
import { resolveLegalRoot } from '../vault/resolve-root';
import { createApp } from './routes';

type BunServer = ReturnType<typeof Bun.serve>;

/** The port the plugin adapter tries first. `runtime.json` is what actually
 * tells a client where the server is, so falling off it is not fatal. */
export const DEFAULT_PORT = 7431;

/** Loopback only (spec §4.5). Nothing here is safe on a public interface. */
export const HOSTNAME = '127.0.0.1';

export interface StartServerOptions {
  /** Vault root. Omitted → `resolveLegalRoot()`, the shared discovery algorithm. */
  vault?: string;
  /** Bind port. Omitted → `DEFAULT_PORT`, falling back to an OS-assigned one
   * when it is busy. An explicit port is never silently substituted. */
  port?: number;
  /** Where `skills/`, `primitives/`, and `scripts/` live. Defaults to the
   * repo root, or `COUNSEL_PLUGIN_ROOT` for an installed-plugin layout. */
  pluginRoot?: string;
  /** Overrides `<counselHome>/providers.yaml`. */
  registryFile?: string;
  env?: NodeJS.ProcessEnv;
}

export interface RunningServer {
  port: number;
  token: string;
  vault: string;
  url: string;
  /** The thread store this server is serving from — exposed so a caller (and
   * the tests) can see where thread state, including each thread's Codex
   * home, actually lands. */
  store: ThreadStore;
  /** Stops listening and removes `runtime.json`. */
  stop(): Promise<void>;
}

/** `~/.counsel-os`, or `COUNSEL_OS_HOME` — the override the tests use so they
 * never touch the developer's real runtime file. Defined in `core/home.ts`
 * (the registry needs it too, without a server dependency) and re-exported
 * here, where it has always been imported from. */
export { counselHome };

/** Where each thread's persistent Codex home lives. Under `counselHome`, not
 * unconditionally under the real `$HOME`: these directories hold a copy of
 * the operator's `auth.json`, so they belong wherever the operator pointed
 * the runtime's state. */
export function codexHomeRoot(env: NodeJS.ProcessEnv = process.env): string {
  return join(counselHome(env), 'codex');
}

/** The handshake file the plugin adapter reads (spec §4.7). */
export function runtimeFilePath(env: NodeJS.ProcessEnv = process.env): string {
  return join(counselHome(env), 'runtime.json');
}

export interface RuntimeFile {
  port: number;
  token: string;
  vault: string;
  pid: number;
  startedAt: string;
}

/**
 * The plugin root: `COUNSEL_PLUGIN_ROOT` when set (an installed plugin puts
 * `skills/` somewhere else entirely), otherwise the repo root — three levels
 * up from `runtime/src/server/`.
 */
export function defaultPluginRoot(env: NodeJS.ProcessEnv = process.env): string {
  return env.COUNSEL_PLUGIN_ROOT ?? resolve(import.meta.dir, '../../..');
}

/**
 * Resolves the vault, or exits the way `scripts/resolve_legal_root.sh` does:
 * the same messages on stderr and the same 1/2 exit codes, so a user who has
 * seen one has seen both. `--vault` skips discovery entirely.
 */
export function resolveVaultOrExit(opts: StartServerOptions): string {
  if (opts.vault) return resolve(opts.vault);
  const env = opts.env ?? process.env;
  const found = resolveLegalRoot({ env });
  if (found.ok) return found.root;
  if (found.code === 2) {
    console.error('Multiple Counsel OS legal roots found. Set COUNSEL_OS_LEGAL_ROOT to choose one:');
    for (const root of found.candidates) console.error(`  ${root}`);
    process.exit(2);
  }
  if (env.COUNSEL_OS_LEGAL_ROOT) {
    console.error(`COUNSEL_OS_LEGAL_ROOT is not a marked Counsel OS legal root: ${env.COUNSEL_OS_LEGAL_ROOT}`);
  } else {
    console.error('No Counsel OS legal root found. Set COUNSEL_OS_LEGAL_ROOT, or run /counsel-os:setup.');
  }
  process.exit(1);
}

/**
 * Binds the app. The default port is a convenience, not a requirement — a
 * second runtime, or anything else already on 7431, falls through to an
 * OS-assigned port and publishes it in `runtime.json`. A port the caller
 * asked for explicitly is never substituted: they asked for that one.
 */
function listen(port: number | undefined, fetch: (req: Request) => Promise<Response>): BunServer {
  const serve = (p: number): BunServer => Bun.serve({ hostname: HOSTNAME, port: p, fetch, idleTimeout: 0 });
  if (port !== undefined) return serve(port);
  try {
    return serve(DEFAULT_PORT);
  } catch {
    return serve(0);
  }
}

/**
 * Publishes `runtime.json`, which holds the bearer token, so two properties
 * have to hold at once.
 *
 * 0600: `writeFileSync`'s mode applies only when it creates the file, so a
 * leftover world-readable file from an earlier run would keep its mode and
 * quietly publish the token. Writing a fresh temp file and renaming over the
 * old one replaces the inode, mode and all.
 *
 * Atomic: a reader (the plugin adapter, on every skill invocation) must
 * never catch a half-written file. `rename` within a directory is atomic, so
 * a reader sees either the old file or the new one.
 */
function writeRuntimeFile(path: string, contents: RuntimeFile): void {
  mkdirSync(join(path, '..'), { recursive: true, mode: 0o700 });
  // Named for this process: two servers starting at once must not write the
  // same temp file.
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(contents, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
  chmodSync(tmp, 0o600);
  renameSync(tmp, path);
}

/** Reads the pid out of a `runtime.json`, or `null` when there is nothing
 * readable and parseable there. */
function runtimeFileOwner(path: string): number | null {
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<RuntimeFile>;
    return typeof parsed.pid === 'number' ? parsed.pid : null;
  } catch {
    return null;
  }
}

/**
 * Starts the local runtime: resolve the vault, load the provider registry,
 * bind loopback, and publish `runtime.json` for the plugin adapter.
 *
 * The token is fresh per process — it lives only in that file (0600) and in
 * memory, so stopping the server ends every credential it issued.
 */
export async function startServer(opts: StartServerOptions = {}): Promise<RunningServer> {
  const env = opts.env ?? process.env;
  const vaultRoot = resolveVaultOrExit(opts);
  const pluginRoot = opts.pluginRoot ?? defaultPluginRoot(env);
  const { providers, router, defaultId } = loadRegistry({
    vaultRoot,
    env,
    ...(opts.registryFile === undefined ? {} : { file: opts.registryFile }),
  });

  const token = randomBytes(32).toString('hex');
  // The store is given the environment's codex root explicitly: its own
  // default is the real `$HOME`, which would ignore `COUNSEL_OS_HOME` and
  // drop a copy of `auth.json` somewhere the operator never pointed at.
  const store = new ThreadStore(vaultRoot, { codexHomeRoot: codexHomeRoot(env) });
  const app = createApp({
    token,
    tenant: DEFAULT_TENANT,
    vaultRoot,
    pluginRoot,
    vault: new FsVaultStore(vaultRoot),
    store,
    providers,
    router,
    defaultProviderId: defaultId,
  });

  const server = listen(opts.port, app);
  const port = server.port ?? opts.port ?? DEFAULT_PORT;
  const file = runtimeFilePath(env);
  writeRuntimeFile(file, { port, token, vault: vaultRoot, pid: process.pid, startedAt: new Date().toISOString() });

  // The handshake file must not outlive the process that owns it: a stale
  // one sends the adapter at a dead port with a dead token.
  let removed = false;
  const removeFile = (): void => {
    if (removed) return;
    removed = true;
    try {
      // Only if the file is still OURS. A second `serve` overwrites the
      // handshake and becomes the runtime the adapter talks to; this one
      // shutting down afterwards must not delete the live server's file and
      // leave the adapter with nothing. A file we cannot read or parse is
      // not provably ours either, so it stays.
      if (runtimeFileOwner(file) !== process.pid) return;
      rmSync(file, { force: true });
    } catch {
      /* best effort — the process is going away either way */
    }
  };
  const onSignal = (): void => {
    removeFile();
    process.exit(0);
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);
  process.on('exit', removeFile);

  console.log(`counsel-os runtime on http://${HOSTNAME}:${port} (vault: ${vaultRoot})`);

  return {
    port,
    token,
    vault: vaultRoot,
    url: `http://${HOSTNAME}:${port}`,
    store,
    async stop(): Promise<void> {
      process.off('SIGINT', onSignal);
      process.off('SIGTERM', onSignal);
      process.off('exit', removeFile);
      removeFile();
      await server.stop(true);
    },
  };
}
